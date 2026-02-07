/**
 * GET /api/poems?dynasty=&q=&tag=&page=&limit= — 列表/搜索/按朝代/按标签，分页。
 * @author poetry
 */

import { NextResponse } from "next/server";
import {
  getPoemsAll,
  getPoemsByDynasty,
  getPoemsByTag,
  countPoemsByTag,
  getPoemsByAuthorSlug,
  getPoemsByRhythmic,
  countPoemsByRhythmic,
  getRhythmics,
  searchPoems,
  countSearchPoems,
  countPoems,
  getDynasties,
  getAuthors,
  getTags,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 500;
const EXCERPT_MAX_LEN = 30;

type ListItem = {
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

function poemToItem(p: {
  slug: string;
  title: string;
  author: string;
  dynasty?: string;
  rhythmic?: string;
  paragraphs?: string[];
  excerpt?: string;
}): ListItem {
  return {
    slug: p.slug,
    title: p.title,
    author_name: p.author,
    dynasty_name: p.dynasty,
    rhythmic: p.rhythmic,
    excerpt: p.excerpt ?? excerptFromParagraphs(p.paragraphs),
  };
}

function tagItemToListItem(p: {
  slug: string;
  title: string;
  author_name: string;
  dynasty_name?: string;
  rhythmic?: string;
  excerpt?: string;
}): ListItem {
  return {
    slug: p.slug,
    title: p.title,
    author_name: p.author_name,
    dynasty_name: p.dynasty_name,
    rhythmic: p.rhythmic,
    excerpt: p.excerpt,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dynasty = searchParams.get("dynasty") ?? "";
  const q = (searchParams.get("q") ?? "").trim();
  const tag = (searchParams.get("tag") ?? "").trim();
  const rhythmic = (searchParams.get("rhythmic") ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  let items: ListItem[] = [];
  let total = 0;

  if (rhythmic) {
    const rhythmics = await getRhythmics();
    const rh = rhythmics.find((r) => r.slug === rhythmic || r.name === rhythmic);
    if (!rh) {
      return NextResponse.json({ items: [], total: 0, page, limit });
    }
    const list = await getPoemsByRhythmic(rh.name, offset, limit);
    total = await countPoemsByRhythmic(rh.name);
    items = list.map((p) =>
      poemToItem({
        slug: p.slug,
        title: p.title,
        author: p.author,
        dynasty: p.dynasty,
        rhythmic: p.rhythmic,
        paragraphs: p.paragraphs,
      })
    );
  } else if (dynasty) {
    const dynasties = await getDynasties();
    const dyn = dynasties.find((d) => d.slug === dynasty || d.name === dynasty);
    if (!dyn) {
      return NextResponse.json({ items: [], total: 0, page, limit });
    }
    const list = await getPoemsByDynasty(dyn.slug, offset, limit);
    total = dyn.poem_count;
    items = list.map((p) =>
      poemToItem({
        slug: p.slug,
        title: p.title,
        author: p.author,
        dynasty: p.dynasty,
        rhythmic: p.rhythmic,
        paragraphs: p.paragraphs,
      })
    );
  } else if (tag) {
    const tags = await getTags();
    const tagSlug = tags.find((t) => t.slug === tag || t.name === tag)?.slug;
    if (!tagSlug) {
      return NextResponse.json({ items: [], total: 0, page, limit });
    }
    const list = await getPoemsByTag(tagSlug, offset, limit);
    total = await countPoemsByTag(tagSlug);
    items = list.map((p) => tagItemToListItem(p));
  } else if (q) {
    const authors = await getAuthors(0, 10000);
    const authorMatch = authors.find((a) => a.name === q);
    if (authorMatch) {
      const list = await getPoemsByAuthorSlug(authorMatch.slug, offset, limit);
      total = authorMatch.poem_count;
      items = list.map((p) => poemToItem({ ...p, dynasty: p.dynasty }));
    } else {
      const list = await searchPoems(q, offset, limit);
      total = await countSearchPoems(q);
      items = list.map((p) => poemToItem({ slug: p.slug, title: p.title, author: p.author_name, dynasty: p.dynasty_name }));
    }
  } else {
    const list = await getPoemsAll(offset, limit);
    total = await countPoems();
    items = list.map((p) =>
      poemToItem({
        slug: p.slug,
        title: p.title,
        author: p.author,
        dynasty: p.dynasty,
        rhythmic: p.rhythmic,
        paragraphs: p.paragraphs,
      })
    );
  }

  return NextResponse.json({ items, total, page, limit });
}
