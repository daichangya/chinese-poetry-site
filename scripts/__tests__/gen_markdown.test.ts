/**
 * gen_markdown 单元测试：样例 JSON 归一后产出 .md 路径与内容符合 markdown-format。
 * @author poetry
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

// 测试 toSlug / 归一逻辑：全唐诗单条结构 { author, paragraphs, title }
import { toSlug } from "../../lib/slug.js";
import { deduplicateByAuthorTitleContent } from "../gen_markdown.js";
import type { NormalizedPoem } from "../../lib/types.js";

describe("gen_markdown 归一与产出约定", () => {
  it("全唐诗单条 JSON 可归一为 title/paragraphs/author/dynasty/tags", () => {
    const raw = {
      author: "李白",
      paragraphs: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"],
      title: "静夜思",
    };
    const titleSlug = toSlug(raw.title);
    const authorSlug = toSlug(raw.author);
    expect(titleSlug).toBe("jing-ye-si");
    expect(authorSlug).toBe("li-bai");
    const id = `${authorSlug}-${titleSlug}`;
    expect(id).toBe("li-bai-jing-ye-si");
  });

  it("宋词单条 JSON 标题取自 rhythmic", () => {
    const raw = {
      author: "和岘",
      paragraphs: ["气和玉烛，睿化著鸿明。", "缇管一阳生。"],
      rhythmic: "导引",
    };
    const title = raw.rhythmic;
    const titleSlug = toSlug(title);
    expect(titleSlug).toBe("dao-yin");
  });

  it("宋词三百首 tags 转 slug 与 rhythmic 一致", () => {
    expect(toSlug("宋词三百首")).toBe("song-ci-san-bai-shou");
    expect(toSlug("湘春夜月")).toBe("xiang-chun-ye-yue");
  });

  it("产出 .md 含 Frontmatter 与 ## 正文 / ## 拼音 / ## 注释 / ## 译文 / ## 赏析", () => {
    // 若有已生成的 .md，取首条做结构断言（支持 POEMS_DIR/poems/ 或 POEMS_DIR 根）
    const poemsDir = process.env.POEMS_DIR ?? path.join(process.cwd(), "chinese-poetry-md");
    const contentRoot = fs.existsSync(path.join(poemsDir, "poems")) ? path.join(poemsDir, "poems") : poemsDir;
    if (!fs.existsSync(contentRoot)) return;
    const authors = fs.readdirSync(contentRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
    if (authors.length === 0) return;
    const firstAuthor = authors[0]!.name;
    const files = fs.readdirSync(path.join(contentRoot, firstAuthor)).filter(
      (f) => f.endsWith(".md") && f !== "bio.md" && f !== "_bio.md"
    );
    if (files.length === 0) return;
    const mdPath = path.join(contentRoot, firstAuthor, files[0]!);
    const content = fs.readFileSync(mdPath, "utf-8");
    const { data: frontmatter, content: body } = matter(content);
    expect(frontmatter).toHaveProperty("id");
    expect(frontmatter).toHaveProperty("title");
    expect(frontmatter).toHaveProperty("titleSlug");
    expect(frontmatter).toHaveProperty("author");
    expect(frontmatter).toHaveProperty("authorSlug");
    expect(frontmatter).toHaveProperty("dynasty");
    expect(frontmatter).toHaveProperty("dynastySlug");
    expect(frontmatter).toHaveProperty("tags");
    expect(body).toContain("## 正文");
    expect(body).toContain("## 拼音");
    expect(body).toContain("## 注释");
    expect(body).toContain("## 译文");
    expect(body).toContain("## 赏析");
    if (frontmatter.rhythmic != null) {
      expect(typeof frontmatter.rhythmic).toBe("string");
      expect((frontmatter.rhythmic as string).length).toBeGreaterThan(0);
    }
  });

  it("同作者同标题正文指纹相同时去重保留一条，且 id/titleSlug 为无后缀、保留分句更多的版本", () => {
    const base: Pick<NormalizedPoem, "author" | "authorSlug" | "dynasty" | "dynastySlug" | "tags"> = {
      author: "王之涣",
      authorSlug: "wang-zhi-huan",
      dynasty: "唐代",
      dynastySlug: "tang",
      tags: ["诗词"],
    };
    const title = "登鹳雀楼";
    const contentText = "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。";
    const p1: NormalizedPoem = {
      ...base,
      title,
      titleSlug: "deng-guan-que-lou",
      id: "wang-zhi-huan-deng-guan-que-lou",
      paragraphs: ["白日依山尽，黄河入海流。", "欲穷千里目，更上一层楼。"],
    };
    const p2: NormalizedPoem = {
      ...base,
      title,
      titleSlug: "deng-guan-que-lou-2",
      id: "wang-zhi-huan-deng-guan-que-lou-2",
      paragraphs: [contentText],
    };
    const result = deduplicateByAuthorTitleContent([p1, p2]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("wang-zhi-huan-deng-guan-que-lou");
    expect(result[0]!.titleSlug).toBe("deng-guan-que-lou");
    expect(result[0]!.paragraphs).toHaveLength(2);
    expect(result[0]!.paragraphs[0]).toBe("白日依山尽，黄河入海流。");
    expect(result[0]!.paragraphs[1]).toBe("欲穷千里目，更上一层楼。");
  });
});
