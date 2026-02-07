# 诗单搜索索引：按前两字拼音首字母分片与 slug 按需存储

**当前方案说明**：列表与搜索已改为 **API 驱动**。诗词列表/搜索由服务端从 SQLite 查询，通过 GET `/api/poems?dynasty=&q=&tag=&page=&limit=`、`/api/poems/random?n=`、`/api/dynasties`、`/api/authors`、`/api/tags` 提供；数据来自 SQLite，详见 [database.md](database.md) 与 [tech-overview.md](tech-overview.md)。默认构建**不生成**下述静态 JSON 分片结构。

以下为**历史静态分片设计**，仅在使用 `load_data` 或静态导出（如 `build:batched`）时有效；保留作参考。

---

## 一、目标

- **体积**：原单文件 `poems-search.json` 约 35MB，改为按标题**前两字**拼音首字母分片后，前端仅在有搜索关键词时拉取对应一片（约 1/700 量级），单次请求约几十 KB。
- **slug 省存**：列表项中 `slug` 仅在与 `toSlug(title)` 不一致时写入（如同标题多首加后缀、长标题截断加 hash），其余由前端用 `toSlug(title)` 生成链接，减小 JSON 体积。

## 二、构建产出结构

### 2.1 目录与文件

- **搜索索引（按关键词用）**：`data/poems/search/` 下按标题前两字拼音首字母分片（两字母 key）。
  - 文件：`jy.json`、`j_.json`、`__.json` 等。key 规则：标题 ≥2 字取前两字首字母（如「静夜思」→ `jy`），标题 1 字为 `x_`（如「静」→ `j_`），空或无拼音 → `__`。每片内容：`PoemSearchItemMinimal[]`，见下。
- **search_keys.json**：`data/poems/search_keys.json`，内容 `{ "keys": ["j_", "jy", ...] }`，列出所有 search 分片 key；用于「随机一首」与首页「推荐几首」客户端随机拉取。
- **朝代诗单（按朝代用）**：每个朝代为 **manifest + 分片**，避免单文件过大。
  - `data/poems/dynasty/<dynastySlug>.json`：**manifest**，内容为 `{ "initials": ["j_", "jy", ...] }`，列出该朝代下有诗的两字母 key。
  - `data/poems/dynasty/<dynastySlug>/<key>.json`：该朝代下标题前两字拼音首字母为 `<key>` 的诗单，内容为 `PoemSearchItemMinimal[]`（与 search 片格式一致）。
- **作者诗单（按作者名搜索用）**：`data/poems/author/<authorSlug>.json`，内容为该作者名下所有诗的 `PoemSearchItemMinimal[]`（与 search/dynasty 片格式一致）。配合 `data/authors.json`（`{ slug, name, poem_count }[]`）做「作者名 → slug」映射后按需拉取。
- **标签诗单（按标签用）**：`data/poems/tag/<tagSlug>.json`，内容为该标签下所有诗的 `PoemSearchItemMinimal[]`（与 author/dynasty/search 片格式一致）。配合 `data/tags.json`（`{ slug, name, poem_count }[]`）做「标签名或 slug → slug」映射后按需拉取。

不再生成单文件 `data/poems-search.json`；朝代不再使用单文件 `dynasty/<slug>.json` 整份诗单。

### 2.2 列表项格式（PoemSearchItemMinimal）

每条为对象，**必选**：`title`、`author_name`；**可选**：`slug`。

- **title**（string）：诗题。
- **author_name**（string）：作者名。
- **slug**（string，可选）：诗的唯一 URL 标识。仅当构建时 `p.slug !== toSlug(p.title)` 时写入（如重复标题后缀 `jing-ye-si-2`、长标题截断加 hash）。未出现时前端用 `toSlug(title)` 生成详情链接。

与 [lib/slug.ts](../lib/slug.ts) 中 `toSlug` 规则一致：中文 → 无声调拼音 → 连字符小写。

## 三、分片规则（搜索索引）

