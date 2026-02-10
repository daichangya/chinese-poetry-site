/**
 * JSON 数据源只读层：从 public/data/*.json（或 NEXT_PUBLIC_DATA_URL）fetch/读取，实现与 lib/db/queries 同名的 API。
 * 供 DATABASE_TYPE=json 时使用；与 dynasty 展示名逻辑一致。
 * @author poetry
 */

import "server-only";
import * as fs from "node:fs";
import * as path from "node:path";
import { getDynastyDisplayNameOrFallback } from "./dynasty";
import { getSSGTagSlugs, SSG_MAX_SLUGS_PER_TAG } from "./ssg_config";
import { toSlug, toPinyinToneNum } from "./slug";
import type { Poem, Author, Dynasty, Tag, PoemSearchItem } from "./types";

const DATA_PATH = "public/data";

function getDataDir(): string {
  return path.join(process.cwd(), DATA_PATH);
}

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_DATA_URL ?? "").trim();
}

async function getJson<T>(relativePath: string): Promise<T> {
  const base = getBaseUrl();
  const fullPath = path.join(getDataDir(), relativePath);
  if (!base) {
    const raw = fs.readFileSync(fullPath, "utf-8");
    return JSON.parse(raw) as T;
  }
  const url = base.replace(/\/$/, "") + "/" + relativePath.replace(/^\//, "");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`data-json: ${res.status} ${relativePath}`);
  return res.json() as Promise<T>;
}

interface Manifest {
  poemCount: number;
  authorCount: number;
  dynastyCount: number;
  tagCount: number;
  poemChunks: { file: string; slugMin: string; slugMax: string; count: number }[];
  searchChunkCount: number;
  randomPoolSize: number;
}

interface SlugRange {
  slugMin: string;
  slugMax: string;
  file: string;
}

interface PoemChunk {
  poems: Poem[];
}

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

function listItemToPoem(item: ListItem, dynastySlug: string): Poem {
  const dSlug = item.dynasty_slug ?? dynastySlug;
  const aSlug = item.author_slug ?? "";
  const dynastyDisplay = getDynastyDisplayNameOrFallback(dSlug, item.dynasty_name);
  return {
    slug: item.slug,
    title: item.title,
    author: item.author_name,
    dynasty: dynastyDisplay,
    titleSlug: toSlug(item.title),
    authorSlug: aSlug,
    dynastySlug: dSlug,
    id: item.slug,
    paragraphs: [],
    tags: [],
    rhythmic: item.rhythmic,
    excerpt: item.excerpt,
  };
}

let manifestCache: Manifest | null = null;
async function getManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache;
  manifestCache = await getJson<Manifest>("manifest.json");
  return manifestCache!;
}

export async function getPoemBySlug(slug: string): Promise<Poem | undefined> {
  const ranges = await getJson<SlugRange[]>("poems/slug-ranges.json");
  const found = ranges.find((r) => r.slugMin <= slug && slug <= r.slugMax);
  if (!found) return undefined;
  const chunk = await getJson<PoemChunk>(`poems/${found.file}`);
  const poem = chunk.poems.find((p) => p.slug === slug);
  if (!poem) return undefined;
  const titlePinyin = toPinyinToneNum(poem.title) || undefined;
  const paragraphsPinyin = poem.paragraphs?.length
    ? poem.paragraphs.map((line) => toPinyinToneNum(line))
    : undefined;
  return {
    ...poem,
    dynasty: getDynastyDisplayNameOrFallback(poem.dynastySlug, poem.dynasty),
    titlePinyin,
    authorPinyin: toPinyinToneNum(poem.author) || undefined,
    dynastyPinyin: toPinyinToneNum(poem.dynasty) || undefined,
    paragraphsPinyin,
  };
}

export async function getAuthors(offset = 0, limit = 10000): Promise<Author[]> {
  const list = await getJson<Author[]>("authors.json");
  return list.slice(offset, offset + limit);
}

export async function getAuthorBySlug(slug: string): Promise<Author | undefined> {
  const list = await getJson<Author[]>("authors.json");
  return list.find((a) => a.slug === slug);
}

