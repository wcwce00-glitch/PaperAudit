/** Conservative, local-only template comparison. The uploaded document is NOT presumed to be official. */
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NS_LIST=[NS,'http://purl.oclc.org/ooxml/wordprocessingml/main'];
const LIMIT=30*1024*1024, ZIP_LIMIT=120*1024*1024, XML_LIMIT=20*1024*1024;
const TERMS=/(?:必须|须|应当|不得|不超过|不少于|至少|至多|请(?:务必|按照|提供|注明)|必须包括|\bmust\b|\brequired\b|\bshould\b|\bno more than\b|\bat least\b|\bmaximum\b|\bminimum\b)/i;
const SECTION_KEYS={abstract:/^(?:摘\s*要|abstract)(?:\s*[:：]|\s*$)/i,keywords:/^(?:关\s*键\s*词|key\s*words|keywords)(?:\s*[:：]|\s*$)/i,references:/^(?:参\s*考\s*文\s*献|references|bibliography)\s*$/i};
const SECTION_LABELS={abstract:'摘要 / Abstract',keywords:'关键词 / Keywords',references:'参考文献 / References'};
function nodes(el,tag){return el?[...el.getElementsByTagNameNS('*',tag)].filter(n=>NS_LIST.includes(n.namespaceURI)):[];}
function val(el,name){
 if(!el)return null;
 for(const a of [...el.attributes])if(a.localName===name&&(!a.namespaceURI||NS_LIST.includes(a.namespaceURI)))return a.value||null;
 return el.getAttributeNS(NS,name)||el.getAttribute(`w:${name}`)||el.getAttribute(name)||null;
}
function xmlParse(str,filename){const doc=new DOMParser().parseFromString(str,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error(`${filename} 无法解析 XML`);return doc;}
async function openDocx(file){
  if(file.size>LIMIT)throw Error('模板或论文不能超过 30 MB');
  // Avoid decompressing all entries for CRC before checking archive size metadata.
  const zip=await JSZip.loadAsync(await file.arrayBuffer(),{checkCRC32:false});
  let expanded=0;for(const entry of Object.values(zip.files)){if(!entry.dir){expanded+=entry?._data?.uncompressedSize||0;if(expanded>ZIP_LIMIT)throw Error('压缩包展开后的总大小超过安全限制');}}
  const fileXml=zip.file('word/document.xml');if(!fileXml)throw Error('文件不是有效的 DOCX');
  if(fileXml?._data?.uncompressedSize>XML_LIMIT)throw Error('正文 XML 过大');
  const doc=xmlParse(await fileXml.async('string'),'document.xml');
  const stylesFile=zip.file('word/styles.xml');
  const styles=stylesFile&&stylesFile?._data?.uncompressedSize<XML_LIMIT?xmlParse(await stylesFile.async('string'),'styles.xml'):null;
  return {doc,styles};
}
function paras(doc){
  const body=nodes(doc,'body')[0];if(!body)throw Error('文档缺少正文');
  return nodes(body,'p').map((p,i)=>({index:i+1,text:nodes(p,'t').map(x=>x.textContent||'').join('').trim(),style:val(nodes(p,'pStyle')[0],'val')||''}));
}
function layout(doc){
  const sections=nodes(doc,'sectPr');if(!sections.length)return null;
  const sec=sections[sections.length-1],sz=nodes(sec,'pgSz')[0],margin=nodes(sec,'pgMar')[0];
  if(!sz||!margin)return null;
  const number=(node,key)=>{const n=Number(val(node,key));return Number.isFinite(n)&&n>0?n:null;};
  const out={width:number(sz,'w'),height:number(sz,'h'),top:number(margin,'top'),bottom:number(margin,'bottom'),left:number(margin,'left'),right:number(margin,'right')};
  return Object.values(out).some(v=>v===null)?null:out;
}
function defaults(styles){
  if(!styles)return null;
  const docDefaults=nodes(styles,'docDefaults')[0];
  let rpr=docDefaults?nodes(docDefaults,'rPr')[0]:null;
  const normal=nodes(styles,'style').find(x=>val(x,'styleId')==='Normal');
  if(normal){const nr=nodes(normal,'rPr')[0];if(nr)rpr=nr;}
  if(!rpr)return null;
  const sz=nodes(rpr,'sz')[0],font=nodes(rpr,'rFonts')[0];
  const half=Number(val(sz,'val'));
  return {pt:Number.isFinite(half)&&half>0?half/2:null,font:val(font,'ascii')||val(font,'eastAsia')||null};
}
function sectionMatches(list){const found=new Set();for(const p of list){for(const [k,rx] of Object.entries(SECTION_KEYS))if(rx.test(p.text))found.add(k);}return found;}
function findRequirements(list){const seen=new Set(),items=[];
  for(const p of list){
    const line=p.text.replace(/\s+/g,' ').trim();
    if(line.length<8||line.length>500||!TERMS.test(line))continue;
    if(seen.has(line))continue;seen.add(line);items.push({location:`段落 ${p.index}`,text:line});
    if(items.length>=24)break;
  }
  return items;
}
function findSectionsExplicitlyRequired(requirements){
  // A section is mandatory only when the words EXPLICITLY require that section's existence.
  // "摘要必须包括方法" constrains the abstract's CONTENT; it does not certify a required heading.
  const required=new Set();
  const labels={abstract:'(?:摘\\s*要|abstract)',keywords:'(?:关\\s*键\\s*词|keywords)',references:'(?:参\\s*考\\s*文\\s*献|references)'};
  for(const entry of requirements){const s=entry.text;
    for(const [k,label] of Object.entries(labels)){
      const after=new RegExp(`(?:必须|须|应当|must|are\\s+required\\s+to)\\s*(?:包含|包括|提供|列出|设置|有|include|contain|provide)\\s*(?:中英文|中文|英文|an?\\s+)?\\s*${label}`,'i');
      const before=new RegExp(`${label}\\s*(?:为必需|必不可少|是必需|is required|are required)`,'i');
      if(after.test(s)||before.test(s))required.add(k);
    }
  }
  return required;
}

function explicitAbstractLimits(requirements){
  const limits=[];
  for(const note of requirements){
    const line=note.text;
    // Only direct numerical limits in an explicit instruction sentence are actionable.
    const chinese=/(?:中文)?摘要.{0,25}?(?:不得超过|不超过|至多|最多)\s*(\d{2,4})\s*(?:个)?字/.exec(line);
    if(chinese)limits.push({language:'zh',limit:Number(chinese[1]),source:note});
    const english=/\babstract\b.{0,40}?(?:must not exceed|no more than|not exceed|maximum of|at most)\s*(\d{2,4})\s*words\b/i.exec(line);
    if(english)limits.push({language:'en',limit:Number(english[1]),source:note});
  }
  return limits;
}
function extractAbstract(paragraphs,lang){
  const heading=lang==='zh'?/^(?:摘\s*要)(?:\s*[:：]\s*(.*))?$/i:/^(?:Abstract)(?:\s*[:：]\s*(.*))?$/i;
  let start=-1,inline='';
  for(let i=0;i<paragraphs.length;i++){
    const match=heading.exec(paragraphs[i].text);
    if(match){start=i;inline=(match[1]||'').trim();break;}
  }
  if(start===-1)return null;
  if(inline)return inline;
  const lines=[];
  for(let i=start+1;i<Math.min(start+5,paragraphs.length);i++){
    const p=paragraphs[i],t=p.text;
    if(/^(?:关键词|key\s*words?|references|参考文献|引言|introduction)\b/i.test(t)||/^\s*\d+(?:\.\d+)*\s+/.test(t)||/^(?:Heading|标题)[1-9]$/.test(p.style))break;
    if(t)lines.push(t);
  }
  return lines.length?lines.join(' '):null;
}
function checkExplicitAbstractLimits(requirements,manuscriptParas,manuscriptName,result){
  for(const constraint of explicitAbstractLimits(requirements)){
    const value=extractAbstract(manuscriptParas,constraint.language);
    if(value===null){warn(result,'unverified','TEMPLATE-ABSTRACT-COUNT-UNVERIFIED','摘要字数限制无法自动核对',manuscriptName,`模板或指南写有“${constraint.source.text}”，但未可靠提取对应语言的摘要正文。`,'在 Word 中选中完整摘要核对长度和投稿阶段要求。');continue;}
    const count=constraint.language==='zh'?(value.match(/[\p{Script=Han}]/gu)||[]).length:(value.trim().match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)||[]).length;
    if(count>constraint.limit)warn(result,'warning','TEMPLATE-ABSTRACT-LIMIT','摘要长度超过明确给出的模板限制',manuscriptName,`按当前支持的计数规则统计 ${count}${constraint.language==='zh'?' 个汉字':' 个词'}；上传材料明确写出的上限为 ${constraint.limit}。来自：${constraint.source.location}。`,'核对作者指南是否按字符、单词或其他方式计数，并缩减摘要。');
  }
}
function mm(v){return (v/1440*25.4).toFixed(1);}
function warn(result,level,code,title,location,detail,advice){result.findings.push({level,code,title,location,detail,advice});}
export function supportedTemplate(file){return !!file&&/\.(?:docx|dotx|txt|md)$/i.test(file.name);}

