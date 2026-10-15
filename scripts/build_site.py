"""Stage only the files actually required by GitHub Pages."""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'dist'/'site'
if SITE.exists(): shutil.rmtree(SITE)
SITE.mkdir(parents=True)
for name in ['index.html','robots.txt','sitemap.xml']:
    shutil.copy2(ROOT/name,SITE/name)
for directory in ['assets','js','vendor','data']:
    shutil.copytree(ROOT/directory,SITE/directory)
(SITE/'examples').mkdir()
shutil.copy2(ROOT/'examples/sample_manuscript.docx', SITE/'examples/sample_manuscript.docx')
(SITE/'.nojekyll').write_text('',encoding='utf8')
print('Website staged:', SITE)