/** 按姓名精确匹配作者，供 Nav 诗人搜索跳转作者页使用。 */
export async function getAuthorByName(name: string): Promise<Author | undefined> {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  const list = await getJson<Author[]>("authors.json");
  return list.find((a) => a.name === trimmed);
}

export async function getDynasties(): Promise<Dynasty[]> {
  const rows = await getJson<Array<{ slug: string; name: string; poem_count: number }>>("dynasties.json");
  return rows.map((r) => ({ slug: r.slug, name: getDynastyDisplayNameOrFallback(r.slug, r.name), poem_count: r.poem_count }));
}

export async function getTags(): Promise<Tag[]> {
  return getJson<Tag[]>("tags.json");
}

export async function getRhythmics(): Promise<Array<{ slug: string; name: string; poem_count: number }>> {
  return getJson("rhythmics.json");
}

export async function getPoemsByRhythmic(name: string, offset = 0, limit = 50): Promise<Poem[]> {
  const rhythmics = await getRhythmics();
  const rh = rhythmics.find((r) => r.name === name || r.slug === name);
  if (!rh) return [];
  const { items } = await loadListChunk("rhythmic", rh.slug, offset, limit);
  const dSlug = items[0]?.dynasty_slug ?? "";
  return items.map((item) => listItemToPoem(item, item.dynasty_slug ?? dSlug));
}

export async function countPoemsByRhythmic(name: string): Promise<number> {
  const rhythmics = await getRhythmics();
  const rh = rhythmics.find((r) => r.name === name || r.slug === name);
  return rh?.poem_count ?? 0;
}

export async function getPoemsAll(offset = 0, limit = 50): Promise<Poem[]> {
  const manifest = await getManifest();
  const slugs: string[] = [];
  let skip = offset;
  const take = limit;
  for (const ch of manifest.poemChunks) {
    const chunk = await getJson<PoemChunk>(`poems/${ch.file}`);
    for (const p of chunk.poems) {
      if (skip > 0) {
        skip--;
        continue;
      }
      slugs.push(p.slug);
      if (slugs.length >= take) break;
    }
    if (slugs.length >= take) break;
  }
  const out: Poem[] = [];
  for (const slug of slugs) {
    const p = await getPoemBySlug(slug);
    if (p) out.push(p);
  }
  return out;
}

const emptyListResult = (
  dimension: "dynasty" | "author" | "tag" | "rhythmic",
  slug: string
): { items: ListItem[]; total: number; dynastySlug?: string; authorSlug?: string } => ({
  items: [],
  total: 0,
  dynastySlug: dimension === "dynasty" ? slug : undefined,
  authorSlug: dimension === "author" ? slug : undefined,
});

