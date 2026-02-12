/**
 * 从数据库读诗词/作者/朝代/标签；单库（列表/筛选/详情 poem_content），支持 SQLite / PostgreSQL / JSON 数据源。
 * DATABASE_TYPE=json 时走 lib/data-json（fetch public/data/*.json），否则走 getDb()。
 * @author poetry
 */

import "server-only";
import * as jsonQueries from "../data-json";
import { getDb } from "./client";
import { decompressFromBlob } from "./compress";
import { getDynastyDisplayName } from "../dynasty";
import { getSSGTagSlugs, SSG_MAX_SLUGS_PER_TAG } from "../ssg_config";
import { toSlug, toPinyinToneNum } from "../slug";
import type { Poem, Author, Dynasty, Tag, PoemSearchItem } from "../types.js";

function useJson(): boolean {
  return (process.env.DATABASE_TYPE ?? "").toLowerCase() === "json";
}

/** 从 poems + poem_content + 作者/朝代名 + tags 拼出完整 Poem；拼音由调用方传入（实时计算） */
function assemblePoem(
  p: { slug: string; title: string; author_slug: string; dynasty_slug: string; rhythmic: string | null; excerpt: string | null },
  authorName: string,
  dynastyName: string,
  content: { paragraphs: string; translation: string | null; appreciation: string | null; annotation: string | null } | null,
  titlePinyin: string | undefined,
  paragraphsPinyin: string[] | undefined,
  tagNames: string[]
): Poem {
  const dynastyDisplay = getDynastyDisplayName(p.dynasty_slug) || dynastyName;
  const paragraphs = content ? (JSON.parse(content.paragraphs || "[]") as string[]) : [];
  return {
    slug: p.slug,
    title: p.title,
    author: authorName,
    dynasty: dynastyDisplay,
    titleSlug: toSlug(p.title),
    authorSlug: p.author_slug,
    dynastySlug: p.dynasty_slug,
    id: p.slug,
    titlePinyin,
    authorPinyin: toPinyinToneNum(authorName) || undefined,
    dynastyPinyin: toPinyinToneNum(dynastyDisplay) || undefined,
    paragraphs,
    paragraphsPinyin,
    translation: content?.translation ?? undefined,
    appreciation: content?.appreciation ?? undefined,
    annotation: content?.annotation ?? undefined,
    tags: tagNames,
    rhythmic: p.rhythmic ?? undefined,
    excerpt: p.excerpt ?? undefined,
  };
}

/** 列表行 → Poem（轻量，无 paragraphs/translation；author/dynasty 来自 JOIN） */
function rowToListPoem(row: {
  slug: string;
  title: string;
  author_slug: string;
  dynasty_slug: string;
  author_name: string;
  dynasty_name: string;
  rhythmic: string | null;
  excerpt: string | null;
}): Poem {
  const dynastyDisplay = getDynastyDisplayName(row.dynasty_slug) || row.dynasty_name;
  return {
    slug: row.slug,
    title: row.title,
    author: row.author_name,
    dynasty: dynastyDisplay,
    titleSlug: toSlug(row.title),
    authorSlug: row.author_slug,
    dynastySlug: row.dynasty_slug,
    id: row.slug,
    titlePinyin: undefined,
    authorPinyin: undefined,
    dynastyPinyin: undefined,
    paragraphs: [],
    translation: undefined,
    appreciation: undefined,
    annotation: undefined,
    tags: [],
    rhythmic: row.rhythmic ?? undefined,
    excerpt: row.excerpt ?? undefined,
  };
}

