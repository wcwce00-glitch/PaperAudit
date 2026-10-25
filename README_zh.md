# PaperAudit — 免费开源的 Word 论文投稿前检查工具

[![CI](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/wcwce00-glitch/PaperAudit/actions/workflows/pages.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[立即免费体验在线版](https://wcwce00-glitch.github.io/PaperAudit/)** · [查看源码 / Star 项目](https://github.com/wcwce00-glitch/PaperAudit) · [反馈问题](https://github.com/wcwce00-glitch/PaperAudit/issues/new) · [English](README.md)

PaperAudit 面向研究生、科研人员和论文写作者。它是一个**无需注册、无需安装、优先在浏览器本地处理文档**的 Word（DOCX）投稿前预检工具。它帮助你在投稿前发现部分常见格式问题，并把检查结果导出成 HTML 或 JSON，方便修改和复查。

> **先试再判断：** 打开[在线演示](https://wcwce00-glitch.github.io/PaperAudit/)，点击“使用示例论文体验”，无需准备自己的论文。觉得有用，再给仓库点一个 Star；Star 能帮助其他研究者发现这个开源工具。欢迎提交可复现的问题和改进建议。

## 三步开始

1. **打开在线工具：** [wcwce00-glitch.github.io/PaperAudit](https://wcwce00-glitch.github.io/PaperAudit/)
2. **添加论文和可选模板：** 选择 DOCX 论文；如果要按某个期刊或会议的规范检查，再上传对应 DOCX/DOTX 模板，或 TXT/MD 作者指南。
3. **运行检查并导出报告：** 查看发现项、证据和建议，下载 HTML 或 JSON 报告。

没有论文文件也可以先用内置示例体验。建议第一次先跑示例，确认操作流程，再用你有权处理的文档。

## 它能帮你检查什么？

- **图题、表题和正文引用：** 检查支持的图表标题、编号和引用问题。
- **基础数字型引文：** 检查部分方括号数字引用与参考文献编号问题。
- **图片有效分辨率提示：** 对可解析的内嵌 PNG/JPEG，结合 Word 中的显示尺寸计算有效 PPI。
- **模板对照：** 对上传模板中可读取的页面参数、匹配的段落样式，以及当前已支持的明确要求进行对比。
- **可追溯报告：** 导出 HTML / JSON，保留检查结果及其证据，便于复查。

### 上传模板时，模板应当是主要依据

如果上传了目标模板或作者指南，具体期刊的检查应优先围绕该文件中的要求，而不是把通用规则包当成期刊官方规范。没有上传模板时，才使用内置通用预检。DOCX/DOTX 可提供可读取的版式信息；TXT/MD 提供文字要求，但不包含 Word 页面版式参数。

**重要限制：** 并非所有 Word 结构或自然语言条款都能被程序可靠解析。当前版本只会对已有检测器、且有足够证据的项目作出明确自动判断；不能可靠自动判断的规则不应被冒充为确定违规或确定合规。模板被上传也不代表其来源、版本或官方身份已经验证。请对照期刊最新的官方作者指南做最终检查。

## 隐私设计

- 普通文档解析与检查在浏览器中运行；PaperAudit 不提供论文上传服务器，也不要求创建账号。
- 请勿在公开 Issue、PR、仓库或 CI 日志中上传未发表论文、私人模板、个人信息或完整报告。
- 可选 WebLLM/Qwen 候选条款提取功能默认关闭且仍属实验功能。启用后会从第三方站点下载模型和运行组件；请阅读页面提示后再选择启用。

## 项目状态

PaperAudit v0.5.0 预览版正在持续完善。我们尤其欢迎以下贡献：

- 可公开分享的合成 DOCX 回归样例（不要使用真实未发表论文）；
- 可复现的误报 / 漏报案例及浏览器兼容性问题；
- 对模板解析、可访问性、中文说明和使用流程的改进；
- 官方作者指南的公开来源链接与版本信息。

查看[开放问题](https://github.com/wcwce00-glitch/PaperAudit/issues)、[开发路线图](docs/roadmap.md)或[贡献指南](CONTRIBUTING.md)。

## 参与项目，让更多研究者用得上

如果你试用后觉得 PaperAudit 对投稿前检查有帮助：

- **点 Star：** [在 GitHub 上 Star PaperAudit](https://github.com/wcwce00-glitch/PaperAudit)——帮助其他人发现项目。
- **分享在线版：** [直接发给同学或实验室伙伴](https://wcwce00-glitch.github.io/PaperAudit/)；建议他们先用示例体验。
- **贡献实际反馈：** [提交一个可复现问题](https://github.com/wcwce00-glitch/PaperAudit/issues/new)，注明浏览器、操作步骤、预期结果和实际结果。不要公开私人论文。

不购买 Star、不刷数据，也不夸大用户数量；项目希望通过真正有用的功能、可复现测试和持续维护建立信任。

## 本地运行与测试

需要 Python 3 和兼容的浏览器测试环境：

```bash
python -m http.server 8000
python -m pytest tests -q
python scripts/build_site.py
```

打开 `http://localhost:8000/` 运行本地页面。不要直接用 `file://` 打开，因为浏览器可能阻止 JavaScript 模块加载。GitHub Actions 会运行自动化验证；请以当前工作流结果为准。

## 许可证

项目采用 MIT 许可证。打包的 JSZip 仍适用自身的许可条款，详见 [vendor/JSZip-LICENSE.md](vendor/JSZip-LICENSE.md)。
