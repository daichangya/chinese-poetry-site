# chinese-poetry 数据源格式说明

本文档梳理 [chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) 仓库内各数据源的 JSON 结构差异，并与老项目 `scripts/chinese-poetry-to-markdown` 的解析脚本对应，供新系统（如 poetry 的 gen_markdown / load_data）实现或扩展数据加载时对照。与 [legacy-tech-reference.md](legacy-tech-reference.md) 中「脚本与职责」互补：彼处偏脚本职责与数据流，本文档偏**原始 JSON 结构**。

## 一、概述

chinese-poetry 仓库内**各目录/文件的 JSON 格式不一致**，主要体现在：

- **顶层结构**：有的是**数组**（如全唐诗、宋词、论语、元曲），有的是**对象**（如蒙学下多本书为 `{ title, content }` 或 `{ title, author, paragraphs }`）。
- **单条“诗”的字段名**：正文有的用 `paragraphs`，有的用 `content`，有的用 `para`（如纳兰性德）。
- **标题**：有的用 `title`，有的用 `rhythmic`（宋词、花间集）、有的用 `chapter`（论语、古文观止、唐诗三百首等）。
- **作者/朝代**：有的每条都有 `author`，有的整本书一个作者（曹操、三字经）；朝代有的在文件名/脚本里推断，有的从 author 字符串解析（如「先秦：左丘明」、「（唐）孟浩然」）。
- **蒙学类**：多为多层嵌套（如 `content[].content[]`），且不同书结构不同。

老项目通过**为每种数据源写独立脚本**（`scripts/chinese-poetry-to-markdown`）统一转成 `createMdContent({ title, paragraphs, author, dynasty, tags? })`，再生成统一 Markdown。新系统若从 chinese-poetry 直接读 JSON，需按本说明做「格式归一」后再写入 Markdown 或内存结构。

## 二、格式分类总表

| 数据源 | 顶层类型 | 标题字段 | 正文字段 | 作者/朝代来源 | 老项目脚本 |
|--------|----------|----------|----------|----------------|------------|
| 全唐诗 | 数组 | title | paragraphs | author；朝代由文件名 poet.tang/song 推断 | quantangshi.ts |
| 御定全唐詩 | 数组 | title | paragraphs | author；dynasty 唐 | yudingquantangshi.ts |
| 宋词 | 数组 | **rhythmic** | paragraphs | author；dynasty 宋 | songci.ts |
| 五代·花间集 | 数组 | title / rhythmic | paragraphs | author；dynasty 五代，tags 花间集 | wudaishici.ts |
| 五代·南唐 | 数组 | title | paragraphs | author；dynasty 五代 | wudaishici.ts |
| 元曲 | 数组 | title | paragraphs | author；dynasty 元（项内 dynasty） | yuanqu.ts |
| 论语 | 数组 | **chapter** | paragraphs | 无 author，脚本写死 孔子及其弟子/春秋/蒙学 | lunyu.ts |
| 楚辞 | 数组 | title | **content** | author；朝代由脚本映射表 | chuci.ts |
| 曹操诗集 | 数组 | title | paragraphs | 无 author，脚本写死 曹操/东汉末年 | caocao.ts |
| 水墨唐诗 | 数组 | title | paragraphs | author；dynasty 唐，tags 水墨唐诗 | shuimotangshi.ts |
| 纳兰性德 | 数组 | title | **para** | author；dynasty 清 | nalanxingde.ts |
| 蒙学·唐诗三百首 | 对象 | chapter / subchapter | paragraphs | author；dynasty 唐，tags 蒙学/唐诗三百首/type | mengxue/tangshisanbaishou.ts |
| 蒙学·古文观止 | 对象 | chapter | paragraphs | author「先秦：左丘明」解析；tags section.title/古文观止/蒙学 | mengxue/guwenguanzhi.ts |
| 蒙学·声律启蒙 | 对象 | chapter | paragraphs | 顶层 author；dynasty 清 | mengxue/shenglvqimeng.ts |
| 蒙学·三字经 | 对象 | title（整书） | paragraphs（整书） | 顶层 author；dynasty 南宋到清末，tags 蒙学 | mengxue/sanzijin-new.ts |
| 蒙学·千字文 | 对象 | title | paragraphs | 顶层 author；dynasty 南北，tags 蒙学 | mengxue/qianziwen.ts |
| 蒙学·千家诗 | 对象 | chapter | paragraphs | author「（唐）孟浩然」解析；tags type/千家诗/蒙学 | mengxue/qianjiashi.ts |
| 蒙学·弟子规 | 对象 | chapter | paragraphs | 顶层 author；tags 蒙学 | mengxue/dizigui.ts |
| 蒙学·百家姓 | 对象 | title | paragraphs | 顶层 author；tags 蒙学 | mengxue/baijiaxing.ts |
| 蒙学·朱子家训 | 对象 | title | paragraphs | 顶层 author；tags 蒙学 | mengxue/zhuzijiaxun.ts |

