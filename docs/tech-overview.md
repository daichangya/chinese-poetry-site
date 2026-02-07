# Poetry 新系统 — 技术设计文档（动态 + SQLite）

## 概述

- **形态**：**服务端动态渲染**，数据来自 SQLite，无静态导出；列表与详情由服务端或 API 按需提供。
- **技术栈**：**Node/TypeScript**（Next.js 动态 + 数据脚本）；数据脚本为 `scripts/gen_markdown.ts`、`scripts/seed_db.ts`、`scripts/ensure_poems_then_build.ts`，与 Next 同仓、共用类型，单运行时。
- **与老项目关系**：poetry 为独立子目录/子应用；数据模型与 searchText 拼接规则**参考**老项目；新系统使用 SQLite 存储，由 seed_db 从 .md 入库。

## 整体架构

### 构建时

1. **中间产出物**：网站内容由 **POEMS_DIR 下的 .md 文件**（每首诗一个）生成，实际路径为 `POEMS_DIR/poems/<author_slug>/<titleSlug>.md`。若 POEMS_DIR 内无 .md，需先运行 `scripts/gen_markdown.ts` 从 chinese-poetry JSON 生成 .md；之后可在 `POEMS_DIR/poems/` 内人工编辑完善。**作者简介**：可运行 `npm run gen_author_bio`（`scripts/gen_author_markdown.ts`）从 chinese-poetry 作者 JSON（宋词/全唐诗/五代等）生成 `POEMS_DIR/poems/<author_slug>/bio.md`，与该作者的诗词 .md 同目录。
2. **数据入库**：`scripts/seed_db.ts` 使用 `lib/load_data.ts` 的 `loadAll()` 从 POEMS_DIR（若存在 `poems` 子目录则从该目录）扫描并解析诗词 .md（**排除** bio.md/_bio.md），得到 poems、authors、dynasties、tags；同时用 `lib/load_author_bios.ts` 扫描各 `poems/<author_slug>/bio.md` 得到作者简介，写入 SQLite 的 `authors.description`。详见 [database.md](database.md)。
3. **渲染与构建**：`npm run build` 调用 `scripts/ensure_poems_then_build.ts`，串联「若 POEMS_DIR 空则 gen_markdown → **seed_db** → next build」；Next.js 构建产出 `.next/`，无静态导出目录 `out/`。

### 运行时

- **动态**：Next 以 Node 服务运行（`next start` 或托管平台）；页面与 API 通过 `lib/db/queries.ts` 读 SQLite。
- **数据流**：用户访问列表/搜索/朝代/作者 → 服务端或前端请求 **API**（如 GET `/api/poems?dynasty=&q=&tag=&page=&limit=`、`/api/dynasties`、`/api/authors`、`/api/poems/random?n=`）→ 服务端查库返回 JSON → 展示结果并链接到诗/作者详情页。诗/作者详情由服务端按 slug 查库渲染。

### 构建产物与 API

- **构建产物**：`.next/`（Next 构建输出）；可选 `data/poetry_index.db`（SQLite 单库，由 `DATABASE_DIR` 或默认目录指定）。
- **API 路由一览**：

| 路径 | 说明 |
|------|------|
| `GET /api/poems` | 诗词列表/搜索，参数：dynasty、q、tag、page、limit |
| `GET /api/poems/random?n=` | 随机 n 首诗（slug/title/author_name），供首页推荐与随机一首 |
| `GET /api/authors?offset=&limit=` | 作者列表分页 |
| `GET /api/dynasties` | 朝代列表 |
| `GET /api/tags` | 标签列表 |

### 数据流（简要）

```mermaid
flowchart LR
  md[POEMS_DIR 下 .md]
  seed[seed_db loadAll]
  db[(SQLite)]
  next[next build]
  nextDir[.next 目录]
  md --> seed
  seed --> db
  db --> next
  next --> nextDir
```

运行时：页面/API → lib/db → SQLite。

## URL 与路径规则

- **页面**：`/`、`/poems`、`/poems/[slug]`、`/poems/random`、`/authors`、`/authors/[slug]`、`/dynasties`、`/contribute` 等由 Next 路由提供；诗/作者详情按 slug 服务端查库渲染。
- **API**：见上表；无静态路径 `/data/poems/search/*.json`。

### Slug 生成规则

与 `scripts/load_data.ts`（或 lib）中 slug 逻辑一致，约定为**无声调拼音 + 连字符**（与老项目 create-md 的 genSlug 一致）。seed_db 使用的 loadAll 解析 .md 时沿用同一规则。

