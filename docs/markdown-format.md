# 诗词 Markdown 文档规则

本文档约定**单首诗词**对应的 `.md` 文件格式，用于 POEMS_DIR 下的内容完善与 **gen_markdown**（Node/TS 脚本）产出；构建时由 **load_data**（`scripts/load_data.ts` 或 `lib/load_data.ts`）解析，**seed_db** 通过同一 `loadAll()` 解析 .md 写入 SQLite，格式约定与本文档一致。人工编辑或脚本生成的诗词 .md 均需符合本约定，以保证构建与展示一致。

## 用途与范围

- **适用对象**：POEMS_DIR 目录下、每首诗一个的 Markdown 文件。
- **使用场景**：从 chinese-poetry 生成初始 .md（`npm run gen_markdown`）后，在对应文件中增补译文、赏析、注释或纠错；执行 `npm run build` 即先 seed_db（从 POEMS_DIR 解析 .md 写入 SQLite）再 next build，站点数据由 SQLite 与 API 提供。
- **解析实现**：`lib/load_data.ts` 的 loadAll（gray-matter 解析 frontmatter + 区块解析）；seed_db 与 load_data 脚本均使用该函数，seed_db 将结果写入 SQLite。

## 文件路径约定

- **根目录**：POEMS_DIR 环境变量指向的目录（如 `poetry/chinese-poetry-md`）；诗词 .md 实际位于其下 **poems** 子目录，即 `POEMS_DIR/poems/`。
- **路径格式**：`poems/<author_slug>/<titleSlug>.md`，与详情页「纠错与完善」链接路径一致。文件名主干即为 **titleSlug**。
- **Slug 规则**：所有 slug（id、titleSlug、authorSlug、dynastySlug、tags 内项）均为**无声调拼音 + 连字符**，与 load_data（Node/TS）中 slug 逻辑及 `docs/tech-overview.md` 一致。
- **示例**：`poems/huang-yan-ping/su-xiang-yan-si-qi-yi.md`、`poems/bai-ju-yi/fu-de-gu-yuan-cao-song-bie.md`（以实际 slug 为准）。

## Frontmatter（YAML）

Frontmatter 置于文件开头，用 `---` 包裹，YAML 格式。含冒号、引号或换行的值需加引号。

### 必填字段（构建与推导所需）

| 字段 | 说明 |
|------|------|
| `id` | 全局唯一标识：**authorSlug** + `-` + **titleSlug**（作者在前，拼音+连字符）。解析时 **poem.slug 优先取 id**（保证同题不同作者不冲突），无则取 titleSlug，再则取文件名主干；slug 用作详情页 URL 与 DB 主键。 |
| `title` | 诗题 |
| `titleSlug` | 诗题 slug（无声调拼音+连字符），与文件名主干一致；poem.slug 无 id 时退而取此值。 |
| `author` 或 `authorName` | 作者名 |
| `authorSlug` | 作者 slug（无声调拼音+连字符，用于路径与链接） |
| `dynasty` 或 `dynastyName` | 朝代名；**没有则留空**。蒙学是分类不是朝代，蒙学类也应留空。 |
| `dynastySlug` | 朝代 slug（无声调拼音+连字符）；dynasty 为空时为空。 |

### 可选字段

| 字段 | 说明 |
|------|------|
| `titlePinyin` | 标题拼音，带声调数字（如 `su4 xiang1 yan2 si4・qi2 yi1`） |
| `authorPinyin`、`dynastyPinyin` | 作者/朝代拼音，带声调数字（如 `huang2 yan4 ping2`、`song4`），与 titlePinyin 风格一致；dynasty 为空时 dynastyPinyin 为空。 |
| `tags` | 标签，数组，**不应为空**。元素为**中文**标签名（如 `蒙学`、`宋词三百首`、`诗词`）。解析后用于聚合 tags 表：slug 由 `toSlug(name)` 推导，name 为中文；poems 表入库时 tags 列存 slug 数组。全站展示一律使用中文（tags 表的 name）。 |
| `rhythmic` | 词牌名，可选。用于宋词、花间集等以词牌为标题的体裁；解析后可在详情页展示「词牌」或按词牌筛选。 |

