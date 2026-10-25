# PaperAudit — Free, open-source DOCX preflight for research papers

[![CI](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[Try the live demo](https://wcwce00-glitch.github.io/PaperAudit/)** · [Source / Star on GitHub](https://github.com/wcwce00-glitch/PaperAudit) · [Report a bug](https://github.com/wcwce00-glitch/PaperAudit/issues/new) · [简体中文](README_zh.md)

PaperAudit is a free, open-source preflight tool for researchers, graduate students, and authors preparing Word manuscripts. It requires no account or installation and processes ordinary document checks in the browser by default. It helps catch a supported subset of formatting issues before submission and exports HTML or JSON reports.

> **Try before deciding:** Open the [live demo](https://wcwce00-glitch.github.io/PaperAudit/), then choose “Use sample manuscript.” You can test the workflow without uploading your own paper. If it proves useful, a GitHub Star helps other researchers discover the project. Reproducible bug reports and practical feedback are welcome.

## Get started in three steps

1. **Open the hosted app:** [wcwce00-glitch.github.io/PaperAudit](https://wcwce00-glitch.github.io/PaperAudit/).
2. **Add a manuscript and, optionally, a target template:** Choose a DOCX manuscript. For venue-specific checks, also provide a DOCX/DOTX template or a TXT/MD copy of the author instructions.
3. **Run the audit and export a report:** Review findings and supporting evidence, then download an HTML or JSON report.

You can start with the built-in sample before selecting your own documents.

## What it checks

- **Figure/table captions and text references:** Supported caption, numbering, and cross-reference patterns.
- **Basic numeric citations:** Selected bracket-numbered citation and reference-number issues.
- **Embedded image resolution hints:** Effective PPI for supported embedded PNG/JPEG images when Word display dimensions can be resolved.
- **Template comparison:** Readable page settings, matched paragraph styles, and explicit requirements supported by current checkers.
- **Portable reports:** HTML and JSON exports for review and follow-up.

### When a template is uploaded, it should drive venue-specific checks

With a target template or author guide, checks should prioritize requirements from that file instead of treating generic rules as official journal rules. Without a template, PaperAudit uses built-in generic preflight checks. DOCX/DOTX can provide readable layout information; TXT/MD provides text requirements but not Word page-layout parameters.

**Limitations matter:** Not every Word structure or natural-language instruction can be reliably parsed. Only rules supported by a deterministic checker and sufficient evidence should receive a definitive automated pass/fail result; unsupported rules must not be misrepresented as confirmed violations or confirmed compliance. Uploading a template does not authenticate its source, version, or official status. Always perform a final check against the venue's latest official instructions.

## Privacy by design

- Ordinary document parsing and checks run in the browser. PaperAudit does not provide a manuscript-upload server or require an account.
- Never publish unpublished manuscripts, private templates, personal information, or full reports in public issues, pull requests, repositories, or CI logs.
- The optional WebLLM/Qwen candidate-extraction path is off by default and remains experimental. Enabling it downloads model/runtime assets from third-party hosts; read the in-app notice before opting in.

## Project status and contributions

The v0.5.0 preview is under active improvement. Helpful contributions include:

- synthetic DOCX regression cases that can be shared publicly (never use an unpublished real paper);
- reproducible false-positive/false-negative reports and browser compatibility findings;
- improvements to template parsing, accessibility, documentation, and onboarding;
- public official author-guide links with version information.

See [open issues](https://github.com/wcwce00-glitch/PaperAudit/issues), the [roadmap](docs/roadmap.md), and [contribution guide](CONTRIBUTING.md).

## Help more researchers find it

If PaperAudit helps with your pre-submission workflow:

- **Star the repository:** [Star PaperAudit on GitHub](https://github.com/wcwce00-glitch/PaperAudit) to help other people discover it.
- **Share the live demo:** [Send the tool to a lab mate or colleague](https://wcwce00-glitch.github.io/PaperAudit/); suggest they start with the sample.
- **Contribute actionable feedback:** [Open a reproducible issue](https://github.com/wcwce00-glitch/PaperAudit/issues/new) with browser, steps, expected behavior, and actual behavior. Do not include private manuscripts.

We do not buy stars, manipulate metrics, or claim a user base that does not exist. Adoption should come from useful functionality, reproducible tests, and consistent maintenance.

## Run locally and test

Requires Python 3 and a compatible browser test environment:

```bash
python -m http.server 8000
python -m pytest tests -q
python scripts/build_site.py
```

Open `http://localhost:8000/`. Opening the page through `file://` may prevent JavaScript modules from loading. Check the current GitHub Actions results for the latest verification status.

## License

PaperAudit is licensed under MIT. Bundled JSZip retains its own license terms; see [vendor/JSZip-LICENSE.md](vendor/JSZip-LICENSE.md).
