/**
 * GET /api/dynasties — 朝代列表。
 * @author poetry
 */

import { NextResponse } from "next/server";
import { getDynasties } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getDynasties();
  return NextResponse.json(items);
}