## 三、按数据源分节说明

### 3.1 全唐诗

- **路径**：`全唐诗/poet.tang.*.json`、`全唐诗/poet.song.*.json`、`全唐诗/唐诗三百首.json` 等（脚本过滤 `poet` 或 `唐诗三百首` 前缀）。
- **顶层结构**：数组，每项为一首诗。
- **单条结构**：`{ author, paragraphs[], title, id? }`。正文为 `paragraphs` 字符串数组。
- **朝代/作者**：朝代由**文件名**推断——`poet.tang.*` → 唐，`poet.song.*` → 宋；作者在项内 `author`。
- **老项目脚本**：`quantangshi.ts`。遍历文件，每文件 `readJsonSync` 得到数组，逐项 `createMdContent({ title: poem.title, author: poem.author, paragraphs: poem.paragraphs, dynasty: file.includes("tang") ? "唐" : "宋" })`。
- **备注**：全唐诗目录下也有宋诗文件（poet.song.*），脚本用同一套逻辑按文件名区分朝代。

### 3.2 御定全唐詩

- **路径**：`御定全唐詩/json/*.json`（数字编号如 007.json、010.json）。
- **顶层结构**：数组，每项为一首诗。
- **单条结构**：`{ title, author, biography?, paragraphs[], notes?, volume?, no#? }`。有卷号 `volume`、序号 `no#`、注释 `notes`、生平 `biography` 等扩展字段。
- **朝代/作者**：朝代固定**唐**；作者在项内 `author`。
- **老项目脚本**：`yudingquantangshi.ts`。遍历 json 目录下所有文件，每文件为数组，逐项传入 `createMdContent`，dynasty 固定为「唐」。
- **备注**：与全唐诗格式类似，多出 volume/notes/biography，脚本未写入 Markdown，仅用 title/author/paragraphs。

### 3.3 宋词

- **路径**：`宋词/ci.song.*.json`（按编号分片）、`宋词/宋词三百首.json`（单文件，约 300 首）。脚本需同时匹配二者。
- **顶层结构**：数组，每项为一首词。
- **单条结构**：`{ author, paragraphs[], rhythmic, tags? }`。**无 title 字段**，词牌名在 `rhythmic`；`宋词三百首.json` 每条带 `tags: ["宋词三百首"]`，ci.song.* 无 tags。
- **归一规则**：标题取 `rhythmic`；朝代固定**宋**；tags 若存在则逐项转 slug（如「宋词三百首」→ `song-ci-san-bai-shou`）写入 md，否则默认 `["诗词"]`。词牌 `rhythmic` 可单独写入 md frontmatter 的 `rhythmic` 字段，供详情页展示或按词牌筛选。
- **老项目脚本**：`songci.ts`。用 `poem.rhythmic` 作为标题传入 `createMdContent`，即 `title: poem.rhythmic`。
- **备注**：宋词以词牌（rhythmic）作标题，与全唐诗的 title 含义不同。

### 3.4 五代·花间集

