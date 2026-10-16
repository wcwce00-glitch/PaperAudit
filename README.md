# PaperAudit Web v0.5.0-preview (candidate)

> Free, open-source, browser-local manuscript checks; not a journal compliance certification.

**Release status:** v0.5.0-preview is under review in [PR #3](https://github.com/wcwce00-glitch/PaperAudit/pulls/3). The published Pages website stays on the currently approved version until review and merge.

**Live website: https://wcwce00-glitch.github.io/PaperAudit/**

# PaperAudit Web (Beta 0.4.1)

[简体中文说明](README_zh.md)

**A local-first, no-login, browser-based manuscript pre-submission checker.**

PaperAudit Web checks ordinary figure/table numbering, literal in-text cross-references, bracket-numbered citations, and embedded PNG/JPEG effective PPI in a DOCX file. It also inspects PNG/JPEG dimensions. All user files are processed locally in the browser and are not sent to a server.

**This is an early beta and not a journal compliance certification.** Neither false positives nor false negatives can be ruled out. Word fields, advanced numbering, vector graphics, external drawings, PDFs, TIFF and formula validation are not comprehensively supported.

## Try the currently published website

The live website at `https://wcwce00-glitch.github.io/PaperAudit/` remains the stable deployed build until this preview is accepted and merged.

## v0.5.0-preview changes under review

- Parse Transitional and Strict OOXML WordprocessingML, including `styles.xml` and `numbering.xml`.
- Keep template requirements paired with source text, filename/paragraph provenance, observed value, review status and recommendation.
- Offer general discipline/language preflight profiles when no template is supplied.
- Offer an explicit opt-in WebLLM/Qwen browser-local candidate extraction experiment; AI candidates remain review-only.

## Try the currently published website

The live website at `https://wcwce00-glitch.github.io/PaperAudit/` remains the stable deployed build until this preview is accepted and merged.

## Try it now — no installation or account

Open the **[live PaperAudit website](https://wcwce00-glitch.github.io/PaperAudit/)**, click **使用示例论文体验** to try the synthetic sample, or choose a `.docx` manuscript (PNG/JPEG images are also supported). Select the checks and effective-PPI threshold, press **开始检查**, and optionally download an HTML or JSON report.

The site is published with GitHub Pages. The public URL is https://wcwce00-glitch.github.io/PaperAudit/.

## Local development

Because browsers normally block JavaScript modules at `file://` URLs, start a *static* server:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/. Python is only needed for local development; visitors to the published website do **not** need Python or any software installation.

## Deployment and search indexing

The live site is deployed by the verified GitHub Actions workflow. Changes pushed to `main` run the tests before the Pages deployment. The site publishes a `robots.txt` and `sitemap.xml` to help search engines discover the homepage; search engines decide independently when to crawl and index it.

`pages.yml` uses official `configure-pages`, `upload-pages-artifact`, and `deploy-pages` actions. No server/database/API key is needed. If your organization or account restricts GitHub Pages, adjust your repository settings accordingly.

## Security and privacy

- No telemetry, accounts, uploads, external JavaScript CDNs or cloud/AI requests.
- Bundled JSZip (MIT/GPLv3 dual license) parses Word's ZIP container. See `vendor/JSZip-LICENSE.md`.
- Hard limit of 30 MB per uploaded file, and explicit safeguards for DOCX expanded content.
- Text is displayed with DOM `textContent` and escaped in the generated standalone HTML report to prevent injecting document HTML.
- The example file is synthetic. Never upload unpublished or confidential research papers to a *public repository* or CI pipeline. Ordinary use of the published app keeps the user-selected document in their browser.
- A static frontend cannot guarantee absolutely against malicious browser extensions or compromised hosting infrastructure; audit the open-source code when processing sensitive documents.

## Main design limitations

- Paragraph numbers are based on the OOXML paragraph sequence, **not page numbers**.
- Basic numeric captions only (not robust chapter-specific, SEQ/REF, caption templates or complex subfigures).
- Basic `[1]`, `[1, 3]`, `[1–4]` references; can misclassify numeric bracket expressions in scientific prose.
- Embedded raster images are checked only when a valid image and width in OOXML can be resolved. Independent images are reported as **unverified** for effective PPI without display width.
- The UI's initial `300 PPI` is a configurable **example**, not a universal requirement.
- A report without warnings means *nothing detected by enabled heuristics*, not journal or scientific approval.

## Future enhancements

Structured citation formats, configurable journal templates, reliable Word field handling, inline Word add-in and optional browser extension. Contributions and reproducible bug reports welcome.

## License

Project source: MIT (`LICENSE`). Bundled JSZip: see `vendor/JSZip-LICENSE.md`.

## Optional journal-template comparison (v0.3)

Provide a DOCX / DOTX template (or text-based author guidelines in TXT / MD) alongside your manuscript. PaperAudit can compare explicitly recorded page dimensions/margins and Normal font settings, review common named sections and extract candidate instructions. A small number of explicit, mechanically checkable word/character limits may also be checked. **This does not verify all journal requirements or establish that the uploaded template is official.** The offline HTML report preserves text excerpts with paragraph provenance and marks unverified rules.

Without a template, filter the manually curated directory of official author-resource links by discipline and language (Chinese/English). These are entry pages, **not guaranteed direct template downloads or journal rankings**. Always follow the latest target-journal Author Guidelines.

Try with `examples/sample_manuscript.docx` and `examples/DEMO_NOT_OFFICIAL_template.docx` (fictional demo, not a real journal template). The site works entirely in the browser, with no manuscript upload endpoint. Development tests: `python -m pytest tests -q` with Playwright Chromium installed.

---

## v0.4.0: Personal template collection + reviewed contributions

Users can explicitly save a selected DOCX/DOTX/TXT/MD template to the **personal browser library** (IndexedDB, SHA-256 keyed, local only), then reuse or delete it. The default upload-for-analysis path **does not** save or publish files. Local browser storage may be cleared, and the same library is not shared across devices.

The **community directory** is curated, not an automatic file-upload service. Users can voluntarily export a JSON submission with journal metadata, source URL, version, language and licensing information. The current Issue Form target is `wcwce00-glitch/PaperAudit` in `js/community.js`. The repository must exist with Issues enabled before the public button works. GitHub Issue Forms are **not** automatically filled from the local metadata: users copy relevant details into the form; the JSON export is a local reference copy.

Only approved, source-reviewed entries from `data/approved-catalog.json` appear in the public directory after maintainer review and a merged PR. The default contribution contains **metadata and an official link only, not any document bytes**. Check source, manuscript type, submission phase, date and redistribution rights; avoid mirroring proprietary publisher files. GitHub Pages has no writable backend and cannot directly accept/review public template binaries. See `data/README.md` for the approved catalog schema, and run `node scripts/validate_catalog.mjs` to check catalog structure.

Browser tests include 16 legacy paper-audit checks and 5 additional library/submission UI checks. The additional five use a mocked IndexedDB/WebCrypto adapter because the test environment blocks all HTTP and file-navigation, including localhost; real HTTPS-origin persistence and GitHub Issues flows still require acceptance tests after deployment.


## Deployment verification (v0.4.1)

- `python -m pytest tests -q` runs legacy harness tests **and** a real HTTP ES Module smoke test. The live test must pass in GitHub Actions before Pages deployment.
- `python scripts/build_site.py` stages a safe static artifact under `dist/site`. Only this directory is published.
- Public journal submissions go through GitHub Issue Forms; users need a GitHub account. Copy fields manually; downloaded JSON is not automatically imported into the Issue Form.
- The browser applies a 10-file limit, 30 MB per file, and 80 MB combined for all selected papers/images plus the optional template.
