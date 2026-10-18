import { parseDocxModel, checkModelStructure } from './docx-model.js';
/** PaperAudit Web checks. No network requests; data never leaves this JS runtime. */
const NS = {
  w:'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  a:'http://schemas.openxmlformats.org/drawingml/2006/main',
  wp:'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  pr:'http://schemas.openxmlformats.org/package/2006/relationships',
};
const DOCX_MAX = 30 * 1024 * 1024;
const ZIP_MAX_EXPANDED = 120 * 1024 * 1024;
const XML_MAX = 20 * 1024 * 1024;
const IMAGE_MAX_EXPANDED = 35 * 1024 * 1024;
const CAPTION = /^\s*(图|表|Fig(?:ure)?\.?|Table)\s*(\d+)(?:\s*[（(]([a-zA-Z])[）)])?(?=\s|[:：.,，、\-–—]|$)/i;
const ZH_REF = /(?:图|表)\s*(\d+)/g;
const EN_REF = /\b(Fig(?:ure)?\.?|Table)\s+(\d+)/gi;
const CITATIONS = /\[(\d+(?:\s*[,，;；\-–—]\s*\d+)*)\]/g;
const REF_ENTRY = /^\s*\[(\d+)\]\s*\S+/;
const BIB_HEADING = /^\s*(参考文献|References|Bibliography)\s*$/i;

function xmlParse(text, where) {
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.getElementsByTagName('parsererror').length) throw new Error(`${where} 的 XML 结构无效`);
  return xml;
}
function nodes(el, ns, tag) { return [...el.getElementsByTagNameNS(ns,tag)]; }
function att(el, ns, tag) { return el?.getAttributeNS(ns,tag) || el?.getAttribute(tag) || null; }
function kind(label) { return /^图|^fig/i.test(label)?'figure':'table'; }
function uniq(list) { return [...new Set(list)]; }
function take(arr,limit=5){return arr.slice(0,limit).join('、');}
function problem(result,level,code,title,location,detail,advice){result.findings.push({level,code,title,location,detail,advice});}
function isDocx(file){return /\.docx$/i.test(file.name);}
function isImage(file){return /\.(png|jpe?g)$/i.test(file.name);}
export function supported(file){return isDocx(file)||isImage(file);}

