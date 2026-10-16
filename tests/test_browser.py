"""Browser smoke tests of UI and analyzer; about:blank harness avoids requiring a local server.

Run: pip install playwright pytest; python -m playwright install chromium; pytest tests -q
"""
from __future__ import annotations
import io
import os
import re
import shutil
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def browser_html():
    html = (ROOT / "index.html").read_text(encoding="utf8")
    html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>', "", html)
    html = html.replace('<link rel="stylesheet" href="assets/style.css" />',
                        f'<style>{(ROOT / "assets/style.css").read_text(encoding="utf8")}</style>')
    html = html.replace('<script src="vendor/jszip.min.js"></script>', '')
    html = html.replace('<script type="module" src="js/app.js"></script>', '')
    return html


@pytest.fixture(scope='module')
def browser():
    with sync_playwright() as playwright:
        executable = shutil.which("chromium") or shutil.which("google-chrome")
        # CI can use a Playwright-managed chromium installation instead.
        browser = playwright.chromium.launch(headless=True, executable_path=executable,
                                           args=["--no-sandbox"])
        yield browser
        browser.close()


@pytest.fixture
def page(browser):
    page = browser.new_page(accept_downloads=True, viewport={"width": 1280, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_content(browser_html())
    page.add_script_tag(path=str(ROOT / 'vendor/jszip.min.js'))
    for filename in ["docx-model.js", "standards.js", "audit.js", "report.js", "template.js", "catalog.js", "library.js", "community.js", "rules-engine.js", "ai-local.js", "app.js"]:
        source = (ROOT / 'js' / filename).read_text(encoding="utf8")
        source = re.sub(r'^import .*?;\s*$', '', source, flags=re.M)
        source = source.replace("import { inspectFiles, supported } from './audit.js';", '')
        source = source.replace("import { inspectTemplateAgainstManuscripts, supportedTemplate } from './template.js';", '')
        source = source.replace("import { selectResources } from './catalog.js';", '')
        source = source.replace("import { makeHTML, exportFile } from './report.js';", '')
        source = source.replace('export async function ', 'async function ').replace('export function ', 'function ').replace('export const ', 'const ')
        if filename == 'docx-model.js':
            source = '(function(){\n'+source+'\nwindow.parseDocxModel=parseDocxModel;window.checkModelStructure=checkModelStructure;\n})()'
        if filename == 'standards.js':
            source = '(function(){\n'+source+'\nwindow.PROFILES=PROFILES;window.getProfile=getProfile;\n})()'
        if filename == 'rules-engine.js':
            source = '(function(){\nconst parseDocxModel=window.parseDocxModel;const getProfile=window.getProfile;\n'+source+'\nwindow.createRulesAudit=createRulesAudit;\n})()'
        if filename == 'ai-local.js':
            source = '(function(){\n'+source+'\nwindow.suggestRequirementsWithLocalAI=suggestRequirementsWithLocalAI;\n})()'
        if filename == 'template.js':
            source = '(function(){\n'+source+'\nwindow.inspectTemplateAgainstManuscripts = inspectTemplateAgainstManuscripts; window.supportedTemplate = supportedTemplate;\n})()'
        if filename == 'catalog.js':
            source = '(function(){\n'+source+'\nwindow.selectResources = selectResources;window.setApprovedResources=setApprovedResources;\n})()'
        page.add_script_tag(content=source)
    yield page
    assert not errors, "JavaScript runtime errors: " + str(errors)
    page.close()


def run_check(page):
    page.locator('#run-audit').click()
    page.wait_for_function('document.querySelector("#results").hidden === false', timeout=10000)
    return page.locator('.finding-title').all_inner_texts()


def test_sample_flags_image_quality_and_keeps_uncertain_references_review_only(page):
    page.locator('#file-input').set_input_files(str(ROOT / 'examples/sample_manuscript.docx'))
    findings = run_check(page)
    assert any('有效分辨率不足' in x for x in findings), findings
    # The semantic parser may label unresolved literal references for review rather
    # than reproducing the old text-only "missing citation" false positives.
    assert page.locator('#count-warning').inner_text() == '1'
    assert any('未能核验' in x for x in findings)
    with page.expect_download() as info:
        page.locator('#save-html').click()
    assert info.value.suggested_filename == 'PaperAudit-report.html'


def test_disable_checks_changes_results(page):
    page.locator('#file-input').set_input_files(str(ROOT / 'examples/sample_manuscript.docx'))
    page.locator('#check-captions').uncheck()
    page.locator('#check-citations').uncheck()
    found = run_check(page)
    assert len(found) == 1
    assert '有效分辨率不足' in found[0]


def test_standalone_image_ppi_requires_display_width(page):
    page.locator('#file-input').set_input_files(str(ROOT / 'examples/waveform_demo.png'))
    found = run_check(page)
    assert len(found) == 1
    assert '缺少最终排版宽度' in found[0]
    assert page.locator('#count-unverified').inner_text() == '1'


def test_invalid_docx_reports_error_not_crash(page):
    page.locator('#file-input').set_input_files({
        'name':'broken.docx',
        'mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'buffer':b'not really a word document',
    })
    found=run_check(page)
    assert len(found)==1
    assert '文件未能完成检查' in found[0]


def make_fake_docx(evidence):
    text = '如图 9 所示，' + evidence
    xml = ('<?xml version="1.0" encoding="UTF-8"?>'
           '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
           '<w:body><w:p><w:r><w:t>' + escape(text) + '</w:t></w:r></w:p></w:body></w:document>')
    f=io.BytesIO()
    with zipfile.ZipFile(f,'w') as z:z.writestr('word/document.xml',xml)
    return f.getvalue()


def test_malicious_document_text_is_not_rendered_as_html(page):
    payload='<img src=x onerror="window.__xss=true">'
    page.locator('#file-input').set_input_files({
        'name':'injection.docx',
        'mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'buffer':make_fake_docx(payload),
    })
    found=run_check(page)
    assert any('未能核验' in x or '文件未能完成检查' in x for x in found), found
    assert not page.evaluate('window.__xss || false')
    assert page.locator('#findings img').count()==0
    with page.expect_download() as info:page.locator('#save-html').click()
    location=Path(info.value.path())
    content=location.read_text(encoding='utf8')
    # The malicious body text is not a rule candidate and is omitted; it must
    # neither appear unescaped nor execute in the DOM.
    assert payload not in content
    assert '<img src=x' not in content


def test_report_filter(page):
    page.locator('#file-input').set_input_files(str(ROOT / 'examples/waveform_demo.png'))
    run_check(page)
    page.locator('[data-filter="warning"]').click()
    assert page.locator('.finding-title').count()==0
    page.locator('[data-filter="unverified"]').click()
    assert page.locator('.finding-title').count()==1


def make_paragraph_docx(lines):
    paragraphs = ''.join('<w:p><w:r><w:t>' + escape(t) + '</w:t></w:r></w:p>' for t in lines)
    xml = ('<?xml version="1.0" encoding="UTF-8"?>'
           '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
           '<w:body>' + paragraphs + '</w:body></w:document>')
    data = io.BytesIO()
    with zipfile.ZipFile(data, 'w') as z:z.writestr('word/document.xml', xml)
    return data.getvalue()


def test_valid_reference_and_subfigures_are_not_flagged(page):
    buf = make_paragraph_docx([
        '1 Introduction',
        '图 1(a) 实验曲线',
        '图 1(b) 对照曲线',
        '结果如图 1 所示，文献 [1] 给出了一种方案。',
        '参考文献',
        '[1] Synthetic paper.',
    ])
    page.locator('#check-images').uncheck()
    page.locator('#file-input').set_input_files({
        'name':'positive.docx',
        'mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'buffer':buf,
    })
    found = run_check(page)
    assert found == [], found


def test_higher_user_ppi_threshold_changes_detection(page):
    page.locator('#file-input').set_input_files(str(ROOT / 'examples/sample_manuscript.docx'))
    page.locator('#ppi').fill('100')
    found = run_check(page)
    assert not any('有效分辨率不足' in x for x in found), found


def make_template_docx(note='本刊稿件必须包含摘要。', width='11906', margin='1440'):
    paragraphs = ''.join('<w:p><w:r><w:t>' + escape(t) + '</w:t></w:r></w:p>' for t in ['Abstract', note])
    xml = ('<?xml version="1.0" encoding="UTF-8"?>'
           '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
           '<w:body>' + paragraphs + f'<w:sectPr><w:pgSz w:w="{width}" w:h="16838"/>'
           f'<w:pgMar w:top="{margin}" w:bottom="1440" w:left="1440" w:right="1440"/></w:sectPr></w:body></w:document>')
    buf=io.BytesIO()
    with zipfile.ZipFile(buf,'w') as z:z.writestr('word/document.xml',xml)
    return buf.getvalue()


def test_journal_directory_language_and_discipline(page):
    assert page.locator('.journal-card').count() >= 7
    page.locator('#discipline').select_option('electrical')
    page.locator('#journal-language').select_option('zh')
    items = page.locator('.journal-card strong').all_inner_texts()
    assert '电力自动化设备' in items, items
    assert all('IEEE' not in x for x in items)
    assert page.locator('.journal-card a[href^="https://"]').count() >= 1


def test_no_template_uses_builtin_profile_without_claiming_journal_compliance(page):
    page.locator('#file-input').set_input_files(str(ROOT / 'examples/sample_manuscript.docx'))
    findings=run_check(page)
    assert any('有效分辨率不足' in x for x in findings)
    assert '模板：英文科研论文 · 通用预检' in page.locator('#coverage').inner_text()
    assert '不等同于任何期刊的官方强制规范' in page.locator('#requirements-summary').inner_text()
    assert page.locator('.requirement-item').count() >= 6
    assert '非官方' in page.locator('#requirements-summary').inner_text() or '通用' in page.locator('#requirements-summary').inner_text()


def test_uploaded_template_page_difference_and_explicit_section(page):
    manuscript=make_paragraph_docx(['Methods', '这是样例正文。'])
    template=make_template_docx()
    page.locator('#file-input').set_input_files({'name':'target.docx','mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':manuscript})
    page.locator('#template-input').set_input_files({'name':'demonstration-template.docx','mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':template})
    run_check(page)
    assert 'demonstration-template.docx' in page.locator('#coverage').inner_text()
    assert page.locator('.requirement-item').count() >= 1
    with page.expect_download() as info:page.locator('#save-json').click()
    import json
    result=json.loads(Path(info.value.path()).read_text(encoding='utf8'))
    assert result['template']['verifiedOfficial'] is False
    assert any('摘要' in x['originalText'] for x in result['rulesAudit']['requirements'])
    assert all(x['status'] in ('pass','fail','review') for x in result['rulesAudit']['requirements'])
    assert len(result['template']['candidateInstructions'])>=1


def test_uploaded_template_page_size_mismatch(page):
    manuscript=make_template_docx(note='无其他说明', width='11906')
    template=make_template_docx(note='无其他说明', width='14000')
    page.locator('#file-input').set_input_files({'name':'target.docx','mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':manuscript})
    page.locator('#template-input').set_input_files({'name':'sizing.docx','mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':template})
    run_check(page)
    rows=page.locator('.requirement-item').all_inner_texts()
    assert any('末节页面参数可能不同' in x for x in rows), rows
    assert not any('有证据支持不符：对照模板页面' in x for x in page.locator('.finding-title').all_inner_texts())


def test_template_text_instructions_are_unverified_not_fabricated_hard_rules(page):
    manuscript=make_paragraph_docx(['1 引言','本研究说明问题。'])
    page.locator('#file-input').set_input_files({'name':'target.docx','mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':manuscript})
    page.locator('#template-input').set_input_files({'name':'instructions.txt','mimeType':'text/plain','buffer':'请详细解释研究的局限性。\n摘要应当包含目的和方法。'.encode()})
    run_check(page)
    rows=page.locator('.requirement-item').all_inner_texts()
    assert any('请详细解释研究的局限性' in x for x in rows)
    assert any('摘要应当包含目的和方法' in x for x in rows)
    assert any('纯文本指南无法提供 Word 排版参照' in x for x in rows)
    assert all('有证据支持不符' not in x for x in rows)


def test_template_text_xss_is_escaped_in_offline_report(page):
    manuscript=make_paragraph_docx(['1 引言','示例'])
    payload='<img src=x onerror="window.__templateXss=true">'
    page.locator('#file-input').set_input_files({'name':'target.docx','mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':manuscript})
    page.locator('#template-input').set_input_files({'name':'rules.txt','mimeType':'text/plain','buffer':('必须包含说明：'+payload).encode()})
    run_check(page)
    with page.expect_download() as info:page.locator('#save-html').click()
    content=Path(info.value.path()).read_text(encoding='utf8')
    assert '&lt;img src=x' in content
    assert payload not in content
    assert not page.evaluate('window.__templateXss || false')


def test_explicit_abstract_character_limit_is_actually_checked(page):
    manuscript=make_paragraph_docx(['摘要：'+'这是具有明确研究目的与方法的中文摘要' * 12,'关键词：测试'])
    guide='摘要不得超过80字。'.encode()
    page.locator('#file-input').set_input_files({'name':'target.docx','mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':manuscript})
    page.locator('#template-input').set_input_files({'name':'official-guide-copied.txt','mimeType':'text/plain','buffer':guide})
    found=run_check(page)
    assert any('摘要不得超过80字' in x for x in found),found


def test_template_is_removable_and_does_not_leak_into_next_audit(page):
    manuscript=make_paragraph_docx(['Methods', '文本'])
    page.locator('#file-input').set_input_files({'name':'target.docx','mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':manuscript})
    page.locator('#template-input').set_input_files({'name':'sample.txt','mimeType':'text/plain','buffer':'稿件必须包含摘要。'.encode()})
    page.locator('#remove-template').click()
    found=run_check(page)
    assert not any('模板' in x for x in found), found
