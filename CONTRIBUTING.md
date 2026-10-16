# Contributing to PaperAudit

Thank you for helping improve a privacy-first research manuscript preflight checker.

## Before opening an issue or pull request

- Reproduce defects with the built-in synthetic example or create a new **synthetic** DOCX fixture.
- Never attach unpublished papers, private author guidelines, personal information, private audit reports, or excerpts from confidential documents.
- Include the browser/OS, enabled checks, expected-versus-actual behavior, and reproducible steps.
- PaperAudit is a preflight assistant—not a publisher compliance certification.

## Local development

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`. Browsers normally block JavaScript ES modules from `file://`.

## Checks before a pull request

```bash
for src in js/*.js scripts/*.mjs; do node --check "$src"; done
node scripts/validate_catalog.mjs
python -m pytest tests -q
python scripts/build_site.py
```

Browser tests require Playwright Chromium. The real WebLLM test is intentionally separate from routine pull-request CI because it downloads model weights and compiles WebGPU shaders. Use the manually triggered **Optional WebLLM hardware smoke test** workflow when checking that experiment on compatible hardware. Do not replace real inference with a mock or call an uncompleted run successful.

## Rules-engine expectations

- Keep rule text verbatim and record source filename/paragraph wherever possible.
- A rule that cannot be reliably checked must remain `review`; missing evidence is not a confirmed violation.
- Cover both Strict and Transitional OOXML and prefer Word styles/automatic numbering over visible-text-only heuristics.
- Add synthetic regression tests for changes that could create false positives or missed detections.
- Never print manuscript text or personal metadata in CI logs; never commit private documents or reports.

## Pull request checklist

- [ ] The change is focused and described.
- [ ] Deterministic tests and browser regressions pass.
- [ ] New DOCX cases are synthetic and license-safe.
- [ ] Unsupported cases and remaining uncertainty are documented.
- [ ] Privacy statements match actual network behavior.
- [ ] User-facing wording does not imply official publisher approval.
