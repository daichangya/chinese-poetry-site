# 数据库设计（单库，支持 SQLite / PostgreSQL / Turso / JSON）

诗词站使用**单库**或 **JSON 静态文件**存储全量诗词、作者、朝代、标签，供 Next 服务端在运行时查询。支持 **SQLite**、**PostgreSQL**、**Turso** 与 **JSON 数据源**，通过环境变量随时切换。

## 设计决策

- **多数据库类型**：`DATABASE_TYPE=sqlite`（默认）使用 better-sqlite3，单文件 `poetry_index.db`；`DATABASE_TYPE=postgres` 且配置 `DATABASE_URL` 时使用 PostgreSQL（pg 驱动）；`DATABASE_TYPE=turso` 且配置 `TURSO_DATABASE_URL` 时使用 Turso Cloud（LibSQL，SQLite 兼容）；`DATABASE_TYPE=json` 时使用静态 JSON 文件（`public/data/*.json`），无需数据库，适合 Vercel 无库部署。业务层统一通过 `lib/db/queries` 读数据；SQL 路径使用 `getDb()` 与 `?` 占位符，JSON 路径由 `lib/data-json` fetch 或读本地文件。
- **单库**：所有表（poems、authors、dynasties、tags、poem_tags、poem_content、schema_version）在同一库中。列表/筛选/详情均查此库。
- **SQLite 路径**：默认目录为项目根下的 `data/`；可通过 `DATABASE_DIR` 指定。单库路径为 `{DATABASE_DIR}/poetry_index.db`。若存在 `public/data/poetry_index.db` 也会被识别（兼容旧路径）。PostgreSQL 时忽略 `DATABASE_DIR`。
- **拼音**：不再落库；详情请求时用 `toPinyinToneNum` 对标题与正文实时计算。
- **数据来源**：由 `scripts/seed_db.ts` 从 POEMS_DIR 下的 .md 经 `loadAll()` 解析后写入；无运行时写库。seed 时按 dialect 使用 `INSERT OR REPLACE`（SQLite）或 `INSERT ... ON CONFLICT DO UPDATE`（PostgreSQL）。

## PRAGMA 与初始化

- 打开库后自动执行：`PRAGMA journal_mode = WAL;`、`PRAGMA page_size = 4096;`（非 Vercel 只读时）。
- 表结构按 `schema_version` 做版本化迁移；`createTables(db)` 创建所有表。自 V2 起压缩列使用 BLOB/BYTEA；从 V1 升级时会将 poem_content、poem_tags、poems、authors 重建为 V2 结构，**需重新执行 `npm run seed:db`** 写入数据。

## Schema（单库）

#### schema_version

| 列 | 类型 | 说明 |
|----|------|------|
| version | INTEGER PK | 当前结构版本 |
| update_time | TEXT | 更新时间 |

#### poems（轻表，列表/首页/SSG 只查此表）

| 列 | 类型 | 说明 |
|----|------|------|
| slug | TEXT PK | 诗的唯一标识，对应 URL |
| title | TEXT | 标题 |
| author_slug | TEXT | 作者 slug，关联 authors.slug |
| dynasty_slug | TEXT | 朝代 slug，关联 dynasties.slug |
| rhythmic | TEXT | 词牌名（可选） |
| excerpt | TEXT | 列表用摘要（首句截断） |

#### poem_content

| 列 | 类型 | 说明 |
|----|------|------|
| slug | TEXT PK | 关联 poems.slug |
| paragraphs | BLOB/BYTEA | 正文 JSON（超 200 字节 gzip，否则 UTF-8） |
| translation | BLOB/BYTEA | 译文（可选，同上压缩） |
| appreciation | BLOB/BYTEA | 赏析（可选） |
| annotation | BLOB/BYTEA | 注释（可选） |

**V2 存储**：自 schema_version=2 起，上述四列改为 BLOB（SQLite）/ BYTEA（PostgreSQL），压缩内容直接存 gzip 字节，避免 base64 约 33% 膨胀。读时由 `decompressFromBlob` 根据 gzip 魔数解压或按 UTF-8 解码；兼容旧库中 base64 字符串。

#### poem_tags（诗词-标签多对多）

| 列 | 类型 | 说明 |
|----|------|------|
| poem_slug | TEXT | 关联 poems.slug |
| tag_slug | TEXT | 关联 tags.slug |
| (poem_slug, tag_slug) | PK | 复合主键 |