export async function getPoemBySlug(slug: string): Promise<Poem | undefined> {
  if (useJson()) return jsonQueries.getPoemBySlug(slug);
  const db = await getDb();
  const poemRow = await db.get<{
    slug: string;
    title: string;
    author_slug: string;
    dynasty_slug: string;
    rhythmic: string | null;
    excerpt: string | null;
    author_name: string;
    dynasty_name: string;
  }>(
    `SELECT p.slug, p.title, p.author_slug, p.dynasty_slug, p.rhythmic, p.excerpt,
            a.name AS author_name, d.name AS dynasty_name
     FROM poems p
     JOIN authors a ON p.author_slug = a.slug
     JOIN dynasties d ON p.dynasty_slug = d.slug
     WHERE p.slug = ?`,
    [slug]
  );
  if (!poemRow) return undefined;

  const contentRow = await db.get<{
    paragraphs: Buffer | string;
    translation: Buffer | string | null;
    appreciation: Buffer | string | null;
    annotation: Buffer | string | null;
  }>("SELECT paragraphs, translation, appreciation, annotation FROM poem_content WHERE slug = ?", [slug]);

  const rawParagraphs = contentRow ? decompressFromBlob(contentRow.paragraphs) ?? "[]" : "[]";
  const paragraphs = (JSON.parse(rawParagraphs) as string[]) ?? [];
  const titlePinyin = toPinyinToneNum(poemRow.title) || undefined;
  const paragraphsPinyin = paragraphs.length ? paragraphs.map((line) => toPinyinToneNum(line)) : undefined;

  const tagRows = await db.all<{ name: string }>(
    "SELECT t.name FROM poem_tags pt JOIN tags t ON pt.tag_slug = t.slug WHERE pt.poem_slug = ?",
    [slug]
  );
  const tagNames = tagRows.map((r) => r.name);

  const contentDecoded =
    contentRow == null
      ? null
      : {
          paragraphs: rawParagraphs,
          translation: decompressFromBlob(contentRow.translation),
          appreciation: decompressFromBlob(contentRow.appreciation),
          annotation: decompressFromBlob(contentRow.annotation),
        };
  return assemblePoem(
    poemRow,
    poemRow.author_name,
    poemRow.dynasty_name,
    contentDecoded,
    titlePinyin,
    paragraphsPinyin,
    tagNames
  );
}