- **路径**：`五代诗词/huajianji/huajianji-1-juan.json` 等多文件（脚本排除 `huajianji-0-preface`）。
- **顶层结构**：数组，每项为一首词。
- **单条结构**：`{ title, author, paragraphs[], rhythmic, notes? }`。有 `title` 也有 `rhythmic`，脚本用 **rhythmic** 作标题；`notes` 为注释数组。
- **朝代/作者**：朝代固定**五代**；tags 固定含「花间集」；作者在项内 `author`。
- **老项目脚本**：`wudaishici.ts` 中 `syncWuDaiShiCiHuajinji`。遍历 huajianji 目录下 json，每文件为数组，`createMdContent({ title: poem.rhythmic, author, paragraphs, dynasty: "五代", tags: ["花间集"] })`。
- **备注**：与宋词类似，标题取 rhythmic；花间集有 notes，脚本未写入 Markdown。

### 3.5 五代·南唐

- **路径**：`五代诗词/nantang/poetrys.json`（单文件）。
- **顶层结构**：数组，每项为一首词。
- **单条结构**：`{ title, author, paragraphs[], rhythmic, notes? }`。与花间集类似，有 title，脚本用 title 即可。
- **朝代/作者**：朝代固定**五代**；作者在项内 `author`。
- **老项目脚本**：`wudaishici.ts` 中 `syncWuDaiShiNanTang`。直接 `data.map(poem => createMdContent({ title: poem.title, author: poem.author, paragraphs: poem.paragraphs, dynasty: "五代" }))`。
- **备注**：南唐为单文件，无 tags 花间集。

### 3.6 元曲

- **路径**：`元曲/yuanqu.json`（单文件）。
- **顶层结构**：数组，每项为一首/段曲。
- **单条结构**：`{ dynasty, author, paragraphs[], title }`。项内自带 `dynasty`（值为 "yuan"），脚本固定传「元」。
- **朝代/作者**：朝代取项内 `dynasty` 或脚本写死**元**；作者在项内 `author`。
- **老项目脚本**：`yuanqu.ts`。遍历数组，`createMdContent({ title, paragraphs, author, dynasty: "元" })`。
- **备注**：dynasty 在 JSON 里为英文 "yuan"，展示用「元」。

### 3.7 论语

- **路径**：`论语/lunyu.json`。
- **顶层结构**：数组，每项为一「篇」（如学而篇、为政篇）。
- **单条结构**：`{ chapter, paragraphs[] }`。**无 author**；标题用 **chapter**（篇名）；正文为 `paragraphs` 字符串数组（每句可为一条或合并）。
- **朝代/作者**：无作者字段，脚本写死 author 为「孔子及其弟子」、dynasty 为「春秋」、tags 为 `["蒙学", "论语"]`。
- **老项目脚本**：`lunyu.ts`。`createMdContent({ title: poem.chapter, paragraphs: poem.paragraphs, author: "孔子及其弟子", dynasty: "春秋", parent: ["论语"], tags: ["蒙学", "论语"] })`。
- **备注**：论语按「篇」为一条，一篇内多段话在一个 paragraphs 数组里。

### 3.8 楚辞

- **路径**：`楚辞/chuci.json`。
- **顶层结构**：数组，每项为一篇（如离骚、九歌）。
- **单条结构**：`{ title, section, author, content[] }`。正文为 **content** 数组（非 paragraphs）；作者在项内 `author`。
- **朝代/作者**：作者在项内，但**朝代需映射**：老项目维护 `_authors` 数组（屈原→楚，宋玉→楚，贾谊→西汉 等），按 author 查表得 dynasty，默认「楚」。
- **老项目脚本**：`chuci.ts`。用 `poem.content` 作为 paragraphs 传入；`createMdContent({ title: poem.title, paragraphs: poem.content, author, dynasty })`，dynasty 来自映射表。
- **备注**：正文字段名为 content，与多数数据源不同。

### 3.9 曹操诗集

- **路径**：`曹操诗集/caocao.json`。
- **顶层结构**：数组，每项为一首诗。
- **单条结构**：`{ title, paragraphs[] }`。**无 author**，整本书作者为曹操。
- **朝代/作者**：脚本写死 author 为「曹操」、dynasty 为「东汉末年」。
- **老项目脚本**：`caocao.ts`。`createMdContent({ title: poem.title, paragraphs: poem.paragraphs, author: "曹操", dynasty: "东汉末年" })`。
- **备注**：单作者诗集，与论语类似由脚本补全作者/朝代。