#### authors / dynasties / tags

slug、name、poem_count；authors 另有 description（V2 为 BLOB/BYTEA，同 poem_content 压缩策略）。

拼音（titlePinyin、paragraphsPinyin）在查询层由 `toPinyinToneNum` 实时计算，不落库。

## 索引

- poems：`idx_poems_dynasty_slug`、`idx_poems_author_slug`
- poem_tags：`idx_poem_tags_tag_slug`
- poem_content：仅主键 slug，无需额外索引。

## 查询层

- **列表/筛选/元数据**：使用 `getDb()`，查 poems + JOIN authors/dynasties 及 poem_tags。
- **详情**：`getPoemBySlug(slug)` 在同一库中查 poem 行、poem_content、tags，最后在内存中计算拼音并拼成 Poem。

## 构建与运行

- **构建**：默认 `npm run build` 会先执行 `npm run seed:db`（写入单库），再执行 `next build`。若已存在 `poetry_index.db`（在 `DATABASE_DIR` 或默认 `data/`、或兼容路径 `public/data/`），则跳过 seed_db。
- **数据目录**：未设置 `DATABASE_DIR` 时，默认使用项目根下的 `data/`；若该目录下无 `poetry_index.db` 则尝试 `public/data/`。执行 `npm run seed:db` 时会打印 `database path` 及校验行数。
- **运行**：Next 通过 `lib/db` 与 API 路由读库；需以 Node 服务运行，SQLite 文件随应用部署或挂载。

## Vercel 部署

- **只读打开**：当 `VERCEL=1` 时，若使用本地 SQLite 单库，则以只读方式打开，不创建 WAL/shm。
- **路径（文件 SQLite）**：使用 `DATABASE_DIR` 或默认 `data/`；将 `poetry_index.db` 放在该目录下并提交（或通过构建产出）。
- **跳过 seed**：若部署环境中已存在 `poetry_index.db`，`ensure_poems_then_build` 会跳过 seed_db，直接执行 `next build`。
- **推荐：Turso**：在 Vercel 上建议使用 Turso Cloud，无需打包数据库文件，见下文「Vercel 部署使用 Turso」。

## 多数据库切换

- **SQLite**：不设置 `DATABASE_TYPE` 或 `DATABASE_TYPE=sqlite`，且不设置 `DATABASE_URL`。使用 `DATABASE_DIR` 或默认 `data/` 下的 `poetry_index.db`。
- **PostgreSQL**：设置 `DATABASE_TYPE=postgres` 与 `DATABASE_URL=postgresql://user:pass@host:5432/dbname`。先建表（运行一次 `npm run seed:db` 会自动执行 `createTables`），再 seed。切换回 SQLite 时改回 `DATABASE_TYPE=sqlite` 并去掉 `DATABASE_URL` 即可。
- **Turso**：设置 `DATABASE_TYPE=turso`、`TURSO_DATABASE_URL`（及 `TURSO_AUTH_TOKEN`）。在 Turso 控制台或 CLI 创建数据库后，本地或 CI 用同一环境变量执行一次 `npm run seed:db` 完成建表与导入。适用于 Vercel 等 serverless，无需 `data/poetry_index.db`。
- **JSON**：设置 `DATABASE_TYPE=json`。先有 POEMS_DIR 下的 .md，执行 `npm run build:json` 生成 `public/data/` 切分 JSON；之后 `npm run build` 会先 build:json（若尚无 manifest.json）再 next build。适用于 Vercel 无库、纯静态数据部署。架构与使用详见 [JSON 数据源说明](json-data-source.md)。

### 如何切换到 PostgreSQL

