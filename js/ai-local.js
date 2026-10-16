/* Optional in-browser WebLLM. Never uploads input to an inference API. */
let engine=null;
// q4f32 avoids the shader-f16 feature required by the q4f16 build on
// some software WebGPU adapters (e.g. CI's SwiftShader).
const MODEL="Qwen2.5-0.5B-Instruct-q4f32_1-MLC";
function parseRows(output){
 const text=String(output||"").trim();
 const first=text.indexOf("["),last=text.lastIndexOf("]");
 if(first<0||last<first)throw Error("本地小模型未输出 JSON 数组，请改用基础规则清单。");
 const data=JSON.parse(text.slice(first,last+1));if(!Array.isArray(data))throw Error("AI 结果不是数组");return data;
}
export async function suggestRequirementsWithLocalAI(templateText,progress=()=>{}){
 if(!navigator.gpu)throw Error("此浏览器没有 WebGPU；请使用支持 WebGPU 的新版 Chrome/Edge，或只用基础规则引擎。");
 if(!String(templateText||"").trim())throw Error("模板没有可供提取的文字。");
 if(templateText.length>30000)throw Error("为避免小模型超出上下文窗口，本次只允许分析前 30000 个字符；请先分段筛选。");
 progress("正在加载免费本地 AI 运行组件……首次需要联网下载运行组件与模型（约数百 MB）。");
 const webllm=await import("https://esm.run/@mlc-ai/web-llm@0.2.85");
 if(!webllm.prebuiltAppConfig||!webllm.prebuiltAppConfig.model_list.some(x=>x.model_id===MODEL))throw Error("固定版本的 WebLLM 未列出目标模型，已停止加载。");
 if(!engine)engine=await webllm.CreateMLCEngine(MODEL,{initProgressCallback:x=>progress(x.text||("模型加载 "+Math.round((x.progress||0)*100)+"%"))});
 const chunks=[];for(let i=0;i<templateText.length;i+=4200)chunks.push({offset:i,text:templateText.slice(i,i+4200)});
 const suggestions=[],seen=new Set();
 for(let i=0;i<chunks.length&&suggestions.length<8;i++){
  progress("本地模型正在提取候选条款（分段 "+(i+1)+"/"+chunks.length+"）；不会自动判定违规……");
  const response=await engine.chat.completions.create({messages:[
   {role:"system",content:"你是学术模板规范摘录助手。只从给定原文抽取明确可追溯的投稿格式要求。用 JSON 数组输出最多3项，每项只含 title 与 text。text 必须是输入中的逐字连续片段，不能改写或编造。不要判定论文是否合规。若没有明确要求，输出 []。"},
   {role:"user",content:"请摘录本段中的明确要求，返回 JSON 数组：\n"+chunks[i].text}
  ],temperature:0,max_tokens:380});
  const output=response.choices&&response.choices[0]&&response.choices[0].message&&response.choices[0].message.content||"";
  for(const row of parseRows(output)){
   if(!row||typeof row.text!=="string"||row.text.trim().length<8||!chunks[i].text.includes(row.text)||seen.has(row.text))continue;
   seen.add(row.text);suggestions.push({title:String(row.title||row.text).slice(0,100),text:row.text,sourceOffset:chunks[i].offset});
   if(suggestions.length>=8)break;
  }
 }
 progress("本地 AI 提取完成 "+suggestions.length+" 条候选要求；所有结果仍需人工核对。");
 return suggestions;
}