### 3.10 水墨唐诗

- **路径**：`水墨唐诗/shuimotangshi.json`。
- **顶层结构**：数组，每项为一首诗。
- **单条结构**：`{ author, title, paragraphs[], prologue? }`。有 `prologue`（赏析/导读），脚本未写入 Markdown。
- **朝代/作者**：朝代固定**唐**；tags 含「水墨唐诗」；作者在项内 `author`。
- **老项目脚本**：`shuimotangshi.ts`。`createMdContent({ title, paragraphs, author, dynasty: "唐", tags: ["水墨唐诗"] })`。
- **备注**：与全唐诗单条结构类似，多 prologue。

### 3.11 纳兰性德

- **路径**：`纳兰性德/纳兰性德诗集.json`。
- **顶层结构**：数组，每项为一首词。
- **单条结构**：`{ title, author, para[] }`。正文字段为 **para**（非 paragraphs）。
- **朝代/作者**：朝代固定**清**；作者在项内为「纳兰性德」，脚本也可写死。
- **老项目脚本**：`nalanxingde.ts`。`createMdContent({ title: poem.title, paragraphs: poem.para, author: "纳兰性德", dynasty: "清" })`。
- **备注**：正文用 para，需在加载时映射为 paragraphs。

### 3.12 蒙学·唐诗三百首

- **路径**：`蒙学/tangshisanbaishou.json`。
- **顶层结构**：对象 `{ title, content[] }`。`content` 为按体裁分类的数组（如五言絕句、七言律詩）。
- **层级**：`content[]` 每项 `{ type, content[] }`；内层 `content[]` 每项 `{ chapter, subchapter?, author, paragraphs[] }`。标题取 `chapter`，若有 `subchapter` 可拼成「chapter（subchapter）」。
- **朝代/作者**：朝代固定**唐**；tags 为 `["蒙学", "唐詩三百首", item.type]`；作者在每条内层项 `author`。
- **老项目脚本**：`mengxue/tangshisanbaishou.ts`。二层循环：`data.content.forEach(item => item.content.forEach(poem => createMdContent({ title: poem.chapter, author: poem.author, dynasty: "唐", paragraphs: poem.paragraphs, tags: ["蒙学", "唐詩三百首", item.type] })))`。
- **备注**：嵌套为「体裁 → 诗列表」，每条诗有 chapter/subchapter/author/paragraphs。

### 3.13 蒙学·古文观止

- **路径**：`蒙学/guwenguanzhi.json`。
- **顶层结构**：对象 `{ title, abstract[], content[] }`。`content` 为卷/分类（如卷一・周文）。
- **层级**：`content[]` 每项 `{ title, content[] }`；内层 `content[]` 每项 `{ chapter, source?, author, paragraphs[] }`。作者字段为字符串如「先秦：左丘明」，需**解析**：按「：」或「:」拆分为朝代与姓名。
- **朝代/作者**：dynasty 从 author 解析（如「先秦：左丘明」→ 先秦、左丘明）；tags 含 section.title、古文观止、蒙学。
- **老项目脚本**：`mengxue/guwenguanzhi.ts`。flatMap 遍历 section 与 chapter，解析 author 得 dynasty 与 authorName，`createMdContent({ title: chapter.chapter, paragraphs, author: authorName, dynasty, tags: [section.title, "古文观止", "蒙学"] })`。
- **备注**：author 格式为「朝代：作者名」，需在加载时拆分。

### 3.14 蒙学·声律启蒙

- **路径**：`蒙学/shenglvqimeng.json`。
- **顶层结构**：对象 `{ title, author, abstract, content[] }`。`content` 为两卷（上卷、下卷）。
- **层级**：`content[0].content`、`content[1].content` 分别为上卷、下卷的章节数组；每项 `{ chapter, paragraphs[] }`。整书一个 **author**（车万育），朝代固定**清**。
- **朝代/作者**：dynasty 清；author 用顶层 data.author；可选 parent 如 [title, "上卷"]。
- **老项目脚本**：`mengxue/shenglvqimeng.ts`。合并上卷与下卷的 content，分别 map 后 concat，`createMdContent({ title: item.chapter, author, paragraphs: item.paragraphs, dynasty: "清", parent: [title, "上卷"] })` 等。
- **备注**：两卷结构，章节为 chapter + paragraphs。

