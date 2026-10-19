# Public-document validation recipe

This is a reproducible manual acceptance test using public university templates. The source documents are linked rather than copied into this repository; only synthetic regression fixtures belong in CI.

## Public source documents

1. **UC Irvine Libraries — Thesis/Dissertation Formatting Manual (2026)**  
   https://guides.lib.uci.edu/gradmanual/templates  
   The page offers Word templates for a master's thesis and dissertation, plus an annotated Word example. Use the downloadable **Accessible Master's Thesis Template 2025** as the baseline. The annotated example is useful as a parser stress test, not as a guaranteed perfectly compliant manuscript.
2. **Cornell Graduate School — thesis/dissertation templates**  
   https://gradschool.cornell.edu/academic-progress/degrees-fields/research-degree-requirements/thesis-dissertation/templates/  
   Cornell describes the linked Word templates as complying with its formatting requirements. The currently linked dissertation introduction is a smaller supplementary test, not a full manuscript.
3. **IEEE Author Center — conference templates**  
   https://conferences.ieeeauthorcenter.ieee.org/write-your-paper/authoring-tools-and-templates/  
   Official IEEE Word templates are useful for checking two-column layouts and author instructions. Some linked legacy template files are .DOC rather than .DOCX; PaperAudit currently parses DOCX/DOTX, so convert a permitted copy to DOCX before testing.

## Acceptance test steps

1. Download the UCI thesis template from the official page and keep the untouched file as the **template**.
2. Make a separate local copy for the **manuscript**. In Word, deliberately change the left margin, paper size, and one clearly named paragraph style's font size. Save as DOCX. Do not overwrite the original template.
3. Open the hosted PaperAudit app: https://wcwce00-glitch.github.io/PaperAudit/
4. Upload the modified copy as the manuscript and the untouched UCI template as the template.
5. Verify the report gives an explicit failure for each measurable mismatch, shows both template and manuscript values, and gives a repair instruction. A mismatch should not be downgraded to generic “manual review”.
6. Restore the manuscript copy to the template settings and run the check again. Those particular properties should pass; any remaining review item must explain what data could not be read and why.
7. Repeat with the Cornell template, then use the UCI annotated example as a robustness test. Do not treat annotations or differences between template versions as proven violations without checking applicability.

## What CI can prove

Automated CI uses synthetic DOCX fixtures to make expected values deterministic and to avoid uploading or committing real unpublished research. The public-template procedure adds real-world DOCX coverage, but it must be run separately because university files can change and external downloads are not stable CI dependencies. A public source document is a test input, not proof that every rule in it has been implemented.
