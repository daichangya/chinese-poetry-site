/**
 * Sitemap index：列出分片子 sitemap，供 robots.txt 引用。
 * 子 sitemap 由 app/sitemap.ts 的 generateSitemaps 生成于 /sitemap/[id].xml。
 * @author poetry
 */

import { NextResponse } from "next/server";
import { generateSitemaps } from "../sitemap";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.shi-ci.cn";

export async function GET() {
  const sitemaps = await generateSitemaps();
  const lastmod = new Date().toISOString();
  const entries = sitemaps
    .map(
      (s) =>
        `  <sitemap>\n    <loc>${siteUrl}/sitemap/${s.id}.xml</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`
    )
    .join("\n");
  const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new NextResponse(index, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
