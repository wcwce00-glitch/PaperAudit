"""Public semantic regression tests. Every DOCX is synthetic; never load user data here."""
from __future__ import annotations
import base64
from io import BytesIO
from pathlib import Path
import re
import shutil
import zipfile
import pytest
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]

def module_url(relative,cache=None):
    if cache is None: cache={}
    path=(ROOT/'js'/relative).resolve()
    if path in cache: return cache[path]
    src=path.read_text(encoding='utf-8')
    def replace(m):
        resolved=module_url(m.group(2),cache)
        return m.group(1)+resolved+m.group(3)
    src=re.sub(r'(from\s+[\'"])(\./[^\'"]+)([\'"])',replace,src)
    out='data:text/javascript;base64,'+base64.b64encode(src.encode()).decode()
    cache[path]=out
    return out

def fake_docx(strict=False,tabs=False,left_margin='1440',extra_section=False,abstract=None,abstract_heading='Abstract'):
    ns='http://purl.oclc.org/ooxml/wordprocessingml/main' if strict else 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    rel_ns='http://purl.oclc.org/ooxml/package/relationships' if strict else 'http://schemas.openxmlformats.org/package/2006/relationships'
    ct_ns='http://purl.oclc.org/ooxml/package/content-types' if strict else 'http://schemas.openxmlformats.org/package/2006/content-types'
    def p(text,sty=None,tab=False):
        import html
        pre=f'<w:pPr><w:pStyle w:val="{sty}"/></w:pPr>' if sty else ''
        content='<w:tab/>' if tab else ''
        return f'<w:p>{pre}<w:r>{content}<w:t xml:space="preserve">{html.escape(text)}</w:t></w:r></w:p>'
    if strict:
        body=p('Do not use hard tabs.')+p('Number equations consecutively.')+p('Figure captions should be below figures.')
    else:
        body=p('Experimental results are shown in Fig. 1, Fig. 2 and Fig. 3 shows no special heading.')
        if abstract is not None:
            keywords = '关键词：这里有很多额外的关键词字数，不能被算入摘要。' if abstract_heading == '摘要' else 'Keywords: these extra words must not count'
            body = p(abstract_heading) + p(abstract) + p(keywords) + p('Introduction') + body
        body+=p('The methods are described in references [1]–[4], [5], [6,7], [8]–[13].')
        body+=''.join(p(f'Synthetic figure caption {i}',sty='figurecaption') for i in range(1,6))
        body+=''.join(p(f'Synthetic table title {i}',sty='tablehead') for i in range(1,3))
        body+=p('References')+''.join(p(f'Author {i}. Synthetic reference title.',sty='references') for i in range(1,14))
        if tabs: body+=p('This manual hard tab should be checked',tab=True)
    if extra_section: body+='<w:p><w:pPr><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440"/><w:cols w:num="2" w:space="425"/></w:sectPr></w:pPr></w:p>'
    doc=f'<?xml version="1.0" encoding="utf-8"?><w:document xmlns:w="{ns}"><w:body>{body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:bottom="1440" w:left="{left_margin}" w:right="1440"/><w:cols w:num="2" w:space="425"/></w:sectPr></w:body></w:document>'
    styles=f'''<?xml version="1.0"?><w:styles xmlns:w="{ns}">
<w:style w:type="paragraph" w:styleId="figurecaption"><w:name w:val="figure caption"/><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="tablehead"><w:name w:val="table head"/><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="6"/></w:numPr></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="references"><w:name w:val="references"/><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="宋体"/><w:sz w:val="20"/></w:rPr></w:style></w:styles>'''
    numbering=f'''<?xml version="1.0"?><w:numbering xmlns:w="{ns}">
<w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="Fig. %1."/><w:pStyle w:val="figurecaption"/></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="5"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="[%1]"/><w:pStyle w:val="references"/></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="6"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperRoman"/><w:lvlText w:val="TABLE %1."/><w:pStyle w:val="tablehead"/></w:lvl></w:abstractNum>
<w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num><w:num w:numId="5"><w:abstractNumId w:val="5"/></w:num><w:num w:numId="6"><w:abstractNumId w:val="6"/></w:num></w:numbering>'''
    content_types=f'''<?xml version="1.0"?><Types xmlns="{ct_ns}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>'''
    rootrels=f'''<?xml version="1.0"?><Relationships xmlns="{rel_ns}"><Relationship Id="rId1" Type="http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument" Target="word/document.xml"/></Relationships>'''
    out=BytesIO()
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',content_types)
        z.writestr('_rels/.rels',rootrels)
        z.writestr('word/document.xml',doc)
        z.writestr('word/styles.xml',styles)
        z.writestr('word/numbering.xml',numbering)
    return out.getvalue()

