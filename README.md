# PaperAudit — Privacy-first DOCX preflight for research papers

[![CI](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[Try the live demo](https://wcwce00-glitch.github.io/PaperAudit/)** · [FAQ](https://wcwce00-glitch.github.io/PaperAudit/#faq) · [简体中文](README_zh.md) · [Report a bug](https://github.com/wcwce00-glitch/PaperAudit/issues/new) · [Visibility & sharing guide](docs/visibility-and-sharing.md)

PaperAudit is a free, open-source, browser-based preflight assistant for Word research manuscripts. It helps catch common figure/table caption and cross-reference issues, basic bracket-numbered citations, supported embedded PNG/JPEG effective PPI, and selected template requirements. It exports standalone HTML or JSON reports.

> **Release status:** The v0.5.0 preview is live. When a target DOCX/DOTX template is uploaded, PaperAudit uses the readable template layout and paragraph styles as a comparison baseline and checks supported explicit requirements. Complex local overrides, final visual placement, and natural-language instructions without a reliable checker remain review-only; template extraction alone is not proof that every requirement passed.

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

Template comparison is deliberately evidence-bounded. It compares measurable page settings and matched paragraph-style properties, plus a small set of explicit machine-checkable instructions. It does **not** guarantee pixel-perfect reproduction of a Word template or full interpretation of every natural-language clause. Direct formatting, complex sections, floating objects, table internals, fields, and final visual placement may require manual review. A list of extracted instructions is not proof that every instruction was checked.

## What it can and cannot tell you

PaperAudit is a preflight assistant, **not** a journal-compliance certification, plagiarism detector, scientific reviewer, or guarantee of acceptance. A clean report only means enabled checks did not identify a supported issue.

Known limitations include complex Word SEQ/REF fields and automatic numbering, chapter-specific caption schemes, all citation styles, vector or linked artwork, equations, PDF/LaTeX sources, visual figure placement, and every local-format override. Effective PPI can be calculated only when a supported embedded raster image and its Word display dimensions can be resolved. A 300-PPI threshold is an editable example, not a universal journal requirement. Always follow the target venue's latest official author instructions.

Uploaded templates are not automatically authenticated as official or current. Natural-language requirements may be extracted as candidates but still need a human to check wording and applicability. The fictional `examples/DEMO_NOT_OFFICIAL_template.docx` is for testing only and must not be used for a real submission.

## Real-template validation

The browser CI includes an opt-in end-to-end test enabled in GitHub Actions. It downloads an official public university DOCX template (UC Irvine first, Cornell as a fallback), makes a temporary copy with a deliberate quarter-inch left-margin change, uploads the original as the template and the changed copy as the manuscript, and checks the exported JSON for a confirmed, actionable mismatch with both values. The source DOCX and modified copy are temporary CI inputs; they are not committed to the repository. This validates a real-world DOCX package and the complete browser/report flow, not every clause of a university's formatting manual or a complete thesis submission.

See the [validation procedure and source links](docs/public-template-validation.md). Public downloads can change, so the workflow logs the source it actually validated; synthetic fixtures remain the deterministic regression baseline.

## Help more researchers discover PaperAudit

- [Try the live app](https://wcwce00-glitch.github.io/PaperAudit/) with a non-sensitive DOCX and your target template.
- If it helps your workflow, **star this repository** so other researchers can discover it.
- Share the demo with lab mates, graduate-writing groups, librarians, and research-support staff who help people prepare submissions.
- Found a false positive or missed template rule? [Open a focused issue](https://github.com/wcwce00-glitch/PaperAudit/issues/new) with the template's public source link, rule wording, and a synthetic reproduction. Do not attach unpublished manuscripts or private documents.

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
