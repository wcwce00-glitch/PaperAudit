# PaperAudit — Privacy-first DOCX preflight for research papers

[![CI](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[Live demo](https://wcwce00-glitch.github.io/PaperAudit/) · [简体中文](README_zh.md) · [Report a bug](https://github.com/wcwce00-glitch/PaperAudit/issues/new)

**A free, open-source, no-install browser tool for checking Word manuscripts before submission.**

PaperAudit helps researchers catch common DOCX preflight problems: figure/table labels and references, bracket-numbered citations, embedded raster-image effective PPI, and selected template requirements. It generates a standalone HTML or JSON report. It is a preflight assistant—not a publisher's validator, plagiarism detector, or scientific reviewer.

> **Current release vs. preview:** The public website is still the approved stable build on `main`. The v0.5.0 semantic OOXML upgrade is under review in [Pull Request #3](https://github.com/wcwce00-glitch/PaperAudit/pulls/3); it is not released until the PR is reviewed and merged.

## Try it in your browser

**[Open PaperAudit](https://wcwce00-glitch.github.io/PaperAudit/)** — no account, server setup, or software installation required for normal checks. Use the built-in synthetic example first, then try a copy of a DOCX you are allowed to process.

## What it checks

- **DOCX structure:** common figure/table captions, textual cross-references, and bracket-numbered references.
- **Image quality hints:** effective PPI for supported embedded PNG/JPEG images when Word provides usable display dimensions.
- **Template comparison (v0.5 preview):** Strict and Transitional OOXML parsing, candidate requirements with source provenance, observed values, judgement and recommendations.
- **Safer uncertainty:** checks that cannot be verified reliably should be marked for review—not presented as confirmed violations.
- **Portable reports:** export results to standalone HTML or JSON for offline review.

## Privacy by default

- Normal audits run in your browser; manuscript files are not uploaded to a PaperAudit server.
- There is no telemetry or account system in the app.
- The optional WebLLM experiment is **off by default**. When explicitly enabled, the browser downloads a runtime and model from third-party hosts; model inference is intended to run locally, but those asset hosts will receive ordinary download requests. AI-generated requirements remain suggestions for human review.
- The public CI suite uses synthetic test documents only. Never commit unpublished papers, private templates, personal data, reports, or excerpts to a public repository.

## Quick start for contributors

```bash
git clone https://github.com/wcwce00-glitch/PaperAudit.git
cd PaperAudit
python -m http.server 8000
```

Open `http://localhost:8000/`. Browsers typically block JavaScript ES modules when the page is opened directly from `file://`. Python is for local development only; public users open the hosted website.

For tests and contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md). The semantic v0.5 preview has synthetic DOCX regression tests and a separately triggered, expensive WebLLM smoke test.

## Known limitations

PaperAudit does not certify journal compliance. Complex SEQ/REF fields, chapter-specific numbering, all citation styles, vector/linked artwork, equations, PDF/LaTeX sources, visual figure placement, and every local-format override are not fully verified. A report with no warnings means only that enabled checks did not find a supported issue; it does not mean the manuscript is submission-ready.

## Contribute or give feedback

Reproducible bug reports, synthetic DOCX regression cases, accessibility feedback, and improvements to the rule engine are welcome. See the [roadmap](docs/roadmap.md), [contribution guide](CONTRIBUTING.md), [good first issues](https://github.com/wcwce00-glitch/PaperAudit/labels/good%20first%20issue), and [open issues](https://github.com/wcwce00-glitch/PaperAudit/issues). Software citation metadata is available in [CITATION.cff](CITATION.cff).

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

- No telemetry, accounts, or PaperAudit upload service. The optional WebLLM experiment described above downloads static runtime/model assets only after explicit consent.
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
