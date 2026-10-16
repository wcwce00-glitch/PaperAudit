"""Isolated browser tests for template-library UI and contribution validation.

The CI/browser sandbox disallows HTTP/file navigation, so these tests inject an
in-memory IndexedDB/WebCrypto adapter into about:blank. They test UI logic and
state; persistence on actual HTTPS origins must also be verified on deployment.
"""
from __future__ import annotations
import json
import re
import shutil
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright
from test_browser import browser_html

ROOT=Path(__file__).resolve().parents[1]
MOCK_STORAGE_JS=r'''
(() => {
 const values=new Map();
 const store={
  put(value){values.set(value.id,value);return emit(value.id)},
  get(key){return emit(values.get(key))},
  getAll(){return emit([...values.values()])},
  delete(key){values.delete(key);return emit(undefined)}
 };
 function emit(value){const request={result:value,error:null};setTimeout(()=>request.onsuccess?.(),0);return request;}
 const db={objectStoreNames:{contains(){return true}},objectStore(){return store},
  transaction(){return {objectStore(){return store}}},close(){}};
 Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){
  const request={result:db,error:null};setTimeout(()=>request.onsuccess?.(),0);return request;
 }}});
 Object.defineProperty(window.crypto,'subtle',{configurable:true,value:{digest:async(_algorithm,buffer)=>{
   // Deterministic testing adapter only, NOT production SHA-256.
   const input=new Uint8Array(buffer),out=new Uint8Array(32);
   for(let i=0;i<input.length;i++)out[i%32]=(out[i%32]+input[i]+i)%256;
   return out.buffer;
 }}});
 window.__testRecords=values;
})();
'''

@pytest.fixture(scope='module')
def chromium():
    with sync_playwright() as pw:
        executable=shutil.which('chromium') or shutil.which('google-chrome')
        browser=pw.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox'])
        yield browser
        browser.close()

@pytest.fixture
def page(chromium):
    p=chromium.new_page(accept_downloads=True)
    errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.set_content(browser_html())
    p.add_script_tag(content=MOCK_STORAGE_JS)
    p.add_script_tag(path=str(ROOT/'vendor/jszip.min.js'))
    for name in ['docx-model.js','standards.js','audit.js','report.js','template.js','catalog.js','library.js','community.js','rules-engine.js','ai-local.js','app.js']:
        code=(ROOT/'js'/name).read_text(encoding='utf8')
        code=re.sub(r'^import .*?;\s*$', '', code, flags=re.M)
        code=code.replace('export async function ','async function ').replace('export function ','function ').replace('export const ','const ')
        if name=='template.js':
            code='(function(){\n'+code+'\nwindow.inspectTemplateAgainstManuscripts=inspectTemplateAgainstManuscripts;window.supportedTemplate=supportedTemplate;})()'
        if name=='catalog.js':
            code='(function(){\n'+code+'\nwindow.selectResources=selectResources;window.setApprovedResources=setApprovedResources;})()'
        p.add_script_tag(content=code)
    yield p
    assert not errors,errors
    p.close()

def select_and_name(page):
    page.locator('#template-input').set_input_files(str(ROOT/'examples/DEMO_NOT_OFFICIAL_template.docx'))
    page.locator('#share-journal').fill('Example Journal')
    page.locator('#share-discipline').select_option('physics')
    page.locator('#share-language').select_option('en')
    page.locator('#share-version').fill('2026')


