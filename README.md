# PaperAudit — Privacy-first DOCX preflight for research papers

[![CI](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[Try the live demo](https://wcwce00-glitch.github.io/PaperAudit/)** · [FAQ](https://wcwce00-glitch.github.io/PaperAudit/#faq) · [简体中文](README_zh.md) · [Report a bug](https://github.com/wcwce00-glitch/PaperAudit/issues/new) · [Visibility & sharing guide](docs/visibility-and-sharing.md)

PaperAudit is a free, open-source, browser-based preflight assistant for Word research manuscripts. It helps catch common figure/table caption and cross-reference issues, basic bracket-numbered citations, supported embedded PNG/JPEG effective PPI, and selected template requirements. It exports standalone HTML or JSON reports.

> **Release status:** The public website remains on the approved `main` build. The v0.5.0 Strict OOXML and source-traceable rules upgrade is under review in [PR #3](https://github.com/wcwce00-glitch/PaperAudit/pull/3) and is not released until that PR is reviewed and merged.

## Why use it?

- **Browser-local by default.** Normal document analysis runs in the browser; PaperAudit has no manuscript upload service, account system, or telemetry.
- **Template checks with provenance (v0.5.0 preview).** The preview is designed to show the source text, source location, observed value, judgement, and recommendation for each requirement.
- **Conservative handling of uncertainty.** When a check cannot be reliably verified, it should be marked for review rather than presented as a confirmed violation.
- **Portable reports.** Export HTML for offline reading or JSON for further processing.
- **Useful without a template.** Built-in generic preflight profiles offer baseline checks; they are not official rules for any specific journal.

## Try it

1. Open the [hosted app](https://wcwce00-glitch.github.io/PaperAudit/).
2. Choose **Use sample manuscript** to try the synthetic example, or select a DOCX you are allowed to process.
3. Optionally add a DOCX/DOTX template or a TXT/MD version of author instructions.
4. Select the checks and set an image-PPI threshold appropriate to your target venue.
5. Review the findings and download an HTML or JSON report.

The app does not require an account or installation. For local development, run `python -m http.server 8000` from the repository root and open `http://localhost:8000/`; browsers may block ES modules when opening the page directly from `file://`.

## Privacy and the optional AI experiment

- Normal audits run locally in the browser. Documents are not uploaded to a PaperAudit server.
- Public CI uses synthetic test documents only. Never commit unpublished manuscripts, private templates, personal data, reports, or extracted text to a public issue, pull request, repository, or CI log.
- The optional WebLLM/Qwen candidate-extraction path is **off by default and experimental**. When explicitly enabled, the browser downloads runtime/model assets from third-party hosts. Real inference has **not yet passed** the available hosted CI software-WebGPU smoke test. AI-extracted requirements remain suggestions for human review, not confirmed rules.

## What it can and cannot tell you

PaperAudit is a preflight assistant, **not** a journal-compliance certification, plagiarism detector, scientific reviewer, or guarantee of acceptance. A clean report only means enabled checks did not identify a supported issue.

Known limitations include complex Word SEQ/REF fields and automatic numbering, chapter-specific caption schemes, all citation styles, vector or linked artwork, equations, PDF/LaTeX sources, visual figure placement, and every local-format override. Effective PPI can be calculated only when a supported embedded raster image and its Word display dimensions can be resolved. A 300-PPI threshold is an editable example, not a universal journal requirement. Always follow the target venue's latest official author instructions.

Uploaded templates are not automatically authenticated as official or current. Natural-language requirements may be extracted as candidates but still need a human to check wording and applicability. The fictional `examples/DEMO_NOT_OFFICIAL_template.docx` is for testing only and must not be used for a real submission.

## Development and tests

Install Python 3 and a compatible browser test environment, then run:

```bash
python -m http.server 8000
python -m pytest tests -q
python scripts/build_site.py
```

The browser test suite and packaging command are exercised in GitHub Actions. The optional real WebLLM test is intentionally separated from routine PR CI because hosted software-WebGPU shader initialization can time out; see the manual [WebLLM smoke workflow](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/webllm-smoke.yml). This limitation is documented rather than reported as a passing inference test.

## Contribute

Reproducible bugs, synthetic DOCX regression cases, accessibility feedback, and cross-browser test reports are welcome.

- Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [roadmap](docs/roadmap.md).
- Browse [good first issues](https://github.com/wcwce00-glitch/PaperAudit/labels/good%20first%20issue) or [all open issues](https://github.com/wcwce00-glitch/PaperAudit/issues).
- For vulnerabilities, follow [SECURITY.md](SECURITY.md) if present; do not publish private research material to demonstrate a bug.
- Software citation metadata is in [CITATION.cff](CITATION.cff).

## Community template directory

The public directory lists curated official resource links and reviewed community submissions; it does not automatically host user-uploaded template files. The browser's personal template library is stored in that browser's local storage. Community submissions are metadata/source-link proposals and require maintainer review before appearing in the public catalog. Check source, version, applicable manuscript type, and redistribution permissions before contributing. See [data/README.md](data/README.md).

## Deployment and discovery

GitHub Pages deploys only from a verified push to `main`, after CI passes. The repository includes `robots.txt` and `sitemap.xml` to help crawlers discover the site, but indexing and search ranking are controlled by search engines and are not immediate or guaranteed.

## License

The project is licensed under the MIT License. The bundled JSZip library retains its own dual-license terms; see [vendor/JSZip-LICENSE.md](vendor/JSZip-LICENSE.md).