- **诗 slug**：`titleSlug + "-" + authorSlug`（或等价实现）；冲突时追加 `-2`、`-3`…
- **作者 slug**：中文作者名 → 拼音连字符。
- **朝代 slug**：由数据源或 poem 的 dynasty_name 推导（如 tang、song、mengxue）。

### 链接与 base_path

子页内链使用 Next.js `<Link>`，相对站点根；部署时按站点根 URL 配置即可。

## 列表与分页

- **分页**：由 API 支持。`GET /api/poems?page=&limit=`、`/api/authors?offset=&limit=` 等返回分页数据与 total，前端或服务端组件按需请求。
- **诗词列表**：`/poems` 页请求 `/api/dynasties`、`/api/authors`、`/api/tags`、`/api/rhythmics` 与 `/api/poems`（按 dynasty/q/tag/rhythmic 筛选）；服务端分页。
- **作者列表**：`/authors` 服务端分页调用 `getAuthors(offset, limit)` 或请求 `/api/authors`。

## 搜索方案

- **数据来源**：SQLite；由 `lib/db/queries.ts` 提供 `searchPoems(q, offset, limit)`、`getPoemsByDynasty`、`getPoemsByTag`、`getPoemsByAuthorSlug` 等。
- **API**：列表/搜索统一为 `GET /api/poems?dynasty=&q=&tag=&rhythmic=&page=&limit=`；q 为关键词时服务端查库过滤（标题/作者等），朝代/标签/词牌/作者名由参数指定后服务端查库。词牌列表：`GET /api/rhythmics` 返回 `{ slug, name, poem_count }[]`；`rhythmic` 参数支持词牌名或 slug。
- **随机与首页推荐**：`GET /api/poems/random?n=` 由服务端从库中随机取 n 首返回。

详见 [database.md](database.md) 与 [poems-search-index.md](poems-search-index.md)（后者保留历史静态分片设计说明，当前默认不生成该结构）。

## 部署与运行

- **运行方式**：将 Next 应用以 Node 服务部署（`next start` 或 Vercel 等托管自动启动）。需 SQLite 单库（默认 `./data/poetry_index.db`）随应用或挂载卷可写可读。
- **环境变量**（可选，见 `.env.example`）：`DATABASE_TYPE`（sqlite | postgres）、`DATABASE_URL`（PostgreSQL 连接串）、`DATABASE_DIR`（SQLite 数据目录）；`BUILD_SSG_POEM_LIMIT` / `BUILD_SSG_AUTHOR_LIMIT`（分层 SSG，见下）；`NEXT_PUBLIC_SITE_URL`（sitemap、robots、canonical、Open Graph）；`NEXT_PUBLIC_SOURCE_REPO`（导航栏 GitHub 与详情页纠错链接）；`NEXT_PUBLIC_BAIDU_ANALYTICS_ID`（百度统计，不配置则不加载）。

## 规模与部署（如 40 万诗）

Vercel 的上限不在 DB 大小，而在**单次构建生成的页数**。40 万诗存 SQLite（约 150～300 MB）可部署，但**禁止对 40 万页做全量 SSG**（会导致构建超时、内存爆炸）。

**推荐策略**：

- **分层 SSG**：诗详情从**指定热门选集 tag**（代码内 curated 列表或环境变量 `BUILD_SSG_TAG_SLUGS`）合并去重后取前 `BUILD_SSG_POEM_LIMIT` 首预渲染；作者按 `BUILD_SSG_AUTHOR_LIMIT` 预渲染。设为 0 则不预渲染，全部按需生成。
- **其余页面**：诗/作者详情未在 `generateStaticParams` 中的 slug 仍可访问（`dynamicParams = true`），首次访问时按需渲染，效果等同动态/ISR。
- **列表与搜索**：不 SSG，始终由 API 或服务端按请求查询。

**安全做法一览**：

| 项目 | 是否安全 |
|------|----------|
| 40 万诗存 SQLite | 是 |
| 构建期只读查询、带 LIMIT/索引 | 是 |
| 只 SSG 1～3 万首诗 + 若干作者页 | 是 |
| 40 万页全量 SSG | 否（禁止） |

详见 [database.md](database.md) 的索引与规模注意事项。

## 模块划分（动态）

