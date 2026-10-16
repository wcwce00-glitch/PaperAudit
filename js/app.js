import { inspectFiles, supported } from './audit.js';
import {createRulesAudit} from './rules-engine.js';
import {PROFILES} from './standards.js';
import {suggestRequirementsWithLocalAI} from './ai-local.js';
import { makeHTML, exportFile } from './report.js';
import { inspectTemplateAgainstManuscripts, supportedTemplate } from './template.js';
import { selectResources, setApprovedResources } from './catalog.js';
import { saveLocalTemplate, listLocalTemplates, getLocalTemplate, removeLocalTemplate } from './library.js';
import { SUBMISSION_REPOSITORY, validateContribution, makeIssueUrl, loadApprovedCatalog } from './community.js';
const el=id=>document.getElementById(id);
let files=[],lastResult=null,templateFile=null,aiSuggestions=[];
const profileSelect=el('profile-select');
for(const profile of PROFILES){const o=document.createElement('option');o.value=profile.id;o.textContent=profile.name;profileSelect.append(o);}
profileSelect.value='general-en';
const MAX_FILES=10,MAX_TOTAL=80*1024*1024,MAX_SINGLE=30*1024*1024;
function fileFingerprint(f){return `${f.name}/${f.size}/${f.lastModified||0}`;}
function checkSelection(candidate, others=files){
  if(candidate.size===0)return '不接受空文件';
  if(candidate.size>MAX_SINGLE)return '单个文件不能超过 30 MB';
  if(others.length+1>MAX_FILES)return `最多选择 ${MAX_FILES} 个论文/图片文件`;
  const combined=others.reduce((n,f)=>n+f.size,0)+candidate.size+(templateFile?.size||0);
  if(combined>MAX_TOTAL)return '全部文件（含模板）合计不能超过 80 MB';
  return null;
}
const zone=el('drop-zone'),fileInput=el('file-input'),filesEl=el('file-list');
function sizeString(b){return b>=1024*1024?(b/1024/1024).toFixed(2)+' MB':(b/1024).toFixed(1)+' KB';}
function refresh(){
  filesEl.replaceChildren();
  if(!files.length){const msg=document.createElement('div');msg.className='file-placeholder';msg.textContent='尚未选择文件。可以先试用下方的示例。';filesEl.append(msg);}
  files.forEach((f,i)=>{const row=document.createElement('div');row.className='file-chip';const icon=document.createElement('span');icon.textContent=/\.docx$/i.test(f.name)?'▣':'▧';const name=document.createElement('b');name.textContent=f.name;const small=document.createElement('small');small.textContent=sizeString(f.size);const remove=document.createElement('button');remove.textContent='移除';remove.type='button';remove.setAttribute('aria-label',`移除 ${f.name}`);remove.addEventListener('click',()=>{files.splice(i,1);refresh();});row.append(icon,name,small,remove);filesEl.append(row);});
  el('run-audit').disabled=!files.length;
  el('status').textContent=files.length?`已选择 ${files.length} 个文件，点击“开始检查”`:'等待添加文件';
}
function receive(list){
  const incoming=[...list].filter(supported);
  if(!incoming.length){el('status').textContent='未找到可用文件：请使用 DOCX、PNG 或 JPG';return;}
  const errors=[];
  for(const f of incoming){
    if(files.some(x=>fileFingerprint(x)===fileFingerprint(f))){errors.push(`${f.name}：已存在相同文件`);continue;}
    const error=checkSelection(f);
    if(error){errors.push(`${f.name}：${error}`);continue;}
    files.push(f);
  }
  refresh();el('results').hidden=true;
  if(errors.length)el('status').textContent=errors.join('；').slice(0,480);
}
zone.addEventListener('click',()=>fileInput.click());
zone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fileInput.click();}});
el('choose-file').addEventListener('click',e=>{e.stopPropagation();fileInput.click();});
fileInput.addEventListener('change',()=>{receive(fileInput.files);fileInput.value='';});
for(const ev of ['dragenter','dragover'])zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('drag');});
zone.addEventListener('dragleave',()=>zone.classList.remove('drag'));
zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag');receive(e.dataTransfer.files);});
el('load-sample').addEventListener('click',async()=>{
  el('status').textContent='正在载入示例……';
  try {const res=await fetch('examples/sample_manuscript.docx');if(!res.ok)throw Error(`HTTP ${res.status}`);const data=await res.blob();receive([new File([data],'sample_manuscript.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})]);}
  catch(err){el('status').textContent=`无法加载示例，请通过网站地址访问：${err.message}`;}
});
function render(result){
  el('results').hidden=false;
  el('report-file').textContent=result.files.map(f=>f.name).join('、');
  el('count-total').textContent=result.findings.length;
  el('count-warning').textContent=result.findings.filter(x=>x.level==='warning').length;
  el('count-unverified').textContent=result.findings.filter(x=>x.level==='unverified').length;
  el('count-images').textContent=result.coverage.imagesChecked;
  el('coverage').textContent=`已扫描 ${result.coverage.filesScanned} 个文件 · 识别 ${result.coverage.paragraphs} 个段落 · 图题 ${result.coverage.figCaptions} · 表题 ${result.coverage.tableCaptions} · 可解析图片 ${result.coverage.imagesChecked}。${result.template?`模板：${result.template.name}（未核验权威性）；候选文字要求 ${result.coverage.templateInstructions||0} 条。`:'尚未上传期刊模板；本次是通用检查。'}检测为启发式规则，不能替代人工审阅。`;
  document.querySelectorAll('.filter').forEach(b=>{b.classList.toggle('active',b.dataset.filter==='all');});
  renderFindings(result,'all');
  renderRequirements(result.rulesAudit);
  el('results').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderRequirements(audit){
  const area=el('requirements-panel'),target=el('requirements-list');
  if(!area||!target)return;
  target.replaceChildren();area.hidden=!audit;
  if(!audit)return;
  el('requirements-summary').textContent='审核依据：'+audit.name+'。来源说明：'+audit.source+'。共 '+audit.stats.total+' 条：已核查符合 '+audit.stats.pass+'，确认不符 '+audit.stats.fail+'，待核验 '+audit.stats.review+'。无法可靠判断的项目不会被报告为违规。';
  for(const rule of audit.requirements){
    const item=document.createElement('article');item.className='requirement-item';
    const head=document.createElement('div');head.className='rq-head';
    const title=document.createElement('h4');title.textContent=rule.id+' · '+rule.title;
    const tag=document.createElement('span');tag.className='rq-pill '+rule.status;tag.textContent=rule.status==='pass'?'已核查 · 符合':rule.status==='fail'?'有证据支持不符':'待核验';
    head.append(title,tag);
    const original=document.createElement('p');original.textContent='规则原文：'+(rule.originalText||rule.text||'');
    const source=document.createElement('div');source.className='rq-source';source.textContent='来源：'+(rule.sourceFile||rule.source||'未注明')+(rule.sourceParagraph?' · 第 '+rule.sourceParagraph+' 段':'');
    const actual=document.createElement('p');actual.className='rq-result';actual.textContent='实际检测值：'+(rule.actualValue||rule.detail||'未执行可靠的自动检测');
    const evidence=document.createElement('p');evidence.className='rq-source';evidence.textContent='判断依据：'+(rule.evidence||'当前检测器没有足够证据确认合规或违规。');
    const advice=document.createElement('p');advice.className='rq-advice';advice.textContent='修改建议：'+(rule.recommendation||rule.action||'人工核对原文及适用条件；待核验不等于违规。');
    item.append(head,original,source,actual,evidence,advice);target.append(item);
  }
}
function renderFindings(result,filter){
  const container=el('findings');container.replaceChildren();
  const list=result.findings.filter(f=>filter==='all'||f.level===filter);
  if(!list.length){const div=document.createElement('div');div.className='empty-findings';div.textContent='此分类暂无发现。请记住，未报警不代表所有投稿要求均已验证。';container.append(div);return;}
  for(const finding of list){
    const item=document.createElement('div');item.className='finding';
    const dot=document.createElement('div');dot.className=`finding-dot ${finding.level}`;
    const body=document.createElement('div');body.className='finding-body';
    const title=document.createElement('div');title.className='finding-title';title.textContent=finding.title;
    const meta=document.createElement('div');meta.className='finding-meta';meta.textContent=`${finding.location} · ${finding.code} · ${finding.level==='warning'?'需要关注':'人工确认'}`;
    const explain=document.createElement('p');explain.className='finding-explain';explain.textContent=finding.detail;
    const advice=document.createElement('div');advice.className='finding-advice';advice.textContent='建议：'+finding.advice;
    body.append(title,meta,explain,advice);item.append(dot,body);container.append(item);
  }
}
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(lastResult)renderFindings(lastResult,b.dataset.filter);
}));
const templateInput=el('template-input');
el('choose-template').addEventListener('click',()=>templateInput.click());
templateInput.addEventListener('change',()=>{
  const f=templateInput.files?.[0];templateInput.value='';
  if(!f)return;
  if(!supportedTemplate(f)){el('template-info').textContent='格式不支持：请使用 DOCX、TXT 或 MD';return;}
  if(f.size===0 || f.size>MAX_SINGLE){el('template-info').textContent='模板必须非空且不超过 30 MB';return;}
  if(files.reduce((n,x)=>n+x.size,0)+f.size>MAX_TOTAL){el('template-info').textContent='论文/图片与模板总计不能超过 80 MB';return;}
  templateFile=f;aiSuggestions=[];el('template-info').textContent=`已选择：${f.name}（仅在浏览器本地分析）`;
  el('remove-template').hidden=false;el('save-local-template').disabled=false;
});
el('remove-template').addEventListener('click',()=>{templateFile=null;el('template-info').textContent='未选择模板：仍可使用下方的官方投稿资源目录';el('remove-template').hidden=true;el('save-local-template').disabled=true;});
function renderCatalog(){
  const entries=selectResources(el('discipline').value,el('journal-language').value);
  const container=el('journal-results');container.replaceChildren();
  if(!entries.length){const empty=document.createElement('p');empty.textContent='此筛选条件下暂未收录已核验的官方入口；可以选择其他学科，或自行打开目标期刊官网的作者指南。';container.append(empty);return;}
  for(const j of entries){
    const card=document.createElement('article');card.className='journal-card';
    const label=document.createElement('span');label.className='journal-kind';label.textContent=j.kind;
    const title=document.createElement('strong');title.textContent=j.name;
    const desc=document.createElement('p');desc.textContent=j.desc;
    const link=document.createElement('a');link.href=j.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='打开官方入口 ↗';
    if(j.provenance==='community')card.classList.add('community-card');
    card.append(label,title,desc,link);container.append(card);
  }
}
for(const id of ['discipline','journal-language'])el(id).addEventListener('change',renderCatalog);
renderCatalog();
loadApprovedCatalog().then(entries=>{setApprovedResources(entries);renderCatalog();}).catch(()=>{
  // The bundled official directory works offline and when opened from file://.
});
function selectedMeta(){return {journal:el('share-journal').value,discipline:el('share-discipline').value,
  language:el('share-language').value,version:el('share-version').value,sourceUrl:el('share-source').value};}
function showLibraryStatus(message){el('library-status').textContent=message;}
function addText(parent,tag,value,className){const e=document.createElement(tag);if(className)e.className=className;e.textContent=value;parent.append(e);return e;}
async function renderLocalLibrary(){
  const container=el('library-list');container.replaceChildren();
  try {
    const records=await listLocalTemplates();
    if(!records.length){addText(container,'p','还没有收藏的模板。先选择上面的模板，再填写期刊名称并点击“保存”。','muted');return;}
    for(const item of records){
      const row=document.createElement('div');row.className='local-template-row';
      const info=document.createElement('div');info.className='info';addText(info,'strong',item.journal+' · '+item.filename);
      addText(info,'small',`${item.version||'版本未注明'} · ${new Date(item.savedAt).toLocaleDateString()} · 仅存于本设备浏览器`);
      const controls=document.createElement('div');controls.className='actions';
      const use=addText(controls,'button','用于本次对照');use.type='button';
      use.addEventListener('click',async()=>{
        try{const record=await getLocalTemplate(item.id);if(!record)throw Error('模板记录不存在');
          const savedFile=new File([record.blob],record.filename,{type:record.mimeType});
          if(savedFile.size>MAX_SINGLE || files.reduce((n,x)=>n+x.size,0)+savedFile.size>MAX_TOTAL)throw Error('该模板超出本次文件大小限制');
          templateFile=savedFile;
          el('template-info').textContent=`已从本地库选择：${record.filename}`;
          el('remove-template').hidden=false;el('save-local-template').disabled=false;
          el('share-journal').value=record.journal;el('share-discipline').value=record.discipline;
          el('share-language').value=record.language;el('share-version').value=record.version;
          el('share-source').value=record.sourceUrl||'';
          showLibraryStatus('已选入当前检查，可以和论文一起运行模板对照。');
          el('template-check').scrollIntoView({behavior:'smooth',block:'center'});
        }catch(error){showLibraryStatus('读取失败：'+error.message);}
      });
      const remove=addText(controls,'button','删除本地收藏','remove-btn');remove.type='button';
      remove.addEventListener('click',async()=>{
        if(!window.confirm(`从当前浏览器移除“${item.journal}”模板？不可撤销。`))return;
        try{await removeLocalTemplate(item.id);await renderLocalLibrary();showLibraryStatus('已从当前浏览器删除，不影响公共目录。');}
        catch(error){showLibraryStatus('删除失败：'+error.message);}
      });
      row.append(info,controls);container.append(row);
    }
  }catch(error){addText(container,'p','本地模板库不可用：'+error.message+'。可继续临时上传模板检查。','muted');}
}
el('save-local-template').addEventListener('click',async()=>{
  if(!templateFile){showLibraryStatus('先选择 DOCX/DOTX/TXT/MD 模板文件');return;}
  const button=el('save-local-template');button.disabled=true;
  try{await saveLocalTemplate(templateFile,selectedMeta());await renderLocalLibrary();
    showLibraryStatus('已保存到此浏览器；未发送到任何服务器，也未加入公共目录。');}
  catch(error){showLibraryStatus('收藏失败：'+error.message);}
  finally{button.disabled=!templateFile;}
});
function contribution(){return validateContribution({...selectedMeta(),rights:el('share-rights').value,
  permissionNote:el('share-permission').value,note:el('share-note').value,
  confirmed:el('share-confirm').checked});}
el('submit-metadata').addEventListener('click',()=>{
  try{const payload=contribution();exportFile(JSON.stringify(payload,null,2),'PaperAudit-template-submission.json','application/json;charset=utf-8');
    el('submission-status').textContent='已导出待审投稿 JSON；没有上传原始模板。审核后才可能进入公共目录。';}
  catch(err){el('submission-status').textContent='无法生成投稿信息：'+err.message;}
});
el('open-submission').addEventListener('click',()=>{
  try {const payload=contribution(),url=makeIssueUrl(payload);
    if(!url){el('submission-status').textContent='尚未配置本项目的 GitHub 仓库；先导出投稿 JSON，待仓库上线后再提交。';return;}
    window.open(url,'_blank','noopener,noreferrer');
    el('submission-status').textContent='已打开 GitHub 投稿表单；请在 GitHub 上填写元数据并亲自提交。不会自动上传论文或模板文件。';
  }catch(err){el('submission-status').textContent='投稿准备失败：'+err.message;}
});
renderLocalLibrary();
el('run-local-ai').addEventListener('click',async()=>{
  const state=el('ai-status'),button=el('run-local-ai');
  if(!templateFile){state.textContent='请先上传期刊模板或指南；通用预检不需要 AI。';return;}
  if(!el('ai-consent').checked){state.textContent='请先勾选同意加载浏览器本地模型（需要从外部下载运行组件与模型权重）。';return;}
  button.disabled=true;
  try{
    let text='';
    if(/\.(?:txt|md)$/i.test(templateFile.name))text=await templateFile.text();
    else{
      const {parseDocxModel}=await import('./docx-model.js');
      const model=await parseDocxModel(templateFile);
      text=model.paragraphs.map(p=>p.text).filter(Boolean).join('\n');
    }
    aiSuggestions=await suggestRequirementsWithLocalAI(text.slice(0,30000),msg=>state.textContent=msg);
    state.textContent='本地 AI 提议 '+aiSuggestions.length+' 条候选要求。请重新运行检查；所有 AI 条目仍标记为待核验。';
  }catch(err){state.textContent='AI 暂不可用：'+String(err.message||err)+'。基础检查不受影响。';}
  finally{button.disabled=false;}
});
el('run-audit').addEventListener('click',async()=>{
  if(!files.length)return;
  const ppi=Number(el('ppi').value);
  if(!Number.isFinite(ppi)||ppi<50||ppi>1200){el('status').textContent='请输入 50–1200 之间的 PPI 阈值';return;}
  const button=el('run-audit');button.disabled=true;button.textContent='正在检查，请稍候……';el('status').textContent='文件仅在浏览器本地处理';
  try {await new Promise(r=>setTimeout(r,30));lastResult=await inspectFiles(files,{captions:el('check-captions').checked,citations:el('check-citations').checked,images:el('check-images').checked,ppi});
    const docxFile=files.find(f=>/\.docx$/i.test(f.name));
    const docxInspectionFailed=docxFile&&lastResult.findings.some(x=>x.code==='FILE-ERROR'&&x.location===docxFile.name);
    if(docxFile&&!docxInspectionFailed){
      // The semantic parser supplies authoritative *counts* from styles/numbering.xml.
      // Suppress only legacy textual heuristics that conflict with that parsed model.
      const legacyCodes=new Set(['HEADING-GAP','CAP-DUPLICATE','CAP-GAP','REF-NOT-FOUND','CITE-SECTION-MISSING','CITE-NOT-FOUND','CITE-DUPLICATE','FIELDS-UNVERIFIED']);
      lastResult.findings=lastResult.findings.filter(x=>!legacyCodes.has(x.code));
      try{
        const audit=await createRulesAudit(docxFile,{templateFile,profileId:profileSelect.value,aiSuggestions});
        lastResult.rulesAudit={name:audit.name,source:audit.source,requirements:audit.requirements,stats:audit.stats};
        lastResult.coverage.templateInstructions=audit.stats.total;
        lastResult.template={name:audit.name,kind:templateFile?'用户上传模板 / 指南':'内置通用规则包',verifiedOfficial:false,candidateInstructions:audit.requirements.map(x=>({location:x.source,text:x.originalText||x.text})),statement:audit.source};
        // Only the conservative rules engine may issue a confirmed mismatch.
        for(const rule of audit.requirements.filter(x=>x.status==='fail')){
          lastResult.findings.push({level:'warning',code:'RULE-'+rule.id,title:'有证据支持不符：'+rule.title,location:rule.sourceFile||rule.source,detail:rule.actualValue||rule.detail,evidence:rule.evidence,advice:rule.recommendation||rule.action||'按原始要求人工核对并修改。'});
        }
      }catch(err){
        lastResult.findings.push({level:'unverified',code:'RULES-ERROR',title:'逐项规则分析待核验',location:templateFile?templateFile.name:'内置预检',detail:String(err.message||err),advice:'基础检查结果仍有效；分析失败不代表论文违反任何规则。'});
      }
    }
    render(lastResult);el('status').textContent=`检查完成：${lastResult.findings.length} 个需关注或待确认事项`;}catch(err){el('status').textContent=`检查失败：${err.message}`;}
  finally{button.disabled=false;button.innerHTML='再次检查 <span>↗</span>';}
});
el('save-html').addEventListener('click',()=>{if(lastResult)exportFile(makeHTML(lastResult),'PaperAudit-report.html','text/html;charset=utf-8');});
el('save-json').addEventListener('click',()=>{if(lastResult)exportFile(JSON.stringify(lastResult,null,2),'PaperAudit-report.json','application/json;charset=utf-8');});
refresh();
