# PaperAudit — 浏览器本地科研论文 DOCX 预检工具

[![CI](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[立即打开在线版](https://wcwce00-glitch.github.io/PaperAudit/)** · [English README](README.md) · [报告 Bug](https://github.com/wcwce00-glitch/PaperAudit/issues/new)

PaperAudit 是免费的开源浏览器工具，帮助科研人员在 Word 论文投稿前检查一部分常见问题：图题/表题及正文中的文字引用、基础数字型参考文献、支持的内嵌 PNG/JPEG 图片有效 PPI，以及选定的模板要求。检查结果可导出为独立 HTML 或 JSON 报告。

> **版本状态：** 当前公开网站仍是 `main` 上已批准的稳定版本。v0.5.0 的 Strict OOXML 解析与可追溯规则升级正在 [PR #3](https://github.com/wcwce00-glitch/PaperAudit/pull/3) 中审查；PR 经过核验并合并前，不会发布到在线网站。

## 主要特点

- **默认浏览器本地处理：** 普通文档检查在浏览器中运行；PaperAudit 不提供论文上传服务，也没有账号系统或遥测。
- **可追溯的模板核查（v0.5.0 预览）：** 设计目标是逐项展示原文、来源位置、实际检测值、判断和建议。
- **保守处理不确定结果：** 无法可靠验证的事项应标为“待人工核验”，而不是直接判定违规。
- **报告可带走：** 导出 HTML 供离线阅读，或导出 JSON 供进一步处理。
- **没有模板也能检查：** 可选择内置的通用预检规则包；这些规则不是任何特定期刊的官方规范。

## 如何使用

1. 打开[在线工具](https://wcwce00-glitch.github.io/PaperAudit/)。
2. 点击“使用示例论文体验”试用合成示例，或选择你有权处理的 DOCX 文件。
3. 可选上传 DOCX/DOTX 模板，或以 TXT/MD 形式准备作者指南。
4. 选择检查项目，并根据目标期刊规定设置图片 PPI 阈值。
5. 查看结果并下载 HTML 或 JSON 报告。

普通用户无需注册或安装软件。如需本地开发，在仓库根目录执行 `python -m http.server 8000`，再打开 `http://localhost:8000/`。直接通过 `file://` 打开时，浏览器可能阻止 JavaScript 模块加载。

## 隐私与可选 AI 实验

- 普通检查在浏览器本地运行，论文不会上传到 PaperAudit 服务器。
- 公开 CI 只使用合成测试文档。请勿把未发表论文、私有模板、个人信息、完整报告或提取出的正文放到公开 Issue、PR、仓库或 CI 日志。
- 可选 WebLLM/Qwen 候选条款提取功能**默认关闭，且仍处于实验阶段**。用户明确启用后，浏览器会从第三方站点下载运行组件与模型文件。目前真实模型推理尚未通过可用托管 CI 的软件 WebGPU 冒烟测试。AI 提取内容只能作为候选建议，必须由人工核验。

## 结果的含义与局限

PaperAudit 是投稿前预检辅助工具，**不**是期刊合规认证、查重工具、科研内容评审，也不保证投稿录用。没有警告只表示已启用的检查没有发现其能够识别的问题。

已知局限包括：复杂 Word SEQ/REF 域与自动编号、章节式图题编号、全部参考文献格式、矢量或外链图片、公式、PDF/LaTeX 源文件、图片在页面中的视觉位置，以及所有局部格式覆盖。只有在能够解析受支持的内嵌位图且读取到 Word 显示尺寸时，才能计算有效 PPI。300 PPI 只是可修改的示例阈值，并非期刊统一要求。投稿时请始终以目标期刊最新官方作者指南为准。

上传的模板不会自动被认证为官方或最新版。自然语言要求可能被提取为候选项，但仍需人工检查文字是否准确、是否适用。虚构文件 `examples/DEMO_NOT_OFFICIAL_template.docx` 仅供测试，不能用于真实投稿。

## 本地开发与测试

安装 Python 3 和兼容的浏览器测试环境后，可运行：

```bash
python -m http.server 8000
python -m pytest tests -q
python scripts/build_site.py
```

GitHub Actions 会运行浏览器测试与站点构建。真实 WebLLM 测试被单独放在手动触发的 [WebLLM 冒烟工作流](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/webllm-smoke.yml) 中，因为托管环境的软件 WebGPU 着色器初始化可能超时。这一限制会如实记录，不会宣称模型推理测试已经通过。

## 参与贡献

欢迎提交可复现 Bug、合成 DOCX 回归样例、无障碍建议和跨浏览器测试结果。

- 阅读[贡献指南](CONTRIBUTING.md)和[开发路线图](docs/roadmap.md)。
- 查看[适合新贡献者的任务](https://github.com/wcwce00-glitch/PaperAudit/labels/good%20first%20issue)或[所有未关闭的 Issues](https://github.com/wcwce00-glitch/PaperAudit/issues)。
- 漏洞请遵循 [SECURITY.md](SECURITY.md)（如该文件存在）的报告流程；不要为演示 Bug 而公开私人研究资料。
- 软件引用元数据见 [CITATION.cff](CITATION.cff)。

## 社区模板目录

公开目录只收录经整理的官方资源链接和已审核的社区贡献，不会自动托管用户上传的模板原件。个人模板库只保存在当前浏览器中。社区投稿只提交来源链接和元数据候选，必须经维护者审核后才会出现在公共目录。投稿前请核对来源、版本、稿件类型和再分发权限。详细说明见 [data/README.md](data/README.md)。

## 发布与搜索引擎发现

GitHub Pages 只会在 `main` 收到通过验证的推送后部署。仓库包含 `robots.txt` 与 `sitemap.xml`，可帮助搜索引擎发现网站；实际抓取、收录和排名由搜索引擎决定，不能保证即时生效。

## 许可证

项目采用 MIT 许可证。打包的 JSZip 仍适用自身的双重许可条款，详见 [vendor/JSZip-LICENSE.md](vendor/JSZip-LICENSE.md)。