- **两字母 key**：使用 [lib/slug.ts](../lib/slug.ts) 的 `getPinyinInitial2(title)`。取诗**标题**前两字符，各自取其拼音首字母（a–z 或 `_`），拼成两字符；不足两位时第二位用 `_`。使用 [pinyin-pro](https://www.npmjs.com/package/pinyin-pro) 与项目内拼音规则一致。
- **归属**：
  - 标题 ≥2 字：如「静夜思」→ `jy`，写入 `data/poems/search/jy.json`。
  - 标题 1 字：如「静」→ `j_`，写入 `data/poems/search/j_.json`。
  - 空串或无拼音（如标点、数字）→ `__`，写入 `data/poems/search/__.json`。
- **去重**：同一首诗只属于一片（按标题前两字唯一决定）。

## 三.1、朝代诗单（manifest + 分片）

- **分片规则**：与搜索索引相同，按诗**标题**前两字拼音首字母（`getPinyinInitial2`）分桶；只写出非空桶，manifest 的 `initials` 为这些两字母 key 排序后的列表。
- **前端**：
  - **有 dynasty 且有 q**：只拉一片。请求 `GET /data/poems/dynasty/<dynastySlug>/<getPinyinInitial2(q)>.json`，得到该朝代下与 q 前两字同 key 的诗，再在内存中按 q 过滤、分页。
  - **有 dynasty 无 q**：拉全朝代、分片合并。先请求 `GET /data/poems/dynasty/<dynastySlug>.json` 得到 manifest（`{ initials: string[] }`），再对 `manifest.initials` 中每个 key 并行请求 `GET /data/poems/dynasty/<dynastySlug>/<key>.json`，将各片数组合并后分页展示。

## 三.2、按作者分片（作者名搜索）

- **构建**：对每个作者写出 `data/poems/author/<authorSlug>.json`，内容为该作者名下所有诗的 `PoemSearchItemMinimal[]`（与 search/dynasty 片格式一致）。不修改 `data/authors.json` 结构。
- **前端**：无 `dynasty` 且有 `q` 时，先加载 `data/authors.json`（可与 dynasties 同次请求）。用 `authors.find(a => a.name === q.trim())` 做**精确匹配**；若匹配到，请求 `GET /data/poems/author/<authorMatch.slug>.json` 得到该作者全部诗单；若未匹配，再按诗题前两字拉 `data/poems/search/<getPinyinInitial2(q)>.json`（按标题片）。这样输入完整作者名（如「白居易」）即可展示该作者全部诗。

## 三.3、按标签分片（标签筛选）

- **构建**：对每个标签写出 `data/poems/tag/<tagSlug>.json`，内容为该标签下所有诗的 `PoemSearchItemMinimal[]`（与 author/dynasty/search 片格式一致）。筛诗规则：`p.tags?.includes(t.slug)`。不修改 `data/tags.json` 结构。
- **前端**：挂载时加载 `data/tags.json`（可与 dynasties、authors 同次请求）。当 URL 有 `tag`（如 `/poems/?tag=北宋`）且无 `dynasty` 时，用 `tags.find(t => t.name === tag.trim() || t.slug === tag.trim())` 解析 slug；若匹配到则请求 `GET /data/poems/tag/<tagMatch.slug>.json`（slug 含非 ASCII 时需 `encodeURIComponent`）；若未匹配则设空列表。若有 `q`，再在内存中按 q 过滤、分页。

## 四、前端使用方式

### 4.1 何时请求

- **按朝代**：有 `dynasty` 时，若有 `q` 则请求一片 `data/poems/dynasty/<dynastySlug>/<getPinyinInitial2(q)>.json`；若无 `q` 则先请求 manifest `data/poems/dynasty/<dynastySlug>.json`，再按 manifest.initials 并行请求各片并合并。
- **按标签**：无 `dynasty` 且有 `tag`（`tag.trim()` 非空）时，用 `tags.json` 匹配 name 或 slug，请求 `data/poems/tag/<tagSlug>.json`；未匹配则展示空列表。
- **按关键词**：无 `dynasty`、无 `tag` 且有 `q`（`q.trim()` 非空）时，先用 `authors.json` 做作者名精确匹配；若匹配到则请求 `data/poems/author/<authorSlug>.json`；否则取 `getPinyinInitial2(q)` 得到两字母 key，请求 `data/poems/search/<key>.json`（空或无拼音时 key 为 `__`）。
- **无朝代、无标签且无 q**：不请求任何诗单，仅展示朝代/总诗数等导航。

### 4.2 链接与 key

- **详情链接**：`/poems/<slug>/`。`slug` 取接口返回的 `slug`（若存在），否则 `slug = toSlug(title)`（前端需引入与构建一致的 `toSlug`）。
- **列表 key**：建议用 `slug ?? toSlug(title)` 或 `title + "\0" + author_name`，保证同屏唯一即可。

### 4.3 过滤与分页

拿到一片（或一朝代多片合并后、或一朝代/作者/标签单片）后，在内存中按 `q` 对 `title`、`author_name` 做 `includes` 过滤（不依赖 `dynasty_name`），再分页展示。按 tag 筛选通过 `data/poems/tag/<tagSlug>.json` 按需拉取实现（列表项仍无 tags 字段）。

### 4.4 随机一首与首页推荐

- **随机一首**（`/poems/random/`）：先 fetch `data/poems/search_keys.json` 得到 `keys` 数组，随机选一个 key，再 fetch `data/poems/search/<key>.json`，从该片中随机取一首，用 `slug ?? toSlug(title)` 跳转到 `/poems/<slug>/`。
- **首页推荐几首**：先 fetch `search_keys.json`，随机选若干 key，并行 fetch 对应 `search/<key>.json`，合并后去重并随机取 N 首（如 10 首）展示链接到详情。

## 五、与 tech-overview 的关系

- [tech-overview.md](tech-overview.md) 中「构建产物结构」的 `data/poems.json` 已由本方案替代：改为 `data/poems/search/*.json` + `data/poems/dynasty/*.json`，列表项含可选 `slug`。
- 数据流：POEMS_DIR → load_data（loadAll + writeDataJson）→ 写出 `data/poems/search/`、`data/poems/dynasty/`、`data/poems/author/`、`data/poems/tag/`；前端按 URL 参数与 `authors.json`、`tags.json` 按需请求对应 JSON。
