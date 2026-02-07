/**
 * L2 构建产物检查：默认检查动态构建（.next/ 存在）；若设 OUT_DIR 则检查静态导出（out/ 与 data/poems/*）。
 * 依赖先执行 npm run build。见 docs/test-overview.md。
 * @author poetry
 */

import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = process.env.OUT_DIR;
const NEXT_DIR = path.join(process.cwd(), ".next");

function checkDynamicBuild(): boolean {
  if (!fs.existsSync(NEXT_DIR)) {
    console.error("check_build_output: .next 目录不存在");
    return false;
  }
  const buildManifest = path.join(NEXT_DIR, "BUILD_ID");
  if (!fs.existsSync(buildManifest)) {
    console.error("check_build_output: .next/BUILD_ID 不存在");
    return false;
  }
  console.log("check_build_output: 动态构建 .next 检查通过");
  return true;
}

function main(): void {
  if (OUT_DIR) {
    // 静态导出模式（如 build:batched 产出 out/）
    runStaticExportChecks(OUT_DIR);
    return;
  }
  if (!checkDynamicBuild()) process.exit(1);
  console.log("check_build_output: 通过");
}

const LIST_ITEM_REQUIRED_KEYS = ["title", "author_name"];

function runStaticExportChecks(outDir: string): void {
  let failed = false;

  if (!fs.existsSync(outDir)) {
    console.error("check_build_output: OUT_DIR 不存在:", outDir);
    process.exit(1);
  }

  const indexHtml = path.join(outDir, "index.html");
  if (!fs.existsSync(indexHtml)) {
    console.error("check_build_output: out/index.html 不存在");
    failed = true;
  }

  const dataDir = path.join(outDir, "data");
  for (const name of ["authors.json", "dynasties.json"]) {
    const p = path.join(dataDir, name);
    if (!fs.existsSync(p)) {
      console.error("check_build_output: out/data/" + name + " 不存在");
      failed = true;
    }
  }

  const dynastyDir = path.join(dataDir, "poems", "dynasty");
  if (!fs.existsSync(dynastyDir)) {
    console.error("check_build_output: out/data/poems/dynasty 不存在");
    failed = true;
  } else {
    const manifestFiles = fs.readdirSync(dynastyDir).filter((f) => f.endsWith(".json"));
    if (manifestFiles.length === 0) {
      console.error("check_build_output: out/data/poems/dynasty 下无 manifest .json 文件");
      failed = true;
    } else if (!failed) {
      const firstManifest = manifestFiles[0]!;
      const manifestPath = path.join(dynastyDir, firstManifest);
      const slug = firstManifest.replace(/\.json$/, "");
      let manifest: unknown;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      } catch (e) {
        console.error("check_build_output: poems/dynasty/" + firstManifest + " 非合法 JSON");
        failed = true;
      }
      const obj = manifest as { initials?: string[] };
      if (!failed && (!Array.isArray(obj.initials) || obj.initials.length === 0)) {
        console.error("check_build_output: poems/dynasty manifest 缺少 initials 数组");
        failed = true;
      }
      const sliceDir = path.join(dynastyDir, slug);
      if (!failed && fs.existsSync(sliceDir)) {
        const sliceFiles = fs.readdirSync(sliceDir).filter((f) => f.endsWith(".json"));
        if (sliceFiles.length > 0) {
          const firstSlice = JSON.parse(
            fs.readFileSync(path.join(sliceDir, sliceFiles[0]!), "utf-8")
          ) as unknown;
          if (Array.isArray(firstSlice) && firstSlice.length > 0) {
            const first = firstSlice[0] as Record<string, unknown>;
            for (const k of LIST_ITEM_REQUIRED_KEYS) {
              if (!(k in first)) {
                console.error("check_build_output: poems/dynasty 列表项缺少字段:", k);
                failed = true;
              }
            }
          }
        }
      }
      if (!failed) console.log("check_build_output: poems/dynasty manifest 与分片检查通过");
    }
  }

  const authorDir = path.join(dataDir, "poems", "author");
  if (!fs.existsSync(authorDir)) {
    console.error("check_build_output: out/data/poems/author 不存在");
    failed = true;
  } else {
    const authorFiles = fs.readdirSync(authorDir).filter((f) => f.endsWith(".json"));
    if (authorFiles.length === 0) {
      console.error("check_build_output: out/data/poems/author 下无 .json 文件");
      failed = true;
    } else if (!failed) {
      const firstFile = authorFiles[0]!;
      const raw = fs.readFileSync(path.join(authorDir, firstFile), "utf-8");
      let arr: unknown;
      try {
        arr = JSON.parse(raw);
      } catch (e) {
        console.error("check_build_output: poems/author/" + firstFile + " 非合法 JSON");
        failed = true;
      }
      if (!failed && Array.isArray(arr) && arr.length > 0) {
        const first = (arr as Record<string, unknown>[])[0] as Record<string, unknown>;
        for (const k of LIST_ITEM_REQUIRED_KEYS) {
          if (!(k in first)) {
            console.error("check_build_output: poems/author 列表项缺少字段:", k);
            failed = true;
          }
        }
      }
      if (!failed) console.log("check_build_output: poems/author 检查通过");
    }
  }

  const tagDir = path.join(dataDir, "poems", "tag");
  if (!fs.existsSync(tagDir)) {
    console.error("check_build_output: out/data/poems/tag 不存在");
    failed = true;
  } else {
    const tagFiles = fs.readdirSync(tagDir).filter((f) => f.endsWith(".json"));
    if (tagFiles.length === 0) {
      console.error("check_build_output: out/data/poems/tag 下无 .json 文件");
      failed = true;
    } else if (!failed) {
      const firstFile = tagFiles[0]!;
      const raw = fs.readFileSync(path.join(tagDir, firstFile), "utf-8");
      let arr: unknown;
      try {
        arr = JSON.parse(raw);
      } catch (e) {
        console.error("check_build_output: poems/tag/" + firstFile + " 非合法 JSON");
        failed = true;
      }
      if (!failed && Array.isArray(arr) && arr.length > 0) {
        const first = (arr as Record<string, unknown>[])[0] as Record<string, unknown>;
        for (const k of LIST_ITEM_REQUIRED_KEYS) {
          if (!(k in first)) {
            console.error("check_build_output: poems/tag 列表项缺少字段:", k);
            failed = true;
          }
        }
      }
      if (!failed) console.log("check_build_output: poems/tag 检查通过");
    }
  }

  const searchDir = path.join(dataDir, "poems", "search");
  if (!fs.existsSync(searchDir)) {
    console.error("check_build_output: out/data/poems/search 不存在");
    failed = true;
  } else {
    const files = fs.readdirSync(searchDir).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
      console.error("check_build_output: out/data/poems/search 下无 .json 文件");
      failed = true;
    } else if (!failed) {
      const firstFile = files[0]!;
      const raw = fs.readFileSync(path.join(searchDir, firstFile), "utf-8");
      let arr: unknown;
      try {
        arr = JSON.parse(raw);
      } catch (e) {
        console.error("check_build_output: poems/search/" + firstFile + " 非合法 JSON");
        failed = true;
      }
      if (!failed && Array.isArray(arr) && arr.length > 0) {
        const first = arr[0] as Record<string, unknown>;
        for (const k of LIST_ITEM_REQUIRED_KEYS) {
          if (!(k in first)) {
            console.error("check_build_output: poems/search 列表项缺少字段:", k);
            failed = true;
          }
        }
        if (!failed) console.log("check_build_output: poems/search 字段检查通过");
      }
    }
  }

  if (failed) process.exit(1);
  console.log("check_build_output: 通过（静态导出）");
}

main();
