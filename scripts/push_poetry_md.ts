/**
 * 准备将 POEMS_DIR 推送到 chinese-poetry-md 仓库：校验/初始化 git、设置 remote、执行 git add 并输出提交/推送命令。
 * 使用方式：npm run push:md；可选环境变量 POEMS_DIR、CHINESE_POETRY_MD_REPO。
 * @author poetry
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const POEMS_DIR =
  process.env.POEMS_DIR ??
  process.env.POEMS_OUTPUT_DIR ??
  path.join(process.cwd(), "chinese-poetry-md");
const MD_REPO =
  process.env.CHINESE_POETRY_MD_REPO ?? "https://github.com/daichangya/chinese-poetry-md";

function run(cmd: string, cwd: string, optional = false): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8" }).trim();
  } catch (e) {
    if (optional) return "";
    throw e;
  }
}

function hasGitDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, ".git"));
}

function getRemoteOrigin(dir: string): string {
  return run("git config --get remote.origin.url", dir, true);
}

function main(): void {
  const resolved = path.resolve(POEMS_DIR);
  if (!fs.existsSync(resolved)) {
    console.error("push_poetry_md: POEMS_DIR 不存在:", resolved);
    console.error("  请先执行 npm run gen_markdown，或将 POEMS_DIR 设为已克隆的 chinese-poetry-md 目录。");
    process.exit(1);
  }

  const isRepo = hasGitDir(resolved);
  if (!isRepo) {
    console.log("push_poetry_md: 目录尚未是 git 仓库，正在初始化并添加 remote...");
    run("git init", resolved);
    run(`git remote add origin ${MD_REPO}`, resolved);
    console.log("push_poetry_md: 已 git init 并设置 origin =", MD_REPO);
  } else {
    const origin = getRemoteOrigin(resolved);
    if (!origin) {
      run(`git remote add origin ${MD_REPO}`, resolved);
      console.log("push_poetry_md: 已设置 origin =", MD_REPO);
    } else if (!origin.includes("chinese-poetry-md")) {
      console.warn("push_poetry_md: 当前 remote.origin 为:", origin);
      console.warn("  若需推送到 chinese-poetry-md，请修改：git remote set-url origin", MD_REPO);
    }
  }

  run("git add -A", resolved);
  const status = run("git status --short", resolved, true);
  if (!status) {
    console.log("push_poetry_md: 无变更，无需提交。");
    return;
  }
  console.log("push_poetry_md: 已执行 git add -A，当前变更：");
  console.log(status);
  console.log("");
  console.log("请在该目录内提交并推送，例如：");
  console.log(`  cd ${resolved}`);
  console.log('  git commit -m "Update markdown from gen_markdown"');
  console.log("  git push -u origin main");
  console.log("（若远程尚无 main，可先 git branch -M main 再 push。）");
}

main();
