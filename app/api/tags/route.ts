/**
 * GET /api/tags — 标签列表。
 * @author poetry
 */

import { NextResponse } from "next/server";
import { getTags } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getTags();
  return NextResponse.json(items);
}
