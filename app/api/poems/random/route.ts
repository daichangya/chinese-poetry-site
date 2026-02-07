/**
 * GET /api/poems/random?n=10 — 随机取 n 首，返回 slug/title/author_name/dynasty_name/rhythmic/excerpt，供首页推荐与随机一首。
 * @author poetry
 */

import { NextResponse } from "next/server";
import { getRandomPoemSlugs, getPoemBySlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const EXCERPT_MAX_LEN = 30;

type Item = {
  slug: string;
  title: string;
  author_name: string;
  dynasty_name?: string;
  rhythmic?: string;
  excerpt?: string;
};

function excerptFromParagraphs(paragraphs: string[] | undefined): string | undefined {
  if (!paragraphs?.length) return undefined;
  const first = paragraphs[0]?.trim() ?? "";
  if (first.length <= EXCERPT_MAX_LEN) return first || undefined;
  return first.slice(0, EXCERPT_MAX_LEN) + "…";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const n = Math.min(50, Math.max(1, parseInt(searchParams.get("n") ?? "10", 10) || 10));
  const slugs = await getRandomPoemSlugs(n);
  const items: Item[] = [];
  for (const slug of slugs) {
    const poem = await getPoemBySlug(slug);
    if (poem)
      items.push({
        slug: poem.slug,
        title: poem.title,
        author_name: poem.author,
        dynasty_name: poem.dynasty,
        rhythmic: poem.rhythmic,
        excerpt: excerptFromParagraphs(poem.paragraphs),
      });
  }
  return NextResponse.json(items);
}
