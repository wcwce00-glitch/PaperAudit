# Visibility, sharing and adoption plan

This document is a practical, low-noise outreach checklist for PaperAudit. The goal is **real users, useful feedback and repeatable maintenance**, not artificial stars or traffic. Re-check each community's current rules before posting.

## 1. Make the first visit successful

- Link directly to the live tool, not just the repository. A new visitor should be able to try the synthetic sample without registration.
- Keep the privacy promise precise: normal checks run in the browser; optional WebLLM downloads third-party assets and is experimental until real inference passes a supported-browser smoke test.
- Link prominent source-code and bug-report actions from the homepage.
- Use the current stable website honestly. Describe the v0.5.0 Strict OOXML work as a preview until PR #3 is merged and the deployed site is verified.
- Invite **one useful action**: try the sample and report a reproducible issue, or star the repository if the project is genuinely useful.

## 2. Complete repository discoverability settings

On GitHub, open the repository, then use the **About** gear and repository Settings.

Suggested description:

> Privacy-first browser-based DOCX preflight for research manuscripts: captions, citations, image PPI, and traceable template checks.

Suggested website:

> https://wcwce00-glitch.github.io/PaperAudit/

Suggested topics (choose those most relevant to the intended audience):

`academic-writing`, `docx`, `ooxml`, `manuscript`, `research-tools`, `open-science`, `document-processing`, `citation-checker`, `privacy-first`, `javascript`, `github-pages`

In **Settings → Social preview**, upload a clear branded PNG/JPG/GIF preview under 1 MB. GitHub recommends at least 640×320 px and 1280×640 px for best display. Do not use a screenshot containing a real manuscript or confidential text.

Official guidance: [customize your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository), [repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics), [social preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview).

## 3. Help search engines discover the live site

The site publishes a canonical URL, page description, crawler rules and a sitemap. After a merge/deployment:

1. Verify ownership of the site in [Google Search Console](https://search.google.com/search-console/about) if you control a suitable property.
2. Use URL Inspection to inspect the public homepage; submit `https://wcwce00-glitch.github.io/PaperAudit/sitemap.xml` in the Sitemaps report.
3. Check that the deployed page really reflects the intended release and that key assets return HTTP 200.
4. Check GitHub's **Insights → Traffic** periodically. Look at visitors, popular content and referrers instead of treating repository stars as the only measure.
5. Give crawlers time to revisit the site. Sitemap submission is a discovery hint, not a guarantee of indexing, ranking or a particular search-result appearance.

References: [Google's sitemap report](https://support.google.com/webmasters/answer/7451001), [software app structured data guidance](https://developers.google.com/search/docs/appearance/structured-data/software-app).

## 4. Reach the right audiences

Start with communities where DOCX, research writing, reproducible science, open-source utilities or scholarly publishing are already being discussed. A useful post should explain the problem solved, link to a working demo, state the limitations, and invite a concrete kind of feedback.

Potential channels:
- Academic writing and research-support groups; ask librarians, writing-centre staff and research-software communities whether they would trial the tool.
- Relevant professional networks (for example, an authentic LinkedIn post aimed at researchers or research-software developers).
- Reddit communities only when their current rules permit project sharing. Participate genuinely and do not cross-post identical promos or send unsolicited messages. Reddit warns that repeated unwanted promotion can be treated as spam: [official spam guidance](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam).
- Hacker News only when its current submission rules permit it and the project is ready for discussion. As checked on 2026-10-18, its Show HN page says it is temporarily restricting Show HN posts from users unfamiliar with the community; do not attempt to bypass that restriction. Read the [current Show HN guidance](https://news.ycombinator.com/showlim) and [site guidelines](https://news.ycombinator.com/newsguidelines.html) first.

Do not buy stars, ask people to manipulate votes, mass-post links, or claim a user base that does not exist. Respond to criticism and ship fixes; credible maintenance tends to build trust more durably than one burst of promotion.

## 5. Ready-to-edit launch copy

### English

> PaperAudit is a free, open-source browser tool for preflighting Word research manuscripts. It checks common figure/table caption and cross-reference issues, basic bracket-numbered citations, and supported embedded PNG/JPEG effective PPI. Normal document checks run locally in the browser, with HTML and JSON report export.
>
> Try the live demo: https://wcwce00-glitch.github.io/PaperAudit/
>
> Source and issues: https://github.com/wcwce00-glitch/PaperAudit
>
> I welcome reproducible feedback on false positives, synthetic DOCX numbering cases, accessibility and browser compatibility. Please do not post unpublished manuscripts or private publisher templates. The Strict OOXML v0.5.0 preview is under review; the optional WebLLM path is experimental.

### 简体中文

> PaperAudit 是免费的开源 Word 论文投稿前预检工具，可检查常见图题/表题及正文引用、基础数字型参考文献，并对支持的内嵌 PNG/JPEG 提供有效 PPI 提示。普通检查在浏览器本地运行，可导出 HTML / JSON 报告。
>
> 在线体验：https://wcwce00-glitch.github.io/PaperAudit/
>
> 源码与问题反馈：https://github.com/wcwce00-glitch/PaperAudit
>
> 欢迎反馈可复现的误报、合成 DOCX 编号案例、无障碍问题和浏览器兼容性。请勿公开未发表论文或私人期刊模板。v0.5.0 Strict OOXML 升级仍在审查中，可选 WebLLM 功能仍处于实验阶段。

Edit the copy into your own voice for each community; do not post it unchanged to many places.

## 6. Cadence and success measures

- **After deployment:** verify the live build, repository About section, social preview and Search Console.
- **First week:** invite a small number of relevant researchers to try the sample and file concrete issues; respond to each report.
- **After feedback:** ship one meaningful usability or false-positive improvement, then share the change with an example.
- **Monthly:** review GitHub Traffic, incoming issues/PRs, external referrals and whether first-time users complete a sample audit.

A useful initial success signal is a stranger reporting a real, reproducible problem or successfully completing an audit—not a vanity metric. Keep a dated changelog of what was actually tested and released.
