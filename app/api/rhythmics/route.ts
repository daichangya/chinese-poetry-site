/**
 * GET /api/rhythmics — 词牌列表（slug、name、poem_count）。
 * @author poetry
 */

import { NextResponse } from "next/server";
import { getRhythmics } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getRhythmics();
  return NextResponse.json(items);
}