| 模块 | 职责 | 实现方式 |
|------|------|----------|
| 诗词 poem | 列表（分页）、按朝代/标签/词牌/关键词、详情、随机 | 服务端 API 查 DB（/api/poems、/api/poems/random）；详情页服务端 getPoemBySlug |
| 作者 author | 列表、详情、作者下诗词 | 服务端或 API（/api/authors、getAuthorBySlug、getPoemsByAuthorSlug） |
| 朝代 dynasty | 列表、与诗词/作者关联 | /api/dynasties、getDynasties、getPoemsByDynasty |
| 标签 tag | 诗词标签展示、按标签筛诗 | /api/tags、getPoemsByTag |
| 词牌 rhythmic | 列表（从 poems.rhythmic 聚合）、按词牌筛诗 | /api/rhythmics、getPoemsByRhythmic、countPoemsByRhythmic |
| 认证 / 后台 / Webhook | 登录、后台管理、Webhook | **本期不实现** |

## 全局头部

- **布局**：左侧为 Logo/首页、诗文、诗人、朝代等主导航；**右侧**为**搜索框**、**主题切换下拉**与 **GitHub**。搜索为请求 `/api/poems?q=...` 等，结果在输入框下方或列表区展示。

## 接口与数据流

- **列表**：API 分页（/api/poems、/api/authors）；诗词列表页可客户端请求 API 或服务端组件直接调 lib/db。
- **详情**：服务端按 slug 查库渲染（getPoemBySlug、getAuthorBySlug）。
- **搜索**：通过 `/api/poems?q=&dynasty=&tag=` 由服务端查库返回。

### 诗详情页布局与阅读设置

（与静态方案一致）主内容区 + 右侧边栏（纠错与完善、阅读设置、朗读、作者信息、同朝代诗词）；正文与拼音、阅读设置（简繁/字体/拼音显隐/原文注解）、朗读、作者信息等逻辑不变，仅数据来源为服务端 getPoemBySlug 等。

## 数据生成与调整

### 中间产出物（Markdown 层）与完善流程

- **POEMS_DIR** 为**内容完善入口**：每首诗对应一个 `.md` 文件。构建时 **seed_db** 仅从 POEMS_DIR 加载 .md（通过 loadAll），不直接读 chinese-poetry JSON。
- **生成 Markdown**：运行 `npm run gen_markdown` 从 chinese-poetry JSON 生成 .md；之后在 POEMS_DIR 内编辑 .md，再执行 `npm run seed:db` 与 `npm run build` 即可更新库与站点。
- **Markdown 文件格式**：与 [markdown-format.md](markdown-format.md) 一致；seed_db 通过 loadAll 解析 .md 入库，约定与 load_data 解析一致。

### 作者与朝代生成

- **由 poems 推导**：seed_db 中由 poems 推导 authors、dynasties、tags 并写入对应表。
- **作者简介**：seed_db 从 `POEMS_DIR/poems/<author_slug>/bio.md`（由 `npm run gen_author_bio` 从 chinese-poetry 作者 JSON 生成）读取简介正文，写入 `authors.description`；作者详情页若有 description 则展示「生平」区块。

### 调整方式

- **增删改诗词内容**：在 POEMS_DIR 下修改对应 .md，再执行 `npm run seed:db`（及如需则 `npm run build`）。
- **修改推导或 slug 逻辑**：改 `lib/load_data.ts` 或相关类型，再 seed_db 与构建。

## 数据与结构

- **运行时数据**：SQLite（poems、authors、dynasties、tags 表）；由 `lib/db/queries.ts` 封装查询，仅服务端使用（server-only 或 API Route）。seed_db 内部通过 loadAll 解析 POEMS_DIR 下 .md 写入 SQLite。标签：tags 表为 slug + name（中文），全站展示用 name；poems 表 tags 列存 slug 数组供 getPoemsByTag 查询。详见 [database.md](database.md)。

## 技术选型与约束

- **构建**：Next.js 动态构建，产出 `.next/`；无 `output: 'export'`。
- **数据脚本**：**Node/TypeScript**（gen_markdown、**seed_db**、ensure_poems_then_build），与 Next 同仓、共用类型。
- **扩展点**：数据更新通过重新跑 `npm run seed:db` 并重新部署或重启服务完成，无在线管理后台。

## 技术栈说明

- **当前采用**：**Node/TypeScript** 全栈——Next.js 动态 + SQLite（better-sqlite3）+ 数据脚本（gen_markdown、seed_db、ensure_poems_then_build），单运行时，便于 Vercel 等托管部署、类型共享与维护。

## 文档与代码对应

- 产品文档中的功能列表在本设计中对应**动态页面与 API**。
- 测试文档中的用例对应**构建后的 Next 服务与 API 行为**，验收标准与本文档约束一致。
