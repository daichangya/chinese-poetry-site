/**
 * MD → 切分 JSON 数据源：loadAll(POEMS_DIR) 产出写入 public/data/，单文件 ≤1MB，供 DATABASE_TYPE=json 运行时 fetch。
 * @author poetry
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadAll } from "../lib/load_data.js";
import { loadAuthorBios } from "../lib/load_author_bios.js";
import { toSlug } from "../lib/slug.js";
import type { Poem, Author, Dynasty, Tag, PoemSearchItem } from "../lib/types.js";

const POEMS_DIR =
  process.env.POEMS_DIR ?? process.env.POEMS_OUTPUT_DIR ?? path.join(process.cwd(), "chinese-poetry-md");
const OUT_DIR = process.env.DATA_JSON_OUTPUT_DIR ?? path.join(process.cwd(), "public", "data");
const MAX_FILE_BYTES = 900 * 1024; // ~900KB per chunk
const RANDOM_POOL_SIZE = 5000;

const EXCERPT_MAX_LEN = 30;
function excerptFromParagraphs(paragraphs: string[]): string | null {
  if (!paragraphs?.length) return null;
  const first = paragraphs[0]?.trim() ?? "";
  if (first.length <= EXCERPT_MAX_LEN) return first || null;
  return first.slice(0, EXCERPT_MAX_LEN) + "…";
}

/** 列表项：与 API 返回的列表/筛选一致；含 author_slug/dynasty_slug 供 JSON 源组装 Poem */
interface ListItem {
  slug: string;
  title: string;
  author_name: string;
  dynasty_name: string;
  author_slug?: string;
  dynasty_slug?: string;
  excerpt?: string;
  rhythmic?: string;
}

function toListItem(p: Poem, dynastyName: string): ListItem {
  const item: ListItem = {
    slug: p.slug,
    title: p.title,
    author_name: p.author,
    dynasty_name: dynastyName,
    author_slug: p.authorSlug,
    dynasty_slug: p.dynastySlug,
  };
  const excerpt = excerptFromParagraphs(p.paragraphs);
  if (excerpt) item.excerpt = excerpt;
  if (p.rhythmic) item.rhythmic = p.rhythmic;
  return item;
}

function writeJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");
}

