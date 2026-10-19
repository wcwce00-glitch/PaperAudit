/* Conservative template requirement inventory. Unknown never means violated. */
import {parseDocxModel} from "./docx-model.js";
import {getProfile} from "./standards.js";
const INDICATORS=/(?:必须|应当|不得|不允许|禁止|至少|至多|不得超过|不超过|需(?:要)?|要求|宜|建议|避免|应|请|删除|\bremove\b|\bmust\b|\bshould\b|\bshall\b|\brequired\b|\bdo not\b|\bplease\b|\bavoid\b|\buse\b|\bkeep\b|\bdefine\b|\bplace\b|\bnumber\b|\bprovide\b|\bcapitalize\b|\bitalicize\b|\bspell out\b|\bdo not\b|\bno more than\b|\bat least\b|\bmaximum\b|\bminimum\b)/i;
const STRICT=/(?:必须|应当|不得|不允许|禁止|须|请勿|删除|\bmust\b|\bshall\b|\bdo not\b|\bremove\b|\bno more than\b|\bat least\b)/i;
function stable(s){return s.toLowerCase().replace(/\s+/g," ").trim();}
function splitSentences(s){
 // Split at the sentence boundary itself. Avoid "\\s*" on a zero-width
 // boundary: engines may coalesce that empty match and keep adjacent Chinese
 // instructions in one candidate.
 return s.replace(/\r/g," ").split(/(?<=[。！？;；])|(?<=\.)\s+(?=[A-Z])/).map(x=>x.trim()).filter(Boolean);
}
function classify(s){
 if(/(?:hard\s+tabs|手动制表符|制表位)/i.test(s))return {check:"tabs",params:{}};
 if(/(?:any\s+kind\s+of\s+pagination|(?:不得|禁止).{0,12}(?:页码|页码编号))/i.test(s))return {check:"pagination",params:{}};
 if(/(?:zero\s+before\s+decimal\s+points|小数点前(?:应|要|必须|加)零)/i.test(s))return {check:"decimalZero",params:{}};
 if(/(?:fig(?:ure)?\\.?\\s+captions?.{0,45}(?:below|under)|(?:图题|图片标题|插图标题).{0,20}(?:下方|下侧|下边))/i.test(s))return {check:"figurePlacement",params:{}};
 if(/(?:table\\s+(?:heads?|captions?|titles?)\\b.{0,45}(?:above|before)|(?:表题|表格标题|表头标题).{0,20}(?:上方|上侧|上边))/i.test(s))return {check:"tablePlacement",params:{}};
 if(/(?:template\s+text\s+is\s+removed|remove\s+(?:all\s+)?template\s+text|删除.{0,15}(?:模板|占位)文字)/i.test(s))return {check:"placeholder",params:{}};
 if(/(?:A4\s+paper|A4\s+paper\s+size|A4\s+纸)/i.test(s))return {check:"a4",params:{}};
 if(/(?:number\s+equations\s+consecutively|公式.{0,10}连续编号)/i.test(s))return {check:"equationNumbers",params:{}};
 const zh=/(?:摘要|Abstract).{0,40}?(?:不得超过|不超过|最多|至多)\s*(\d{2,4})\s*(字|词)/i.exec(s);
 const en=/\babstract\b.{0,60}?(?:no\s+more\s+than|at\s+most|maximum\s+of|must\s+not\s+exceed)\s*(\d{2,4})\s*words/i.exec(s);
 if(zh)return {check:"abstractLimit",params:{max:+zh[1],language:zh[2]==="词"?"en":"zh"}};
 if(en)return {check:"abstractLimit",params:{max:+en[1],language:"en"}};
 return {check:"manual",params:{}};
}
export function extractTextRequirements(paras,provenance="用户上传模板"){
 const out=[],seen=new Set();for(const p of paras){for(const sentence of splitSentences(p.text)){if(sentence.length<7||!INDICATORS.test(sentence))continue;const key=stable(sentence);if(seen.has(key))continue;seen.add(key);const kind=classify(sentence);out.push({id:"T-"+String(out.length+1).padStart(3,"0"),title:sentence.slice(0,62)+(sentence.length>62?"…":""),text:sentence,source:provenance+" · 模板第 "+p.index+" 段",sourceIndex:p.index,strength:STRICT.test(sentence)?"mandatory":"advisory",check:kind.check,params:kind.params});}}return out;
}
function result(status,detail,evidence,action){return {status,detail,actualValue:detail,evidence,action:action||""};}
function plainParagraphs(m){return m.paragraphs.filter(p=>p.text);}
function checkRule(rule,manuscript,template){
 const paras=plainParagraphs(manuscript),check=rule.check||"manual",reliable=rule.strength==="mandatory"&&!!(template&&template.isUserTemplate);
 if(check==="tabs"){const allowed=paras.filter(p=>p.hasTabs&&/(?:equation|formula|公式)/i.test(p.styleId+" "+p.styleName)),found=paras.filter(p=>p.hasTabs&&!allowed.includes(p));return found.length?result(reliable?"fail":"review","检测到 "+found.length+" 处非公式段落含手动 Tab"+(reliable?"，违反上传模板的明确禁用要求。":"，但当前来源未足以确认该要求是否强制。"),found.slice(0,8).map(p=>"段落 "+p.index+"："+p.text.slice(0,100)).join("；"),reliable?"删除这些段落中的手动 Tab，使用模板段落样式、制表位或段落缩进实现对齐；公式编号段落除外。":"先确认该要求是否适用于这份稿件；若适用，删除列出的手动 Tab 并改用段落设置。"):result("pass","未检测到非公式段落 Tab。","Word 段落结构；公式编号定位可能合理使用 Tab","无需因本项单独修改，仍请人工检查公式排版。");}
 if(check==="placeholder"){const patterns=[/XXX-X-XXXX-XXXX-X/i,/©20XX IEEE/i,/\bPaper\s+Title\s*\*?(?=\s|$|[,:;.!?])/i,/Sample of a Table footnote/i,/Insert paper title/i,/填入(?:论文|标题|作者)/],found=paras.filter(p=>patterns.some(re=>re.test(p.text)));return found.length?result(reliable?"fail":"review","识别到 "+found.length+" 处典型模板占位文字。",found.slice(0,5).map(p=>"段落 "+p.index+"："+p.text.slice(0,120)).join("；"),"核实版权占位信息是否必须保留；其他占位文字一般应删除。"):result("pass","未匹配到已知占位符模式。","仅覆盖已知模式；不保证识别全部占位内容","仍需人工通读模板中的示例文字。");}
 if(check==="a4"){const secs=manuscript.sections;if(!secs.length)return result("review","未识别到分节纸张尺寸。","DOCX sectPr","人工确认页面尺寸。");const missing=secs.some(s=>!Number.isFinite(s.widthTwip)||!Number.isFinite(s.heightTwip)),bad=secs.filter(s=>Number.isFinite(s.widthTwip)&&Number.isFinite(s.heightTwip)&&(Math.abs(s.widthTwip-11906)>45||Math.abs(s.heightTwip-16838)>45));if(missing)return result("review","部分分节纸张尺寸未读取。","Word sectPr","在 Word 中检查每个分节的页面设置。");return bad.length?result(reliable?"fail":"review",bad.length+" 个分节的纸张尺寸并非 A4。","检测到分节："+bad.map(s=>Math.round(s.widthTwip)+"×"+Math.round(s.heightTwip)+" twips").join("；"),"核对所有分节是否应使用 A4。"):result("pass","已核对 "+secs.length+" 个分节，纸张尺寸为 A4。",secs.map(s=>Math.round(s.widthTwip)+"×"+Math.round(s.heightTwip)+" twips").join("；"),"无需因页面尺寸单独修改。");}
 if(check==="decimalZero"){const found=paras.filter(p=>/(?<![\w/])\.\d+(?![\w/])/.test(p.text)&&!/(?:doi:|https?:\/\/)/i.test(p.text));return found.length?result("review","发现 "+found.length+" 处可能缺少前导零的小数，未作违规判定。",found.slice(0,5).map(p=>"段落 "+p.index+"："+p.text.slice(0,125)).join("；"),"检查数学表达式、参考文献和数字语境后再修改。"):result("pass","在可解析的普通文本中未发现明显省略前导零的小数。","正文纯文本；公式对象与图中标签未检查","无需因本项单独修改。");}
 if(check==="abstractLimit"){
  const lang=rule.params.language||"en",limit=rule.params.max;
  const head=lang==="zh"?/^(?:中文)?摘要\s*(?:[:：—–-]\s*(.*))?$/i:/^abstract\s*(?:[:：—–-]\s*(.*))?$/i;
  let start=-1,inline="";
  for(let i=0;i<paras.length;i++){const m=head.exec(paras[i].text.trim());if(m){start=i;inline=(m[1]||"").trim();break;}}
  if(start<0)return result("review","未可靠提取摘要的起始位置，无法自动统计。","未找到单独的 Abstract / 摘要标题或其后带正文的标题段。","人工确认摘要范围及计数口径。");
  const pieces=[];if(inline)pieces.push(inline);
  for(let i=start+1;i<paras.length&&i<start+13;i++){
   const p=paras[i],t=p.text.trim();
   if(/^(?:关键词|关键字|key\s*words?|index\s*terms|references|bibliography|参考文献|引言|绪论|introduction|1\s*[.]?\s+introduction)\b/i.test(t))break;
   if(/^(?:\d+(?:\.\d+)*\s+).{0,80}$/.test(t)&&/^(?:\d+(?:\.\d+)*\s+)?(?:introduction|引言|绪论|methods?|方法|materials|结果|results|讨论|discussion)\b/i.test(t))break;
   if(/^(?:heading|标题)\s*[1-3]$/i.test(p.styleName||""))break;
   if(t)pieces.push(t);
  }
  const value=pieces.join(" "),amount=lang==="zh"?(value.match(/\p{Script=Han}/gu)||[]).length:(value.match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)||[]).length;
  const unit=lang==="zh"?"个汉字":"个词";
  return amount>limit?result(reliable?"fail":"review","摘要约 "+amount+unit+"，上传的明确要求上限为 "+limit+"。","提取范围："+pieces.length+" 段；摘要内容可能包含数学、表格或特殊分词。","确认模板的适用范围与计数规则后，调整摘要长度。"):result("pass","摘要约 "+amount+unit+"，未超过模板上限 "+limit+"。","提取范围："+pieces.length+" 段；统计口径基于可解析的正文文本。","当前字数检查未发现超限；仍需按期刊对标题、关键词和符号的计数规则人工核对。");
 }
 if(check==="page")return manuscript.sections.length?result("pass","已读取 "+manuscript.sections.length+" 个分节页面设置。","Word sectPr；不代表期刊合规","无需因本项单独修改。"):result("review","无法提取有效分节信息。","DOCX sectPr","用 Word 检查页面设置。");
 if(check==="captions")return result("pass","语义解析识别图题 "+paras.filter(p=>p.captionKind==="figure").length+" 个、表题 "+paras.filter(p=>p.captionKind==="table").length+" 个。","Word 段落样式与自动编号","人工确认视觉位置与子图编号。");
 if(check==="references"){const b=paras.findIndex(p=>/^(参考文献|references|bibliography)\s*$/i.test(p.text)),n=b<0?0:paras.slice(b+1).filter(p=>p.text&&(p.category==="reference"||/^\[\d+\]\s*\S/.test(p.text))).length;return result("pass","识别参考文献区段内 "+n+" 条候选条目。","Word 样式及自动编号；不代表引文完全正确","人工抽查引用与条目一一对应。");}
 if(check==="figurePlacement"||check==="tablePlacement")return result("review","逻辑 XML 顺序不能可靠证明最终分页中的上下位置，未自动判断违规。","已解析段落与绘图对象，未计算页面视觉坐标","在 Word 或 PDF 渲染结果中人工核对图题应置于图下、表题应置于表上。");
 if(check==="equationNumbers")return result("review","当前未完整恢复所有公式对象及自动编号。","复杂公式可能位于 OMML 或 DrawingML","在 Word 中人工核对公式是否连续编号。");
 if(check==="pagination")return result("review","未完整检查页眉页脚自动页码及手工页面编号。","尚未覆盖全部 header/footer 和 PAGE 域","人工检查是否意外加入页码。");
 if(check==="styleDetail"&&template&&template.model){const key=rule.params.styleKey,ts=template.model.styleDefinitions.find(s=>s.name.toLowerCase().replace(/[^a-z0-9]/g,"")===key),ms=manuscript.styleDefinitions.find(s=>s.name.toLowerCase().replace(/[^a-z0-9]/g,"")===key);if(!ts||!ms)return result("review","论文中没有可靠匹配样式 "+key+"；可能重命名或局部覆盖。","两份 styles.xml","人工检查对应样式。");const keys=["fontSizePt","lineTwip","beforeTwip","afterTwip"],shared=keys.filter(k=>ts.props[k]!==null&&ms.props[k]!==null);if(!shared.length)return result("review","样式没有共同可比较的显式字体/间距参数。","Word 样式继承链","在 Word 中检查局部格式覆盖。");const diffs=shared.filter(k=>Math.abs(ts.props[k]-ms.props[k])>(k==="fontSizePt"?0.2:35));return diffs.length?result("review","样式 "+ts.name+" 可能有差异："+diffs.join("、")+"。未排除局部格式覆盖。","模板与论文 styles.xml 的参数对照","人工核对差异是否属于目标模板的强制要求。"):result("pass","样式 "+ts.name+" 的 "+shared.length+" 个可比较参数在当前容差内一致。","两份 styles.xml；不代表全部文本","无需因已对比参数单独修改，仍需检查局部覆盖。");}
 if(check==="styleCompare"&&template&&template.model){
  const actual=manuscript.sections||[],expected=template.model.sections||[];
  if(!actual.length||!expected.length)return result("review","至少一份文档缺少可读取的页面设置。","模板与论文的 Word sectPr","在 Word 中检查页面、页边距和分栏设置。");
  const keys=[["widthTwip","纸张宽度",45],["heightTwip","纸张高度",45],["topTwip","上页边距",80],["bottomTwip","下页边距",80],["leftTwip","左页边距",80],["rightTwip","右页边距",80],["columns","分栏数",0]];
  const sectionCountDiff=actual.length!==expected.length;
  // When section counts differ, later sections cannot be safely paired by index:
  // a legitimate landscape/table section may shift the correspondence. Compare
  // only the first section and leave the rest for review instead of false failures.
  const count=sectionCountDiff?1:actual.length,diffs=[],unknown=[];
  const format=s=>keys.map(([k,label])=>label+"="+(Number.isFinite(s[k])?(k.endsWith("Twip")?s[k]+" twips":s[k]):"无法读取")).join("；");
  for(let i=0;i<count;i++)for(const [key,label,tolerance] of keys){
   const a=actual[i][key],t=expected[i][key];
   if(!Number.isFinite(a)||!Number.isFinite(t)){unknown.push("第 "+(i+1)+" 节 "+label);continue;}
   if(Math.abs(a-t)>tolerance)diffs.push("第 "+(i+1)+" 节 "+label+"（模板 "+t+"；论文 "+a+(key.endsWith("Twip")?" twips":"")+"）");
  }
  if(diffs.length&&sectionCountDiff)return result("review","检测到可量化的页面参数差异："+diffs.join("；")+"；但分节数不同（模板 "+expected.length+"；论文 "+actual.length+"），无法可靠地按节对应，暂不将其判为确定违规。","模板："+expected.map((s,i)=>"第"+(i+1)+"节 "+format(s)).join(" | ")+"；论文："+actual.map((s,i)=>"第"+(i+1)+"节 "+format(s)).join(" | "),"请在 Word 中逐节对照模板确认纸张大小、页边距和分栏；若确认某一对应分节违反模板，再修正该节。不要仅为匹配分节数量而删除合法分节。");
  if(diffs.length)return result("fail","已确认与上传模板存在可量化的页面版式差异："+diffs.join("；"),"模板："+expected.map((s,i)=>"第"+(i+1)+"节 "+format(s)).join(" | ")+"；论文："+actual.map((s,i)=>"第"+(i+1)+"节 "+format(s)).join(" | "), "请在 Word 的“布局/页面设置”中，按差异清单逐项修正纸张大小、页边距或分栏数；保存后重新检测。");
  if(unknown.length||sectionCountDiff)return result("review","已比较 "+count+" 对分节，未发现已读取参数的明确差异，但"+(sectionCountDiff?"分节数不同（模板 "+expected.length+"；论文 "+actual.length+"）；为避免错误配对，只自动对照首节，其余分节需要逐节核验。":"部分页面参数无法可靠读取")+"，不能仅凭这一点认定格式错误。","无法读取："+(unknown.length?unknown.join("、"):"无")+"；模板 "+expected.length+" 节，论文 "+actual.length+" 节。","检查额外分节的用途及无法读取的页面参数；只有确认违反适用模板要求时才标记为错误。");
  return result("pass","已比较 "+count+" 对分节的纸张尺寸、页边距和分栏；未发现超出容差的差异。","模板："+expected.map((s,i)=>"第"+(i+1)+"节 "+format(s)).join(" | ")+"；论文："+actual.map((s,i)=>"第"+(i+1)+"节 "+format(s)).join(" | "),"当前可解析的页面参数与模板基本一致；仍需检查最终渲染和局部页面设置。");
 }
 if(check==="images")return result("review","图片 PPI 由基础检查器单独核对；矢量图和图中标签仍需人工验证。","DOCX 图像对象","核对图像清晰度和最终排版大小。");
 return result("review","已提取原文，但当前没有足够可靠的自动核验器。","规则原文；未执行可信自动判断","请依据原文逐条人工核对，不要直接认定违规。");
}

