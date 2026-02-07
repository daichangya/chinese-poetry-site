/**
 * 分批构建：base → 多批 poems → 多批 authors，合并 out/ 为一份静态站。
 * 用于诗词/作者数量大时避免单次 next build OOM/SIGKILL。
 * @author poetry
 */

import * as child_process from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadAll, writeDataJson } from "../lib/load_data.js";

const POEMS_DIR =
  process.env.POEMS_DIR ??
  process.env.POEMS_OUTPUT_DIR ??
  path.join(process.cwd(), "chinese-poetry-md");
const DATA_DIR =
  process.env.DATA_DIR ?? path.join(process.cwd(), "public", "data");
const OUT_DIR = path.join(process.cwd(), "out");
const OUT_BASE_DIR = path.join(process.cwd(), "out_base");

const POEM_BATCH_SIZE = parseInt(process.env.BUILD_POEM_LIMIT ?? "2000", 10);
const AUTHOR_BATCH_SIZE = parseInt(
  process.env.BUILD_AUTHOR_LIMIT ?? "3000",
  10
);

function hasAnyMd(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (hasAnyMd(full)) return true;
    } else if (e.isFile() && e.name.endsWith(".md")) {
      return true;
    }
  }
  return false;
}

function runGenMarkdown(): void {
  console.log("build_batched: POEMS_DIR empty, running gen_markdown...");
  child_process.execSync("npm run gen_markdown", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
}

function runLoadData(): { poems: { length: number }; authors: { length: number } } {
  const result = loadAll(POEMS_DIR);
  writeDataJson(result, DATA_DIR);
  console.log(
    `build_batched: load_data → ${result.poems.length} poems, ${result.authors.length} authors`
  );
  console.log(`build_batched: JSON 已写入 ${DATA_DIR}`);
  return result;
}

function runNextBuild(env: Record<string, string>): void {
  const nextPath = path.join(process.cwd(), "node_modules", "next");
  if (!fs.existsSync(nextPath)) {
    throw new Error("Next.js not installed");
  }
  const nodeOptions =
    process.env.NODE_OPTIONS ??
    `--max-old-space-size=${process.env.NODE_BUILD_MAX_OLD_SPACE_SIZE ?? 4096}`;
  child_process.execSync("next build", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, ...env, NODE_OPTIONS: nodeOptions },
  });
}

/** 将 srcDir 下子目录复制到 destDir，仅合并详情页目录；排除 page、random 等列表/重定向目录 */
function mergeSubdirs(
  srcDir: string,
  destDir: string,
  excludeNames: Set<string> = new Set(["page", "random"])
): void {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory() || excludeNames.has(e.name)) continue;
    const srcSub = path.join(srcDir, e.name);
    const destSub = path.join(destDir, e.name);
    if (fs.existsSync(destSub)) {
      fs.rmSync(destSub, { recursive: true });
    }
    fs.cpSync(srcSub, destSub, { recursive: true });
  }
}

function main(): void {
  if (!hasAnyMd(POEMS_DIR)) {
    runGenMarkdown();
  } else {
    console.log("build_batched: POEMS_DIR has .md files, skipping gen_markdown.");
  }

  const { poems, authors } = runLoadData();
  const poemBatches = Math.ceil(poems.length / POEM_BATCH_SIZE);
  const authorBatches = Math.ceil(authors.length / AUTHOR_BATCH_SIZE);

  console.log(
    `build_batched: base + ${poemBatches} poem batches + ${authorBatches} author batches`
  );

  if (fs.existsSync(OUT_BASE_DIR)) {
    fs.rmSync(OUT_BASE_DIR, { recursive: true });
  }

  // 1) base：只生成首页、列表、朝代、贡献等，不生成诗词/作者详情
  console.log("build_batched: phase=base...");
  runNextBuild({ BUILD_BATCH_PHASE: "base" });
  fs.cpSync(OUT_DIR, OUT_BASE_DIR, { recursive: true });

  // 2) poems 各批
  for (let i = 0; i < poemBatches; i++) {
    const offset = i * POEM_BATCH_SIZE;
    console.log(`build_batched: phase=poems batch ${i + 1}/${poemBatches} (offset=${offset})...`);
    runNextBuild({
      BUILD_BATCH_PHASE: "poems",
      BUILD_POEM_OFFSET: String(offset),
      BUILD_POEM_LIMIT: String(POEM_BATCH_SIZE),
    });
    mergeSubdirs(
      path.join(OUT_DIR, "poems"),
      path.join(OUT_BASE_DIR, "poems")
    );
  }

  // 3) authors 各批
  for (let i = 0; i < authorBatches; i++) {
    const offset = i * AUTHOR_BATCH_SIZE;
    console.log(`build_batched: phase=authors batch ${i + 1}/${authorBatches} (offset=${offset})...`);
    runNextBuild({
      BUILD_BATCH_PHASE: "authors",
      BUILD_AUTHOR_OFFSET: String(offset),
      BUILD_AUTHOR_LIMIT: String(AUTHOR_BATCH_SIZE),
    });
    mergeSubdirs(
      path.join(OUT_DIR, "authors"),
      path.join(OUT_BASE_DIR, "authors")
    );
  }

  // 4) 用合并结果替换 out
  fs.rmSync(OUT_DIR, { recursive: true });
  fs.renameSync(OUT_BASE_DIR, OUT_DIR);
  console.log("build_batched: done. Output in out/");
}

main();