async function loadListChunk(
  dimension: "dynasty" | "author" | "tag" | "rhythmic",
  slug: string,
  offset: number,
  limit: number
): Promise<{ items: ListItem[]; total: number; dynastySlug?: string; authorSlug?: string }> {
  try {
    const singlePath = `list/${dimension}/${slug}.json`;
    const base = getBaseUrl();
    const dataDir = getDataDir();
    const singleFull = path.join(dataDir, singlePath);
    const metaFull = path.join(dataDir, `list/${dimension}/${slug}/meta.json`);
    let total: number;
    let items: ListItem[];
    if (!base && fs.existsSync(singleFull)) {
      const data = await getJson<ListItem[]>(singlePath);
      total = data.length;
      items = data.slice(offset, offset + limit);
    } else if (!base && fs.existsSync(metaFull)) {
      const meta = await getJson<{ total: number; chunks: string[] }>(`list/${dimension}/${slug}/meta.json`);
      total = meta.total;
      let start = 0;
      let end = 0;
      const chunkIndex: number[] = [];
      for (let i = 0; i < meta.chunks.length; i++) {
        const c = await getJson<ListItem[]>(`list/${dimension}/${slug}/${i}.json`);
        start = end;
        end += c.length;
        chunkIndex.push(start, end);
      }
      const needStart = offset;
      const needEnd = offset + limit;
      items = [];
      for (let i = 0; i < meta.chunks.length; i++) {
        const chunkStart = chunkIndex[2 * i]!;
        const chunkEnd = chunkIndex[2 * i + 1]!;
        if (needEnd <= chunkStart || needStart >= chunkEnd) continue;
        const c = await getJson<ListItem[]>(`list/${dimension}/${slug}/${i}.json`);
        const sliceStart = Math.max(0, needStart - chunkStart);
        const sliceEnd = Math.min(c.length, needEnd - chunkStart);
        items.push(...c.slice(sliceStart, sliceEnd));
      }
    } else {
      const data = await getJson<ListItem[] | { total: number; chunks: string[] }>(singlePath).catch(async () => {
        const meta = await getJson<{ total: number; chunks: string[] }>(`list/${dimension}/${slug}/meta.json`);
        return meta;
      });
      if (Array.isArray(data)) {
        total = data.length;
        items = data.slice(offset, offset + limit);
      } else {
        total = data.total;
        items = [];
        let cursor = 0;
        for (let i = 0; i < data.chunks.length; i++) {
          const c = await getJson<ListItem[]>(`list/${dimension}/${slug}/${i}.json`);
          const chunkStart = cursor;
          cursor += c.length;
          const chunkEnd = cursor;
          if (offset + limit <= chunkStart || offset >= chunkEnd) continue;
          const sliceStart = Math.max(0, offset - chunkStart);
          const sliceEnd = Math.min(c.length, offset + limit - chunkStart);
          items.push(...c.slice(sliceStart, sliceEnd));
        }
      }
    }
    return {
      items,
      total,
      dynastySlug: dimension === "dynasty" ? slug : undefined,
      authorSlug: dimension === "author" ? slug : undefined,
    };
  } catch {
    return emptyListResult(dimension, slug);
  }
}

export async function getPoemsByDynasty(dynastySlug: string, offset = 0, limit = 50): Promise<Poem[]> {
  const { items } = await loadListChunk("dynasty", dynastySlug, offset, limit);
  const dynastyName = (await getDynasties()).find((d) => d.slug === dynastySlug)?.name ?? "";
  return items.map((item) => listItemToPoem(item, dynastySlug));
}

export async function getPoemsByAuthorSlug(authorSlug: string, offset = 0, limit = 50): Promise<Poem[]> {
  const { items } = await loadListChunk("author", authorSlug, offset, limit);
  const dSlug = items[0]?.dynasty_slug ?? "";
  return items.map((item) => listItemToPoem(item, item.dynasty_slug ?? dSlug));
}

export async function searchPoems(q: string, offset = 0, limit = 50): Promise<PoemSearchItem[]> {
  const manifest = await getManifest();
  const all: PoemSearchItem[] = [];
  const lower = q.trim().toLowerCase();
  if (!lower) return [];
  for (let i = 0; i < manifest.searchChunkCount; i++) {
    const file = `chunk-${String(i).padStart(4, "0")}.json`;
    const chunk = await getJson<PoemSearchItem[]>(`search/${file}`);
    for (const item of chunk) {
      if (item.title.includes(q) || item.author_name.includes(q) || item.title.toLowerCase().includes(lower) || item.author_name.toLowerCase().includes(lower)) {
        all.push(item);
      }
    }
  }
  return all.slice(offset, offset + limit);
}

export async function countSearchPoems(q: string): Promise<number> {
  const manifest = await getManifest();
  let count = 0;
  const lower = q.trim().toLowerCase();
  if (!lower) return 0;
  for (let i = 0; i < manifest.searchChunkCount; i++) {
    const file = `chunk-${String(i).padStart(4, "0")}.json`;
    const chunk = await getJson<PoemSearchItem[]>(`search/${file}`);
    for (const item of chunk) {
      if (item.title.includes(q) || item.author_name.includes(q) || item.title.toLowerCase().includes(lower) || item.author_name.toLowerCase().includes(lower)) count++;
    }
  }
  return count;
}

export async function countPoems(): Promise<number> {
  const m = await getManifest();
  return m.poemCount;
}

