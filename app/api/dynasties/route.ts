/**
 * GET /api/dynasties — 朝代列表。
 * @author poetry
 */

import { NextResponse } from "next/server";
import { getDynasties } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getDynasties();
  return NextResponse.json(items, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
