# PaperAudit: practical discovery and adoption plan

The goal is to help the right researchers discover a useful tool, complete a first audit, and give actionable feedback. Do not buy stars, manufacture users, spam communities, or claim traffic that has not been measured.

## 1. The one link to share

- **Live demo:** https://wcwce00-glitch.github.io/PaperAudit/
- **Repository / Star:** https://github.com/wcwce00-glitch/PaperAudit
- **Issues and reproducible feedback:** https://github.com/wcwce00-glitch/PaperAudit/issues/new

For first-time visitors, recommend the built-in sample first. It reduces friction and avoids asking people to upload unpublished manuscripts just to understand the product.

## 2. Before outreach

- Verify the live Pages build and its core assets after the relevant PRs merge and deploy.
- Keep README, website, and social copy aligned with features that are actually available on the live `main` build.
- Add a repository website URL and relevant topics using the GitHub repository **About** panel. Suggested topics: `academic-writing`, `docx`, `ooxml`, `manuscript`, `research-tools`, `open-science`, `document-processing`, `citation-checker`, `privacy-first`.
- Set a clear social preview image in **Settings → Social preview**. Use a synthetic example only; never expose a real paper, personal data, or private publisher template.
- If eligible, verify the Pages domain in Google Search Console, inspect the homepage, and submit `https://wcwce00-glitch.github.io/PaperAudit/sitemap.xml`. Sitemap submission is only a discovery hint, not a promise of indexing or ranking.

Official references: [Customize a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository), [repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics), [social preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview), [Google sitemap report](https://support.google.com/webmasters/answer/7451001).

## 3. Short launch copy

### Simplified Chinese

> 我做了一个免费的开源小工具 PaperAudit，想解决一个很具体的问题：投稿前，快速检查 Word 论文里一部分常见的图表标题/引用、数字型参考文献和图片有效分辨率问题；如果有目标模板，也可以对照当前支持的页面设置、样式和明确要求。普通检查默认在浏览器本地运行，并可导出 HTML / JSON 报告。
>
> 可以先用示例体验，不必上传自己的论文： https://wcwce00-glitch.github.io/PaperAudit/
>
> 源码： https://github.com/wcwce00-glitch/PaperAudit
>
> 目前还在持续改进，特别欢迎可复现的误报、漏报、中文模板解析和浏览器兼容性反馈。它不是期刊合规认证，也不能自动理解所有 Word 格式和自然语言要求。请不要在公开反馈里上传未发表论文或私人模板。如果工具对你有帮助，欢迎给 GitHub 仓库点 Star，让更多研究者有机会发现它。

### English

> I’m building PaperAudit, a free, open-source browser tool for preflighting Word research manuscripts. It checks a supported subset of figure/table captions and references, basic numeric citations, and effective PPI for supported embedded images. With a target template, it can compare readable page settings, matched styles, and explicit requirements supported by current checkers. Ordinary checks run locally in the browser, with HTML/JSON report export.
>
> Try the sample without uploading your own paper: https://wcwce00-glitch.github.io/PaperAudit/
>
> Source: https://github.com/wcwce00-glitch/PaperAudit
>
> I welcome reproducible false-positive/false-negative reports, Chinese template examples made from synthetic data, and browser-compatibility feedback. This is a preflight assistant, not a journal-compliance certification, and it cannot interpret every Word feature or natural-language rule. Please do not post unpublished manuscripts or private templates. If it helps your workflow, a GitHub Star helps other researchers discover it.

Personalize each post for the audience and disclose that you are the maintainer. Do not paste identical promotions into many communities.

## 4. Where to share thoughtfully

Start with a few relevant places rather than broadcasting everywhere:

- Research-software and open-science groups that welcome project demos.
- University library, research-support, writing-centre, and graduate-student communities; ask for usability feedback, not endorsements.
- A personal professional-network post aimed at researchers who use Word templates.
- Relevant Reddit communities only when their current rules permit project sharing. Participate genuinely and do not cross-post identical promotions. Read [Reddit's spam guidance](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam).
- Hacker News only when current submission rules permit it. Read [Show HN guidance](https://news.ycombinator.com/showlim) and [site guidelines](https://news.ycombinator.com/newsguidelines.html); never try to bypass posting restrictions.

Avoid unsolicited mass messages and paid star campaigns. A specific, reproducible demo and a transparent limitation statement build more trust than hype.

## 5. A realistic first-month cadence

- **After release:** test the public demo on desktop/mobile-sized viewports, check links, and confirm the deployed version matches the README.
- **Week 1:** share with a small number of relevant researchers and ask them to complete the sample audit; capture where they get stuck.
- **Week 2:** fix one real onboarding or false-positive problem, then share the concrete change and test evidence.
- **Week 3:** publish one synthetic before/after example showing what the tool can and cannot detect.
- **Week 4:** review GitHub **Insights → Traffic**, referrers, issues, PRs, and sample completion feedback. Do not infer success from stars alone.

A useful early signal is an unfamiliar user successfully completing an audit or reporting a reproducible issue. Keep claims tied to measured results.