1. **准备 PostgreSQL 实例**：本地安装、Docker 或云服务（如 Supabase、Neon、Railway）均可。创建好数据库并拿到连接串。
2. **配置环境变量**（项目根 `.env` 或部署环境）：
   ```bash
   DATABASE_TYPE=postgres
   DATABASE_URL=postgresql://用户名:密码@主机:5432/数据库名
   ```
   示例（本地）：
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/poetry
   ```
3. **建表并导入数据**：在项目根执行一次：
   ```bash
   npm run seed:db
   ```
   `seed_db` 会检测到 `DATABASE_TYPE=postgres`，连接 `DATABASE_URL`，自动执行建表（`createTables`）并写入诗词数据。若数据量较大（如数十万首），首次 seed 可能需数分钟。
4. **构建与运行**：与 SQLite 相同，`npm run build`、`npm run start` 或 `npm run dev`。应用会从 PostgreSQL 读数据。
5. **切回 SQLite**：删除或注释 `DATABASE_TYPE`、`DATABASE_URL`，或改为 `DATABASE_TYPE=sqlite`。之后会使用默认 `data/poetry_index.db`（需确保该库存在或重新执行 `npm run seed:db`）。

### Vercel 部署使用 Turso

在 Vercel 上使用 **Turso Cloud**（LibSQL，SQLite 兼容）可避免将 `data/poetry_index.db` 打进包，适合 serverless 冷启动与体积限制。

1. **创建 Turso 数据库**：在 [Turso 控制台](https://turso.tech) 或使用 [Turso CLI](https://docs.turso.tech/cli) 创建数据库，获取 URL（形如 `libsql://<db>-<org>.turso.io`）与 Auth Token。
2. **配置环境变量**：在 Vercel Project Settings → Environment Variables 中设置：
   - `DATABASE_TYPE=turso`
   - `TURSO_DATABASE_URL=libsql://你的库-你的组织.turso.io`
   - `TURSO_AUTH_TOKEN=你的 token`
3. **建表与导入**：在本地或 CI 中配置**同一组** `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`，在项目根执行一次：
   ```bash
   DATABASE_TYPE=turso npm run seed:db
   ```
   会连接 Turso、执行 `createTables` 并写入诗词数据。完成后 Vercel 部署即可直接使用该库，无需再包含 `data/poetry_index.db`。
4. **与文件 SQLite 的差异**：Turso 使用 HTTP 连接，语法与 SQLite 一致（`INSERT OR REPLACE`、`RANDOM()` 等），schema 与 seed 逻辑无需修改。仅需在首次使用前完成上述 seed。

### JSON 数据源（Vercel 无库部署）

当 **DATABASE_TYPE=json** 时，应用不连接任何数据库，改为从 **public/data/** 下的切分 JSON 文件读取（单文件约 ≤1MB，便于 CDN）。适合在 Vercel 上不配置数据库、仅使用静态资源的部署方式。

1. **数据流**：MD（POEMS_DIR）→ `npm run build:json`（调用 `loadAll()` 并切分写入）→ **public/data/**（manifest、poems 分块、list/dynasty|author|tag、search 分块、random-pool 等）。
2. **环境变量**：
   - `DATABASE_TYPE=json`
   - 可选 `NEXT_PUBLIC_DATA_URL`：若从其他域名拉取 JSON 则设为站点根 URL（如 `https://xxx.vercel.app`）；不设则同源 `/data` 或本地读 `public/data`。
   - 可选 `DATA_JSON_OUTPUT_DIR`：构建脚本产出目录，默认 `public/data`。
3. **构建**：`npm run build` 在 json 模式下会执行 `npm run build:json`（若尚无 `public/data/manifest.json`）再 `next build`。也可单独执行 `npm run build:json` 生成/更新 JSON，再部署。
4. **目录约定**：`manifest.json`（计数与 chunk 元信息）、`poems/chunk-*.json` 与 `poems/slug-ranges.json`、`list/dynasty|author|tag/<slug>.json`（大列表再分片为 `<slug>/0.json` + `meta.json`）、`search/chunk-*.json`、`random-pool.json`，以及 `authors.json`、`dynasties.json`、`tags.json`、`rhythmics.json`。单文件体积控制在约 900KB 以内。
5. **与 DB 的关系**：JSON 与 SQLite/PostgreSQL/Turso 并列，同一套查询 API（`getPoemBySlug`、`getPoemsByDynasty`、`searchPoems` 等）在 json 模式下由 `lib/data-json` 实现，对外接口不变。更完整的目录结构、分片策略与使用说明见 [json-data-source.md](json-data-source.md)。

## 测试

- **单测**：`lib/db/queries.test.ts` 默认使用 SQLite 临时目录（`DATABASE_DIR` + `DATABASE_TYPE=sqlite`），创建单库、插入 fixture 后对行数、`getPoemBySlug`（含实时拼音）、列表/按标签/搜索等做断言。运行：`npm run test -- --run lib/db`。可设 `DATABASE_TYPE=postgres` 与 `DATABASE_URL` 测试 PostgreSQL。
- **回归**：首页推荐、诗列表、诗详情页、作者页、SSG 等可在构建并启动后通过 `scripts/p0_smoke_test.ts` 或人工验证。
