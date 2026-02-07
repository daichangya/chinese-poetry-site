/**
 * load_author_bios 单元测试：扫描 POEMS_DIR 下各 author_slug/bio.md，解析得到 Map<slug, description>。
 * @author poetry
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadAuthorBios } from "./load_author_bios.js";

describe("load_author_bios", () => {
  it("扫描目录下各 author_slug/bio.md 返回 Map<slug, description>", () => {
    const tmpDir = path.join(process.cwd(), "tmp-load-author-bios-test");
    const liBaiDir = path.join(tmpDir, "li-bai");
    const suShiDir = path.join(tmpDir, "su-shi");
    fs.mkdirSync(liBaiDir, { recursive: true });
    fs.mkdirSync(suShiDir, { recursive: true });
    fs.writeFileSync(
      path.join(liBaiDir, "bio.md"),
      "---\ntitle: 李白\n---\n李白（701年－762年），字太白，号青莲居士。",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(suShiDir, "bio.md"),
      "---\ntitle: 苏轼\n---\n苏轼（1037年－1101年），字子瞻，号东坡居士。",
      "utf-8"
    );
    try {
      const map = loadAuthorBios(tmpDir);
      expect(map.size).toBe(2);
      expect(map.get("li-bai")).toContain("李白");
      expect(map.get("li-bai")).toContain("青莲居士");
      expect(map.get("su-shi")).toContain("苏轼");
      expect(map.get("su-shi")).toContain("东坡居士");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("支持 _bio.md 且目录名即 slug", () => {
    const tmpDir = path.join(process.cwd(), "tmp-load-author-bios-underscore");
    const authorDir = path.join(tmpDir, "du-fu");
    fs.mkdirSync(authorDir, { recursive: true });
    fs.writeFileSync(
      path.join(authorDir, "_bio.md"),
      "---\ntitle: 杜甫\n---\n杜甫（712年－770年），字子美。",
      "utf-8"
    );
    try {
      const map = loadAuthorBios(tmpDir);
      expect(map.size).toBe(1);
      expect(map.get("du-fu")).toContain("杜甫");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("不存在的目录返回空 Map", () => {
    const map = loadAuthorBios(path.join(process.cwd(), "nonexistent-poems-dir-xyz"));
    expect(map.size).toBe(0);
  });
});
