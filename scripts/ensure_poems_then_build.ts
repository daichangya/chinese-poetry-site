/**
 * 构建串联：若 POEMS_DIR 空则 gen_markdown → seed:db → next build，否则 seed:db → next build。
 * DATABASE_TYPE=json 时改为 build:json → next build（若有 MD 则先 build:json；若 public/data/manifest.json 已存在可跳过 build:json）。
 * 若单库 poetry_index.db 已存在（如 Vercel 部署时使用已提交的库），则跳过 seed_db，直接 next build。
 * @author poetry
 */

import * as child_process from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/** 从项目根加载 .env，使 DATABASE_TYPE 等在本脚本中生效（tsx 不会自动加载 .env） */
function loadEnv(): void {
  let dir = process.cwd();
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      const envPath = path.join(dir, ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
          if (m && process.env[m[1]!] === undefined) {
            const val = m[2]!.replace(/^["']|["']$/g, "").trim();
            process.env[m[1]!] = val;
          }
        }
      }
      break;
    }
    dir = path.dirname(dir);
  }
}
loadEnv();

const POEMS_DIR =
  process.env.POEMS_DIR ??
  process.env.POEMS_OUTPUT_DIR ??
  path.join(process.cwd(), "chinese-poetry-md");
const DATA_JSON_OUT = process.env.DATA_JSON_OUTPUT_DIR ?? path.join(process.cwd(), "public", "data");

/** 与 lib/db/client 一致的默认单库路径：data/poetry_index.db */
function getDefaultIndexDbPath(): string {
  let dir = process.cwd();
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, "package.json"))) return path.join(dir, "data", "poetry_index.db");
    dir = path.dirname(dir);
  }
  return path.join(process.cwd(), "data", "poetry_index.db");
}

/** 兼容旧路径 public/data/poetry_index.db */
function getLegacyIndexDbPath(): string {
  let dir = process.cwd();
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, "package.json"))) return path.join(dir, "public", "data", "poetry_index.db");
    dir = path.dirname(dir);
  }
  return path.join(process.cwd(), "public", "data", "poetry_index.db");
}

/** 递归统计目录下 .md 文件数量（仅判断是否为空） */
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
  console.log("ensure_poems_then_build: POEMS_DIR empty, running gen_markdown...");
  child_process.execSync("npm run gen_markdown", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
}

function runSeedDb(): void {
  console.log("ensure_poems_then_build: running seed:db...");
  child_process.execSync("npm run seed:db", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
}

function runBuildJson(): void {
  console.log("ensure_poems_then_build: running build:json...");
  child_process.execSync("npm run build:json", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
}

function runNextBuild(): void {
  const nextPath = path.join(process.cwd(), "node_modules", "next");
  if (!fs.existsSync(nextPath)) {
    console.log("ensure_poems_then_build: Next.js not installed, skipping next build.");
    return;
  }
  const nodeOptions =
    process.env.NODE_OPTIONS ?? `--max-old-space-size=${process.env.NODE_BUILD_MAX_OLD_SPACE_SIZE ?? 4096}`;
  console.log("ensure_poems_then_build: running next build...");
  child_process.execSync("next build", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
  });
}

function main(): void {
  const useJson = (process.env.DATABASE_TYPE ?? "").toLowerCase() === "json";
  if (useJson) {
    const manifestPath = path.join(DATA_JSON_OUT, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      console.log("ensure_poems_then_build: JSON data exists at", manifestPath, ", skipping build:json.");
      runNextBuild();
      return;
    }
    if (!hasAnyMd(POEMS_DIR)) {
      runGenMarkdown();
    } else {
      console.log("ensure_poems_then_build: POEMS_DIR has .md files, skipping gen_markdown.");
    }
    runBuildJson();
    runNextBuild();
    return;
  }

  const indexPath = process.env.DATABASE_DIR
    ? path.join(process.env.DATABASE_DIR.trim(), "poetry_index.db")
    : getDefaultIndexDbPath();
  let indexExists = fs.existsSync(indexPath);
  if (!indexExists) {
    indexExists = fs.existsSync(getLegacyIndexDbPath());
    if (indexExists) {
      console.log("ensure_poems_then_build: existing index at", getLegacyIndexDbPath(), ", skipping seed_db.");
      runNextBuild();
      return;
    }
  }
  if (indexExists) {
    console.log("ensure_poems_then_build: existing database at", indexPath, ", skipping seed_db.");
    runNextBuild();
    return;
  }

  if (!hasAnyMd(POEMS_DIR)) {
    runGenMarkdown();
  } else {
    console.log("ensure_poems_then_build: POEMS_DIR has .md files, skipping gen_markdown.");
  }
  runSeedDb();
  runNextBuild();
}

main();