def test_local_library_saves_reuses_and_deletes(page):
    select_and_name(page)
    page.locator('#save-local-template').click()
    page.wait_for_function("document.querySelector('#library-status').textContent.includes('已保存')")
    assert page.locator('.local-template-row').count()==1
    assert page.evaluate('window.__testRecords.size')==1
    page.locator('#remove-template').click()
    page.locator('.local-template-row button').filter(has_text='用于本次对照').click()
    page.wait_for_function("document.querySelector('#template-info').textContent.includes('已从本地库选择')")
    assert page.locator('#share-journal').input_value()=='Example Journal'
    page.locator('#file-input').set_input_files(str(ROOT/'examples/sample_manuscript.docx'))
    page.locator('#run-audit').click()
    page.wait_for_function('document.querySelector("#results").hidden === false',timeout=10000)
    assert 'DEMO_NOT_OFFICIAL_template.docx' in page.locator('#coverage').inner_text()
    page.locator('#save-local-template').click()
    page.wait_for_function("document.querySelector('#library-status').textContent.includes('已保存')")
    assert page.locator('.local-template-row').count()==1 # same hash -> one entry
    page.on('dialog',lambda d:d.accept())
    page.locator('.local-template-row button').filter(has_text='删除本地收藏').click()
    page.wait_for_function("document.querySelectorAll('.local-template-row').length === 0")
    assert page.evaluate('window.__testRecords.size')==0


def test_public_submission_requires_explicit_consent_and_https(page):
    select_and_name(page)
    page.locator('#submission-details summary').click()
    page.locator('#share-source').fill('http://example.com/author-guidelines')
    page.locator('#share-confirm').check()
    page.locator('#submit-metadata').click()
    assert 'HTTPS' in page.locator('#submission-status').inner_text()
    page.locator('#share-source').fill('https://example.com/author-guidelines')
    with page.expect_download() as dl: page.locator('#submit-metadata').click()
    exported=json.loads(Path(dl.value.path()).read_text(encoding='utf8'))
    assert exported['status']=='pending_review'
    assert exported['sourceUrl']=='https://example.com/author-guidelines'
    assert 'blob' not in exported and 'filename' not in exported
    page.evaluate('window.open=(url)=>{window.__openedIssue=url;return null;}')
    page.locator('#open-submission').click()
    assert '已打开' in page.locator('#submission-status').inner_text()
    assert 'template=template-contribution.yml' in page.evaluate('window.__openedIssue')
    assert '/wcwce00-glitch/PaperAudit/issues/new?' in page.evaluate('window.__openedIssue')
    assert page.locator('.community-card').count()==0


def test_upload_does_not_automatically_collect_and_submit_needs_consent(page):
    select_and_name(page)
    assert page.locator('.local-template-row').count()==0
    assert page.evaluate('window.__testRecords.size')==0
    page.locator('#submission-details summary').click()
    page.locator('#share-source').fill('https://publisher.example.org/template')
    page.locator('#submit-metadata').click()
    assert '确认' in page.locator('#submission-status').inner_text()


def test_approved_catalog_only_and_safe_urls(page):
    # Mock the bundled catalog feed: approved entries appear, pending / unsafe do not.
    payload=[
      {'status':'approved','name':'Open Journal Example','language':'en','discipline':'optics','url':'https://publisher.example.org/guidelines','desc':'Reviewed official source'},
      {'status':'pending_review','name':'Pending Submission','language':'en','discipline':'optics','url':'https://publisher.example.org/pending'},
      {'status':'approved','name':'Bad unsafe URL','language':'en','discipline':'optics','url':'javascript:alert(1)'}]
    page.evaluate('''async payload => {
      window.fetch=async()=>({ok:true,json:async()=>payload});
      const list=await loadApprovedCatalog();setApprovedResources(list);renderCatalog();
    }''',payload)
    assert page.locator('.journal-card strong',has_text='Open Journal Example').count()==1
    assert page.locator('.journal-card strong',has_text='Pending Submission').count()==0
    assert page.locator('.journal-card strong',has_text='Bad unsafe URL').count()==0
    assert page.locator('.community-card').count()==1


def test_malicious_title_is_text_not_markup(page):
    select_and_name(page)
    page.locator('#share-journal').fill('<img src=x onerror="window.pwned=true">')
    page.locator('#save-local-template').click()
    page.wait_for_function("document.querySelectorAll('.local-template-row').length === 1")
    assert not page.evaluate('window.pwned || false')
    assert page.locator('.local-template-row img').count()==0