/** 将数组按字节大小切分为多个 chunk，每块 ≤ maxBytes */
function chunkBySize<T>(items: T[], maxBytes: number, serializer: (arr: T[]) => string): { chunks: T[][]; totalBytes: number } {
  const chunks: T[][] = [];
  let current: T[] = [];
  let currentBytes = 2; // "[]"
  for (const item of items) {
    const oneSize = serializer([item]).length;
    if (current.length > 0 && currentBytes + oneSize + 1 > maxBytes) {
      chunks.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(item);
    currentBytes += (current.length === 1 ? 0 : 1) + oneSize;
  }
  if (current.length > 0) chunks.push(current);
  return { chunks, totalBytes: chunks.reduce((acc, c) => acc + serializer(c).length, 0) };
}

async function main(): Promise<void> {
  console.log("build_json_data: loading from", POEMS_DIR);
  const { poems, authors, dynasties, tags } = loadAll(POEMS_DIR);
  const bioMap = loadAuthorBios(POEMS_DIR);

  const dynastyNameBySlug = new Map<string, string>(dynasties.map((d) => [d.slug, d.name]));
  const authorsWithBio: Author[] = authors.map((a) => ({
    ...a,
    description: bioMap.get(a.slug),
  }));

  const poemsSorted = [...poems].sort((a, b) => a.slug.localeCompare(b.slug));
  poemsSorted.forEach((p) => {
    const excerpt = excerptFromParagraphs(p.paragraphs);
    (p as Poem & { excerpt?: string }).excerpt = excerpt ?? undefined;
  });

  const rhythmics = new Map<string, number>();
  for (const p of poems) {
    if (p.rhythmic?.trim()) {
      const slug = toSlug(p.rhythmic);
      rhythmics.set(slug, (rhythmics.get(slug) ?? 0) + 1);
    }
  }
  const rhythmicsList = Array.from(rhythmics.entries())
    .map(([slug, poem_count]) => ({ slug, name: slug, poem_count }))
    .sort((a, b) => b.poem_count - a.poem_count);
  const rhythmicNameBySlug = new Map<string, string>();
  for (const p of poems) {
    if (p.rhythmic?.trim()) {
      const s = toSlug(p.rhythmic);
      if (!rhythmicNameBySlug.has(s)) rhythmicNameBySlug.set(s, p.rhythmic!);
    }
  }
  const rhythmicsWithName = rhythmicsList.map((r) => ({ ...r, name: rhythmicNameBySlug.get(r.slug) ?? r.slug }));

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  writeJson(path.join(OUT_DIR, "authors.json"), authorsWithBio);
  writeJson(path.join(OUT_DIR, "dynasties.json"), dynasties);
  writeJson(path.join(OUT_DIR, "tags.json"), tags);
  writeJson(path.join(OUT_DIR, "rhythmics.json"), rhythmicsWithName);

  const poemChunkSerializer = (arr: Poem[]) => JSON.stringify({ poems: arr });
  const { chunks: poemChunks } = chunkBySize(poemsSorted, MAX_FILE_BYTES, poemChunkSerializer);
  const poemsDir = path.join(OUT_DIR, "poems");
  if (!fs.existsSync(poemsDir)) fs.mkdirSync(poemsDir, { recursive: true });
  const slugRanges: { slugMin: string; slugMax: string; file: string }[] = [];
  poemChunks.forEach((chunk, i) => {
    const file = `chunk-${String(i).padStart(4, "0")}.json`;
    const outPath = path.join(poemsDir, file);
    writeJson(outPath, { poems: chunk });
    const slugMin = chunk[0]!.slug;
    const slugMax = chunk[chunk.length - 1]!.slug;
    slugRanges.push({ slugMin, slugMax, file });
  });
  writeJson(path.join(poemsDir, "slug-ranges.json"), slugRanges);

  const searchItems: PoemSearchItem[] = poems.map((p) => ({
    slug: p.slug,
    title: p.title,
    author_name: p.author,
    dynasty_name: dynastyNameBySlug.get(p.dynastySlug) ?? p.dynasty,
  }));
  const searchChunkSerializer = (arr: PoemSearchItem[]) => JSON.stringify(arr);
  const { chunks: searchChunks } = chunkBySize(searchItems, MAX_FILE_BYTES, searchChunkSerializer);
  const searchDir = path.join(OUT_DIR, "search");
  if (!fs.existsSync(searchDir)) fs.mkdirSync(searchDir, { recursive: true });
  searchChunks.forEach((chunk, i) => {
    writeJson(path.join(searchDir, `chunk-${String(i).padStart(4, "0")}.json`), chunk);
  });

  const listItemSerializer = (arr: ListItem[]) => JSON.stringify(arr);
  const listDir = path.join(OUT_DIR, "list");
  const writeListDimension = (
    dimension: "dynasty" | "author" | "tag" | "rhythmic",
    filter: (p: Poem, slug: string) => boolean
  ) => {
    const dimDir = path.join(listDir, dimension);
    if (!fs.existsSync(dimDir)) fs.mkdirSync(dimDir, { recursive: true });
    const meta: Record<string, { total: number; chunks?: string[] }> = {};
    if (dimension === "dynasty") {
      for (const d of dynasties) {
        const items = poems
          .filter((p) => filter(p, d.slug))
          .map((p) => toListItem(p, dynastyNameBySlug.get(p.dynastySlug) ?? p.dynasty));
        if (items.length === 0) continue;
        const { chunks: listChunks } = chunkBySize(items, MAX_FILE_BYTES, listItemSerializer);
        if (listChunks.length === 1) {
          writeJson(path.join(dimDir, `${d.slug}.json`), items);
          meta[d.slug] = { total: items.length };
        } else {
          const subDir = path.join(dimDir, d.slug);
          if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
          const chunkFiles = listChunks.map((_, i) => `${i}.json`);
          listChunks.forEach((chunk, i) => writeJson(path.join(subDir, `${i}.json`), chunk));
          writeJson(path.join(subDir, "meta.json"), { total: items.length, chunks: chunkFiles });
          meta[d.slug] = { total: items.length, chunks: chunkFiles };
        }
      }
    } else if (dimension === "author") {
      for (const a of authors) {
        const items = poems.filter((p) => filter(p, a.slug)).map((p) => toListItem(p, dynastyNameBySlug.get(p.dynastySlug) ?? p.dynasty));
        if (items.length === 0) continue;
        const { chunks: listChunks } = chunkBySize(items, MAX_FILE_BYTES, listItemSerializer);
        if (listChunks.length === 1) {
          writeJson(path.join(dimDir, `${a.slug}.json`), items);
          meta[a.slug] = { total: items.length };
        } else {
          const subDir = path.join(dimDir, a.slug);
          if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
          const chunkFiles = listChunks.map((_, i) => `${i}.json`);
          listChunks.forEach((chunk, i) => writeJson(path.join(subDir, `${i}.json`), chunk));
          writeJson(path.join(subDir, "meta.json"), { total: items.length, chunks: chunkFiles });
          meta[a.slug] = { total: items.length, chunks: chunkFiles };
        }
      }
    } else if (dimension === "rhythmic") {
      for (const r of rhythmicsWithName) {
        const items = poems
          .filter((p) => filter(p, r.slug))
          .map((p) => toListItem(p, dynastyNameBySlug.get(p.dynastySlug) ?? p.dynasty));
        if (items.length === 0) continue;
        const { chunks: listChunks } = chunkBySize(items, MAX_FILE_BYTES, listItemSerializer);
        if (listChunks.length === 1) {
          writeJson(path.join(dimDir, `${r.slug}.json`), items);
          meta[r.slug] = { total: items.length };
        } else {
          const subDir = path.join(dimDir, r.slug);
          if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
          const chunkFiles = listChunks.map((_, i) => `${i}.json`);
          listChunks.forEach((chunk, i) => writeJson(path.join(subDir, `${i}.json`), chunk));
          writeJson(path.join(subDir, "meta.json"), { total: items.length, chunks: chunkFiles });
          meta[r.slug] = { total: items.length, chunks: chunkFiles };
        }
      }
    } else {
      for (const t of tags) {
        const items = poems
          .filter((p) => filter(p, t.slug))
          .map((p) => toListItem(p, dynastyNameBySlug.get(p.dynastySlug) ?? p.dynasty));
        if (items.length === 0) continue;
        const { chunks: listChunks } = chunkBySize(items, MAX_FILE_BYTES, listItemSerializer);
        if (listChunks.length === 1) {
          writeJson(path.join(dimDir, `${t.slug}.json`), items);
          meta[t.slug] = { total: items.length };
        } else {
          const subDir = path.join(dimDir, t.slug);
          if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
          const chunkFiles = listChunks.map((_, i) => `${i}.json`);
          listChunks.forEach((chunk, i) => writeJson(path.join(subDir, `${i}.json`), chunk));
          writeJson(path.join(subDir, "meta.json"), { total: items.length, chunks: chunkFiles });
          meta[t.slug] = { total: items.length, chunks: chunkFiles };
        }
      }
    }
    return meta;
  };
  writeListDimension("dynasty", (p, slug) => p.dynastySlug === slug);
  writeListDimension("author", (p, slug) => p.authorSlug === slug);
  writeListDimension("tag", (p, slug) => p.tags?.some((t) => t === slug || toSlug(t) === slug) ?? false);
  writeListDimension("rhythmic", (p, slug) => (p.rhythmic ? toSlug(p.rhythmic) === slug : false));

  const allSlugs = poems.map((p) => p.slug);
  const randomPool =
    allSlugs.length <= RANDOM_POOL_SIZE
      ? allSlugs
      : Array.from({ length: RANDOM_POOL_SIZE }, () => allSlugs[Math.floor(Math.random() * allSlugs.length)]!);
  writeJson(path.join(OUT_DIR, "random-pool.json"), randomPool);

  const manifest = {
    version: 1,
    poemCount: poems.length,
    authorCount: authors.length,
    dynastyCount: dynasties.length,
    tagCount: tags.length,
    poemChunks: slugRanges.map((r, i) => ({ file: r.file, slugMin: r.slugMin, slugMax: r.slugMax, count: poemChunks[i]!.length })),
    searchChunkCount: searchChunks.length,
    randomPoolSize: randomPool.length,
  };
  writeJson(path.join(OUT_DIR, "manifest.json"), manifest);

  console.log(
    `build_json_data: wrote ${OUT_DIR} (poems ${poemChunks.length} chunks, search ${searchChunks.length} chunks, random ${randomPool.length})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
