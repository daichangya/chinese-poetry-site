/**
 * 从 chinese-poetry 作者 JSON 生成 POEMS_DIR/<author_slug>/bio.md。
 * 数据源见 docs/chinese-poetry-data-formats.md；产出格式见 docs/markdown-format.md。
 * @author poetry
 */

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";
import { Converter as OpenCCConverter } from "opencc-js/t2cn";
import { toSlug } from "../lib/slug.js";

const toSimplified = OpenCCConverter({ from: "t", to: "cn" });

/** 作者 JSON 路径（相对 chinesePoetryRoot），处理顺序：先五代、全唐诗、宋词，后写入覆盖先写入 */
export const AUTHOR_JSON_PATHS = [
  "五代诗词/nantang/authors.json",
  "全唐诗/authors.tang.json",
  "全唐诗/authors.song.json",
  "宋词/author.song.json",
];

export interface AuthorEntry {
  name: string;
  description?: string;
  short_description?: string;
  desc?: string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function writeBio(poemsDir: string, slug: string, name: string, body: string, shortDescription?: string): void {
  const dir = path.join(poemsDir, "poems", slug);
  ensureDir(dir);
  const frontmatter: Record<string, string> = { title: name };
  if (shortDescription) frontmatter.short_description = shortDescription;
  const content = matter.stringify(body, frontmatter, { lineWidth: -1 } as Record<string, unknown>);
  fs.writeFileSync(path.join(dir, "bio.md"), content, "utf-8");
}

/**
 * 从 chinese-poetry 作者 JSON 生成 poemsDir/poems/<author_slug>/bio.md。
 * 若未传参则使用环境变量 CHINESE_POETRY_ROOT/CHINESE_POETRY_DIR 与 POEMS_DIR/POEMS_OUTPUT_DIR。
 * @returns 写入的 bio 文件数量
 */
export function run(
  chinesePoetryRoot?: string,
  poemsDir?: string
): number {
  const root =
    chinesePoetryRoot ??
    process.env.CHINESE_POETRY_ROOT ??
    process.env.CHINESE_POETRY_DIR ??
    path.join(process.cwd(), "chinese-poetry");
  const outDir =
    poemsDir ?? process.env.POEMS_DIR ?? process.env.POEMS_OUTPUT_DIR ?? path.join(process.cwd(), "chinese-poetry-md");

  console.log("gen_author_markdown: CHINESE_POETRY_ROOT =", root);
  console.log("gen_author_markdown: POEMS_DIR =", outDir);

  let written = 0;
  for (const rel of AUTHOR_JSON_PATHS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      console.warn("gen_author_markdown: skip (not found)", rel);
      continue;
    }
    let list: AuthorEntry[];
    try {
      const data = readJson<AuthorEntry[] | Record<string, AuthorEntry>>(abs);
      list = Array.isArray(data) ? data : Object.values(data);
    } catch (e) {
      console.warn("gen_author_markdown: skip (parse error)", rel, e);
      continue;
    }
    for (const item of list) {
      const name = (item.name ?? "").trim();
      if (!name) continue;
      const bodyRaw = (item.description ?? item.desc ?? "").trim();
      if (!bodyRaw) continue;
      const body = toSimplified(bodyRaw);
      const slug = toSlug(name);
      if (!slug) continue;
      const shortDescription = item.short_description ? toSimplified(item.short_description.trim()) : undefined;
      writeBio(outDir, slug, toSimplified(name), body, shortDescription);
      written++;
    }
    console.log("gen_author_markdown: processed", rel, "entries from", list.length);
  }
  console.log("gen_author_markdown: wrote", written, "bio.md files");
  return written;
}

function main(): void {
  run();
}

// 仅在被直接执行时运行（避免被 test 引用时执行）
const isEntry =
  typeof process !== "undefined" &&
  process.argv[1] != null &&
  (process.argv[1].endsWith("gen_author_markdown.ts") || process.argv[1].endsWith("gen_author_markdown.js"));
if (isEntry) main();