@pytest.fixture(scope='module')
def browser():
    with sync_playwright() as pw:
        binary=shutil.which('chromium') or shutil.which('google-chrome')
        b=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox'])
        yield b
        b.close()

@pytest.fixture
def local_page(browser):
    page=browser.new_page()
    page.set_content('<input type="file" id="paper"><input type="file" id="template">')
    page.add_script_tag(path=str(ROOT/'vendor/jszip.min.js'))
    yield page
    page.close()

def loaded_files(page,paper=None,template=None):
    typ='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    page.locator('#paper').set_input_files({'name':'synthetic.docx','mimeType':typ,'buffer':paper or fake_docx()})
    page.locator('#template').set_input_files({'name':'strict-template.docx','mimeType':typ,'buffer':template or fake_docx(strict=True)})

def test_word_numbering_yields_five_figures_two_tables_and_thirteen_references(local_page):
    loaded_files(local_page)
    src=module_url('docx-model.js')
    actual=local_page.evaluate('''async src => {
      const m=await import(src); const p=await m.parseDocxModel(document.querySelector('#paper').files[0]);
      const r={findings:[],coverage:{}};m.checkModelStructure(p,r,{captions:true,citations:true});
      return {ns:p.namespace,counts:r.coverage,alerts:r.findings,figs:p.paragraphs.filter(x=>x.captionKind==='figure').map(x=>x.captionNumber),tables:p.paragraphs.filter(x=>x.captionKind==='table').map(x=>x.captionNumber)};
    }''',src)
    assert actual['counts']['figCaptions']==5
    assert actual['counts']['tableCaptions']==2
    assert actual['counts']['references']==13
    assert actual['counts']['citations']==13
    assert actual['alerts']==[]
    assert actual['figs']==[1,2,3,4,5]
    assert actual['tables']==[1,2]

def test_strict_ooxml_template_and_rule_inventory(local_page):
    loaded_files(local_page)
    src=module_url('rules-engine.js')
    docx_src=module_url('docx-model.js')
    actual=local_page.evaluate('''async ({src,docx}) => {
      const m=await import(src);const paper=document.querySelector('#paper').files[0],template=document.querySelector('#template').files[0];
      const model=await (await import(docx)).parseDocxModel(template);
      const a=await m.createRulesAudit(paper,{templateFile:template});
      return {ns:model.namespace,paragraphs:model.paragraphs.length,total:a.stats.total,fail:a.stats.fail,types:a.requirements.map(x=>x.check),sources:a.requirements.map(x=>x.source),requirements:a.requirements};
    }''',{"src":src,"docx":docx_src})
    assert actual['ns']=='http://purl.oclc.org/ooxml/wordprocessingml/main'
    assert actual['paragraphs']>=3
    assert actual['total']>=3
    assert actual['fail']==0
    assert 'tabs' in actual['types']
    assert all(('模板第' in s or 'styles.xml' in s or 'sectPr' in s) for s in actual['sources'])
    assert all('text' in row and 'source' in row and row['status'] in ('pass','fail','review') for row in actual['requirements'])