### 3.15 蒙学·三字经

- **路径**：`蒙学/sanzijing-new.json`（新版）、`蒙学/sanzijin.json`（旧版若有）。
- **顶层结构**：对象 `{ title, author, tags?, paragraphs[] }`。**整书单篇**，一个 paragraphs 数组即全书内容（每句/每段为数组一项）。
- **朝代/作者**：顶层 author（如王应麟）；dynasty 脚本写「南宋到清末」；tags 蒙学。
- **老项目脚本**：`mengxue/sanzijin-new.ts`。整书只调用一次 `createMdContent({ title: `${data.title} (新版)`, paragraphs: data.paragraphs, author: data.author, dynasty: "南宋到清末", tags: ["蒙学"] })`。
- **备注**：单书单篇，无嵌套 content。

### 3.16 蒙学·千字文

- **路径**：`蒙学/qianziwen.json`。
- **顶层结构**：对象 `{ title, author, tags?, paragraphs[] }`。与三字经类似，整书单篇，paragraphs 为字符串数组（每四字或一句一项）。
- **朝代/作者**：顶层 author（周兴嗣）；dynasty 脚本写「南北」或「南北朝」；tags 蒙学。
- **老项目脚本**：`mengxue/qianziwen.ts`。逻辑同三字经，单次 createMdContent。
- **备注**：结构同三字经，无 content 嵌套。

### 3.17 蒙学·千家诗

- **路径**：`蒙学/qianjiashi.json`。
- **顶层结构**：对象 `{ title, author, content[] }`。`content` 按体裁（如五言絕句、七言律詩）分。
- **层级**：`content[]` 每项 `{ type, content[] }`；内层 `content[]` 每项 `{ chapter, author, paragraphs[] }`。**author 格式为「（唐）孟浩然」**，需用正则解析括号内朝代与括号外姓名。
- **朝代/作者**：dynasty 从 author 字符串解析（如 `（唐）孟浩然` → 唐、孟浩然）；tags 为 [section.type, "千家诗", "蒙学"]。
- **老项目脚本**：`mengxue/qianjiashi.ts`。双重循环，对每条 poem.author 用 `/^（([^）]+)）(.+)$/` 匹配，得到 dynasty 与 authorName；若有 subchapter 结构则再拆子条。`createMdContent({ title: poem.chapter, paragraphs, author: authorName, dynasty, tags: [section.type, "千家诗", "蒙学"] })`。
- **备注**：author 格式为「（朝代）作者名」，与古文观止的「朝代：作者名」不同。

### 3.18 蒙学·弟子规

- **路径**：`蒙学/dizigui.json`。
- **顶层结构**：对象 `{ title, author, content[] }`。`content` 为章节数组。
- **单条结构**：`content[]` 每项 `{ chapter, paragraphs[] }`。chapter 为章节名（如總敘、入則孝）；paragraphs 为字符串数组。
- **朝代/作者**：顶层 author（李毓秀）；dynasty 脚本写蒙学常用朝代或「清」；tags 蒙学。
- **老项目脚本**：`mengxue/dizigui.ts`。遍历 content，每章一条 `createMdContent({ title: item.chapter, paragraphs: item.paragraphs, author, dynasty, tags: ["蒙学"] })`。
- **备注**：一层 content 嵌套，无二层 content。

### 3.19 蒙学·百家姓

- **路径**：`蒙学/baijiaxing.json`。
- **顶层结构**：对象 `{ title, author, tags?, paragraphs[] }`。整书单篇，paragraphs 为字符串数组（每句若干姓）。
- **朝代/作者**：顶层 author（佚名）；tags 可能含「北宋」；dynasty 由脚本设定；tags 蒙学。
- **老项目脚本**：`mengxue/baijiaxing.ts`。单次 createMdContent，整书一篇。
- **备注**：与三字经、千字文类似，无 content 嵌套。