**拼音格式**：titlePinyin、authorPinyin、dynastyPinyin 及 `## 拼音` 区块均使用**带声调数字**（音节后跟 1–4，如 `zhang1 yuan2`），与常见拼音库风格一致（如 pypinyin 的 Style.TONE3 或 pinyin-pro 的对应输出）。

## 正文区块（Section）

正文为 Frontmatter 之后的 Markdown，按二级标题 `## 区块名` 划分。区块名称与解析逻辑如下。

### 区块列表

| 区块名 | 格式 | 解析结果 |
|--------|------|----------|
| `## 正文` | **列表**，每行一句：`- 句子` | 诗句列表，与模板逐句渲染对应 |
| `## 拼音` | **列表**，每行一句对应拼音：`- 拼音串` | 拼音列表，与正文逐句对应 |
| `## 译文` | 多行正文（非列表） | 合并为单个字符串，详情页「译文」 |
| `## 赏析` | 多行正文（非列表） | 合并为单个字符串，详情页「赏析」 |
| `## 注释` | 多行正文（非列表） | 合并为单个字符串，详情页「注解」；可为「词: 释义」等形式 |

- **正文、拼音**：解析器仅收集以 `- ` 开头的列表项；其他行不纳入该区块。
- **译文、赏析、注释**：解析器将区块内所有以 `- ` 开头的行去掉前缀后，与其余非标题行一起用换行连接成字符串；缺失区块按空字符串处理。
- 区块**顺序不限**，缺失的区块按空处理。

## 与老项目的对应关系

| 项目 | 说明 |
|------|------|
| **老项目** | 根目录 README 示例含 `id`、`titlePinyin`、`authorPinyin`、`dynastyPinyin`；`tags` 为显示名数组；section 顺序常见为 正文 → 拼音 → 注释 → 译文 → 赏析；create-md 产出路径为 `authorSlug/titleSlug.md`。 |
| **新项目（poetry）** | `id` 为 authorSlug-titleSlug（作者在前）；poem.slug 取 **id**（优先）或 titleSlug 或文件名主干；`author`/`dynasty` 与 `authorName`/`dynastyName` 均可；产出路径为 `author_slug/titleSlug.md`；tags 为**中文**标签名列表；section 名称与解析规则与老项目兼容，顺序不限，缺失区块按空处理。 |

二者格式兼容：老项目示例的 .md 可被 poetry 的 load_data 正确解析（tags 若为中文则按上述规则；若为历史 slug，展示会沿用 slug 直至重新生成数据）；poetry 的 **gen_markdown**（Node/TS）产出亦符合本规则。

## 完整示例

以下为一首诗的完整 .md 示例（黄彥平《宿香嚴寺・其一》），包含 Frontmatter 与 正文/拼音/注释/译文/赏析 各区块（注释、译文、赏析可留空或占位）。文件路径为 `huang-yan-ping/su-xiang-yan-si-qi-yi.md`。

```markdown
---
id: huang-yan-ping-su-xiang-yan-si-qi-yi
title: 宿香嚴寺・其一
titlePinyin: su4 xiang1 yan2 si4・qi2 yi1
titleSlug: su-xiang-yan-si-qi-yi
author: 黄彥平
authorPinyin: huang2 yan4 ping2
authorSlug: huang-yan-ping
dynasty: 宋
dynastyPinyin: song4
dynastySlug: song
tags:
  - shi-ci
---

## 正文

- 章原暝邊龍會宿，塔嶺尖處胡孫愁。
- 且並山腰欹側過，莫從髙頂望神州。

## 拼音

- zhang1 yuan2 ming2 bian1 long2 hui4 su4 ， ta3 ling3 jian1 chu3 hu2 sun1 chou2 。
- qie3 bing4 shan1 yao1 qi1 ce4 guo4 ， mo4 cong2 gao1 ding3 wang4 shen2 zhou1 。

## 注释

## 译文

## 赏析
```

## 蒙学类示例（dynasty 为空、tags 非空）

