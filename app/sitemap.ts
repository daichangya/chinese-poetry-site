/**
 * 动态 sitemap：分片生成。其他页面全部 + 诗文 5 万条；单文件不超 5 万 URL。
 * generateSitemaps 返回 5 片：static、filters（朝代/词牌/标签）、authors、poems-0、poems-1。
 * @author poetry
 */

import type { MetadataRoute } from "next";
import {
  getPoemSlugsForSitemap,
  getAuthorSlugsForSSG,
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

const POEM_SITEMAP_LIMIT = 25_000;
const AUTHOR_SITEMAP_LIMIT = 10_000;

export async function generateSitemaps() {
  return [
    { id: "static" },
    { id: "filters" },
    { id: "authors" },
    { id: "poems-0" },
    { id: "poems-1" },
  ];
}

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

    if (id === "authors") {
      const slugs = await getAuthorSlugsForSSG(AUTHOR_SITEMAP_LIMIT);
      return slugs.map((slug) => ({
        url: `${siteUrl}/authors/${slug}/`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      }));
    }

    if (id === "poems-0") {
      const slugs = await getPoemSlugsForSitemap(POEM_SITEMAP_LIMIT, 0);
      return slugs.map((slug) => ({
        url: `${siteUrl}/poems/${slug}/`,
        lastModified: new Date(),
        changeFrequency: "yearly" as const,
        priority: 0.8,
      }));
    }

    if (id === "poems-1") {
      const slugs = await getPoemSlugsForSitemap(POEM_SITEMAP_LIMIT, POEM_SITEMAP_LIMIT);
      return slugs.map((slug) => ({
        url: `${siteUrl}/poems/${slug}/`,
        lastModified: new Date(),
        changeFrequency: "yearly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // DB 不可用时仅 static 片有内容；其余片返回空数组
  }

  return [];
}
