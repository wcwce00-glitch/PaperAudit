"""Real HTTP + CSP + ES Module integration for v0.5; synthetic documents only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json,os,shutil
import pytest
from playwright.sync_api import sync_playwright,Error as PlaywrightError
from test_v050_semantics import fake_docx
ROOT=Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

@pytest.fixture(scope='module')
def http_site():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    t=Thread(target=server.serve_forever,daemon=True);t.start()
    try:yield f'http://127.0.0.1:{server.server_port}/'
    finally:server.shutdown();server.server_close();t.join(timeout=5)

@pytest.fixture(scope='module')
def browser():
    with sync_playwright() as pw:
        executable=shutil.which('chromium') or shutil.which('google-chrome')
        b=pw.chromium.launch(headless=True,**({'executable_path':executable} if executable else {}),args=['--no-sandbox'])
        yield b
        b.close()

@pytest.fixture
def live_page(browser,http_site):
    p=browser.new_page(accept_downloads=True)
    errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    try:p.goto(http_site,wait_until='networkidle',timeout=15000)
    except PlaywrightError as e:
        p.close()
        if os.environ.get('PAPERAUDIT_REQUIRE_HTTP_TESTS')=='1':pytest.fail('CI must load real HTTP/ES Module page: '+str(e))
        pytest.skip('Local browser HTTP blocked by environment: '+str(e))
    p.locator('#run-audit').wait_for(state='visible')
    yield p
    assert not errors,'Real ES module runtime exceptions: '+str(errors)
    p.close()

def test_semantic_word_and_strict_template_as_real_site(live_page):
    p=live_page
    assert p.locator('#profile-select option').count()>=7
    typ='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    p.locator('#file-input').set_input_files({'name':'synthetic.docx','mimeType':typ,'buffer':fake_docx()})
    p.locator('#template-input').set_input_files({'name':'strict-template.docx','mimeType':typ,'buffer':fake_docx(strict=True)})
    p.locator('#run-audit').click()
    p.locator('#results').wait_for(state='visible',timeout=25000)
    assert p.locator('#requirements-panel').is_visible()
    assert p.locator('.requirement-item').count()>=3
    with p.expect_download() as dl:p.locator('#save-json').click()
    result=json.loads(Path(dl.value.path()).read_text(encoding='utf-8'))
    assert result['version']=='0.5.0-preview'
    assert result['coverage']['figCaptions']==5
    assert result['coverage']['tableCaptions']==2
    assert result['coverage']['references']==13
    assert result['coverage']['citations']==13
    assert not [f for f in result['findings'] if f['code'] in ('CITE-NOT-FOUND','REF-NOT-FOUND')]
    assert result['rulesAudit']['stats']['total']>=3
    assert all(row.get('originalText') and (row.get('sourceFile') or row.get('source')) for row in result['rulesAudit']['requirements'])

def test_select_builtin_profile_without_template_and_export_report(live_page):
    p=live_page
    p.locator('#profile-select').select_option('electrical-en')
    typ='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    p.locator('#file-input').set_input_files({'name':'synthetic.docx','mimeType':typ,'buffer':fake_docx()})
    p.locator('#run-audit').click();p.locator('#results').wait_for(state='visible',timeout=25000)
    assert p.locator('.requirement-item').count()>=6
    assert '电气工程' in p.locator('#requirements-summary').inner_text()
    with p.expect_download() as dl:p.locator('#save-html').click()
    report=Path(dl.value.path()).read_text(encoding='utf-8')
    assert '逐条规则检查' in report
    assert '规则来源' in report
    assert '实际检测值' in report
    assert '修改建议' in report

def test_local_library_and_public_contribution(live_page):
    p=live_page
    typ='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    p.locator('#template-input').set_input_files({'name':'strict-template.docx','mimeType':typ,'buffer':fake_docx(strict=True)})
    p.locator('#share-journal').fill('Synthetic Journal')
    p.locator('#save-local-template').click()
    p.locator('.local-template-row').first.wait_for(state='visible',timeout=10000)
    assert p.locator('.local-template-row').count()==1
    p.reload(wait_until='networkidle')
    p.locator('.local-template-row').first.wait_for(state='visible',timeout=10000)
    # Form fields are intentionally not persisted across reloads.
    p.locator('#share-journal').fill('Synthetic Journal')
    p.locator('#share-discipline').select_option('general')
    p.locator('#share-language').select_option('en')
    p.locator('#submission-details summary').click()
    p.locator('#share-source').fill('https://example.org/author-guide')
    p.locator('#share-confirm').check()
    with p.expect_download() as dl:p.locator('#submit-metadata').click()
    meta=json.loads(Path(dl.value.path()).read_text(encoding='utf-8'))
    assert meta['sourceUrl']=='https://example.org/author-guide'
    assert 'blob' not in meta

def test_ai_is_off_by_default_and_explicit_consent_required(live_page):
    p=live_page
    assert not p.locator('#ai-consent').is_checked()
    p.locator('#run-local-ai').click()
    assert '请先上传' in p.locator('#ai-status').inner_text()
    typ='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    p.locator('#template-input').set_input_files({'name':'strict-template.docx','mimeType':typ,'buffer':fake_docx(strict=True)})
    p.locator('#run-local-ai').click()
    assert '请先勾选同意' in p.locator('#ai-status').inner_text()


@pytest.mark.skipif(os.environ.get('PAPERAUDIT_PUBLIC_TEMPLATE_TESTS') != '1',
                    reason='Set PAPERAUDIT_PUBLIC_TEMPLATE_TESTS=1 to fetch and test an official public DOCX')
def test_official_public_template_detects_real_docx_page_margin_change(live_page, tmp_path):
    """Exercise the real browser flow with a public university DOCX and a modified copy.

    Only the public template is downloaded. The manuscript is a temporary local
    copy with its section margins deliberately changed; no research manuscript
    or document content is uploaded to a PaperAudit server or committed.
    """
    import io
    import time
    import urllib.error
    import urllib.request
    import zipfile
    import xml.etree.ElementTree as ET

    sources = [
        ("UC Irvine Accessible Master's Thesis Template 2025",
         "https://guides.lib.uci.edu/ld.php?content_id=70078581"),
        ("Cornell Graduate School dissertation introduction template",
         "https://gradschool.cornell.edu/wp-content/uploads/2018/06/dissertation_template071911.docx"),
    ]
    source_label = None
    original = None
    errors = []
    for label, url in sources:
        for attempt in range(3):
            try:
                request = urllib.request.Request(
                    url, headers={"User-Agent": "PaperAudit-public-template-validation/1.0"}
                )
                with urllib.request.urlopen(request, timeout=30) as response:
                    candidate = response.read()
                if not zipfile.is_zipfile(io.BytesIO(candidate)):
                    raise ValueError("official download did not return a valid DOCX/ZIP file")
                with zipfile.ZipFile(io.BytesIO(candidate)) as archive:
                    if "word/document.xml" not in archive.namelist():
                        raise ValueError("DOCX is missing word/document.xml")
                source_label, original = label, candidate
                break
            except Exception as exc:
                errors.append(f"{label} attempt {attempt + 1}: {exc}")
                if attempt < 2:
                    time.sleep(2 ** attempt)
        if original is not None:
            break
    assert original is not None, "Could not download a valid official public DOCX: " + " | ".join(errors)

    # Change the left margin in every section while retaining all other DOCX parts.
    namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    entries = {}
    with zipfile.ZipFile(io.BytesIO(original)) as archive:
        entries = {item.filename: archive.read(item.filename) for item in archive.infolist()}
    root = ET.fromstring(entries["word/document.xml"])
    changed = 0
    for node in root.iter(namespace + "pgMar"):
        key = namespace + "left"
        current = node.attrib.get(key)
        if current is not None and current.isdigit():
            node.attrib[key] = str(int(current) + 360)  # six tenths of an inch
            changed += 1
    assert changed > 0, f"{source_label}: no numeric section left margin was found to mutate"
    ET.register_namespace("w", namespace[1:-1])
    entries["word/document.xml"] = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    mutated_path = tmp_path / "public-template-with-deliberate-margin-error.docx"
    with zipfile.ZipFile(mutated_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in entries.items():
            archive.writestr(name, data)
    mutated = mutated_path.read_bytes()

    p = live_page
    typ = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    p.locator("#file-input").set_input_files({
        "name": "public-template-mutated-manuscript.docx",
        "mimeType": typ,
        "buffer": mutated,
    })
    p.locator("#template-input").set_input_files({
        "name": "official-public-template.docx",
        "mimeType": typ,
        "buffer": original,
    })
    p.locator("#run-audit").click()
    p.locator("#results").wait_for(state="visible", timeout=30000)
    with p.expect_download() as dl:
        p.locator("#save-json").click()
    report = json.loads(Path(dl.value.path()).read_text(encoding="utf-8"))
    requirements = report["rulesAudit"]["requirements"]
    page_checks = [row for row in requirements if row.get("check") == "styleCompare"]
    assert page_checks, f"{source_label}: no template page-setup comparison was emitted"
    assert any(
        row.get("status") == "fail"
        and "左页边距" in row.get("detail", "")
        and "模板" in row.get("detail", "")
        and "论文" in row.get("detail", "")
        for row in page_checks
    ), f"{source_label}: the deliberately changed margin was not reported as an actionable failure: {page_checks}"
    print(f"PUBLIC TEMPLATE VALIDATION PASSED: {source_label}; mutated {changed} section margin(s); confirmed actionable template mismatch in exported JSON.")
