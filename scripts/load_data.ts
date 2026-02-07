/**
 * 入口：从 POEMS_DIR 加载 .md，写出 data/poems/dynasty/*.json、data/poems/search/*.json、authors.json、dynasties.json。
 * @author poetry
 */

import * as path from "node:path";
import { loadAll, writeDataJson } from "../lib/load_data.js";

const POEMS_DIR =
  process.env.POEMS_DIR ??
  process.env.POEMS_OUTPUT_DIR ??
  path.join(process.cwd(), "chinese-poetry-md");
const DATA_DIR =
  process.env.DATA_DIR ?? path.join(process.cwd(), "public", "data");

function main(): void {
  const result = loadAll(POEMS_DIR);
  writeDataJson(result, DATA_DIR);
  console.log(
    `load_data: loaded ${result.poems.length} poems, ${result.authors.length} authors, ${result.dynasties.length} dynasties → ${DATA_DIR}`
  );
}

main();
