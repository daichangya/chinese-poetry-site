/**
 * 从 POEMS_DIR 扫描并解析 .md 文件，得到 poems/authors/dynasties。
 * 按 docs/markdown-format.md 解析 Frontmatter 与 ## 区块。
 * 中间产出（data/*.json）统一为简体：解析时对中文文本做繁转简。
 * @author poetry
 */

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";
import { Converter as OpenCCConverter } from "opencc-js/t2cn";
import { toSlug, getPinyinInitial2 } from "./slug";
import type { Poem, Author, Dynasty, Tag, LoadDataResult } from "./types.js";

/** 繁转简，使 data 目录 JSON 等中间文件统一为简体 */
const toSimplified = OpenCCConverter({ from: "t", to: "cn" });

const POEMS_DIR =
  process.env.POEMS_DIR ?? process.env.POEMS_OUTPUT_DIR ?? path.join(process.cwd(), "chinese-poetry-md");

/** 解析 ## 区块：正文/拼音为列表项（- 开头），译文/赏析/注释为合并字符串 */
function parseSections(body: string): {
  paragraphs: string[];
  paragraphsPinyin: string[];
  translation: string;
  appreciation: string;
  annotation: string;
} {
  const paragraphs: string[] = [];
  const paragraphsPinyin: string[] = [];
  let translation = "";
  let appreciation = "";
  let annotation = "";

  const sections = body.split(/(?=^##\s)/m);
  for (const block of sections) {
    const lines = block.trim().split("\n");
    if (lines.length === 0) continue;
    const header = lines[0];
    const content = lines.slice(1).join("\n").trim();
    if (header.startsWith("## 正文")) {
      for (const line of content.split("\n")) {
        const m = line.match(/^-\s+(.*)$/);
        if (m) paragraphs.push(m[1]!.trim());
      }
    } else if (header.startsWith("## 拼音")) {
      for (const line of content.split("\n")) {
        const m = line.match(/^-\s+(.*)$/);
        if (m) paragraphsPinyin.push(m[1]!.trim());
      }
    } else if (header.startsWith("## 译文")) {
      translation = content
        .split("\n")
        .map((l) => {
          const m = l.match(/^-\s+(.*)$/);
          return (m ? m[1] : l).trim();
        })
        .filter(Boolean)
        .join("\n");
    } else if (header.startsWith("## 赏析")) {
      appreciation = content
        .split("\n")
        .map((l) => {
          const m = l.match(/^-\s+(.*)$/);
          return (m ? m[1] : l).trim();
        })
        .filter(Boolean)
        .join("\n");
    } else if (header.startsWith("## 注释")) {
      annotation = content
        .split("\n")
        .map((l) => {
          const m = l.match(/^-\s+(.*)$/);
          return (m ? m[1] : l).trim();
        })
        .filter(Boolean)
        .join("\n");
    }
  }
  return { paragraphs, paragraphsPinyin, translation, appreciation, annotation };
}

const BIO_FILENAMES = ["bio.md", "_bio.md"];

/** 递归收集目录下所有 .md 文件路径（相对 baseDir），排除作者简介 bio.md / _bio.md */
function collectMdFiles(dir: string, baseDir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(baseDir, full);
    if (e.isDirectory()) {
      collectMdFiles(full, baseDir, out);
    } else if (e.isFile() && e.name.endsWith(".md") && !BIO_FILENAMES.includes(e.name)) {
      out.push(rel);
    }
  }
}

/** 解析单篇 .md 为 Poem；中文文本统一繁转简 */
function parseOneMd(filePath: string, content: string): Poem | null {
  const { data: fm, content: body } = matter(content);
  const slug = (fm.id ?? fm.titleSlug ?? path.basename(filePath, ".md")) as string;
  let title = (fm.title ?? "") as string;
  let author = (fm.author ?? fm.authorName ?? "") as string;
  let authorSlug = (fm.authorSlug ?? "") as string;
  if (!authorSlug && author) authorSlug = toSlug(author);
  let dynasty = (fm.dynasty ?? fm.dynastyName ?? "") as string;
  const dynastySlug = (fm.dynastySlug ?? "") as string;
  const id = (fm.id ?? `${authorSlug}-${slug}`) as string;
  let tags = fm.tags;
  if (Array.isArray(tags)) {
    tags = tags.map((t: unknown) =>
      typeof t === "object" && t && "slug" in t ? (t as { slug: string }).slug : toSimplified(String(t))
    );
  } else {
    tags = [];
  }
  const { paragraphs: rawParagraphs, paragraphsPinyin, translation: rawTranslation, appreciation: rawAppreciation, annotation: rawAnnotation } = parseSections(body);
  if (!title || !rawParagraphs.length) return null;

  title = toSimplified(title);
  author = toSimplified(author);
  dynasty = toSimplified(dynasty);
  const paragraphs = rawParagraphs.map((p) => toSimplified(p));
  const translation = rawTranslation ? toSimplified(rawTranslation) : "";
  const appreciation = rawAppreciation ? toSimplified(rawAppreciation) : "";
  const annotation = rawAnnotation ? toSimplified(rawAnnotation) : "";

  const rhythmicRaw = (fm.rhythmic as string) ?? "";
  const rhythmic = rhythmicRaw ? toSimplified(rhythmicRaw) : undefined;

  return {
    slug,
    id,
    title,
    titlePinyin: fm.titlePinyin,
    titleSlug: slug,
    author,
    authorPinyin: fm.authorPinyin,
    authorSlug,
    dynasty,
    dynastyPinyin: fm.dynastyPinyin,
    dynastySlug,
    tags: tags as string[],
    paragraphs,
    paragraphsPinyin: paragraphsPinyin.length ? paragraphsPinyin : undefined,
    translation: translation || undefined,
    appreciation: appreciation || undefined,
    annotation: annotation || undefined,
    rhythmic,
  };
}

/** POEMS_DIR 下诗词 .md 所在子目录（与 chinese-poetry-md 仓库结构一致）；若不存在则退化为 poemsDir 根 */
function getContentRoot(poemsDir: string): string {
  const underPoems = path.join(poemsDir, "poems");
  return fs.existsSync(underPoems) ? underPoems : poemsDir;
}

/**
 * 从 POEMS_DIR 加载所有 .md，解析为 poems，并推导 authors、dynasties。
 * 若存在 POEMS_DIR/poems 则从该目录扫描，否则从 POEMS_DIR 根扫描（兼容旧结构）。
 */
export function loadAll(poemsDir: string = POEMS_DIR): LoadDataResult {
  const contentRoot = getContentRoot(poemsDir);
  const mdFiles: string[] = [];
  collectMdFiles(contentRoot, contentRoot, mdFiles);
  const poems: Poem[] = [];
  for (const rel of mdFiles) {
    const full = path.join(contentRoot, rel);
    try {
      const content = fs.readFileSync(full, "utf-8");
      const poem = parseOneMd(rel, content);
      if (poem) poems.push(poem);
    } catch {
      // skip invalid files
    }
  }

  const authorMap = new Map<string, { name: string; count: number }>();
  const dynastyMap = new Map<string, { name: string; count: number }>();
  const tagMap = new Map<string, { name: string; count: number }>();
  for (const p of poems) {
    if (p.authorSlug) {
      const cur = authorMap.get(p.authorSlug);
      authorMap.set(p.authorSlug, {
        name: p.author,
        count: cur ? cur.count + 1 : 1,
      });
    }
    if (p.dynastySlug) {
      const cur = dynastyMap.get(p.dynastySlug);
      dynastyMap.set(p.dynastySlug, {
        name: p.dynasty,
        count: cur ? cur.count + 1 : 1,
      });
    }
    for (const t of p.tags ?? []) {
      const raw = typeof t === "string" ? t : String(t);
      const slug = toSlug(raw);
      const name = toSimplified(raw);
      const cur = tagMap.get(slug);
      tagMap.set(slug, { name, count: cur ? cur.count + 1 : 1 });
    }
  }

  const authors: Author[] = Array.from(authorMap.entries()).map(([slug, { name, count }]) => ({
    slug,
    name,
    poem_count: count,
  }));

  const dynasties: Dynasty[] = Array.from(dynastyMap.entries()).map(([slug, { name, count }]) => ({
    slug,
    name,
    poem_count: count,
  }));

  const tags: Tag[] = Array.from(tagMap.entries()).map(([slug, { name, count }]) => ({
    slug,
    name,
    poem_count: count,
  }));

  return { poems, authors, dynasties, tags };
}

/** 精简列表项（poems/search/*、poems/dynasty/*）：title、author_name 必选，slug 仅在与 toSlug(title) 不同时写入 */
export interface PoemSearchItemMinimal {
  title: string;
  author_name: string;
  slug?: string;
}

/** 写出 data/poems/dynasty/*.json（按朝代分片）、data/poems/search/*.json（按标题前两字拼音首字母分片）、authors/dynasties/tags */
export function writeDataJson(
  result: LoadDataResult,
  outDir: string
): void {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const toListItem = (p: Poem): PoemSearchItemMinimal => {
    const base: PoemSearchItemMinimal = { title: p.title, author_name: p.author };
    if (p.slug !== toSlug(p.title)) base.slug = p.slug;
    return base;
  };

  const dynastyDir = path.join(outDir, "poems", "dynasty");
  if (!fs.existsSync(dynastyDir)) fs.mkdirSync(dynastyDir, { recursive: true });
  for (const d of result.dynasties) {
    const dynastyPoems = result.poems.filter((p) => p.dynastySlug === d.slug);
    const byKey = new Map<string, PoemSearchItemMinimal[]>();
    for (const p of dynastyPoems) {
      const key = getPinyinInitial2(p.title);
      const list = byKey.get(key) ?? [];
      list.push(toListItem(p));
      byKey.set(key, list);
    }
    const initials = Array.from(byKey.keys()).sort();
    fs.writeFileSync(
      path.join(dynastyDir, `${d.slug}.json`),
      JSON.stringify({ initials }, null, 0),
      "utf-8"
    );
    const dynastySlugDir = path.join(dynastyDir, d.slug);
    if (!fs.existsSync(dynastySlugDir)) fs.mkdirSync(dynastySlugDir, { recursive: true });
    for (const key of initials) {
      const items = byKey.get(key)!;
      fs.writeFileSync(
        path.join(dynastySlugDir, `${key}.json`),
        JSON.stringify(items, null, 0),
        "utf-8"
      );
    }
  }

  const authorDir = path.join(outDir, "poems", "author");
  if (!fs.existsSync(authorDir)) fs.mkdirSync(authorDir, { recursive: true });
  for (const a of result.authors) {
    const items: PoemSearchItemMinimal[] = result.poems
      .filter((p) => p.authorSlug === a.slug)
      .map(toListItem);
    fs.writeFileSync(
      path.join(authorDir, `${a.slug}.json`),
      JSON.stringify(items, null, 0),
      "utf-8"
    );
  }

  const tagDir = path.join(outDir, "poems", "tag");
  if (!fs.existsSync(tagDir)) fs.mkdirSync(tagDir, { recursive: true });
  for (const t of result.tags) {
    if (!t.slug) continue;
    const items: PoemSearchItemMinimal[] = result.poems
      .filter((p) => p.tags?.includes(t.name) || p.tags?.includes(t.slug))
      .map(toListItem);
    fs.writeFileSync(
      path.join(tagDir, `${t.slug}.json`),
      JSON.stringify(items, null, 0),
      "utf-8"
    );
  }

  const searchDir = path.join(outDir, "poems", "search");
  if (!fs.existsSync(searchDir)) fs.mkdirSync(searchDir, { recursive: true });
  const byKey = new Map<string, PoemSearchItemMinimal[]>();
  for (const p of result.poems) {
    const key = getPinyinInitial2(p.title);
    const list = byKey.get(key) ?? [];
    list.push(toListItem(p));
    byKey.set(key, list);
  }
  const keys = Array.from(byKey.keys()).sort();
  for (const key of keys) {
    const items = byKey.get(key)!;
    fs.writeFileSync(
      path.join(searchDir, `${key}.json`),
      JSON.stringify(items, null, 0),
      "utf-8"
    );
  }
  fs.writeFileSync(
    path.join(outDir, "poems", "search_keys.json"),
    JSON.stringify({ keys }, null, 0),
    "utf-8"
  );

  fs.writeFileSync(
    path.join(outDir, "authors.json"),
    JSON.stringify(result.authors, null, 0),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(outDir, "dynasties.json"),
    JSON.stringify(result.dynasties, null, 0),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(outDir, "tags.json"),
    JSON.stringify(result.tags, null, 0),
    "utf-8"
  );
}