export async function getAuthors(offset = 0, limit = 10000): Promise<Author[]> {
  if (useJson()) return jsonQueries.getAuthors(offset, limit);
  const db = await getDb();
  const rows = await db.all<{ slug: string; name: string; poem_count: number }>(
    "SELECT slug, name, poem_count FROM authors ORDER BY poem_count DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
  return rows.map((r) => ({ slug: r.slug, name: r.name, poem_count: r.poem_count }));
}

export async function getAuthorBySlug(slug: string): Promise<Author | undefined> {
  if (useJson()) return jsonQueries.getAuthorBySlug(slug);
  const db = await getDb();
  const row = await db.get<{ slug: string; name: string; poem_count: number; description: Buffer | string | null }>(
    "SELECT slug, name, poem_count, description FROM authors WHERE slug = ?",
    [slug]
  );
  if (!row) return undefined;
  const description = decompressFromBlob(row.description);
  return {
    slug: row.slug,
    name: row.name,
    poem_count: row.poem_count,
    description: description ?? undefined,
  };
}

/** 按姓名精确匹配作者，供 Nav 诗人搜索跳转作者页使用。 */
export async function getAuthorByName(name: string): Promise<Author | undefined> {
  if (useJson()) return jsonQueries.getAuthorByName(name);
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  const db = await getDb();
  const row = await db.get<{ slug: string; name: string; poem_count: number }>(
    "SELECT slug, name, poem_count FROM authors WHERE name = ?",
    [trimmed]
  );
  if (!row) return undefined;
  return { slug: row.slug, name: row.name, poem_count: row.poem_count };
}

export async function getDynasties(): Promise<Dynasty[]> {
  if (useJson()) return jsonQueries.getDynasties();
  const db = await getDb();
  const rows = await db.all<{ slug: string; name: string; poem_count: number }>(
    "SELECT slug, name, poem_count FROM dynasties ORDER BY poem_count DESC"
  );
  return rows.map((r) => ({ slug: r.slug, name: getDynastyDisplayName(r.slug) || r.name, poem_count: r.poem_count }));
}

export async function getTags(): Promise<Tag[]> {
  if (useJson()) return jsonQueries.getTags();
  const db = await getDb();
  const rows = await db.all<{ slug: string; name: string; poem_count: number }>(
    "SELECT slug, name, poem_count FROM tags ORDER BY poem_count DESC"
  );
  return rows.map((r) => ({ slug: r.slug, name: r.name, poem_count: r.poem_count }));
}

/** 词牌列表：从 poems 聚合 rhythmic，返回 slug（toSlug(name)）、name、poem_count */
export async function getRhythmics(): Promise<Array<{ slug: string; name: string; poem_count: number }>> {
  if (useJson()) return jsonQueries.getRhythmics();
  const db = await getDb();
  const rows = await db.all<{ name: string; poem_count: number }>(
    "SELECT rhythmic AS name, COUNT(*) AS poem_count FROM poems WHERE rhythmic IS NOT NULL AND rhythmic != '' GROUP BY rhythmic ORDER BY poem_count DESC"
  );
  return rows.map((r) => ({ slug: toSlug(r.name), name: r.name, poem_count: r.poem_count }));
}

/** 按词牌名查诗词列表（分页） */
export async function getPoemsByRhythmic(name: string, offset = 0, limit = 50): Promise<Poem[]> {
  if (useJson()) return jsonQueries.getPoemsByRhythmic(name, offset, limit);
  const db = await getDb();
  const rows = await db.all<{
    slug: string;
    title: string;
    author_slug: string;
    dynasty_slug: string;
    rhythmic: string | null;
    excerpt: string | null;
    author_name: string;
    dynasty_name: string;
  }>(
    `SELECT p.slug, p.title, p.author_slug, p.dynasty_slug, p.rhythmic, p.excerpt,
            a.name AS author_name, d.name AS dynasty_name
     FROM poems p
     JOIN authors a ON p.author_slug = a.slug
     JOIN dynasties d ON p.dynasty_slug = d.slug
     WHERE p.rhythmic = ? ORDER BY p.slug LIMIT ? OFFSET ?`,
    [name, limit, offset]
  );
  return rows.map(rowToListPoem);
}

/** 按词牌名统计诗词数量 */
export async function countPoemsByRhythmic(name: string): Promise<number> {
  if (useJson()) return jsonQueries.countPoemsByRhythmic(name);
  const db = await getDb();
  const row = await db.get<{ c: number }>("SELECT COUNT(*) as c FROM poems WHERE rhythmic = ?", [name]);
  return row?.c ?? 0;
}

/** 全诗分页（无筛选时默认列表） */
export async function getPoemsAll(offset = 0, limit = 50): Promise<Poem[]> {
  if (useJson()) return jsonQueries.getPoemsAll(offset, limit);
  const db = await getDb();
  const rows = await db.all<{
    slug: string;
    title: string;
    author_slug: string;
    dynasty_slug: string;
    rhythmic: string | null;
    excerpt: string | null;
    author_name: string;
    dynasty_name: string;
  }>(
    `SELECT p.slug, p.title, p.author_slug, p.dynasty_slug, p.rhythmic, p.excerpt,
            a.name AS author_name, d.name AS dynasty_name
     FROM poems p
     JOIN authors a ON p.author_slug = a.slug
     JOIN dynasties d ON p.dynasty_slug = d.slug
     ORDER BY p.slug LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows.map(rowToListPoem);
}

export async function getPoemsByDynasty(dynastySlug: string, offset = 0, limit = 50): Promise<Poem[]> {
  if (useJson()) return jsonQueries.getPoemsByDynasty(dynastySlug, offset, limit);
  const db = await getDb();
  const rows = await db.all<{
    slug: string;
    title: string;
    author_slug: string;
    dynasty_slug: string;
    rhythmic: string | null;
    excerpt: string | null;
    author_name: string;
    dynasty_name: string;
  }>(
    `SELECT p.slug, p.title, p.author_slug, p.dynasty_slug, p.rhythmic, p.excerpt,
            a.name AS author_name, d.name AS dynasty_name
     FROM poems p
     JOIN authors a ON p.author_slug = a.slug
     JOIN dynasties d ON p.dynasty_slug = d.slug
     WHERE p.dynasty_slug = ? ORDER BY p.slug LIMIT ? OFFSET ?`,
    [dynastySlug, limit, offset]
  );
  return rows.map(rowToListPoem);
}

/** 关键词搜索：标题或作者名 LIKE %q%；分页；author 通过 JOIN authors 取 name */
export async function searchPoems(q: string, offset = 0, limit = 50): Promise<PoemSearchItem[]> {
  if (useJson()) return jsonQueries.searchPoems(q, offset, limit);
  const db = await getDb();
  const pattern = `%${q}%`;
  const rows = await db.all<{ slug: string; title: string; author_name: string; dynasty_name: string }>(
    `SELECT p.slug, p.title, a.name AS author_name, d.name AS dynasty_name
     FROM poems p
     JOIN authors a ON p.author_slug = a.slug
     JOIN dynasties d ON p.dynasty_slug = d.slug
     WHERE p.title LIKE ? OR a.name LIKE ?
     ORDER BY p.slug LIMIT ? OFFSET ?`,
    [pattern, pattern, limit, offset]
  );
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    author_name: r.author_name,
    dynasty_name: r.dynasty_name,
    title_pinyin: undefined,
    tags: undefined,
  }));
}

export async function countSearchPoems(q: string): Promise<number> {
  if (useJson()) return jsonQueries.countSearchPoems(q);
  const db = await getDb();
  const pattern = `%${q}%`;
  const row = await db.get<{ c: number }>(
    "SELECT COUNT(*) as c FROM poems p JOIN authors a ON p.author_slug = a.slug WHERE p.title LIKE ? OR a.name LIKE ?",
    [pattern, pattern]
  );
  return row?.c ?? 0;
}

export async function countPoems(): Promise<number> {
  if (useJson()) return jsonQueries.countPoems();
  const db = await getDb();
  const row = await db.get<{ c: number }>("SELECT COUNT(*) as c FROM poems");
  return row?.c ?? 0;
}

export async function countAuthors(): Promise<number> {
  if (useJson()) return jsonQueries.countAuthors();
  const db = await getDb();
  const row = await db.get<{ c: number }>("SELECT COUNT(*) as c FROM authors");
  return row?.c ?? 0;
}

export async function countDynasties(): Promise<number> {
  if (useJson()) return jsonQueries.countDynasties();
  const db = await getDb();
  const row = await db.get<{ c: number }>("SELECT COUNT(*) as c FROM dynasties");
  return row?.c ?? 0;
}

/** 随机取 n 首诗的 slug（用于首页推荐、随机一首） */
export async function getRandomPoemSlugs(n: number): Promise<string[]> {
  if (useJson()) return jsonQueries.getRandomPoemSlugs(n);
  const db = await getDb();
  const rows = await db.all<{ slug: string }>("SELECT slug FROM poems ORDER BY RANDOM() LIMIT ?", [n]);
  return rows.map((r) => r.slug);
}

/** 随机取 n 首诗的列表信息（一次查询，避免 N+1）；用于首页推荐与随机一首 */
export async function getRandomPoemsForList(n: number): Promise<Array<{
  slug: string;
  title: string;
  author_name: string;
  dynasty_name?: string;
  rhythmic?: string;
  excerpt?: string;
}>> {
  if (useJson()) {
    // JSON 数据源暂无批量查询，fallback 到 N+1
    const slugs = await jsonQueries.getRandomPoemSlugs(n);
    const results: Array<{ slug: string; title: string; author_name: string; dynasty_name?: string; rhythmic?: string; excerpt?: string }> = [];
    for (const slug of slugs) {
      const poem = await jsonQueries.getPoemBySlug(slug);
      if (poem) {
        const excerpt = poem.paragraphs?.[0]?.trim();
        results.push({
          slug: poem.slug,
          title: poem.title,
          author_name: poem.author,
          dynasty_name: poem.dynasty,
          rhythmic: poem.rhythmic,
          excerpt: excerpt && excerpt.length > 30 ? excerpt.slice(0, 30) + "…" : excerpt,
        });
      }
    }
    return results;
  }
  const db = await getDb();
  const rows = await db.all<{
    slug: string;
    title: string;
    excerpt: string | null;
    rhythmic: string | null;
    author_name: string;
    dynasty_name: string;
  }>(
    `SELECT p.slug, p.title, p.excerpt, p.rhythmic,
            a.name AS author_name, d.name AS dynasty_name
     FROM poems p
     JOIN authors a ON p.author_slug = a.slug
     JOIN dynasties d ON p.dynasty_slug = d.slug
     ORDER BY RANDOM() LIMIT ?`,
    [n]
  );
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    author_name: r.author_name,
    dynasty_name: getDynastyDisplayName(r.dynasty_name) || r.dynasty_name,
    rhythmic: r.rhythmic ?? undefined,
    excerpt: r.excerpt ?? undefined,
  }));
}

/** 按作者 slug 查其诗词列表（分页） */
export async function getPoemsByAuthorSlug(authorSlug: string, offset = 0, limit = 50): Promise<Poem[]> {
  if (useJson()) return jsonQueries.getPoemsByAuthorSlug(authorSlug, offset, limit);
  const db = await getDb();
  const rows = await db.all<{
    slug: string;
    title: string;
    author_slug: string;
    dynasty_slug: string;
    rhythmic: string | null;
    excerpt: string | null;
    author_name: string;
    dynasty_name: string;
  }>(
    `SELECT p.slug, p.title, p.author_slug, p.dynasty_slug, p.rhythmic, p.excerpt,
            a.name AS author_name, d.name AS dynasty_name
     FROM poems p
     JOIN authors a ON p.author_slug = a.slug
     JOIN dynasties d ON p.dynasty_slug = d.slug
     WHERE p.author_slug = ? ORDER BY p.slug LIMIT ? OFFSET ?`,
    [authorSlug, limit, offset]
  );
  return rows.map(rowToListPoem);
}

/** 按标签 slug 查诗词列表（含 excerpt、rhythmic，供列表页展示）；走 poem_tags 索引 */
export async function getPoemsByTag(
  tagSlug: string,
  offset = 0,
  limit = 500
): Promise<Array<PoemSearchItem & { rhythmic?: string; excerpt?: string }>> {
  if (useJson()) return jsonQueries.getPoemsByTag(tagSlug, offset, limit);
  const db = await getDb();
  const rows = await db.all<{
    slug: string;
    title: string;
    rhythmic: string | null;
    excerpt: string | null;
    author_name: string;
    dynasty_name: string;
  }>(
    `SELECT p.slug, p.title, p.rhythmic, p.excerpt,
            a.name AS author_name, d.name AS dynasty_name
     FROM poems p
     JOIN poem_tags pt ON p.slug = pt.poem_slug
     JOIN authors a ON p.author_slug = a.slug
     JOIN dynasties d ON p.dynasty_slug = d.slug
     WHERE pt.tag_slug = ? ORDER BY p.slug LIMIT ? OFFSET ?`,
    [tagSlug, limit, offset]
  );
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    author_name: r.author_name,
    dynasty_name: r.dynasty_name,
    title_pinyin: undefined,
    tags: undefined,
    rhythmic: r.rhythmic ?? undefined,
    excerpt: r.excerpt ?? undefined,
  }));
}

/** 按标签 slug 统计诗词数量 */
export async function countPoemsByTag(tagSlug: string): Promise<number> {
  if (useJson()) return jsonQueries.countPoemsByTag(tagSlug);
  const db = await getDb();
  const row = await db.get<{ c: number }>("SELECT COUNT(*) as c FROM poem_tags WHERE tag_slug = ?", [tagSlug]);
  return row?.c ?? 0;
}

/** 供分层 SSG 使用：取前 limit 条诗的 slug（按 dynasty_slug, slug 稳定顺序），不全表加载 */
export async function getPoemSlugsForSSG(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  if (useJson()) return jsonQueries.getPoemSlugsForSSG(limit);
  const db = await getDb();
  const rows = await db.all<{ slug: string }>("SELECT slug FROM poems ORDER BY dynasty_slug, slug LIMIT ?", [limit]);
  return rows.map((r) => r.slug);
}

/** 供分层 SSG 使用：从热门选集 tag（curated 或 BUILD_SSG_TAG_SLUGS）收集诗文 slug，去重后取前 limit 个 */
export async function getPoemSlugsForSSGByPopularTags(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  if (useJson()) return jsonQueries.getPoemSlugsForSSGByPopularTags(limit);
  const tagSlugs = getSSGTagSlugs();
  if (tagSlugs.length === 0) return [];
  const existingTags = await getTags();
  const existingSlugSet = new Set(existingTags.map((t) => t.slug));
  const slugs = new Set<string>();
  for (const tagSlug of tagSlugs) {
    if (!existingSlugSet.has(tagSlug)) continue;
    const list = await getPoemsByTag(tagSlug, 0, SSG_MAX_SLUGS_PER_TAG);
    for (const item of list) slugs.add(item.slug);
    if (slugs.size >= limit) break;
  }
  return Array.from(slugs).slice(0, limit);
}

/** 供分层 SSG 使用：取前 limit 个作者的 slug（按 poem_count DESC），不全表加载 */
export async function getAuthorSlugsForSSG(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  if (useJson()) return jsonQueries.getAuthorSlugsForSSG(limit);
  const db = await getDb();
  const rows = await db.all<{ slug: string }>("SELECT slug FROM authors ORDER BY poem_count DESC LIMIT ?", [limit]);
  return rows.map((r) => r.slug);
}

/** 供 sitemap 分片使用：按 slug 稳定顺序分页取作者 slug */
export async function getAuthorSlugsForSitemap(limit: number, offset: number): Promise<string[]> {
  if (limit <= 0 || offset < 0) return [];
  if (useJson()) return jsonQueries.getAuthorSlugsForSitemap(limit, offset);
  const db = await getDb();
  const rows = await db.all<{ slug: string }>(
    "SELECT slug FROM authors ORDER BY slug LIMIT ? OFFSET ?",
    [limit, offset]
  );
  return rows.map((r) => r.slug);
}

/** 供 sitemap 分片使用：按 dynasty_slug, slug 稳定顺序分页取诗 slug */
export async function getPoemSlugsForSitemap(limit: number, offset: number): Promise<string[]> {
  if (limit <= 0 || offset < 0) return [];
  if (useJson()) return jsonQueries.getPoemSlugsForSitemap(limit, offset);
  const db = await getDb();
  const rows = await db.all<{ slug: string }>(
    "SELECT slug FROM poems ORDER BY dynasty_slug, slug LIMIT ? OFFSET ?",
    [limit, offset]
  );
  return rows.map((r) => r.slug);
}
