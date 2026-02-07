/**
 * Slug 与拼音工具单元测试。
 * @author poetry
 */

import { describe, it, expect } from "vitest";
import { toSlug, toPinyinToneNum, getPinyinInitial, getPinyinInitial2 } from "./slug.js";

describe("toSlug", () => {
  it("中文转无声调拼音连字符", () => {
    expect(toSlug("李白")).toBe("li-bai");
    expect(toSlug("宿香嚴寺・其一")).toMatch(/^su-xiang-yan-si/);
  });

  it("空字符串返回空", () => {
    expect(toSlug("")).toBe("");
    expect(toSlug("  ")).toBe("");
  });
});

describe("toPinyinToneNum", () => {
  it("中文转带声调数字拼音", () => {
    const out = toPinyinToneNum("章");
    expect(out).toMatch(/\d/);
    expect(out.length).toBeGreaterThan(0);
  });

  it("空字符串返回空", () => {
    expect(toPinyinToneNum("")).toBe("");
  });
});

describe("getPinyinInitial", () => {
  it("中文取拼音首字母", () => {
    expect(getPinyinInitial("静夜思")).toBe("j");
    expect(getPinyinInitial("李白")).toBe("l");
  });

  it("英文小写/大写返回小写", () => {
    expect(getPinyinInitial("abc")).toBe("a");
    expect(getPinyinInitial("A")).toBe("a");
  });

  it("空或非 a-z 归入兜底", () => {
    expect(getPinyinInitial("")).toBe("_");
    expect(getPinyinInitial("  ")).toBe("_");
  });
});

describe("getPinyinInitial2", () => {
  it("两字及以上取前两字拼音首字母", () => {
    expect(getPinyinInitial2("静夜思")).toBe("jy");
    expect(getPinyinInitial2("春晓")).toBe("cx");
    expect(getPinyinInitial2("李白")).toBe("lb");
  });

  it("单字为首字母加下划线", () => {
    expect(getPinyinInitial2("静")).toBe("j_");
    expect(getPinyinInitial2("李")).toBe("l_");
  });

  it("空串或仅空白返回 __", () => {
    expect(getPinyinInitial2("")).toBe("__");
    expect(getPinyinInitial2("  ")).toBe("__");
  });

  it("英文取前两字符首字母", () => {
    expect(getPinyinInitial2("ab")).toBe("ab");
    expect(getPinyinInitial2("A")).toBe("a_");
  });

  it("无拼音字符归入 _ 拼成两字母", () => {
    expect(getPinyinInitial2("1")).toBe("__");
    expect(getPinyinInitial2("12")).toBe("__");
  });
});
