# 诗词站（chinese-poetry-site）

基于 Next.js 与 SQLite、[chinese-poetry](https://github.com/daichangya/chinese-poetry) 数据源的中文诗词阅读网站。构建时从中间产出物（每首诗一个 .md）入库，运行时由服务端读库与 API 提供数据。

## 功能概览

- **浏览与检索**：诗词列表、按朝代/作者/标签筛选、全局搜索（服务端 API 查询）
- **诗词详情**：正文、拼音、注释、译文、赏析；阅读设置（简繁、正文字体、拼音显隐等）
- **朗读与主题**：详情页朗读全文、多套主题切换；贡献指南（/contribute）
- **动态站点**：数据存于 SQLite，列表与搜索由服务端 API 提供，可部署为 Node 服务


## 技术栈

Next.js（动态渲染）、TypeScript、Tailwind CSS、SQLite（better-sqlite3）；数据脚本（tsx）：chinese-poetry JSON → `gen_markdown` → .md → `seed_db` 入库 → Next 构建与运行。

## 仓库关系

- **本站代码**：[chinese-poetry-site](https://github.com/daichangya/chinese-poetry-site)（本仓库）
- **诗词数据**：[chinese-poetry](https://github.com/daichangya/chinese-poetry)（JSON 数据源，位于项目内 `chinese-poetry/` 目录，**不纳入本仓库版本库**，需单独克隆）
- **中间 .md 产出**：[chinese-poetry-md](https://github.com/daichangya/chinese-poetry-md)（`gen_markdown` 生成的诗词 .md 可推送到该独立仓库；默认产出目录 `chinese-poetry-md/` 已被 .gitignore，不纳入本站版本库）

若需从零生成诗词 .md 并构建站点，请先将数据源克隆到 `chinese-poetry/` 目录。本站页脚与贡献页均标明数据来源 [chinese-poetry](https://github.com/daichangya/chinese-poetry)。

## 环境要求

- Node.js（建议 18+）
- npm 或 pnpm

## 克隆与构建

```bash
# 1. 克隆本站
git clone https://github.com/daichangya/chinese-poetry-site
cd chinese-poetry-site

# 2. 若需从零生成 .md（POEMS_DIR 为空时构建会先跑 gen_markdown），请先克隆数据源
git clone https://github.com/daichangya/chinese-poetry chinese-poetry

# 3. 安装依赖并构建
npm install
npm run build
```

若本仓已包含预生成的 `chinese-poetry-md/` 目录（或通过 POEMS_DIR 指定了已有 .md 的目录），可省略步骤 2，直接 `npm install && npm run build`。

## 脚本与命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发（需先有 chinese-poetry-md/ 或先跑过 gen_markdown，且已执行过 seed:db 或 build） |
| `npm run build` | 完整构建（无 POEMS_DIR 内 .md 时自动 gen_markdown → **seed:db** → next build） |
| `npm run gen_author_bio` | 从 chinese-poetry 作者 JSON 生成作者简介到 POEMS_DIR/\<author_slug\>/bio.md（需先有 chinese-poetry 数据） |
| `npm run gen_markdown` | 从 chinese-poetry 生成诗词 .md 到 POEMS_DIR（默认 chinese-poetry-md/） |
| `npm run seed:db` | 从 POEMS_DIR 解析 .md 与各作者 bio.md 写入单库（默认 data/，见 [docs/database.md](docs/database.md)） |
| `npm run load_data` | 从 POEMS_DIR 生成 data/ 下 JSON 与搜索索引（仅当需要静态 JSON 或与 build:batched 配合时使用；默认构建不依赖） |
| `npm run push:md` | 准备将 POEMS_DIR 推送到 chinese-poetry-md 仓库（校验 git、remote，执行 git add 并输出提交/推送命令） |
| `npm run init:md-repo` | 将 templates/chinese-poetry-md 下的 README、.gitignore、git-add-n.sh 等复制到 POEMS_DIR，便于 chinese-poetry-md 仓库展示与维护 |
| `npm run build:batched` | 分批构建（base → 多批 poems → 多批 authors，合并 out/），仅需静态导出时使用；默认动态构建不需要 |
| `npm run test` | 运行单元测试 |
| `npm run check:build` | 检查构建产物（可选） |

## 目录结构（简要）

- `app/` — Next 页面与路由（含 API 路由）
- `components/` — 公共组件
- `lib/db/` — SQLite 连接、schema、查询（服务端）
- `scripts/` — 数据脚本（gen_markdown、seed_db、load_data、ensure_poems_then_build 等）
- `chinese-poetry-md/` — 中间产出物（每首诗一个 .md，构建用；可推送到 [chinese-poetry-md](https://github.com/daichangya/chinese-poetry-md)，见下方「上传 .md」）
- `docs/` — 产品/技术/测试文档
- `.next/` — 构建输出（运行需 `next start`）
- `data/poetry_index.db` — SQLite 单库（默认在 **data/** 下，可由 DATABASE_DIR 指定目录；建议在项目根执行 build/seed:db。Vercel 部署详见 [docs/database.md](docs/database.md)#vercel-部署）
- `chinese-poetry/` — 数据源（需单独克隆，且被 .gitignore）

## 将 .md 上传到 chinese-poetry-md 仓库

生成的诗词 .md 可推送到独立仓库 [chinese-poetry-md](https://github.com/daichangya/chinese-poetry-md)，便于版本管理与协作。

**方式一：先克隆 chinese-poetry-md，再生成到该目录**

```bash
# 在项目根外克隆（或克隆到项目内，需在 .gitignore 中排除该子目录）
git clone https://github.com/daichangya/chinese-poetry-md chinese-poetry-md
# 指定产出目录并生成
POEMS_DIR=./chinese-poetry-md npm run gen_markdown
# 准备推送（会执行 git add，并输出 commit/push 命令）
npm run push:md
# 按提示在 POEMS_DIR 内执行：git commit -m "..." && git push
```

**方式二：生成到默认 chinese-poetry-md/ 后，再初始化为该仓库**

```bash
npm run gen_markdown   # 生成到默认 chinese-poetry-md/
npm run push:md       # 若目录尚未是 git 仓库，会提示 init 与 remote；已存在则做 git add 并输出提交/推送命令
```

环境变量：`POEMS_DIR` 默认 `./chinese-poetry-md`；`CHINESE_POETRY_MD_REPO` 默认 `https://github.com/daichangya/chinese-poetry-md`（用于校验 remote 与提示），可在 `.env` 中覆盖。

**首次或需更新 chinese-poetry-md 的 README/.gitignore 等**：在本站执行 `npm run init:md-repo`，会将 `templates/chinese-poetry-md/` 下的 README.md、.gitignore、git-add-n.sh 等复制到 POEMS_DIR；再将 POEMS_DIR 内变更一并通过 `npm run push:md` 后按提示 commit/push 即可。

## 运行与测试

### 运行

**开发模式**（本地调试，默认 http://localhost:3000）：

```bash
npm install
npm run seed:db    # 将 POEMS_DIR 内 .md 写入 SQLite（若尚未执行过 build 或 seed:db）
npm run dev
```

若无 `chinese-poetry-md/`（或 POEMS_DIR）内 .md，需先克隆数据源并生成 .md：`git clone ... chinese-poetry`，再执行 `npm run gen_markdown`，然后 `npm run seed:db` 与 `npm run dev`。或直接执行 `npm run build`（会自动 gen_markdown → seed:db → next build），再 `npm run dev`。

**生产模式**（构建后本地运行）：

```bash
npm run build      # 含 seed:db，产出 .next/
npm run start      # 启动生产服务，默认 http://localhost:3000
```

### 测试

- **单元测试**：`npm run test`（Vitest，如 load_data、slug 等）。
- **构建检查**：先 `npm run build`，再 `npm run check:build`（检查 .next 存在）。
- **功能验证**：在浏览器访问首页、诗词列表（朝代/标签/搜索）、诗词详情、作者列表与详情、朝代列表；或直接请求 API，如 `/api/dynasties`、`/api/poems?dynasty=tang&page=1&limit=5`、`/api/poems/random?n=3`。

| 场景     | 命令 |
|----------|------|
| 开发     | `npm run seed:db` → `npm run dev` |
| 生产构建 | `npm run build` |
| 生产运行 | `npm run start` |
| 单元测试 | `npm run test` |
| 构建检查 | `npm run build` → `npm run check:build` |

## 部署

构建产物在 `.next/`，需以 Node 服务运行（`next start` 或托管平台自动启动）。可部署到 Vercel 等支持 Next 动态的托管；构建命令为 `npm run build`，无需再合并 out/。大规模（如 40 万首）时的规模边界与分层 SSG 策略见 [技术设计·规模与部署](docs/tech-overview.md)。若需 sitemap、统计、纠错链接，见环境变量表与 [技术设计·部署与运行](docs/tech-overview.md)。

**预渲染的静态页在哪？** 分层 SSG 生成的 HTML 在 `.next/server/app/` 下：诗详情为 `.next/server/app/poems/<slug>.html`，作者详情为 `.next/server/app/authors/<slug>.html`。构建日志会显示 `Generating static pages (164/164)` 及 `● (SSG)` 路由。这些页面由 `next start` 直接提供，不会单独导出到 `out/` 目录。

**Vercel 部署**：  
- 构建产物为 `.next/`，Vercel 直接支持，无需 `out/` 静态导出。  
- **数据来源**：仓库内若已存在 `data/poetry_index.db`，构建会自动跳过 seed_db，直接执行 next build，运行时使用该单库；适合在 Vercel 上无 chinese-poetry-md 数据源时使用。操作：本地执行 `npm run gen_markdown` 与 `npm run seed:db` 生成 `poetry_index.db` 后，将 `data/` 下该文件提交到仓库即可。  
- 若未提交单库（`data/poetry_index.db`），Vercel 构建会执行 seed_db，但 `chinese-poetry-md/` 在 .gitignore 中，构建时无 .md 数据会得到空库。  
- 若平台内存不足可设 `NODE_OPTIONS=--max-old-space-size=3072`。

## 环境变量（可选）

| 变量 | 说明 |
|------|------|
| `DATABASE_TYPE` | 数据库类型：`sqlite`（默认）或 `postgres`；与 `DATABASE_URL` 配合切换。切换到 PostgreSQL 的步骤见 [docs/database.md](docs/database.md)#多数据库切换 |
| `DATABASE_URL` | PostgreSQL 连接串（当 `DATABASE_TYPE=postgres` 时必填）；SQLite 时忽略 |
| `DATABASE_DIR` | SQLite 单库数据目录（poetry_index.db 所在目录），默认项目根下 `data/`；未设置时自动尝试 `public/data/`（兼容旧路径） |
| `BUILD_SSG_POEM_LIMIT` / `BUILD_SSG_AUTHOR_LIMIT` | 分层 SSG：构建时预渲染前 N 首/前 M 个作者（未设置时默认 100/50），设为 0 则不预渲染；大规模见 [技术设计·规模与部署](docs/tech-overview.md) |
| `CHINESE_POETRY_DIR` | 诗词 JSON 数据目录，默认 `./chinese-poetry`（gen_markdown 使用） |
| `CHINESE_POETRY_ROOT` | 同 CHINESE_POETRY_DIR；gen_author_bio 读取作者 JSON 时的根目录，默认 `./chinese-poetry` |
| `NODE_BUILD_MAX_OLD_SPACE_SIZE` | `next build` 子进程 Node 堆上限（MB），默认 4096；Vercel 可设为 3072 |
| `BUILD_POEM_LIMIT` / `BUILD_AUTHOR_LIMIT` | 分批构建时每批数量，默认 2000/3000；仅 `build:batched` 使用（静态导出场景） |
| `POEMS_DIR` / `POEMS_OUTPUT_DIR` | 中间产出物 .md 目录，默认 `./chinese-poetry-md`；可设为已克隆的 [chinese-poetry-md](https://github.com/daichangya/chinese-poetry-md) 目录以便推送 |
| `CHINESE_POETRY_MD_REPO` | .md 上传目标仓库 URL，默认 `https://github.com/daichangya/chinese-poetry-md`；`push:md` 用于校验 remote 与提示 |
| `NEXT_PUBLIC_SITE_URL` | 站点根 URL（sitemap、robots、canonical 等） |
| `NEXT_PUBLIC_SOURCE_REPO` | .md 仓库地址：导航栏 GitHub、详情页「纠错与完善」、页脚纠错链接（默认 chinese-poetry-md） |
| `NEXT_PUBLIC_BAIDU_ANALYTICS_ID` | 百度统计 ID，不配置则不加载 |

详见 [docs/README.md](docs/README.md) 与 [技术设计·部署与运行](docs/tech-overview.md)。

## 文档与贡献

- [docs/README.md](docs/README.md) — 文档索引与使用顺序
- [技术设计](docs/tech-overview.md) — 架构、数据流、部署
- [产品与测试](docs/product-overview.md)、[test-overview.md](docs/test-overview.md)
- [贡献指南](CONTRIBUTING.md) — 纠错与完善、参与贡献说明

参与内容纠错与完善见站内贡献指南或 [.md 仓库 PR](https://github.com/daichangya/chinese-poetry-md/pulls)。

## License

MIT