export async function countAuthors(): Promise<number> {
  const m = await getManifest();
  return m.authorCount;
}

export async function countDynasties(): Promise<number> {
  const m = await getManifest();
  return m.dynastyCount;
}

export async function getRandomPoemSlugs(n: number): Promise<string[]> {
  const pool = await getJson<string[]>("random-pool.json");
  const result: string[] = [];
  const size = Math.min(n, pool.length);
  const indices = new Set<number>();
  while (indices.size < size) {
    indices.add(Math.floor(Math.random() * pool.length));
  }
  for (const i of indices) result.push(pool[i]!);
  return result;
}

export async function getPoemsByTag(
  tagSlug: string,
  offset = 0,
  limit = 500
): Promise<Array<PoemSearchItem & { rhythmic?: string; excerpt?: string }>> {
  const { items } = await loadListChunk("tag", tagSlug, offset, limit);
  return items.map((item) => ({
    slug: item.slug,
    title: item.title,
    author_name: item.author_name,
    dynasty_name: item.dynasty_name,
    rhythmic: item.rhythmic,
    excerpt: item.excerpt,
  }));
}

export async function countPoemsByTag(tagSlug: string): Promise<number> {
  try {
    const data = await getJson<ListItem[]>(`list/tag/${tagSlug}.json`);
    return data.length;
  } catch {
    try {
      const meta = await getJson<{ total: number }>(`list/tag/${tagSlug}/meta.json`);
      return meta.total;
    } catch {
      return 0;
    }
  }
}

export async function getPoemSlugsForSSG(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const ranges = await getJson<SlugRange[]>("poems/slug-ranges.json");
  const first = ranges[0];
  if (!first) return [];
  const chunk = await getJson<PoemChunk>(`poems/${first.file}`);
  return chunk.poems.slice(0, limit).map((p) => p.slug);
}

/** 供分层 SSG 使用：从热门选集 tag（curated 或 BUILD_SSG_TAG_SLUGS）收集诗文 slug，去重后取前 limit 个 */
export async function getPoemSlugsForSSGByPopularTags(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const tagSlugs = getSSGTagSlugs();
  if (tagSlugs.length === 0) return [];
  const existingTags = await getTags();
  const existingSlugSet = new Set(existingTags.map((t) => t.slug));
  const slugs = new Set<string>();
  for (const slug of tagSlugs) {
    if (!existingSlugSet.has(slug)) continue;
    const list = await getPoemsByTag(slug, 0, SSG_MAX_SLUGS_PER_TAG);
    for (const item of list) slugs.add(item.slug);
    if (slugs.size >= limit) break;
  }
  return Array.from(slugs).slice(0, limit);
}

export async function getAuthorSlugsForSSG(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const authors = await getJson<Author[]>("authors.json");
  return authors.slice(0, limit).map((a) => a.slug);
}

/** 供 sitemap 分片使用：按当前数组顺序分页取作者 slug */
export async function getAuthorSlugsForSitemap(limit: number, offset: number): Promise<string[]> {
  if (limit <= 0 || offset < 0) return [];
  const authors = await getJson<Author[]>("authors.json");
  return authors.slice(offset, offset + limit).map((a) => a.slug);
}

export async function getPoemSlugsForSitemap(limit: number, offset: number): Promise<string[]> {
  if (limit <= 0 || offset < 0) return [];
  const manifest = await getManifest();
  let cursor = 0;
  const result: string[] = [];
  for (const ch of manifest.poemChunks) {
    const chunkEnd = cursor + ch.count;
    if (offset + limit <= cursor || offset >= chunkEnd) {
      cursor = chunkEnd;
      continue;
    }
    const chunk = await getJson<PoemChunk>(`poems/${ch.file}`);
    const localStart = Math.max(0, offset - cursor);
    const need = limit - result.length;
    const localEnd = Math.min(chunk.poems.length, localStart + need);
    result.push(...chunk.poems.slice(localStart, localEnd).map((p) => p.slug));
    cursor = chunkEnd;
    if (result.length >= limit) break;
  }
  return result;
}
