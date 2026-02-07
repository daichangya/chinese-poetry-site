/**
 * 将 templates/chinese-poetry-md 下的文件（README、.gitignore、git-add-n.sh 等）复制到 POEMS_DIR，
 * 便于 chinese-poetry-md 仓库拥有统一的 GitHub 展示文件。不执行 git 操作。
 * 使用方式：npm run init:md-repo；可选环境变量 POEMS_DIR、POEMS_OUTPUT_DIR。
 * @author poetry
 */

import * as fs from "node:fs";
import * as path from "node:path";

const POEMS_DIR =
  process.env.POEMS_DIR ??
  process.env.POEMS_OUTPUT_DIR ??
  path.join(process.cwd(), "chinese-poetry-md");

const TEMPLATE_DIR = path.join(process.cwd(), "templates", "chinese-poetry-md");

function main(): void {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error("init_md_repo: 模板目录不存在:", TEMPLATE_DIR);
    process.exit(1);
  }

  if (!fs.existsSync(POEMS_DIR)) {
    fs.mkdirSync(POEMS_DIR, { recursive: true });
    console.log("init_md_repo: 已创建 POEMS_DIR:", POEMS_DIR);
  }

  const entries = fs.readdirSync(TEMPLATE_DIR, { withFileTypes: true });
  const copied: string[] = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const src = path.join(TEMPLATE_DIR, e.name);
    const dest = path.join(POEMS_DIR, e.name);
    fs.copyFileSync(src, dest);
    copied.push(e.name);
  }

  if (copied.length === 0) {
    console.log("init_md_repo: 模板目录下无文件，未复制任何内容。");
    return;
  }
  console.log("init_md_repo: 已复制到", POEMS_DIR, ":", copied.join(", "));
}

main();
