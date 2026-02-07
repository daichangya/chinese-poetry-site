/**
 * 从 POEMS_DIR 下各作者目录读取 bio.md，供 seed_db 写入 authors.description。
 * 目录名即 author_slug，文件名为 bio.md 或 _bio.md。
 * @author poetry
 */

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

const BIO_FILES = ["bio.md", "_bio.md"];

/**
 * 扫描 POEMS_DIR 下每个一级子目录，若存在 bio.md 或 _bio.md 则解析，
 * 目录名即 slug，body 作为 description。若存在 poemsDir/poems 则从该目录扫描（与 chinese-poetry-md 一致）。
 */
export function loadAuthorBios(poemsDir: string): Map<string, string> {
  const map = new Map<string, string>();
  const contentRoot = path.join(poemsDir, "poems");
  const root = fs.existsSync(contentRoot) ? contentRoot : poemsDir;
  if (!fs.existsSync(root)) return map;

  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dirPath = path.join(root, e.name);
    for (const bioName of BIO_FILES) {
      const bioPath = path.join(dirPath, bioName);
      if (!fs.existsSync(bioPath)) continue;
      try {
        const raw = fs.readFileSync(bioPath, "utf-8");
        const { content } = matter(raw);
        const description = content.trim();
        if (description) map.set(e.name, description);
      } catch {
        // skip invalid file
      }
      break; // at most one bio per dir
    }
  }
  return map;
}
