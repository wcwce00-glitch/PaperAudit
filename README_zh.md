# PaperAudit — 浏览器本地科研论文 DOCX 预检工具

[![CI](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**免费开源、免安装的 Word 论文投稿前预检工具。** [立即打开在线版](https://wcwce00-glitch.github.io/PaperAudit/) · [English README](README.md) · [报告 Bug](https://github.com/wcwce00-glitch/PaperAudit/issues/new)

PaperAudit 帮助科研人员提前发现部分 DOCX 常见问题：图题/表题与正文中的文字引用、数字型参考文献、支持的内嵌 PNG/JPEG 图片有效 PPI，并导出独立 HTML 或 JSON 报告。它不代替期刊官方审稿、Word 最终排版或科学内容审查。

> **版本说明：** 当前在线网站仍是已批准的稳定版本。v0.5.0 Strict OOXML 语义升级正在 [Pull Request #3](https://github.com/wcwce00-glitch/PaperAudit/pulls/3) 中验收；尚未发布到在线网站。

## 主要特点

- **本地优先：** 普通论文检查在浏览器里执行，PaperAudit 不提供论文上传服务，也没有遥测或账号系统。
- **可追溯的模板检查（v0.5 预览）：** 尝试解析 Transitional / Strict WordprocessingML，从模板逐条提取候选规范，并关联原文、来源、实际检测值、判断和建议。
- **不确定就待核验：** 当前无法可靠验证的规则不会仅凭猜测判定为违规。
- **可下载报告：** 生成可离线查看与分享的 HTML / JSON 报告。
- **免费规则包：** 没上传模板时可选择通用学科规则，但通用规则并非任何期刊的官方投稿要求。

## 隐私边界

默认检查不会将论文上传到 PaperAudit 服务器。可选的 WebLLM 本地 AI 实验默认关闭；用户明确启用后，浏览器会从第三方站点下载运行组件和模型权重。模型推理设计为在浏览器本地执行，但第三方资源站会收到普通文件下载请求。AI 提取的规则始终是待核验候选项。

公开 GitHub Actions 只使用合成 DOCX 测试文档。**请勿把未发表论文、私有模板、个人信息、完整审计报告或摘录提交到公开仓库、Issue、PR 或 CI 日志。**

## 普通用户使用步骤

1. 浏览器打开公开网址并收藏。
2. 拖入 `.docx`（或者 PNG/JPG 图片），或者选择 **使用示例论文体验**。
3. 可选上传 DOCX/DOTX 投稿模板，或把作者指南保存为 TXT/MD 后上传；也可直接使用官方模板入口目录。
4. 勾选图表、引用、内嵌图片检查，按目标期刊要求修改 PPI 阈值。
5. 点击 **开始检查**，查看按段落定位的问题清单。
6. 点击 **下载 HTML 报告**，离线查看和分享。

## 部署与搜索引擎收录

网站已通过 GitHub Actions 测试并部署到 GitHub Pages。每次向 `main` 推送变更都会先运行测试，再尝试发布。仓库提供 `robots.txt` 与 `sitemap.xml` 方便搜索引擎发现首页，但是否抓取、何时收录及搜索排名由搜索引擎决定，不会即时生效。

前端没有服务端，不需要购买 VPS 或数据库。网站源码公开，但上传给浏览器的私人论文不会自动成为 GitHub 仓库内容。**切勿把未发表论文文件直接提交到公开仓库。**

## 给开发者：本地运行与测试

```bash
python -m http.server 8000
```

浏览器打开 `http://localhost:8000/`。直接双击 `index.html` 可能因浏览器对 `file://` 的模块加载限制而失败。

## 模板对照如何理解

- **当前能自动核对：** 单一 DOCX 末节页面参数、默认/Normal 字体/字号、少数常见结构项、显式写出的摘要字数上限。异常会标注上传文件名和规则依据。
- **当前只摘录并提示人工核对：** 必须解释的研究方法、利益冲突、伦理说明、讨论深度、参考文献规范等自然语言写作要求。**不会宣称已经理解并检查了全部要求**。
- **目前不支持：** PDF 作者指南、Word 旧 `.doc`、LaTeX 源文件中的期刊格式自动比较；复杂 Word 分节、自动域、表格内模板要求和完整参考文献风格尚未覆盖。
- **权威性：** 网页不鉴别上传模板是否为官方当前版本。必须以期刊官网最新版 Author Guidelines / 投稿须知优先；投稿初审和录用后排版要求可能不同。
- **隐私：** 普通检查在浏览器本地处理论文和模板；可选 WebLLM 功能会下载外部运行组件与模型，但不应把论文正文发送给推理 API。作者资源目录只展示公开网址，点击外链会打开对应机构网站。

### 演示模板

`examples/DEMO_NOT_OFFICIAL_template.docx` 是**刻意制作的非官方测试材料**。不要将它用于任何期刊投稿。可把它与 `examples/sample_manuscript.docx` 一起选择，测试模板对照与候选规则摘录。

## 当前版本边界

- 只支持 DOCX 和 PNG/JPEG；不支持旧 DOC 和 PDF。
- 章节编号、Zotero / EndNote 域、REF/SEQ 自动编号、复杂公式、浮动/外链/矢量图片不能保证完整检查。
- 独立图片不知道最终排版宽度，因此不直接断言“低于 300 PPI”。Word 内嵌位图可使用显示宽度计算有效 PPI。
- “没有警告”≠“论文全部符合期刊要求”；算法可能漏检或误判。
- 图片审查依据像素与实际排版大小；不能仅修改图片的 DPI 元数据来提高质量。
- 文件大小限制：30 MB / 文件；对于压缩包解压后体积也设置了安全限制。

## 许可与依赖

本项目使用 MIT 许可证。打包的 JSZip 保留原始许可证，见 `vendor/JSZip-LICENSE.md`。

---

## v0.4.0：个人模板库与社区投稿

为了让用户贡献真正可共享的投稿模板，新增两级模板库：

1. **我的模板库（真正可用）**：先选择 DOCX/DOTX/TXT/MD 模板，填写期刊名称，然后点击“保存当前模板到我的模板库”。模板二进制保存在用户当前浏览器的 IndexedDB 中，不会自动上传。下次访问**相同网址、相同浏览器配置**时，可以再次选择或删除。内容根据 SHA-256 去重。清空网站数据、更换浏览器/设备、无痕窗口退出都可能使本地收藏丢失。浏览器在空间不足时也可能清理存储，不应把它当唯一备份。
2. **共享模板目录（人工审核）**：如果用户自愿提供期刊/会议名称、研究方向、中英文、版本年份、**HTTPS 官方/授权来源**，并确认没有私人论文或未获授权材料，就能导出待审稿 JSON；配置好项目 GitHub 仓库后，也能打开 GitHub Issue Form（需人工填写表单）。**默认只提交来源和元数据，不上传实际模板文件**。只有维护者核查版本、来源、允许转载情况，并通过 PR 将条目写入 `data/approved-catalog.json` 后，页面才会向其他用户显示“社区贡献 · 已人工审核来源”的链接。

### 维护者启用真正的在线投稿入口

v0.4.1 的 `js/community.js` 已配置 `wcwce00-glitch/PaperAudit` 为预期目标仓库；**只有真实仓库已创建并开启 Issues** 时才能投稿。用户打开 GitHub Issue Form 后需登录并自行填写元数据，网页不发送私人 DOCX 文件。"生成投稿信息 JSON" 仅保存到用户本地，不会自动提交。

收到 Issue 后，维护者应核对：① 来源是不是官方网站或明确授权渠道；② 是否适用于目前稿件类型、投稿阶段和版本；③ 是否有转载授权；④ 链接是否可正常打开。优先收录官方**链接**，不要默认复制或托管发行商模板文件。批准后在 `data/approved-catalog.json` 增加条目并使用 PR 审查，再由 GitHub Pages 发布；公共条目不是自动机器认证的投稿合规保证。

样例 JSON 字段和验证方法见 `data/README.md`；CI 运行 `node scripts/validate_catalog.mjs` 检查格式、重复 URL 和不安全链接（但**不替代人工真实性核验**）。

### 为什么不能用户一上传就直接进公共目录？

当前项目是纯静态 GitHub Pages，没有接受上传的后端、账户审核或集中数据库。浏览器保存的本地模板只属于本人；为了保护未发表手稿和遵守期刊模板版权，需要明确的公开同意和管理员审核。将来如果确实需要“无需 GitHub 账户的一键投稿”，必须额外开发提交 API、文件扫描、审核后台、访问控制、存储及隐私政策，这**不属于 v0.4.0 已实现功能**。


## v0.4.1 发布加固说明

- 浏览器最多选 10 个论文/图片文件，单个 ≤30 MB，包含目标模板的总大小 ≤80 MB。
- Pages 工作流必须等待测试通过，且只发布 `dist/site` 文件。
- 提供真实 HTTP/ES Module 浏览器测试，必须在允许本地 HTTP 的 CI 环境里成功。
- 社区投稿链接使用 GitHub Issue Form。因表单字段无法可靠直接预填，用户需在 GitHub 网页填写；JSON 文件仅用于保存投稿信息。
- 仍然属于预发布版本，不代表通过任何期刊全部投稿规范。