蒙学类内容无具体朝代，dynasty 与 dynastyPinyin、dynastySlug 留空；tags 至少含 `meng-xue`，可按书名补充（参考老项目古文观止、唐诗三百首、千家诗等）：

```markdown
---
id: cheng-deng-ji-hua-mu
title: 花木
titleSlug: hua-mu
author: 程登吉
authorSlug: cheng-deng-ji
dynasty: ""
dynastyPinyin: ""
dynastySlug: ""
tags:
  - meng-xue
---
```

## 与展示样式的关系

解析得到的 title、author、dynasty、正文与拼音等，在详情页按 [poem-style.md](poem-style.md) 约定的版式与样式展示（字级/行上拼音、标题/作者/正文层级与颜色等）；阅读设置（简繁、字体、拼音显隐、原文注解）见 [tech-overview.md](tech-overview.md)。

## 参考实现

- **解析**：load_data（Node/TS）使用 `gray-matter` 解析 frontmatter（YAML），按 `## 标题` 与 `- ` 列表切分正文/拼音，其余区块合并为字符串。
- **生成**：gen_markdown（Node/TS）从 CHINESE_POETRY_DIR 加载 chinese-poetry JSON 后，按本规则写出 `POEMS_DIR/poems/<author_slug>/<titleSlug>.md`；dynasty 没有或为「蒙学」时输出为空，tags 至少一项（蒙学类 `meng-xue`，否则 `shi-ci`），与老项目约定一致。**繁转简**：chinese-poetry 数据中繁体/简体混合，gen_markdown 在写入 .md 前对 title、author、dynasty、paragraphs 统一做繁转简（opencc-js t2cn），中间产出物一律为简体。

## 作者简介 Markdown

作者简介与诗词 .md 区分：**同一作者目录下**放置 `bio.md`（或 `_bio.md`），仅用于该作者生平/简介，**不作为诗词解析**。

- **路径**：`POEMS_DIR/poems/<author_slug>/bio.md`（与该作者的诗词 `poems/<author_slug>/<titleSlug>.md` 同目录）。
- **Frontmatter**：`title`（必填，作者名），`short_description`（可选，短简介）。
- **正文**：作者简介正文；解析时整段 body 作为 `description` 写入 SQLite `authors.description`。
- **与诗词区分**：load_data 收集诗词 .md 时**排除**文件名为 `bio.md`、`_bio.md` 的项；作者简介由 `lib/load_author_bios.ts` 在 seed_db 时单独扫描各 `<author_slug>/` 目录并解析，返回 `Map<slug, description>` 供写入 authors 表。

### 作者简介 Markdown 示例

以下为作者简介的完整 .md 示例，路径为 `POEMS_DIR/poems/<author_slug>/bio.md`（如 `poems/su-shi/bio.md`）。Frontmatter 含 `title`（作者名）、可选 `short_description`；正文为简介内容，换行会保留并在作者详情页「生平」区块中原样展示。

```markdown
---
title: 苏轼
short_description: 北宋文学家、书法家
---

苏轼（1037年—1101年），字子瞻，号东坡居士，眉州眉山（今属四川）人。北宋文学家、书法家、画家。

嘉祐二年进士。历知密州、徐州、湖州等。元丰中因“乌台诗案”贬黄州团练副使。哲宗时召还，官至礼部尚书。绍圣中复贬惠州、儋州。卒谥文忠。与父洵、弟辙合称“三苏”，均列“唐宋八大家”。
```

### 作者简介的展示样式

作者详情页（`/authors/[slug]`）在存在 `description` 时展示「生平」区块：

| 元素 | 说明 |
|------|------|
| **区块标题** | 二级标题「生平」，与页面主题主色、字重一致（`font-semibold text-primary`）。 |
| **正文容器** | 使用 `whitespace-pre-wrap`，保留 bio.md 正文中的换行与空格，多段时按原样分段显示。 |
| **正文颜色** | 正文使用主题文字色的 90% 透明度（`text-text/90`），与标题区分层级。 |

作者简介为纯文本展示，不参与阅读设置中的简繁切换、字体、拼音等；若需在简介中区分简繁或特殊格式，可在生成 bio.md 时预先写好对应内容。
