# Repository instructions for coding agents

## Project purpose
PaperAudit is a static, browser-local preflight checker for Word research manuscripts. It is not a publisher validator, plagiarism detector, or scientific reviewer.

## Non-negotiable privacy rules
- Never commit or upload user-submitted manuscripts, publisher templates, personal information, extracted private text, or private audit reports.
- Public test fixtures and CI logs must use synthetic documents only.
- Do not print document text, file metadata containing personal data, or entire parsed audit objects in CI output.
- Normal checks are local. The optional WebLLM experiment downloads its runtime/model from third-party static hosts after explicit user consent; state this boundary accurately.

## Correctness rules
- Prefer OOXML styles/numbering semantics over visible-text-only heuristics.
- Support Transitional and Strict WordprocessingML namespace URIs.
- Keep rule source text, filename/paragraph provenance, observed value, status, evidence, and recommendation together.
- If evidence is insufficient, return `review`. Never label a rule as a confirmed violation just because a value could not be parsed.
- A green result means only that enabled checks did not detect a supported problem.
- AI-extracted rules are candidates for human review and can never directly create confirmed violations.

## Before a pull request
1. Run JavaScript syntax checks and `node scripts/validate_catalog.mjs`.
2. Run `python -m pytest tests -q` using synthetic fixtures.
3. Run `python scripts/build_site.py`.
4. If changing WebLLM, run the optional real model workflow where a suitable WebGPU adapter is available; report exact failure stage if not.
5. Inspect the diff for private data and misleading claims.

Do not merge a PR or publish a release unless explicitly authorized by the repository owner.
