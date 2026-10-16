"""End-to-end test the SHIPPED index.html through a real local HTTP origin.

Set PAPERAUDIT_REQUIRE_HTTP_TESTS=1 in CI. In browser-restricted assistant sandboxes
localhost requests may be administratively blocked, but CI MUST not skip.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
import shutil
import pytest
from playwright.sync_api import sync_playwright, Error as PlaywrightError, expect

ROOT=Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

@pytest.fixture(scope='module')
def http_site():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    t=Thread(target=server.serve_forever,daemon=True);t.start()
    try: yield f'http://127.0.0.1:{server.server_port}/'
    finally: server.shutdown();server.server_close();t.join(timeout=5)

@pytest.fixture(scope='module')
def browser():
    with sync_playwright() as pw:
        executable=shutil.which('chromium') or shutil.which('google-chrome')
        browser=pw.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox'])
        yield browser
        browser.close()

@pytest.fixture
def live_page(browser,http_site):
    p=browser.new_page(accept_downloads=True)
    errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    try:
        p.goto(http_site,wait_until='networkidle',timeout=12000)
    except PlaywrightError as e:
        p.close()
        if os.environ.get('PAPERAUDIT_REQUIRE_HTTP_TESTS') == '1':
            pytest.fail('CI must run true HTTP/ES Module tests: '+str(e))
        pytest.skip('Browser local HTTP blocked in this environment: '+str(e))
    p.wait_for_selector('#run-audit',timeout=10000)
    yield p,errors
    assert errors == [], 'Real ES Module runtime failed: '+str(errors)
    p.close()

def test_actual_html_imports_es_modules_and_scans_sample(live_page):
    p,errors=live_page
    assert 'PaperAudit' in p.title()
    assert p.locator('.journal-card').count()>=7
    p.locator('#file-input').set_input_files(str(ROOT/'examples/sample_manuscript.docx'))
    p.locator('#run-audit').click()
    results = p.locator('#results')
    results.wait_for(state='visible', timeout=15000)
    titles=p.locator('.finding-title').all_inner_texts()
    assert any('有效分辨率不足' in title for title in titles), titles
    assert all(title.strip() for title in titles)
    with p.expect_download() as dl:p.locator('#save-json').click()
    import json
    output=json.loads(Path(dl.value.path()).read_text(encoding='utf8'))
    assert output['version']=='0.5.0-preview'
    assert len(output['findings'])==len(titles)
    assert output['coverage']['filesScanned'] >= 1

def test_real_browser_template_indexeddb_and_total_limit(live_page):
    p,errors=live_page
    p.locator('#template-input').set_input_files(str(ROOT/'examples/DEMO_NOT_OFFICIAL_template.docx'))
    p.locator('#share-journal').fill('Synthetic Journal')
    p.locator('#save-local-template').click()
    library_status = p.locator('#library-status')
    expect(library_status).to_contain_text('已保存', timeout=10000)
    template_rows = p.locator('.local-template-row')
    assert template_rows.count()==1
    p.reload(wait_until='networkidle')
    template_rows.first.wait_for(state='visible', timeout=10000)
    assert template_rows.count()==1
    # Reject 11 files, all real browser files, not a mocked concatenated application.
    samples=[{'name':f'figure{i}.png','mimeType':'image/png','buffer':b'png-not-important-for-selection'} for i in range(11)]
    p.locator('#file-input').set_input_files(samples)
    assert p.locator('.file-chip').count()==10
    assert '最多选择' in p.locator('#status').inner_text()
