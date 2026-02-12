/**
 * GET /api/poems/random?n=10 — 随机取 n 首，返回 slug/title/author_name/dynasty_name/rhythmic/excerpt，供首页推荐与随机一首。
 * 优化：使用单次 SQL 查询替代 N+1（getRandomPoemsForList）。
 * @author poetry
 */

import { NextResponse } from "next/server";
import { getRandomPoemsForList } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const n = Math.min(50, Math.max(1, parseInt(searchParams.get("n") ?? "10", 10) || 10));
  const items = await getRandomPoemsForList(n);
  return NextResponse.json(items);
}