### 3.20 蒙学·朱子家训

- **路径**：`蒙学/zhuzijiaxun.json`。
- **顶层结构**：对象 `{ title, author, paragraphs[] }`。整书单篇，paragraphs 为字符串数组。
- **朝代/作者**：顶层 author（朱柏庐）；dynasty 由脚本设定；tags 蒙学。
- **老项目脚本**：`mengxue/zhuzijiaxun.ts`。单次 createMdContent。
- **备注**：结构同百家姓、三字经，无 content。

## 四、与 Markdown / 新系统衔接

无论何种 chinese-poetry 格式，老项目均先转为 `createMdContent` 的同一入参（title、paragraphs、author、dynasty、tags?），再根据 [markdown-format.md](markdown-format.md) 写出 `authorSlug/titleSlug.md`（含 Frontmatter 与正文/拼音/注释/译文/赏析区块）。

新系统若从 chinese-poetry 直接读 JSON：

1. **按本说明识别**：顶层是数组还是对象、标题/正文/作者字段名、朝代来源（文件名/写死/解析）。
2. **格式归一**：统一成「标题、正文数组、作者、朝代、（可选）tags」再写入 Markdown 或内存中的 Poem 结构。
3. **特殊解析**：古文观止的「朝代：作者」、千家诗的「（朝代）作者」、楚辞的朝代映射表、纳兰的 `para` → paragraphs 等，需在加载层单独处理。

## 五、未接入数据源格式

以下为 chinese-poetry 仓库中存在、但老项目 `chinese-poetry-to-markdown` **未接入**的数据，格式列出于此便于后续扩展。

### 5.1 诗经

- **路径**：`诗经/shijing.json`。
- **顶层结构**：数组，每项为一首。
- **单条结构**：`{ title, chapter, section, content[] }`。**无 author**；标题用 `title`（篇名如关雎、葛覃）；`chapter` 为「国风」等，`section` 为「周南」等；正文为 **content** 数组。
- **扩展建议**：需在脚本中写死或根据 chapter/section 推断作者/朝代；正文字段为 content，需映射为 paragraphs。

### 5.2 四书五经等

- **路径**：如 `四书五经/daxue.json`、`mengzi.json`、`zhongyong.json` 等。结构可能为数组或对象，需按实际 JSON 查看后再写加载逻辑；可参考论语、蒙学单篇（paragraphs）或嵌套 content 两种形态。

## 六、作者信息文件

chinese-poetry 中部分目录提供**作者简介** JSON，与诗词正文分离。本项目用 **gen_author_markdown**（`npm run gen_author_bio`）读取后生成 `POEMS_DIR/poems/<author_slug>/bio.md`，seed_db 时由 `load_author_bios` 解析并写入 `authors.description`。

| 路径 | 顶层 | 单条字段 | 说明 |
|------|------|----------|------|
| `宋词/author.song.json` | 数组 | `name`, `description?`, `short_description?` | 宋词作者 |
| `全唐诗/authors.tang.json` | 数组 | `name`, `desc`, `id?` | 唐诗作者 |
| `全唐诗/authors.song.json` | 数组 | `name`, `desc`, `id?` | 全唐诗目录下宋诗作者 |
| `五代诗词/nantang/authors.json` | 数组 | `name`, `desc` | 南唐作者 |

- **归一**：正文取 `description ?? desc`，空则跳过；短简介取 `short_description`（仅宋词有）；slug 与诗词一致，用 `toSlug(name)`。
- **产出**：每个作者一个 `chinese-poetry-md/poems/<author_slug>/bio.md`，与该作者的诗词 .md 同目录；格式见 [markdown-format.md](markdown-format.md)「作者简介 Markdown」。

---

各源 JSON 结构与本说明不一致时，以仓库内实际文件为准；脚本逻辑以 [legacy-tech-reference.md](legacy-tech-reference.md) 与 `scripts/chinese-poetry-to-markdown` 代码为准。
