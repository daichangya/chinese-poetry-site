/**
 * GET /api/authors/by-name?name= — 按姓名精确匹配作者，供 Nav 诗人搜索跳转作者页。
 * 找到返回 200 + { slug, name, poem_count }，未找到返回 404。
 * @author poetry
 */

import { NextResponse } from "next/server";
import { getAuthorByName } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "";
  const author = await getAuthorByName(name);
  if (!author) {
    return NextResponse.json({ error: "未找到该诗人" }, { status: 404 });
  }
  return NextResponse.json({
    slug: author.slug,
    name: author.name,
    poem_count: author.poem_count,
  });
}
