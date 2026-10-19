# Changelog

## Unreleased — Template-first audit UI
- Remove the supplemental checkbox / custom image-PPI panel from the main workflow.
- Make uploaded journal templates the controlling source for the primary report; run generic preflight only when no template is supplied.
- Keep unsupported or ambiguous template clauses marked for human review rather than assuming they passed.


## v0.5.0-preview — Strict OOXML semantics and traceable requirements (published 2026-10-18)
- Read Word styles and automatic numbering definitions from DOCX, including Transitional and Strict WordprocessingML namespaces.
- Prefer semantic numbering over visible-text-only heuristics for figure captions, table captions and bracket-numbered references; downgrade uncertain cases to review instead of confirmed violations.
- Add built-in language/discipline preflight profiles for use without an uploaded template. These are community-maintained generic checks, not official journal rules.
- Add per-requirement source text, file/paragraph provenance, observed value, evidence, judgement and recommendation to on-screen and downloadable reports.
- Add opt-in browser-local WebLLM/Qwen candidate extraction; candidates are source-checked and always remain review-only.
- Add synthetic Strict OOXML and HTTP integration tests.
- Separate the expensive real WebLLM test into a manually triggered workflow so software-WebGPU shader timeouts do not block deterministic PR checks. Actual model inference remains an experimental, not yet validated capability in the available CI runner.
- Add a post-deploy smoke check for the semantic modules, WebLLM CSP configuration, robots.txt and sitemap.xml.
- Published preview deployment: https://wcwce00-glitch.github.io/PaperAudit/ .

## Template-driven comparison follow-up (PR #6)
- Wire the existing template-to-manuscript comparison module into the main audit action.
- Compare supported template page settings, explicit required sections and abstract limits against each selected manuscript.
- Add measurable template-versus-manuscript paragraph style comparisons and report the observed values and source provenance.
- Keep uncertain cases in review-only status; template text extraction alone is not treated as a completed format check.
- Regression tests use synthetic DOCX fixtures only; no private manuscripts, templates, or extracted text are committed or sent to CI.

## v0.4.1 — pre-release hardening
- Aligned analysis report version with website version.
- Limited combined file count and total selected bytes.
- Switched public contributions to GitHub Issue Forms.
- Added maintainers' documentation and reporting templates.
- Added real HTTP/ES Module browser smoke tests (requires CI environment allowing localhost traffic).
- Made GitHub Pages deployment depend on passing tests and publish only staged website assets.

## v0.4.0
- Personal template library and curated community catalog initial release.