def test_explicit_hard_tab_prohibition_is_actionable_failure(local_page):
    loaded_files(local_page,paper=fake_docx(tabs=True))
    src=module_url('rules-engine.js')
    actual=local_page.evaluate('''async src => {
      const m=await import(src);
      const a=await m.createRulesAudit(document.querySelector('#paper').files[0],{templateFile:document.querySelector('#template').files[0]});
      return a.requirements.filter(x=>x.check==='tabs').map(x=>({status:x.status,detail:x.detail,recommendation:x.recommendation}));
    }''',src)
    assert actual and actual[0]['status']=='fail'
    assert '段落' in actual[0]['detail']
    assert '删除这些段落中的手动 Tab' in actual[0]['recommendation']

def test_builtin_profile_works_without_template(local_page):
    loaded_files(local_page)
    src=module_url('rules-engine.js')
    actual=local_page.evaluate('''async src => {
      const m=await import(src);const a=await m.createRulesAudit(document.querySelector('#paper').files[0],{profileId:'electrical-en'});
      return {name:a.name,stats:a.stats,hasAi:a.requirements.some(x=>x.id.startsWith('AI-'))};
    }''',src)
    assert '电气' in actual['name']
    assert actual['stats']['total']>=6
    assert actual['hasAi'] is False

def test_chinese_guidelines_keep_verbatim_source_and_unknown_checks_as_review(local_page):
    loaded_files(local_page)
    guide="摘要不得超过200字。\n请删除所有模板占位文字。\n论文写作请遵循会议作者指南。".encode("utf-8")
    local_page.locator("#template").set_input_files({
        "name":"synthetic-cn-guide.txt",
        "mimeType":"text/plain",
        "buffer":guide,
    })
    src=module_url("rules-engine.js")
    actual=local_page.evaluate("""async src => {
      const m=await import(src);
      const a=await m.createRulesAudit(
        document.querySelector("#paper").files[0],
        {templateFile:document.querySelector("#template").files[0]}
      );
      return a.requirements.map(x=>({
        id:x.id,check:x.check,originalText:x.originalText,sourceFile:x.sourceFile,
        sourceParagraph:x.sourceParagraph,actualValue:x.actualValue,status:x.status,
        recommendation:x.recommendation,evidence:x.evidence
      }));
    }""",src)
    assert any(x["originalText"]=="摘要不得超过200字。" for x in actual)
    assert any(x["originalText"]=="请删除所有模板占位文字。" for x in actual)
    assert any(x["originalText"]=="论文写作请遵循会议作者指南。" for x in actual)
    assert all(x["sourceFile"]=="synthetic-cn-guide.txt" for x in actual)
    assert all(x["originalText"] and x["actualValue"] and x["recommendation"] for x in actual)
    assert all(x["status"] in ("pass","fail","review") for x in actual)
    assert any(x["check"]=="manual" and x["status"]=="review" for x in actual)
    assert all(x["status"]!="fail" for x in actual if x["check"]=="manual")


def test_template_page_margin_mismatch_is_actionable_failure(local_page):
    # Synthetic public fixture only: paper left margin is 720 twips; template is 1440.
    paper=fake_docx(left_margin='720')
    loaded_files(local_page,paper=paper)
    src=module_url("rules-engine.js")
    actual=local_page.evaluate("""async src => {
      const m=await import(src);
      const a=await m.createRulesAudit(
        document.querySelector("#paper").files[0],
        {templateFile:document.querySelector("#template").files[0]}
      );
      return a.requirements.filter(x=>x.check==="styleCompare").map(x=>({
        status:x.status,detail:x.detail,evidence:x.evidence,recommendation:x.recommendation
      }));
    }""",src)
    assert actual
    assert actual[0]["status"]=="fail"
    assert "左页边距" in actual[0]["detail"]
    assert "模板 1440" in actual[0]["detail"]
    assert "论文 720" in actual[0]["detail"]
    assert "Word 的“布局/页面设置”" in actual[0]["recommendation"]


