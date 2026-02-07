/**
 * load_data 单元测试：样例 .md 解析结果与写出 JSON 符合约定。
 * @author poetry
 */

import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { loadAll, writeDataJson } from "./load_data.js";

const SAMPLE_MD = `---
id: li-bai-jing-ye-si
title: 静夜思
titleSlug: jing-ye-si
author: 李白
authorSlug: li-bai
dynasty: 唐
dynastySlug: tang
tags:
  - 诗词
---
## 正文
- 床前明月光，疑是地上霜。
- 举头望明月，低头思故乡。

## 拼音
- chuang2 qian2 ming2 yue4 guang1 ， yi2 shi4 di4 shang4 shuang1 。
- ju3 tou2 wang4 ming2 yue4 ， di1 tou2 si1 gu4 xiang1 。

## 注释

## 译文

## 赏析
`;

const SAMPLE_MD_WITH_RHYTHMIC = `---
id: huang-xiao-mai-xiang-chun-ye-yue
title: 湘春夜月
titleSlug: xiang-chun-ye-yue
author: 黄孝迈
authorSlug: huang-xiao-mai
dynasty: 宋
dynastySlug: song
rhythmic: 湘春夜月
tags:
  - song-ci-san-bai-shou
---
## 正文
- 近清明。
- 翠禽枝上消魂。

## 拼音
- jin4 qing1 ming2 。
- cui4 qin2 zhi1 shang4 xiao1 hun2 。

## 注释

## 译文

## 赏析
`;

