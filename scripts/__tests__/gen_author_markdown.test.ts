/**
 * gen_author_markdown 单元测试：从 mock 作者 JSON 生成 poemsDir/<slug>/bio.md，frontmatter 与正文符合约定。
 * @author poetry
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";
import { run, AUTHOR_JSON_PATHS } from "../gen_author_markdown.js";

describe("gen_author_markdown", () => {
  let tmpRoot: string;
  let tmpPoems: string;

  beforeEach(() => {
    tmpRoot = path.join(process.cwd(), "tmp-gen-author-md-root");
    tmpPoems = path.join(process.cwd(), "tmp-gen-author-md-poems");
    fs.mkdirSync(tmpRoot, { recursive: true });
    fs.mkdirSync(tmpPoems, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    fs.rmSync(tmpPoems, { recursive: true, force: true });
  });

  it("从宋词 author.song.json 格式生成 bio.md，含 title 与简介正文", () => {
    const songDir = path.join(tmpRoot, "宋词");
    fs.mkdirSync(songDir, { recursive: true });
    const authors: Array<{ name: string; description?: string; short_description?: string }> = [
      {
        name: "苏轼",
        description: "苏轼（1037-1101）北宋文学家，字子瞻，号东坡居士。",
        short_description: "字子瞻，号东坡居士。",
      },
    ];
    fs.writeFileSync(path.join(songDir, "author.song.json"), JSON.stringify(authors, null, 2), "utf-8");

    const count = run(tmpRoot, tmpPoems);
    expect(count).toBeGreaterThanOrEqual(1);

    const slug = "su-shi";
    const bioPath = path.join(tmpPoems, slug, "bio.md");
    expect(fs.existsSync(bioPath)).toBe(true);
    const content = fs.readFileSync(bioPath, "utf-8");
    const { data: fm, content: body } = matter(content);
    expect(fm.title).toBe("苏轼");
    expect(body).toContain("东坡居士");
    expect(body).toContain("1037");
  });

  it("从 desc 字段（全唐诗格式）生成 bio.md", () => {
    const tangDir = path.join(tmpRoot, "全唐诗");
    fs.mkdirSync(tangDir, { recursive: true });
    const authors = [
      { name: "李白", desc: "李白（701年－762年），字太白，号青莲居士。", id: "test-id" },
    ];
    fs.writeFileSync(path.join(tangDir, "authors.tang.json"), JSON.stringify(authors), "utf-8");

    const count = run(tmpRoot, tmpPoems);
    expect(count).toBeGreaterThanOrEqual(1);

    const bioPath = path.join(tmpPoems, "li-bai", "bio.md");
    expect(fs.existsSync(bioPath)).toBe(true);
    const content = fs.readFileSync(bioPath, "utf-8");
    const { content: body } = matter(content);
    expect(body).toContain("青莲居士");
  });

  it("无 author JSON 时写入 0 个文件", () => {
    const emptyRoot = path.join(process.cwd(), "tmp-empty-root-xyz");
    fs.mkdirSync(emptyRoot, { recursive: true });
    try {
      const count = run(emptyRoot, tmpPoems);
      expect(count).toBe(0);
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it("AUTHOR_JSON_PATHS 包含预期路径", () => {
    expect(AUTHOR_JSON_PATHS).toContain("宋词/author.song.json");
    expect(AUTHOR_JSON_PATHS).toContain("全唐诗/authors.tang.json");
    expect(AUTHOR_JSON_PATHS).toContain("五代诗词/nantang/authors.json");
  });
});