async function imageDimensions(bytes, mime){
  const blob = new Blob([bytes],{type:mime});
  if (typeof createImageBitmap === 'function') {
    const bitmap=await createImageBitmap(blob);
    const size={width:bitmap.width,height:bitmap.height}; bitmap.close(); return size;
  }
  const uri=URL.createObjectURL(blob);
  try {return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight});img.onerror=()=>reject(new Error('无法读取图片像素尺寸'));img.src=uri;});}
  finally {URL.revokeObjectURL(uri);}
}
function citNums(raw){
  const out=new Set();
  for(const token of raw.split(/[,，;；]/)) {
    const parts=token.trim().split(/[\-–—]/).map(x=>x.trim());
    if(parts.length===1 && /^\d+$/.test(parts[0])){out.add(Number(parts[0]));}
    else if(parts.length===2 && parts.every(x=>/^\d+$/.test(x))) {
      const start=Number(parts[0]),end=Number(parts[1]);
      if(start>0 && end>=start && end-start<=100){for(let n=start;n<=end;n++)out.add(n);}
    }
  }
  return out;
}
function paragraphText(el){return nodes(el,NS.w,'t').map(n=>n.textContent||'').join('').trim();}
function parseDocText(doc, result, opts){
  const xmlNodes=nodes(doc,NS.w,'body')[0];
  if(!xmlNodes)throw Error('DOCX 缺少正文 body');
  const paras=nodes(xmlNodes,NS.w,'p').map((el,i)=>({el,index:i+1,text:paragraphText(el)}));
  const caps={figure:[],table:[]};
  let bibStart=-1,prevHeading=null;
  for(const p of paras){
    if(BIB_HEADING.test(p.text)){bibStart=p.index;continue;}
    if(!p.text)continue;
    const ps=nodes(p.el,NS.w,'pStyle')[0];
    const sty=ps?att(ps,NS.w,'val'):'';
    const match=/^(?:Heading|标题)(\d+)$/i.exec(sty||'');
    if(match){const level=Number(match[1]);if(prevHeading!==null && level>prevHeading+1){problem(result,'warning','HEADING-GAP','标题层级可能跳跃',`段落 ${p.index}`,`上一标题级别为 ${prevHeading}，当前为 ${level}。`,'核对 Word 标题样式和实际层级。');}prevHeading=level;}
    if(bibStart!==-1)continue;
    const m=CAPTION.exec(p.text);
    if(m){caps[kind(m[1])].push({n:Number(m[2]),sub:(m[3]||'').toLowerCase(),idx:p.index,text:p.text});}
  }
  result.coverage.paragraphs=paras.length;
  result.coverage.figCaptions=caps.figure.length;
  result.coverage.tableCaptions=caps.table.length;
  if(opts.captions){
    for(const k of ['figure','table']){
      const noun=k==='figure'?'图':'表';
      const list=caps[k];const numbers=uniq(list.map(x=>x.n)).sort((a,b)=>a-b);
      for(const n of numbers){
        const matches=list.filter(x=>x.n===n),sub=matches.map(x=>x.sub);
        if(matches.length>1&&(sub.includes('')||uniq(sub).length<sub.length)){
          problem(result,'warning','CAP-DUPLICATE',`${noun} ${n} 可能重复编号`,take(matches.map(x=>`段落 ${x.idx}`)),`检测到 ${matches.length} 处相同主编号。`,'如果是 (a)/(b) 子图，请确认子图标记与标题是否正确。');
        }
      }
      if(numbers.length){
        for(let n=numbers[0];n<numbers[numbers.length-1];n++){
          if(!numbers.includes(n)) problem(result,'warning','CAP-GAP',`${noun} ${n} 可能缺号`,'图表标题',`已识别编号 ${numbers.join('、')}，其中缺少 ${n}。`,'检查是否删除了图题、使用了章节编号或 Word 自动编号。');
        }
      }
    }
    for(const p of paras){
      if(!p.text||CAPTION.test(p.text)||bibStart!==-1&&p.index>=bibStart)continue;
      const hits=[];
      for(const m of p.text.matchAll(ZH_REF)) hits.push({k:m[0][0]==='图'?'figure':'table',n:Number(m[1])});
      for(const m of p.text.matchAll(EN_REF)) hits.push({k:kind(m[1]),n:Number(m[2])});
      for(const h of uniq(hits.map(x=>`${x.k}:${x.n}`))){
        const [k,num]=h.split(':'),n=Number(num);
        if(!caps[k].some(x=>x.n===n)){
          problem(result,'warning','REF-NOT-FOUND',`${k==='figure'?'图':'表'} ${n} 引用未找到对应标题`,`段落 ${p.index}`,p.text.slice(0,140),'确认正文引用与图表标题的编号一致。');
        }
      }
    }
  }
  if(opts.citations){
    const citationMap=new Map(),entryMap=new Map();
    for(const p of paras){
      if(!p.text)continue;
      if(bibStart!==-1 && p.index>bibStart){
        const r=REF_ENTRY.exec(p.text);
        if(r){const n=Number(r[1]);entryMap.set(n,[...(entryMap.get(n)||[]),p.index]);}
      }else if(bibStart===-1||p.index<bibStart){
        for(const c of p.text.matchAll(CITATIONS)){
          for(const n of citNums(c[1])){citationMap.set(n,[...(citationMap.get(n)||[]),p.index]);}
        }
      }
    }
    result.coverage.citations=citationMap.size;
    result.coverage.references=entryMap.size;
    if(citationMap.size && bibStart===-1)problem(result,'unverified','CITE-SECTION-MISSING','无法核对参考文献列表','全文','识别到方括号数字，但未检测到独立的“参考文献 / References”标题。','请核对参考文献是否使用了其他标题或引文格式。');
    else if(bibStart!==-1){
      for(const [n,where] of citationMap){if(!entryMap.has(n))problem(result,'warning','CITE-NOT-FOUND',`文献 [${n}] 未找到条目`,`段落 ${take(where)}`,`正文引用 [${n}]，参考文献部分未识别到以 [${n}] 开始的条目。`,'检查参考文献条目或数字引文格式。');}
      for(const [n,where] of entryMap){if(where.length>1)problem(result,'warning','CITE-DUPLICATE',`文献 [${n}] 可能重复`,`段落 ${take(where)}`,`发现 ${where.length} 条相同编号的参考文献。`,'确认编号是否重复。');}
    }
    const fields=nodes(doc,NS.w,'instrText').map(x=>x.textContent||'').join(' ');
    if(/\b(?:SEQ|REF|ADDIN\s+ZOTERO|CITATION)\b/i.test(fields))problem(result,'unverified','FIELDS-UNVERIFIED','检测到 Word 自动域','文档域代码','部分自动编号或 Zotero/Word 引文字段需要在 Word 中刷新后才能核对最终显示。','在 Word 中更新域、重新保存，再检查最终版。');
  }
}
function safeRelTarget(s){
  if(!s||/^[a-z]+:/i.test(s)||s.startsWith('//'))return null;
  const full=s.startsWith('/')?s.slice(1):`word/${s}`;
  const pieces=[];
  for(const seg of full.replace(/\\/g,'/').split('/')){
    if(seg==='..'){if(!pieces.length)return null;pieces.pop();}
    else if(seg && seg!=='.')pieces.push(seg);
  }
  return pieces.join('/');
}
async function inspectInlineImages(zip,doc,result,opts){
  if(!opts.images)return;
  const rels=zip.file('word/_rels/document.xml.rels');
  if(!rels){result.coverage.imageStatus='未找到 DOCX 图片关系文件';return;}
  const rxml=xmlParse(await rels.async('string'),'DOCX 关系表');
  const targets=new Map();
  for(const el of nodes(rxml,NS.pr,'Relationship')){
    const id=el.getAttribute('Id');const target=el.getAttribute('Target');
    if(el.getAttribute('TargetMode')==='External')continue;
    if((el.getAttribute('Type')||'').endsWith('/image'))targets.set(id,safeRelTarget(target));
  }
  const drawings=nodes(doc,NS.w,'drawing');
  result.coverage.imagesDeclared=drawings.length;
  if(drawings.length===0)return;
  let done=0;
  for(let i=0;i<drawings.length;i++){
    const d=drawings[i],blip=nodes(d,NS.a,'blip')[0];
    const extent=nodes(d,NS.wp,'extent')[0];
    const rid=blip?att(blip,NS.r,'embed'):null;
    const path=targets.get(rid);const emu=extent?Number(extent.getAttribute('cx')):null;
    const location=`内嵌图片 ${i+1}`;
    if(!path||!zip.file(path)){problem(result,'unverified','IMAGE-UNRESOLVED','图片来源无法解析',location,'当前绘图对象缺少可识别的内嵌图像或关系引用。','建议核对是否为链接图、EMF/SVG 矢量图或浮动对象。');continue;}
    if(!/\.(png|jpe?g)$/i.test(path)){problem(result,'unverified','IMAGE-UNSUPPORTED','图片格式尚不支持',location,`${path}：当前仅计算 PNG/JPEG 的有效 PPI。`,'矢量图、TIFF 和其他格式请按照期刊要求人工检查。');continue;}
    const entry=zip.file(path);const uncompressed=entry?._data?.uncompressedSize||0;
    if(uncompressed>IMAGE_MAX_EXPANDED){problem(result,'unverified','IMAGE-TOO-LARGE','图片超出大小限制',location,'为防止资源消耗过高，跳过此图片。','请单独确认图片尺寸。');continue;}
    try {
      const buffer=await entry.async('uint8array');
      const dims=await imageDimensions(buffer,/\.png$/i.test(path)?'image/png':'image/jpeg');
      done++;
      if(!Number.isFinite(emu)||emu<=0){problem(result,'unverified','IMAGE-NO-WIDTH','无法获取图片排版宽度',location,`图片像素尺寸 ${dims.width}×${dims.height}，但无法获取有效显示宽度。`,'请在 Word 中查看图片实际宽度。');continue;}
      const widthInch=emu/914400;
      const ppi=dims.width/widthInch;
      if(ppi<opts.ppi){problem(result,'warning','IMAGE-LOW-PPI','内嵌图片有效分辨率不足',location,`${dims.width}×${dims.height} px；排版宽度 ${(widthInch*25.4).toFixed(1)} mm；有效 ${ppi.toFixed(1)} PPI，低于自定义阈值 ${opts.ppi}。`,'优先使用原始高分辨率图片或矢量图；不要简单修改 DPI 元数据。');}
    }catch(err){problem(result,'unverified','IMAGE-DECODE','图片无法完成解码',location,String(err?.message||err),'请检查是否为受支持的有效 PNG/JPEG 图片。');}
  }
  result.coverage.imagesChecked=done;
}
async function inspectDocx(file,result,opts){
  if(file.size>DOCX_MAX)throw Error('DOCX 超过 30 MB 安全限制');
  let zip;
  try{zip=await window.JSZip.loadAsync(await file.arrayBuffer(),{checkCRC32:false});}
  catch(err){throw Error('无法读取 DOCX 压缩结构：'+err.message);}
  const data=zip.file('word/document.xml');
  if(!data)throw Error('该文件不是有效 DOCX：缺少 word/document.xml');
  let expanded=0;
  for(const entry of Object.values(zip.files)){
    if(entry.dir)continue;
    expanded+=entry._data&&entry._data.uncompressedSize||0;
    if(expanded>ZIP_MAX_EXPANDED)throw Error('DOCX 解压后总体积过大，已中止检查');
  }
  if(data._data&&data._data.uncompressedSize>XML_MAX)throw Error('DOCX 正文 XML 超出安全限制');
  const doc=xmlParse(await data.async('string'),'Word 正文');
  const model=await parseDocxModel(file);
  checkModelStructure(model,result,opts);
  // Strict OOXML relationship/drawing namespace mapping is not yet used by the
  // legacy raster-image reader; avoid false "unresolved image" warnings there.
  if(model.namespace==='http://schemas.openxmlformats.org/wordprocessingml/2006/main'){
    await inspectInlineImages(zip,doc,result,opts);
  } else if(opts.images){
    result.coverage.imageStatus='Strict OOXML 图片关系暂未逐项核验';
    problem(result,'unverified','STRICT-IMAGE-UNVERIFIED','Strict OOXML 图片暂待核验',file.name,
      'Strict OOXML 的图片关系与绘图命名空间尚未接入有效 PPI 计算，未判定图片违规。',
      '如需检查图片有效分辨率，请在 Word 中另存为 Transitional DOCX 后重试，或人工核对图片格式。');
  }
  result.coverage.filesScanned++;
}
async function inspectImage(file,result,opts){
  if(file.size>DOCX_MAX)throw Error('单个图片超过 30 MB 限制');
  try{
    const dimensions=await imageDimensions(await file.arrayBuffer(),/\.png$/i.test(file.name)?'image/png':'image/jpeg');
    result.coverage.imagesChecked++;
    problem(result,'unverified','IMAGE-STANDALONE-PPI','独立图片缺少最终排版宽度',file.name,`像素：${dimensions.width}×${dimensions.height}。仅凭文件像素和 DPI 标签无法确认期刊要求的有效 PPI。`,'将图片插入 Word 并设置最终显示尺寸，或按期刊规定人工确认。');
    result.coverage.filesScanned++;
  }catch(err){throw Error(`图片无法解码：${err?.message||err}`);}
}
export async function inspectFiles(files, opts){
  const result={version:'0.5.0-preview',tool:'PaperAudit Web',createdAt:new Date().toISOString(),files:files.map(f=>({name:f.name,size:f.size})),rules:{captions:!!opts.captions,citations:!!opts.citations,images:!!opts.images,minPpi:Number(opts.ppi)},findings:[],coverage:{filesScanned:0,paragraphs:0,figCaptions:0,tableCaptions:0,citations:0,references:0,imagesDeclared:0,imagesChecked:0},limitations:['优先读取 Word 自动编号定义与段落样式；复杂字段、章节编号和自动域仍可能需要人工核验。','暂不完整支持章节编号、自动域、公式编号、浮动/链接图片、TIFF/EMF/SVG 有效分辨率。','不检查学术内容、科研正确性或期刊全部投稿规范；问题位置为段落序号，并非 Word 页码。']};
  for(const file of files){
    try{
      if(isDocx(file))await inspectDocx(file,result,opts);
      else if(isImage(file))await inspectImage(file,result,opts);
      else problem(result,'unverified','FILE-UNSUPPORTED','不支持的文件',file.name,'仅支持 DOCX、PNG 和 JPEG。','把 Word 旧格式另存为 .docx。');
    }catch(err){problem(result,'warning','FILE-ERROR','文件未能完成检查',file.name,String(err?.message||err),'请确认文件未损坏、大小合适且格式正确。');}
  }
  return result;
}
