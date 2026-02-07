/**
 * GET /api/authors?offset=&limit= — 作者列表分页。
 * @author poetry
 */

import { NextResponse } from "next/server";
import { getAuthors, countAuthors } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const list = await getAuthors(offset, limit);
  const total = await countAuthors();
  return NextResponse.json({ items: list, total, offset, limit });
}
