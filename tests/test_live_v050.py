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
    assert p.locator('.requirement-item').count()>=2
    # Some strict-template rules (e.g. visual placement) are retained separately when not reliably machine-verifiable.
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
