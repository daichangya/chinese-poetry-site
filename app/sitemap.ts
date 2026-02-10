/**
 * 动态 sitemap：分片生成。每文件最多 2500 条 URL，分片数量由 countPoems/countAuthors 动态计算。
 * generateSitemaps 返回：static、filters、authors-0..N、poems-0..M。
 * @author poetry
 */

import type { MetadataRoute } from "next";
import {
  getPoemSlugsForSitemap,
  getAuthorSlugsForSitemap,
  countPoems,
  countAuthors,
  getDynasties,
  getTags,
  getRhythmics,
} from "@/lib/db";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.shi-ci.cn";

const STATIC_ENTRIES: MetadataRoute.Sitemap = [
  { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  { url: `${siteUrl}/poems/`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${siteUrl}/authors/`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${siteUrl}/dynasties/`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${siteUrl}/tags/`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${siteUrl}/rhythmics/`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${siteUrl}/poems/random/`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
  { url: `${siteUrl}/contribute/`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
];

const POEM_SITEMAP_LIMIT = 2_500;
const AUTHOR_SITEMAP_LIMIT = 2_500;

export async function generateSitemaps() {
  const poemCount = await countPoems();
  const numPoemSlices = Math.ceil(poemCount / POEM_SITEMAP_LIMIT);
  const poemSitemaps = Array.from({ length: numPoemSlices }, (_, i) => ({ id: `poems-${i}` }));

  const authorCount = await countAuthors();
  const numAuthorSlices = Math.ceil(authorCount / AUTHOR_SITEMAP_LIMIT);
  const authorSitemaps = Array.from({ length: numAuthorSlices }, (_, i) => ({ id: `authors-${i}` }));

  return [
    { id: "static" },
    { id: "filters" },
    ...authorSitemaps,
    ...poemSitemaps,
  ];
}

/** 延长 sitemap 分片生成超时（Vercel 等）；避免 poems-0/poems-1 数据量大时被截断 */
export const maxDuration = 60;

export default async function sitemap(
  props: { id: Promise<string> }
): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;

  if (id === "static") {
    return STATIC_ENTRIES;
  }

  try {
    if (id === "filters") {
      const dynasties = await getDynasties();
      const tags = await getTags();
      const rhythmics = await getRhythmics();
      const entries: MetadataRoute.Sitemap = [];
      // 与列表页 /dynasties、/tags、/rhythmics 的链接一致：均用 name 作为 query
      for (const d of dynasties) {
        entries.push({
          url: `${siteUrl}/poems/?dynasty=${encodeURIComponent(d.name)}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        });
      }
      for (const t of tags) {
        entries.push({
          url: `${siteUrl}/poems/?tag=${encodeURIComponent(t.name)}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        });
      }
      for (const r of rhythmics) {
        entries.push({
          url: `${siteUrl}/poems/?rhythmic=${encodeURIComponent(r.name)}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        });
      }
      return entries;
    }

    if (id.startsWith("authors-")) {
      const n = parseInt(id.slice("authors-".length), 10);
      if (!Number.isNaN(n) && n >= 0) {
        const offset = n * AUTHOR_SITEMAP_LIMIT;
        const slugs = await getAuthorSlugsForSitemap(AUTHOR_SITEMAP_LIMIT, offset);
        return slugs.map((slug) => ({
          url: `${siteUrl}/authors/${slug}/`,
          lastModified: new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.8,
        }));
      }
    }

    if (id.startsWith("poems-")) {
      const n = parseInt(id.slice("poems-".length), 10);
      if (!Number.isNaN(n) && n >= 0) {
        const offset = n * POEM_SITEMAP_LIMIT;
        const slugs = await getPoemSlugsForSitemap(POEM_SITEMAP_LIMIT, offset);
        return slugs.map((slug) => ({
          url: `${siteUrl}/poems/${slug}/`,
          lastModified: new Date(),
          changeFrequency: "yearly" as const,
          priority: 0.8,
        }));
      }
    }
  } catch (err) {
    // DB/JSON 不可用或超时时，该分片返回空数组；搜索引擎可能报 "could not be read"
    console.error("[sitemap]", id, err);
  }

  return [];
}