function normalizeStyle(value){return String(value||"").toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]/g,"");}
function roleForStyle(id,name){
 const n=normalizeStyle(String(id||"")+" "+String(name||""));
 if(/figurecaption|figcaption|figuretitle|图题|图注|图片说明/.test(n))return "figure-caption";
 if(/tablecaption|tablehead|表题|表头/.test(n))return "table-caption";
 if(/heading1|headingone|标题1|一级标题|sectiontitle1/.test(n))return "heading-1";
 if(/heading2|headingtwo|标题2|二级标题|sectiontitle2/.test(n))return "heading-2";
 if(/heading3|headingthree|标题3|三级标题|sectiontitle3/.test(n))return "heading-3";
 if(/abstract|摘要/.test(n))return "abstract";
 if(/keywords?|indexterms|关键词/.test(n))return "keywords";
 if(/references?|bibliography|参考文献/.test(n))return "references";
 if(/papertitle|documenttitle|论文标题|文章标题/.test(n)||/(^| )title( |$)/i.test(String(name||"")))return "title";
 if(/normal|bodytext|maintext|正文|正文文本|paragraphtext/.test(n))return "body";
 if(/caption|题注/.test(n))return "caption";
 return null;
}
function usedStyleSamples(model){
 const out=new Map();
 for(const p of model.paragraphs||[]){
  if(!p.text)continue;
  const sid=p.styleId||"",def=(model.styleDefinitions||[]).find(s=>sid&&s.id===sid);
  const name=p.styleName||def?.name||sid;
  if(!sid&&!name)continue;
  const key=sid?"id:"+normalizeStyle(sid):"name:"+normalizeStyle(name);
  if(!out.has(key))out.set(key,{id:sid,name,props:p.properties||def?.props||{},directParagraphProperties:p.directParagraphProperties||{},runOverrides:p.runOverrides||[],index:p.index,text:p.text});
 }
 return [...out.values()];
}
function displayProp(key,value,props={}){
 if(key==="fontSizePt")return Number(value).toFixed(1)+" pt";
 if(key==="lineTwip"){
  const rule=props.lineRule||"auto";
  if(rule==="auto")return (Number(value)/240).toFixed(2)+"× 行距（auto；OOXML="+value+"）";
  if(rule==="exact")return value+" twips（"+(Number(value)/20).toFixed(1)+" pt，exact）";
  if(rule==="atLeast")return "至少 "+value+" twips（"+(Number(value)/20).toFixed(1)+" pt）";
  return value+" twips（"+rule+"）";
 }
 if(["beforeTwip","afterTwip","firstLineTwip","leftTwip","rightTwip","hangingTwip"].includes(key))return value+" twips";
 if(["bold","italic","smallCaps","allCaps","strike","keepNext","keepLines","pageBreakBefore"].includes(key))return value?"是":"否";
 if(key==="alignment")return ({left:"左对齐",right:"右对齐",center:"居中",both:"两端对齐",distribute:"分散对齐",start:"起始对齐",end:"末尾对齐"}[value]||String(value));
 if(key==="outlineLevel")return "大纲级别 "+(Number(value)+1);
 if(key==="color")return String(value).toUpperCase()==="AUTO"?"自动":("#"+String(value).replace(/^#/,"").toUpperCase());
 if(key==="underline")return value==="none"?"无下划线":String(value);
 return String(value);
}
function propDifference(key,a,b,tProps={},mProps={}){
 if(a===null||a===undefined||b===null||b===undefined||a===""||b==="")return false;
 if(typeof a==="number"&&typeof b==="number"){
  let tolerance=35;
  if(key==="fontSizePt")tolerance=0.25;
  else if(key==="lineTwip")tolerance=(tProps.lineRule||"auto")==="auto"&&(mProps.lineRule||"auto")==="auto"?8:20;
  else if(key==="outlineLevel")tolerance=0;
  return Math.abs(a-b)>tolerance;
 }
 return String(a).trim().toLowerCase()!==String(b).trim().toLowerCase();
}
const DIRECT_RUN_PROPS=[
 ["font","西文字体"],["fontHAnsi","西文高位字符字体"],["fontEast","东亚字体"],["fontCs","复杂文字字体"],
 ["fontSizePt","字号"],["bold","加粗"],["italic","斜体"],["underline","下划线"],["color","文字颜色"],
 ["smallCaps","小型大写字母"],["allCaps","全部大写"],["strike","删除线"]
];
const INLINE_BOOL_KEYS=new Set(["bold","italic","smallCaps","allCaps","strike"]);
function sampleRunProps(sample){
 const runs=sample?.runOverrides||[];
 return runs.find(r=>DIRECT_RUN_PROPS.some(([key])=>r[key]!==null&&r[key]!==undefined))||null;
}
function effectiveRunProps(sample,run){
 const out={...(sample.props||{})};
 if(run)for(const [key] of DIRECT_RUN_PROPS)if(run[key]!==null&&run[key]!==undefined)out[key]=run[key];
 for(const key of INLINE_BOOL_KEYS)if(out[key]===null||out[key]===undefined)out[key]=false;
 if(out.underline===null||out.underline===undefined)out.underline="none";
 return out;
}
function compareDirectRunSample(t,m,templateName,manuscriptName){
 const tr=sampleRunProps(t),mr=sampleRunProps(m);
 if(!tr&&!mr)return null;
 const tp=effectiveRunProps(t,tr),mp=effectiveRunProps(m,mr);
 const keys=DIRECT_RUN_PROPS.filter(([key])=>(tr?.[key]!==null&&tr?.[key]!==undefined)||(mr?.[key]!==null&&mr?.[key]!==undefined));
 const comparable=keys.filter(([key])=>tp[key]!==null&&tp[key]!==undefined&&mp[key]!==null&&mp[key]!==undefined);
 const diffs=comparable.filter(([key])=>propDifference(key,tp[key],mp[key],tp,mp));
 if(!diffs.length)return null;
 return {
  id:"CMP-RUN-"+String(t.index).padStart(3,"0"),
  title:"样式“"+t.name+"”的局部直接格式样例有差异",
  text:"机器可读基准：模板样式“"+t.name+"”中可读取的 run 级直接格式样例；仅代表样例文字，不是该样式全部文字的统一规则。",
  originalText:"模板样式“"+t.name+"”中的 Word run 级直接格式属性（局部样例）。",
  source:"模板 document.xml / styles.xml",sourceFile:templateName,sourceParagraph:t.index,checkedDocument:manuscriptName,
  strength:"advisory",check:"directRunCompare",status:"review",
  detail:"模板样例与论文样例的局部格式不同："+diffs.map(([key,label])=>label+"（模板 "+displayProp(key,tp[key],tp)+"；论文 "+displayProp(key,mp[key],mp)+"）").join("；")+"。局部加粗/斜体等差异可能是有意强调，不直接判为违规。",
  actualValue:diffs.map(([key,label])=>label+"：模板 "+displayProp(key,tp[key],tp)+"；论文 "+displayProp(key,mp[key],mp)).join("；"),
  evidence:"模板第 "+t.index+" 段的样例 run 与论文第 "+m.index+" 段的样例 run；比较仅覆盖首个可读取的直接格式样例，并非全文每个 run。",
  recommendation:"在 Word 中检查对应段落的局部字体、字号、颜色、加粗/斜体或下划线；仅在模板确实要求一致时才修改，并复核该段其余 run。"
 };
}
function compareTemplateStyles(templateModel,manuscriptModel,templateName,manuscriptName){
 const ts=usedStyleSamples(templateModel),ms=usedStyleSamples(manuscriptModel);
 const roleCounts=list=>{const m=new Map();for(const s of list){const r=roleForStyle(s.id,s.name);if(r)m.set(r,(m.get(r)||0)+1);}return m;};
 const tc=roleCounts(ts),mc=roleCounts(ms),usedM=new Set(),out=[];
 const props=[
  ["font","西文字体"],["fontHAnsi","西文高位字符字体"],["fontEast","东亚字体"],["fontCs","复杂文字字体"],["fontSizePt","字号"],["alignment","段落对齐"],
  ["lineRule","行距规则"],["lineTwip","行距值"],["beforeTwip","段前距"],["afterTwip","段后距"],
  ["leftTwip","左缩进"],["rightTwip","右缩进"],["firstLineTwip","首行缩进"],["hangingTwip","悬挂缩进"],
  ["bold","加粗"],["italic","斜体"],["underline","下划线"],["smallCaps","小型大写字母"],["allCaps","全部大写"],["strike","删除线"],
  ["keepNext","与下段同页"],["keepLines","段落不分页"],["pageBreakBefore","段前分页"],["outlineLevel","大纲级别"],["color","文字颜色"]
 ];
 for(const t of ts){
  if(out.length>=20)break;
  const tId=normalizeStyle(t.id),tName=normalizeStyle(t.name),role=roleForStyle(t.id,t.name);
  let m=ms.find(x=>!usedM.has(x)&&((tId&&normalizeStyle(x.id)===tId)||(tName&&normalizeStyle(x.name)===tName)));
  if(!m&&role&&tc.get(role)===1&&mc.get(role)===1)m=ms.find(x=>!usedM.has(x)&&roleForStyle(x.id,x.name)===role);
  if(!m){
   if(role&&["title","abstract","keywords","references","figure-caption","table-caption","heading-1","heading-2","heading-3"].includes(role)){
    out.push({id:"CMP-STYLE-"+String(out.length+1).padStart(2,"0"),title:"模板样式未能在论文中匹配："+t.name,text:"机器可读基准：上传模板中的 Word 样式“"+t.name+"”（非自然语言条文）。",originalText:"机器可读基准：模板 styles.xml 中的样式“"+t.name+"”（非自然语言条文）。",source:"模板 styles.xml",sourceFile:templateName,sourceParagraph:t.index,checkedDocument:manuscriptName,strength:"advisory",check:"templateStyleCompare",status:"review",detail:"模板使用的样式“"+t.name+"”没有与论文中的样式名称/语义角色可靠匹配。",actualValue:"模板样式："+t.name+"；论文：未找到可靠匹配项",evidence:"模板第 "+t.index+" 段使用该样式；相似样式的映射不唯一或论文未使用可识别的对应样式。",recommendation:"检查标题、摘要、关键词、参考文献或图表题是否使用了不同样式名或直接格式覆盖；不要仅凭名称缺失判断违规。",sourceIndex:t.index});
   }
   continue;
  }
  usedM.add(m);
  if(out.length<19){const direct=compareDirectRunSample(t,m,templateName,manuscriptName);if(direct)out.push(direct);}
  const shared=props.filter(([k])=>t.props&&m.props&&t.props[k]!==null&&t.props[k]!==undefined&&m.props[k]!==null&&m.props[k]!==undefined&&t.props[k]!==""&&m.props[k]!=="");
  const diffs=shared.filter(([k])=>propDifference(k,t.props[k],m.props[k],t.props,m.props));
  if(!shared.length){
   if(role)out.push({id:"CMP-STYLE-"+String(out.length+1).padStart(2,"0"),title:"样式格式无法量化对照："+t.name,text:"机器可读基准：模板样式“"+t.name+"”；当前 OOXML 未提供双方都可比较的格式值。",originalText:"机器可读基准：模板 styles.xml 中的样式“"+t.name+"”（非自然语言条文）。",source:"模板 styles.xml",sourceFile:templateName,sourceParagraph:t.index,checkedDocument:manuscriptName,strength:"advisory",check:"templateStyleCompare",status:"review",detail:"模板与论文中虽找到相似样式，但没有双方均可读取的显式格式属性。",actualValue:"模板样式："+t.name+"；论文样式："+m.name+"；可比较的格式属性：0",evidence:"比较来源为两个 DOCX 的 styles.xml / 段落样式解析结果；局部直接格式与最终渲染未完整覆盖。",recommendation:"在 Word 中查看这两个样式的实际字体、字号、行距与缩进。",sourceIndex:t.index});
   continue;
  }
  const directDiffs=diffs.filter(([k])=>(t.directParagraphProperties&&t.directParagraphProperties[k]!==undefined)||(m.directParagraphProperties&&m.directParagraphProperties[k]!==undefined));
  const findingStatus=diffs.length?(directDiffs.length?"review":"fail"):"pass";
  const detail=diffs.length
    ?(directDiffs.length?"发现段落样例的可量化格式差异，但至少一项来自段落级直接格式，样例差异可能与内容角色有关，暂列待核验：":"发现可量化的样式格式差异：")+diffs.map(([k,label])=>label+"（模板 "+displayProp(k,t.props[k],t.props)+"；论文 "+displayProp(k,m.props[k],m.props)+"）").join("；")
    :"在 "+shared.length+" 个可读取属性中未发现超出容差的差异。";
  out.push({id:"CMP-STYLE-"+String(out.length+1).padStart(2,"0"),title:"模板样式对照："+t.name,text:"机器可读基准：模板 Word 样式“"+t.name+"”；对比论文样式“"+m.name+"”。",originalText:"机器可读基准：模板 styles.xml 中的样式“"+t.name+"”（非自然语言条文）。",source:"模板 styles.xml",sourceFile:templateName,sourceParagraph:t.index,checkedDocument:manuscriptName,strength:diffs.length&&!directDiffs.length?"mandatory":"advisory",check:"templateStyleCompare",status:findingStatus,detail,actualValue:diffs.length?diffs.map(([k,label])=>label+": 模板 "+displayProp(k,t.props[k],t.props)+"；论文 "+displayProp(k,m.props[k],m.props)).join("；"):"未发现超容差差异（比较 "+shared.length+" 项）",evidence:"模板第 "+t.index+" 段使用样式“"+t.name+"”；论文第 "+m.index+" 段使用样式“"+m.name+"”。比较的可读取属性："+shared.map(([,label])=>label).join("、")+"。"+(directDiffs.length?"其中涉及段落级直接格式覆盖，不能仅凭单个样例确定为样式定义违规。":"")+"未完整覆盖所有 run 级直接格式和最终页面渲染。",recommendation:diffs.length?(directDiffs.length?"核对报告列出的实际值与模板值，并检查该段是否因标题、摘要或特殊内容而使用了有意的直接格式；只有确认模板要求适用于该段后再修改。":"已检测到明确的样式属性差异。按报告列出的模板值与论文实际值，修正对应 Word 样式的字体、字号、对齐、行距、段前后距、缩进或颜色；再重新检测。"):"当前可读取的匹配样式属性未发现超出容差的差异。",sourceIndex:t.index});
 }
 return out;
}

export async function createRulesAudit(manuscriptFile,{templateFile=null,profileId="general-en",aiSuggestions=[]}={}){
 const manuscript=await parseDocxModel(manuscriptFile);let template=null,standards=[],name="",source="";
 if(templateFile){name=templateFile.name;source=name+"（用户上传；未独立认证为官方当前版本）";if(/\.(?:docx|dotx)$/i.test(templateFile.name)){const model=await parseDocxModel(templateFile);template={isUserTemplate:true,model};standards=extractTextRequirements(model.paragraphs,source);}else{const text=await templateFile.text();if(text.length>15*1024*1024)throw Error("模板文字过大");const paras=text.split(/\r?\n/).map((text,i)=>({text,index:i+1}));template={isUserTemplate:true};standards=extractTextRequirements(paras,source);standards.push({id:"S-text-format",title:"纯文本指南无法提供 Word 排版参照",text:"TXT/MD 仅包含文字，不提供 Word 页面尺寸、页边距、字体、行距或分栏参数；这些版式项目未被自动核验。",source:source,sourceFile:templateFile.name,sourceIndex:null,strength:"advisory",check:"manual",params:{}});}}
 else{const profile=getProfile(profileId);name=profile.name;source=profile.description;standards=profile.rules.map(x=>({...x,params:{}}));}
 if(template&&template.model){standards.push({id:"S-paper",title:"对照模板页面与分栏",text:"按上传模板的 Word 页面设置比较纸张大小、页边距与分栏。",source:name+" · sectPr",strength:"advisory",check:"styleCompare",params:{}});}
 const checks=standards.map(rule=>{const checked=checkRule(rule,manuscript,template);return {...rule,...checked,originalText:rule.text,sourceFile:templateFile?templateFile.name:source,sourceParagraph:rule.sourceIndex||null,actualValue:checked.actualValue||checked.detail,recommendation:checked.action||(checked.status==="pass"?"当前支持的检查未发现异常；仍需核对完整投稿指南。":"根据上述证据人工核对；未确认不符前不要直接判为违规。")};});
 const suggestions=aiSuggestions.map((s,i)=>({id:"AI-"+(i+1),title:String(s.title||"AI 候选要求").slice(0,100),text:String(s.text||"").slice(0,2000),originalText:String(s.text||"").slice(0,2000),source:source+" · 本地 AI 候选（未经正式核验）",sourceFile:templateFile?templateFile.name:"",sourceParagraph:null,sourceOffset:s.sourceOffset||0,strength:"unverified",check:"manual",params:{},status:"review",detail:"AI 仅提供待核验的原文候选条款，不自动判定论文违规。",actualValue:"未进行自动合规判断",evidence:"候选原文必须在来源文件中逐字存在",action:"人工核对原文与适用范围；不要仅凭 AI 建议修改论文。",recommendation:"人工核对原文与适用范围；不要仅凭 AI 建议修改论文。"}));
 const measuredComparisons=template&&template.model?compareTemplateStyles(template.model,manuscript,name,manuscriptFile.name):[];
 const requirements=[...checks,...measuredComparisons,...suggestions];
 return {name,source,profileId:templateFile?null:profileId,requirements,stats:{total:requirements.length,pass:requirements.filter(x=>x.status==="pass").length,fail:requirements.filter(x=>x.status==="fail").length,review:requirements.filter(x=>x.status==="review").length},isUserTemplate:!!templateFile,formatVersion:"0.5.1"};
}