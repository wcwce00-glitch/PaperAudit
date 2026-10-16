"""Opt-in real WebLLM inference smoke test. Uses synthetic Strict OOXML only.

CI explicitly opts in. Failing WebGPU/CSP/model download must be reported; no mock
inference is used and no user/private files are read or logged.
"""
from __future__ import annotations
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json, os, re, shutil
import pytest
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from test_v050_semantics import fake_docx

ROOT=Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

@pytest.fixture(scope="module")
def site():
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(QuietHandler,directory=str(ROOT)))
    thread=Thread(target=server.serve_forever,daemon=True)
    thread.start()
    try: yield f"http://127.0.0.1:{server.server_port}/"
    finally: server.shutdown();server.server_close();thread.join(timeout=5)

def test_real_webllm_load_and_candidate_extraction(site,tmp_path):
    if os.environ.get("PAPERAUDIT_RUN_WEBLLM_SMOKE")!="1":
        pytest.skip("Set PAPERAUDIT_RUN_WEBLLM_SMOKE=1 to download and run the real local model.")
    with sync_playwright() as pw:
        executable=shutil.which("chromium") or shutil.which("google-chrome")
        browser=pw.chromium.launch(
            headless=True,
            **({"executable_path":executable} if executable else {}),
            args=[
                "--no-sandbox",
                "--enable-unsafe-webgpu",
                "--use-vulkan=swiftshader",
                "--enable-features=Vulkan",
                "--disable-dev-shm-usage",
            ],
        )
        page=browser.new_page(accept_downloads=True,viewport={"width":1280,"height":900})
        page.set_default_timeout(15000)
        page.on("pageerror",lambda e: None)
        page.goto(site,wait_until="networkidle",timeout=30000)
        gpu=page.evaluate("""async () => {
          if (!navigator.gpu) return {available:false,reason:"navigator.gpu is absent"};
          try { const a=await navigator.gpu.requestAdapter(); return {available:!!a,reason:a?"adapter available":"requestAdapter returned null",features:a?[...a.features]:[]}; }
          catch(e){return {available:false,reason:String(e)};}
        }""")
        assert gpu["available"],"GitHub Actions Chromium cannot create WebGPU adapter: "+str(gpu)
        typ="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        synthetic=fake_docx(strict=True)
        page.locator("#template-input").set_input_files({"name":"synthetic-strict-template.docx","mimeType":typ,"buffer":synthetic})
        page.locator("#ai-consent").check()
        page.locator("#run-local-ai").click()
        status=page.locator("#ai-status")
        try:
            page.wait_for_function("""() => {
              const s=document.querySelector('#ai-status')?.textContent||'';
              return s.includes('本地 AI 提议')||s.includes('AI 暂不可用');
            }""",timeout=900000,polling=1000)
        except PlaywrightTimeoutError:
            pytest.fail("WebLLM model load/inference timed out. Status: "+status.inner_text()[:350])
        state=status.inner_text()
        assert state.startswith("本地 AI 提议"),"Real WebLLM model load or inference failed: "+state[:500]
        m=re.search(r"本地 AI 提议\s+(\d+)\s+条",state)
        assert m and int(m.group(1))>=1,"Model loaded but did not extract a verbatim candidate from the synthetic requirements."
        page.locator("#file-input").set_input_files({"name":"synthetic.docx","mimeType":typ,"buffer":fake_docx()})
        page.locator("#run-audit").click()
        page.locator("#results").wait_for(state="visible",timeout=30000)
        with page.expect_download() as download: page.locator("#save-json").click()
        result=json.loads(Path(download.value.path()).read_text(encoding="utf-8"))
        ai_rows=[r for r in result["rulesAudit"]["requirements"] if str(r.get("id","")).startswith("AI-")]
        assert ai_rows,"AI suggestions were not carried into the subsequent requirement report."
        assert all(r["status"]=="review" for r in ai_rows),"AI candidates must remain review-only, never a confirmed violation."
        assert all(r.get("originalText") and r.get("sourceFile") for r in ai_rows),"AI suggestions must retain candidate text and source provenance."
        assert not any("word/document.xml" in str(r) for r in ai_rows),"No private DOCX internals may be logged or exported."
        browser.close()
