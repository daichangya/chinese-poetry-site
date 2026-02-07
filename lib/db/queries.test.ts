/**
 * 数据库查询单测：单库（SQLite 或 PostgreSQL），插入 fixture 后对 poems/poem_content/poem_tags 行数及
 * getPoemBySlug 返回的完整 Poem（paragraphs、拼音实时计算、author、dynasty、tags）做断言。
 * 默认使用 SQLite 临时目录；可设 DATABASE_TYPE=postgres + DATABASE_URL 测 PostgreSQL。
 * @author poetry
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { getDb, closeDb } from "./client.js";
import { createTables } from "./schema.js";
import { compressText } from "./compress.js";
import {
  getPoemBySlug,
  getPoemsAll,
  getPoemsByTag,
  countPoemsByTag,
  countPoems,
  searchPoems,
  countSearchPoems,
} from "./queries.js";

let testDir: string;
const TEST_SLUG = "li-bai-jing-ye-si";

beforeAll(async () => {
  testDir = path.join(os.tmpdir(), `poetry-db-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  process.env.DATABASE_DIR = testDir;
  process.env.DATABASE_TYPE = "sqlite";

  const db = await getDb();
  await createTables(db);
  await db.run("INSERT INTO authors (slug, name, poem_count, description) VALUES (?, ?, ?, ?)", ["li-bai", "李白", 1, null]);
  await db.run("INSERT INTO dynasties (slug, name, poem_count) VALUES (?, ?, ?)", ["tang", "唐", 1]);
  await db.run("INSERT INTO tags (slug, name, poem_count) VALUES (?, ?, ?)", ["shi-ci", "诗词", 1]);
  await db.run(
    "INSERT INTO poems (slug, title, author_slug, dynasty_slug, rhythmic, excerpt) VALUES (?, ?, ?, ?, ?, ?)",
    [TEST_SLUG, "静夜思", "li-bai", "tang", null, "床前明月光，疑是地上霜。…"]
  );
  await db.run("INSERT INTO poem_tags (poem_slug, tag_slug) VALUES (?, ?)", [TEST_SLUG, "shi-ci"]);
  await db.run(
    "INSERT INTO poem_content (slug, paragraphs, translation, appreciation, annotation) VALUES (?, ?, ?, ?, ?)",
    [TEST_SLUG, '["床前明月光，疑是地上霜。","举头望明月，低头思故乡。"]', null, null, null]
  );
});

afterAll(async () => {
  await closeDb();
  delete process.env.DATABASE_DIR;
  delete process.env.DATABASE_TYPE;
  try {
    const dbPath = path.join(testDir, "poetry_index.db");
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    fs.rmdirSync(testDir);
  } catch {
    // ignore
  }
});

describe("db schema and row counts", () => {
  it("单库 poems/authors/dynasties/tags/poem_tags/poem_content 各有 1 行", async () => {
    const db = await getDb();
    const poems = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM poems"))?.c ?? 0;
    const tags = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM poem_tags"))?.c ?? 0;
    const authors = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM authors"))?.c ?? 0;
    const dynasties = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM dynasties"))?.c ?? 0;
    const tagTable = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM tags"))?.c ?? 0;
    const content = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM poem_content"))?.c ?? 0;
    expect(poems).toBe(1);
    expect(tags).toBe(1);
    expect(authors).toBe(1);
    expect(dynasties).toBe(1);
    expect(tagTable).toBe(1);
    expect(content).toBe(1);
  });

  it("poem_content 抽样：paragraphs 为 JSON 数组", async () => {
    const db = await getDb();
    const row = await db.get<{ paragraphs: string }>("SELECT paragraphs FROM poem_content WHERE slug = ?", [TEST_SLUG]);
    expect(row).toBeDefined();
    const arr = JSON.parse(row!.paragraphs) as string[];
    expect(arr).toHaveLength(2);
    expect(arr[0]).toContain("床前明月光");
  });
});

describe("getPoemBySlug", () => {
  it("返回的 Poem 含完整 paragraphs、拼音实时计算、author、dynasty、tags", async () => {
    const poem = await getPoemBySlug(TEST_SLUG);
    expect(poem).toBeDefined();
    expect(poem!.slug).toBe(TEST_SLUG);
    expect(poem!.title).toBe("静夜思");
    expect(poem!.author).toBe("李白");
    expect(poem!.dynasty).toBe("唐代");
    expect(poem!.paragraphs).toHaveLength(2);
    expect(poem!.paragraphs[0]).toContain("床前明月光");
    expect(poem!.tags).toContain("诗词");
    expect(poem!.excerpt).toBeDefined();
    expect(poem!.titlePinyin).toBeDefined();
    expect(poem!.paragraphsPinyin).toBeDefined();
    expect(poem!.paragraphsPinyin!.length).toBe(2);
  });

  it("不存在的 slug 返回 undefined", async () => {
    expect(await getPoemBySlug("non-existent-slug")).toBeUndefined();
  });

  it("压缩存储的 poem_content 解压后返回正确内容", async () => {
    const db = await getDb();
    const slugCompressed = "test-compressed-poem";
    const longLine = "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。".repeat(6);
    const paragraphs = [longLine, "第二句"];
    const paraJson = JSON.stringify(paragraphs);
    const stored = compressText(paraJson) ?? paraJson;
    expect(stored.startsWith("gz:")).toBe(true);
    await db.run("INSERT INTO poems (slug, title, author_slug, dynasty_slug, rhythmic, excerpt) VALUES (?, ?, ?, ?, ?, ?)", [
      slugCompressed,
      "登鹳雀楼",
      "li-bai",
      "tang",
      null,
      "白日依山尽…",
    ]);
    await db.run("INSERT INTO poem_content (slug, paragraphs, translation, appreciation, annotation) VALUES (?, ?, ?, ?, ?)", [
      slugCompressed,
      stored,
      null,
      null,
      null,
    ]);
    const poem = await getPoemBySlug(slugCompressed);
    expect(poem).toBeDefined();
    expect(poem!.paragraphs).toEqual(paragraphs);
  });
});

describe("list and search", () => {
  it("getPoemsAll 返回列表项含 author、dynasty、excerpt，无 paragraphs", async () => {
    const list = await getPoemsAll(0, 10);
    expect(list.length).toBeGreaterThanOrEqual(1);
    const jingYeSi = list.find((p) => p.slug === TEST_SLUG);
    expect(jingYeSi).toBeDefined();
    expect(jingYeSi!.author).toBe("李白");
    expect(jingYeSi!.dynasty).toBe("唐代");
    expect(jingYeSi!.excerpt).toBeDefined();
    expect(jingYeSi!.paragraphs).toEqual([]);
  });

  it("getPoemsByTag 通过 poem_tags 按标签查诗", async () => {
    const list = await getPoemsByTag("shi-ci", 0, 10);
    expect(list).toHaveLength(1);
    expect(list[0].slug).toBe(TEST_SLUG);
    expect(list[0].author_name).toBe("李白");
  });

  it("countPoemsByTag 正确", async () => {
    expect(await countPoemsByTag("shi-ci")).toBe(1);
    expect(await countPoemsByTag("other-tag")).toBe(0);
  });

  it("countPoems 正确", async () => {
    expect(await countPoems()).toBeGreaterThanOrEqual(1);
  });

  it("searchPoems 按标题或作者名 LIKE 搜索", async () => {
    const byTitle = await searchPoems("静夜", 0, 10);
    expect(byTitle).toHaveLength(1);
    expect(byTitle[0].title).toBe("静夜思");
    const byAuthor = await searchPoems("李白", 0, 10);
    expect(byAuthor.length).toBeGreaterThanOrEqual(1);
    expect(byAuthor.some((p) => p.author_name === "李白")).toBe(true);
  });

  it("countSearchPoems 正确", async () => {
    expect(await countSearchPoems("静夜")).toBeGreaterThanOrEqual(1);
    expect(await countSearchPoems("李白")).toBeGreaterThanOrEqual(1);
    expect(await countSearchPoems("不存在")).toBe(0);
  });
});
