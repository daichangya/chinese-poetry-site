/**
 * Sitemap index：列出分片子 sitemap，供 robots.txt 引用。
 * 子 sitemap 由 app/sitemap.ts 的 generateSitemaps 生成于 /sitemap/[id].xml。
 * @author poetry
 */

import { NextResponse } from "next/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shi-ci.cn";

export function GET() {
  const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/sitemap/static.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap/filters.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap/authors.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap/poems-0.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap/poems-1.xml</loc>
  </sitemap>
</sitemapindex>`;

  return new NextResponse(index, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
