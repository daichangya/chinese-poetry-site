# JSON 数据源：架构与使用

当 `DATABASE_TYPE=json` 时，应用不连接数据库，改为从 **public/data/**（或 `NEXT_PUBLIC_DATA_URL` 指向的根）下的切分 JSON 文件读取数据。适用于 Vercel 等无库、纯静态资源部署。

## 架构

### 数据流

```mermaid
flowchart LR
  MD[Markdown 源 POEMS_DIR]
  Build[build:json 脚本]
  Data[public/data/]
  App[Next 应用]
  MD --> Build
  Build --> Data
  Data --> App
```

- **输入**：`POEMS_DIR` 下的诗词 `.md`，经 `loadAll()` 解析得到 poems、authors、dynasties、tags。
- **构建**：`npm run build:json`（或 `ensure_poems_then_build` 在 JSON 模式下的自动调用）将上述数据按维度切分、序列化为 JSON，写入 `public/data/`（或 `DATA_JSON_OUTPUT_DIR`）。
- **运行时**：`lib/data-json` 根据是否存在 `NEXT_PUBLIC_DATA_URL` 选择 **本地 fs** 或 **fetch** 读取；实现与 `lib/db/queries` 同名的 API，供 `lib/db` 在 `DATABASE_TYPE=json` 时转发。

### 目录结构

| 路径 | 说明 |
|------|------|
| `manifest.json` | 总计数（poemCount、authorCount 等）、poemChunks 元信息、searchChunkCount、randomPoolSize |
| `poems/slug-ranges.json` | 按 slug 区间的分片索引（slugMin、slugMax、file） |
| `poems/chunk-*.json` | 诗词分片，每片 `{ poems: Poem[] }`，单文件约 ≤900KB |
| `list/dynasty/<slug>.json` 或 `list/dynasty/<slug>/` | 按朝代列表：单文件或分片目录（`0.json`、`1.json`… + `meta.json`） |
| `list/author/<slug>.json` 或 `list/author/<slug>/` | 按作者列表，同上 |
| `list/tag/<slug>.json` 或 `list/tag/<slug>/` | 按标签列表，同上 |
| `search/chunk-*.json` | 搜索用轻量项分片（slug、title、author_name、dynasty_name） |
| `random-pool.json` | 随机推荐用 slug 池 |
| `authors.json`、`dynasties.json`、`tags.json`、`rhythmics.json` | 维度元数据（slug、name、poem_count 等） |

列表维度（dynasty/author/tag）按 **slug** 访问；朝代展示名（如「元代」）在 API 层通过 `getDynastyDisplayNameOrFallback` 与 slug 对应，侧栏与 URL 使用展示名，接口内部用 slug 查 list。

### 分片策略

- **单文件体积**：约 900KB（`MAX_FILE_BYTES`）为上限；超过则拆成多块。
- **列表**：某维度下某 slug 的列表 ≤900KB 时写为 `list/<dimension>/<slug>.json`；否则建目录 `list/<dimension>/<slug>/`，写入 `0.json`、`1.json`… 及 `meta.json`（含 `total`、`chunks`）。
- **诗词 / 搜索**：按 slug 排序后线性切分为 `poems/chunk-*.json`、`search/chunk-*.json`。

### 与 DB 模式对比

| 方面 | JSON | SQLite / PostgreSQL / Turso |
|------|------|-----------------------------|
| 写入 | 无运行时写；仅通过 build:json 产出 | seed_db 写入，无运行时写 |
| 列表/筛选 | 按 slug 读 list 文件或分片 | SQL 查询 |
| 部署 | 可把 public/data 放到 CDN，设 `NEXT_PUBLIC_DATA_URL` | 需数据库实例或文件 |
| 适用场景 | Vercel 无库、静态托管 | 有库或本地文件 |

## 使用

### 环境变量

- **DATABASE_TYPE=json**：启用 JSON 数据源。
- **NEXT_PUBLIC_DATA_URL**（可选）：若 JSON 从其他域名提供，设为该站点根 URL（如 `https://your-cdn.com`）；不设则同源访问 `/data` 或本地读 `public/data`。
- **DATA_JSON_OUTPUT_DIR**（可选）：`build:json` 产出目录，默认 `public/data`。
- **POEMS_DIR** / **POEMS_OUTPUT_DIR**（可选）：build:json 读取的 .md 目录，默认 `chinese-poetry-md`。

### 构建

1. **仅生成 JSON**：  
   `npm run build:json`  
   从 POEMS_DIR 加载 .md，写入 public/data/。

2. **全量构建（推荐）**：  
   `npm run ensure_poems_then_build` 或 `npm run build`  
   在 `DATABASE_TYPE=json` 且尚无 `public/data/manifest.json` 时会先执行 `build:json`，再执行 `next build`。

### 本地与部署

- **本地**：不设 `NEXT_PUBLIC_DATA_URL` 时，服务端从 `public/data/` 用 `fs.readFileSync` 读取。
- **部署**：可将 `public/data` 部署到同站或 CDN；若放到其他域名，设置 `NEXT_PUBLIC_DATA_URL`，运行时通过 fetch 拉取。

### Vercel 部署（JSON 数据源）

1. **环境变量**（Vercel 项目 → Settings → Environment Variables，Production / Preview 按需配置）：
   - **DATABASE_TYPE** = `json`（必填）
   - **NEXT_PUBLIC_SITE_URL** = `https://你的项目.vercel.app` 或自定义域名（用于 sitemap、canonical、OG）
   - **NEXT_PUBLIC_SOURCE_REPO** = 你的 chinese-poetry-md 仓库 URL（可选，用于纠错链接）
   - **BUILD_SSG_POEM_LIMIT** = `5000` 或 `2000`（预渲染诗数，可按构建时间调整；设为 `0` 则全部按需生成）
   - **BUILD_SSG_AUTHOR_LIMIT** = `50`
   - 不设 **NEXT_PUBLIC_DATA_URL** 时，运行时从同站 `public/data` 读 JSON（推荐）。

2. **数据从哪来**：构建时必须能访问到 `public/data/`（含 `manifest.json` 等）。推荐做法：
   - 本地或 CI 执行 `npm run build:json`（需已存在 `chinese-poetry-md` 或设置 `POEMS_DIR`），将生成的 **public/data** 提交到仓库；
   - Vercel 拉代码后执行 `npm run build`（即 `ensure_poems_then_build`），检测到 `public/data/manifest.json` 存在会**跳过** build:json，直接 `next build`，构建快且稳定。
   - 若不在仓库中提交 public/data，则需在 Vercel 构建中能访问 .md 源并执行 build:json，构建时间长且可能超时，不推荐。

3. **构建命令**：保持 Vercel 默认 **Build Command** 为 `npm run build`（或 `npx next build` 且能先产出 public/data，见上）。**Output Directory** 留空（Next 默认 `.next`）。

4. **可选**：若把 public/data 放到 CDN 单独域名，设置 **NEXT_PUBLIC_DATA_URL** 为该域名根 URL，运行时通过 fetch 拉取 JSON。

### 常见问题

- **某朝代/作者/标签无数据**：确认是否已执行 `npm run build:json`，且源 .md 中确实包含该维度（如该朝代有诗）。若某 slug 无对应 list 文件，接口会返回 200 且 `items: []`、`total: 0`（或朝代/作者侧栏的 total 来自 dynasties/authors 元数据，列表为空）。
- **list 文件缺失导致 500**：已修复：`lib/data-json` 的 `loadListChunk` 在读取失败时返回空列表，不再抛错；`countPoemsByTag` 在单文件与 meta 均不存在时返回 0。
- **朝代 URL 为「元代」等中文**：侧栏使用展示名（如「元代」）生成 `/poems/?dynasty=元代`；API 通过 `getDynasties()` 的 name 解析到 slug（如 `yuan`），再用 slug 读 list，行为一致。

## 相关文档

- [数据库设计（database.md）](database.md)：多数据源切换、JSON 小节与构建流程。
- [技术设计（tech-overview.md）](tech-overview.md)：整体架构与部署。
