# Poetry 新系统 — 文档索引

本目录为按 legacy-rewrite-with-docs 技能产出的文档，供在 `poetry` 目录下进行新系统开发时使用。

**当前方案**：动态网站，使用 SQLite 存储诗词、作者、朝代、标签；列表与搜索由服务端 API 提供，页面为服务端渲染或请求 API。**技术栈**为 Node/TypeScript（Next.js 动态 + 数据脚本 gen_markdown/seed_db），详见 [技术设计文档](tech-overview.md) 与 [数据库设计](database.md)。

## 文档与步骤对应

| 步骤 | 文档 | 说明 |
|------|------|------|
| 阶段一产出 | [phase1-features-and-extensions.md](phase1-features-and-extensions.md) | 老项目分析：功能点/扩展点清单、模块与职责 |
| 产品文档 | [product-overview.md](product-overview.md) | 产品概述、用户与角色、功能列表、关键流程、非功能需求 |
| 技术设计文档 | [tech-overview.md](tech-overview.md) | 动态架构、SQLite、API、构建流程、部署与运行 |
| 数据库设计 | [database.md](database.md) | SQLite schema、seed_db、构建与运行 |
| JSON 数据源 | [json-data-source.md](json-data-source.md) | JSON 模式架构、目录结构、分片策略与使用 |
| 测试文档 | [test-overview.md](test-overview.md) | 测试范围、环境（SQLite + API）、用例、验收标准 |
| 老项目网站使用说明 | [legacy-usage-guide.md](legacy-usage-guide.md) | 老项目（aspoem）面向访客的操作说明，供新系统对照与对外介绍 |
| 老项目技术参考 | [legacy-tech-reference.md](legacy-tech-reference.md) | 老项目（aspoem）数据流、脚本、DB、API、Markdown 解析、组件与路由等技术细节，供新系统开发对照与复刻 |
| 诗词 Markdown 格式 | [markdown-format.md](markdown-format.md) | 诗词 .md 文件格式约定（路径、Frontmatter、正文区块），供完善与 gen_markdown 使用；seed_db 通过 loadAll 解析 .md 入库 |
| 诗词 .md 示例/模板 | [su-xiang-yan-si-qi-yi.md](su-xiang-yan-si-qi-yi.md) | 中间产出物（单首诗 .md）的完整示例，供 gen_markdown 产出与人工编辑参考 |
| chinese-poetry 数据源格式 | [chinese-poetry-data-formats.md](chinese-poetry-data-formats.md) | chinese-poetry 各源 JSON 格式说明，与老项目脚本对应，供数据加载与扩展参考 |
| 诗文展示样式 | [poem-style.md](poem-style.md) | 诗词详情页视觉样式与版式（标题/作者/正文与拼音），参考 诗文样式.png，与设计系统及阅读设置一致 |
| 部署与配置 | [tech-overview.md](tech-overview.md)#部署与运行 | 环境变量（DATABASE_TYPE、DATABASE_URL、DATABASE_DIR、NEXT_PUBLIC_SITE_URL、NEXT_PUBLIC_SOURCE_REPO、NEXT_PUBLIC_BAIDU_ANALYTICS_ID）等见技术设计文档「部署与运行」 |

后续若单文档体量过大，可再拆分为按模块/功能域的子文档（如 `product-poem.md`、`tech-api.md`），并在此索引中补充链接。

## 使用顺序

1. 实现与需求对照：以 **产品文档** 为需求基准，**技术设计文档** 与 **数据库设计** 为实现蓝图。
2. 测试与发布：按 **测试文档** 执行用例，满足验收标准后再发布。
3. 变更时：先更新对应文档，再改代码或用例，保持文档与代码一致；功能（如朗读、主题、贡献页、SEO）变更时同步更新 product/tech/test 对应小节。