def test_extra_section_is_not_alone_a_confirmed_format_error(local_page):
    # Additional sections can be legitimate (e.g. landscape tables or pagination changes).
    loaded_files(local_page,paper=fake_docx(extra_section=True),template=fake_docx(strict=True))
    src=module_url("rules-engine.js")
    actual=local_page.evaluate("""async src => {
      const m=await import(src);
      const a=await m.createRulesAudit(document.querySelector("#paper").files[0],{templateFile:document.querySelector("#template").files[0]});
      return a.requirements.filter(x=>x.check==="styleCompare").map(x=>({status:x.status,detail:x.detail}));
    }""",src)
    assert actual and actual[0]["status"]=="review"
    assert "分节数不同" in actual[0]["detail"]
    assert "不能仅凭这一点认定格式错误" in actual[0]["detail"]


def test_common_quantified_abstract_limit_wording_is_extracted_as_explicit_rule(local_page):
    loaded_files(local_page)
    guide = "摘要最多200字。\n摘要控制在300字以内。\nAbstract should not exceed 250 words.\n摘要限180字。\nAbstract (max. 220 words)."
    local_page.locator("#template").set_input_files({
        "name": "abstract-limits.txt",
        "mimeType": "text/plain",
        "buffer": guide.encode("utf-8"),
    })
    src = module_url("rules-engine.js")
    actual = local_page.evaluate("""async src => {
      const m = await import(src);
      const a = await m.createRulesAudit(
        document.querySelector("#paper").files[0],
        {templateFile: document.querySelector("#template").files[0]}
      );
      return a.requirements.filter(x => x.check === "abstractLimit").map(x => ({
        originalText: x.originalText, strength: x.strength, params: x.params, status: x.status
      }));
    }""", src)
    assert len(actual) == 5, actual
    assert [x["params"]["max"] for x in actual] == [200, 300, 250, 180, 220], actual
    assert all(x["strength"] == "mandatory" for x in actual), actual
    # The synthetic manuscript has no reliably delimited abstract, so it must
    # remain review rather than inventing a pass/fail result.
    assert all(x["status"] == "review" for x in actual), actual


def test_chinese_abstract_word_limit_stops_before_keywords_heading(local_page):
    paper = fake_docx(abstract='甲乙丙丁戊己庚辛壬癸', abstract_heading='摘要')
    local_page.locator('#paper').set_input_files({
        'name': 'synthetic-cn-paper.docx',
        'mimeType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'buffer': paper,
    })
    guide = '摘要最多10字。'.encode('utf-8')
    local_page.locator('#template').set_input_files({
        'name': 'abstract-limit.txt', 'mimeType': 'text/plain', 'buffer': guide,
    })
    src = module_url('rules-engine.js')
    actual = local_page.evaluate("""async src => {
      const m = await import(src);
      const a = await m.createRulesAudit(document.querySelector('#paper').files[0], {
        templateFile: document.querySelector('#template').files[0]
      });
      return a.requirements.filter(x => x.check === 'abstractLimit').map(x => ({
        status: x.status, detail: x.detail
      }));
    }""", src)
    assert actual and actual[0]['status'] == 'pass', actual
    assert '10个汉字' in actual[0]['detail'], actual


def test_chinese_abstract_not_exceed_limit_is_mandatory_and_fails_when_over(local_page):
    paper = fake_docx(abstract='甲乙丙丁戊己庚辛壬癸子', abstract_heading='摘要')
    local_page.locator('#paper').set_input_files({
        'name': 'synthetic-cn-paper.docx',
        'mimeType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'buffer': paper,
    })
    guide = '摘要不超过10字。'.encode('utf-8')
    local_page.locator('#template').set_input_files({
        'name': 'abstract-limit.txt', 'mimeType': 'text/plain', 'buffer': guide,
    })
    src = module_url('rules-engine.js')
    actual = local_page.evaluate("""async src => {
      const m = await import(src);
      const a = await m.createRulesAudit(document.querySelector('#paper').files[0], {
        templateFile: document.querySelector('#template').files[0]
      });
      return a.requirements.filter(x => x.check === 'abstractLimit').map(x => ({
        strength: x.strength, status: x.status, detail: x.detail
      }));
    }""", src)
    assert actual and actual[0]['strength'] == 'mandatory', actual
    assert actual[0]['status'] == 'fail', actual
    assert '11个汉字' in actual[0]['detail'], actual