/** Compares a user-supplied template only where the available evidence supports a comparison. */
export async function inspectTemplateAgainstManuscripts(templateFile,manuscriptFiles,result){
  if(!supportedTemplate(templateFile))throw Error('模板只支持 .docx、.dotx、.txt、.md');
  if(templateFile.size>LIMIT)throw Error('模板超过 30 MB');
  const isDocx=/\.(?:docx|dotx)$/i.test(templateFile.name);
  let tplParas=[],tplLayout=null,tplDefaults=null;
  if(isDocx){const parsed=await openDocx(templateFile);tplParas=paras(parsed.doc);tplLayout=layout(parsed.doc);tplDefaults=defaults(parsed.styles);}
  else{const text=await templateFile.text();if(text.length>XML_LIMIT)throw Error('指南文本太大');tplParas=text.split(/\r?\n/).map((t,i)=>({index:i+1,text:t.trim(),style:''}));}
  const sections=sectionMatches(tplParas),requirements=findRequirements(tplParas),strictSections=findSectionsExplicitlyRequired(requirements);
  result.template={name:templateFile.name,kind:isDocx?'用户上传的 DOCX 模板':'用户上传的指南文本',verifiedOfficial:false,
    layout:tplLayout,defaults:tplDefaults,sectionsRecognized:[...sections].map(x=>SECTION_LABELS[x]),
    candidateInstructions:requirements,statement:'仅比较可解析的结构信息；未确认该模板来自目标期刊，也不能据此认证投稿合规。'};
  result.coverage.templateInstructions=requirements.length;
  for(const note of requirements.slice(0,8))warn(result,'unverified','TEMPLATE-INSTRUCTION','模板/指南中发现待核实的写作要求',`${templateFile.name} · ${note.location}`,note.text,'确认这项说明对你的稿件类型和当前投稿阶段是否适用；需要人工核对具体内容。');
  if(requirements.length>8)warn(result,'unverified','TEMPLATE-INSTRUCTION-MORE','另有模板要求未逐项展开',templateFile.name,`共识别 ${requirements.length} 条候选要求；报告的“模板来源”部分保留全部摘录。`,'请查阅官方作者指南逐项核对，不能认为这些要求已自动通过。');
  if(!isDocx)warn(result,'unverified','TEMPLATE-NO-LAYOUT','纯文本指南无法提供 Word 排版参照',templateFile.name,'已读取文字说明，但没有页面大小、页边距和 Word 样式信息。','上传对应 DOCX 模板以进行页面和样式比较。');
  if(manuscriptFiles.length===0){warn(result,'unverified','TEMPLATE-NO-DOCX','没有用于对照的 DOCX 论文',templateFile.name,'本次仅提取了模板结构和候选写作说明。','请同时添加一篇 .docx 论文。');return result;}
  for(const manuscriptFile of manuscriptFiles){
    let parsed;
    try{parsed=await openDocx(manuscriptFile);}catch(e){warn(result,'unverified','TEMPLATE-COMPARE-SKIPPED','论文无法进行模板比较',manuscriptFile.name,String(e?.message||e),'修复 DOCX 文件后重试。');continue;}
    const manuscriptParas=paras(parsed.doc),mSections=sectionMatches(manuscriptParas),mLayout=layout(parsed.doc),mDefaults=defaults(parsed.styles);
    checkExplicitAbstractLimits(requirements,manuscriptParas,manuscriptFile.name,result);
    if(tplLayout&&mLayout){
      for(const [label,key] of [['纸张宽度','width'],['纸张高度','height'],['上页边距','top'],['下页边距','bottom'],['左页边距','left'],['右页边距','right']]){
        const t=tplLayout[key],m=mLayout[key];if(t!==null&&m!==null&&Math.abs(t-m)>80){
          warn(result,'warning','TEMPLATE-PAGE',`${label}与上传模板不同`,manuscriptFile.name,`论文 ${mm(m)} mm；模板 ${mm(t)} mm。所比对的是 DOCX 可解析的末节页面设置。`,'若确认为适用的期刊格式，核对 Word 页面设置；模板也可能包含示例或不同分节配置。');
        }
      }
    }else if(tplLayout)warn(result,'unverified','TEMPLATE-PAGE-NO-DATA','页面设置无法完整对比',manuscriptFile.name,'至少一份 DOCX 缺少可解析的页面设置。','在 Word 中确认纸张和页边距。');
    if(tplDefaults&&mDefaults){
      if(tplDefaults.pt&&mDefaults.pt&&Math.abs(tplDefaults.pt-mDefaults.pt)>0.4)warn(result,'warning','TEMPLATE-BASE-FONTSIZE','默认正文字号可能与模板不同',manuscriptFile.name,`论文默认 ${mDefaults.pt} pt；模板默认 ${tplDefaults.pt} pt。比较的是 DOCX 默认/Normal 样式，不代表所有段落实际字号。`,'检查 Word 正文样式；手动覆盖样式的段落需另行检查。');
      if(tplDefaults.font&&mDefaults.font&&tplDefaults.font.toLowerCase()!==mDefaults.font.toLowerCase())warn(result,'unverified','TEMPLATE-BASE-FONT','默认字体与模板不同，需人工确认',manuscriptFile.name,`论文默认字体：${mDefaults.font}；模板默认字体：${tplDefaults.font}。仅比较显式的 Normal 样式，未检查所有文字的实际字体。`,'检查中英文字体、主题字体与局部覆盖样式。');
    }
    for(const k of strictSections){if(!mSections.has(k))warn(result,'warning','TEMPLATE-REQUIRED-SECTION',`未识别到模板明确要求的${SECTION_LABELS[k]}`,manuscriptFile.name,`上传的材料含“必须包含/提供”该部分的显式文字要求，但未在论文中识别到常见的${SECTION_LABELS[k]}标题。`,'确认该要求是否适用，并检查是否采用了其他名称、随投稿系统单独上传或被 Word 域隐藏。');}
    for(const k of sections){if(!strictSections.has(k)&&!mSections.has(k))warn(result,'unverified','TEMPLATE-SECTION-SUGGESTION',`模板包含${SECTION_LABELS[k]}，论文未识别到`,manuscriptFile.name,`模板中发现此结构，但不能仅凭示例判断它是该期刊必须提交的独立部分。`,'阅读作者指南确认是否必需。');}
  }
  return result;
}
