/* Maintainer-authored general preflight profiles; not official publisher rules. */
const base=[
 ["G01","投稿信息","检查文稿是否保留模板占位符","placeholder"],
 ["G02","Word 结构","检查图题、表题的结构识别","captions"],
 ["G03","参考文献","核对数字引文与参考文献自动编号的可解析性","references"],
 ["G04","稿件格式","检查纸张尺寸、页面分节与分栏结构是否可读","page"],
 ["G05","版式编辑","检查正文段落中是否有手动 Tab","tabs"],
 ["G06","投稿材料","核验利益冲突/资金支持声明是否需要提供","disclosures"]
];
function build(id,name,disc,lang,extra=[]){return {id,name,disc,lang,official:false,
 description:"PaperAudit 社区维护的通用预检规则包，不等同于任何期刊的官方强制规范。",
 rules:[...base,...extra].map(x=>({id:x[0],title:x[1],text:x[2],check:x[3],source:"PaperAudit 通用预检建议",strength:"advisory"}))};}
export const PROFILES=[
 build("general-en","英文科研论文 · 通用预检","general","en"),
 build("general-zh","中文科技论文 · 通用预检","general","zh"),
 build("conference-en","国际学术会议 · 通用预检","general","en",[
  ["C01","会议图表","核对图题与表题位置，实际视觉位置需要人工确认","figurePlacement"],
  ["C02","会议版式","检查多栏排版设置与正文样式","styleCompare"]]),
 build("electrical-en","电气工程与能源 · 英文稿件","electrical","en",[
  ["E01","单位与表达","检查数字小数点前有无零","decimalZero"],
  ["E02","图表呈现","核对线路图/波形图的清晰度，须人工确认","figurePlacement"]]),
 build("optics-en","光学与光电子 · 英文稿件","optics","en",[
  ["O01","光学图稿","检查嵌入图片有效 PPI 是否可获取","images"],
  ["O02","实验细节","核对实验与测量方法的完整性（人工）","methods"]]),
 build("physics-en","物理与材料 · 英文稿件","physics","en"),
 build("computer-en","计算机与工程 · 英文稿件","computer","en"),
 build("medicine-zh","医学与生命科学 · 中文稿件","medicine","zh",[
  ["M01","伦理声明","检查是否应提供伦理审批及受试者声明","ethics"]])
];
export function getProfile(id){return PROFILES.find(x=>x.id===id)||PROFILES[0];}