describe("load_data", () => {
  it("解析单篇 .md 得到 slug/title/author/dynasty/paragraphs", () => {
    const tmpDir = path.join(process.cwd(), "tmp-load-data-test");
    const authorDir = path.join(tmpDir, "li-bai");
    fs.mkdirSync(authorDir, { recursive: true });
    fs.writeFileSync(path.join(authorDir, "jing-ye-si.md"), SAMPLE_MD, "utf-8");
    try {
      const result = loadAll(tmpDir);
      expect(result.poems.length).toBe(1);
      const p = result.poems[0]!;
      expect(p.slug).toBe("li-bai-jing-ye-si");
      expect(p.title).toBe("静夜思");
      expect(p.author).toBe("李白");
      expect(p.authorSlug).toBe("li-bai");
      expect(p.dynasty).toBe("唐");
      expect(p.dynastySlug).toBe("tang");
      expect(p.paragraphs).toHaveLength(2);
      expect(p.paragraphs[0]).toContain("床前明月光");
      expect(p.paragraphsPinyin).toHaveLength(2);
      expect(result.authors.length).toBeGreaterThanOrEqual(1);
      expect(result.dynasties.length).toBeGreaterThanOrEqual(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("解析含 rhythmic 的 .md 得到 poem.rhythmic 与 tags", () => {
    const tmpDir = path.join(process.cwd(), "tmp-load-data-rhythmic-test");
    const authorDir = path.join(tmpDir, "huang-xiao-mai");
    fs.mkdirSync(authorDir, { recursive: true });
    fs.writeFileSync(
      path.join(authorDir, "xiang-chun-ye-yue.md"),
      SAMPLE_MD_WITH_RHYTHMIC,
      "utf-8"
    );
    try {
      const result = loadAll(tmpDir);
      expect(result.poems.length).toBe(1);
      const p = result.poems[0]!;
      expect(p.rhythmic).toBe("湘春夜月");
      expect(p.tags).toContain("song-ci-san-bai-shou");
      expect(p.title).toBe("湘春夜月");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("写出 poems/search/*.json 按两字母分片与 poems/dynasty/*.json，列表项含 title/author_name、slug 仅不等时写入", () => {
    const tmpDir = path.join(process.cwd(), "tmp-load-data-test");
    const authorDir = path.join(tmpDir, "li-bai");
    const dataDir = path.join(tmpDir, "data");
    fs.mkdirSync(authorDir, { recursive: true });
    fs.writeFileSync(path.join(authorDir, "jing-ye-si.md"), SAMPLE_MD, "utf-8");
    try {
      const result = loadAll(tmpDir);
      writeDataJson(result, dataDir);
      const searchDir = path.join(dataDir, "poems", "search");
      expect(fs.existsSync(searchDir)).toBe(true);
      const jyPath = path.join(searchDir, "jy.json");
      expect(fs.existsSync(jyPath)).toBe(true);
      const searchJson = JSON.parse(fs.readFileSync(jyPath, "utf-8"));
      expect(Array.isArray(searchJson)).toBe(true);
      expect(searchJson.length).toBe(1);
      expect(searchJson[0]).toHaveProperty("title", "静夜思");
      expect(searchJson[0]).toHaveProperty("author_name", "李白");
      expect(searchJson[0]).toHaveProperty("slug", "li-bai-jing-ye-si");
      const dynastyManifestPath = path.join(dataDir, "poems", "dynasty", "tang.json");
      expect(fs.existsSync(dynastyManifestPath)).toBe(true);
      const dynastyManifest = JSON.parse(fs.readFileSync(dynastyManifestPath, "utf-8"));
      expect(dynastyManifest).toHaveProperty("initials");
      expect(Array.isArray(dynastyManifest.initials)).toBe(true);
      expect(dynastyManifest.initials).toContain("jy");
      const dynastySlicePath = path.join(dataDir, "poems", "dynasty", "tang", "jy.json");
      expect(fs.existsSync(dynastySlicePath)).toBe(true);
      const dynastySlice = JSON.parse(fs.readFileSync(dynastySlicePath, "utf-8"));
      expect(Array.isArray(dynastySlice)).toBe(true);
      expect(dynastySlice.length).toBe(1);
      expect(dynastySlice[0]).toHaveProperty("title", "静夜思");
      expect(dynastySlice[0]).toHaveProperty("author_name", "李白");
      const authorPath = path.join(dataDir, "poems", "author", "li-bai.json");
      expect(fs.existsSync(authorPath)).toBe(true);
      const authorJson = JSON.parse(fs.readFileSync(authorPath, "utf-8"));
      expect(Array.isArray(authorJson)).toBe(true);
      expect(authorJson.length).toBe(1);
      expect(authorJson[0]).toHaveProperty("title", "静夜思");
      expect(authorJson[0]).toHaveProperty("author_name", "李白");
      const tagPath = path.join(dataDir, "poems", "tag", "shi-ci.json");
      expect(fs.existsSync(tagPath)).toBe(true);
      const tagJson = JSON.parse(fs.readFileSync(tagPath, "utf-8"));
      expect(Array.isArray(tagJson)).toBe(true);
      expect(tagJson.length).toBe(1);
      expect(tagJson[0]).toHaveProperty("title", "静夜思");
      expect(tagJson[0]).toHaveProperty("author_name", "李白");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("收集 .md 时排除 bio.md 和 _bio.md，不当作诗词解析", () => {
    const tmpDir = path.join(process.cwd(), "tmp-load-data-bio-exclude");
    const authorDir = path.join(tmpDir, "li-bai");
    fs.mkdirSync(authorDir, { recursive: true });
    fs.writeFileSync(path.join(authorDir, "jing-ye-si.md"), SAMPLE_MD, "utf-8");
    fs.writeFileSync(
      path.join(authorDir, "bio.md"),
      "---\ntitle: 李白\n---\n李白（701年－762年），字太白。",
      "utf-8"
    );
    try {
      const result = loadAll(tmpDir);
      expect(result.poems.length).toBe(1);
      expect(result.poems[0]!.slug).toBe("li-bai-jing-ye-si");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("解析含繁体字的 .md 时输出为简体", () => {
    const traditionalMd = `---
id: li-bai-jing-ye-si
title: 靜夜思
titleSlug: jing-ye-si
author: 李白
authorSlug: li-bai
dynasty: 唐
dynastySlug: tang
tags: [诗词]
---
## 正文
- 床前明月光，疑是地上霜。
- 舉頭望明月，低頭思故鄉。

## 拼音
- chuang2 qian2 ming2 yue4 guang1
- ju3 tou2 wang4 ming2 yue4

## 译文
## 注释
## 赏析
`;
    const tmpDir = path.join(process.cwd(), "tmp-load-data-test-t2s");
    const authorDir = path.join(tmpDir, "li-bai");
    fs.mkdirSync(authorDir, { recursive: true });
    fs.writeFileSync(path.join(authorDir, "jing-ye-si.md"), traditionalMd, "utf-8");
    try {
      const result = loadAll(tmpDir);
      expect(result.poems.length).toBe(1);
      const p = result.poems[0]!;
      expect(p.title).toBe("静夜思");
      expect(p.author).toBe("李白");
      expect(p.dynasty).toBe("唐");
      expect(p.paragraphs[0]).toContain("床前明月光");
      expect(p.paragraphs[1]).toContain("举头");
      expect(p.paragraphs[1]).toContain("低头");
      expect(p.paragraphs[1]).toContain("故乡");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
