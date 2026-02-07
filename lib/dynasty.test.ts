/**
 * 朝代枚举与归一化单测。
 * @author poetry
 */

import { describe, it, expect } from "vitest";
import { getDynastySlug, getDynastyDisplayName, normalizeDynasty, DYNASTY_ENTRIES } from "./dynasty.js";

describe("dynasty", () => {
  it("getDynastySlug 将唐/唐代 归一为 tang", () => {
    expect(getDynastySlug("唐")).toBe("tang");
    expect(getDynastySlug("唐代")).toBe("tang");
  });

  it("getDynastySlug 将宋/元代等归一为规范 slug", () => {
    expect(getDynastySlug("宋")).toBe("song");
    expect(getDynastySlug("元代")).toBe("yuan");
    expect(getDynastySlug("先秦")).toBe("xian-qin");
  });

  it("getDynastyDisplayName 将 slug 或别名转为展示名", () => {
    expect(getDynastyDisplayName("tang")).toBe("唐代");
    expect(getDynastyDisplayName("唐")).toBe("唐代");
    expect(getDynastyDisplayName("唐代")).toBe("唐代");
    expect(getDynastyDisplayName("song")).toBe("宋代");
    expect(getDynastyDisplayName("先秦")).toBe("先秦");
  });

  it("normalizeDynasty 返回规范 slug 与展示名", () => {
    expect(normalizeDynasty("唐")).toEqual({ slug: "tang", displayName: "唐代" });
    expect(normalizeDynasty("唐代")).toEqual({ slug: "tang", displayName: "唐代" });
    expect(normalizeDynasty("清")).toEqual({ slug: "qing", displayName: "清代" });
    expect(normalizeDynasty("")).toEqual({ slug: "", displayName: "" });
  });

  it("未知朝代退回 toSlug / 原串", () => {
    expect(getDynastySlug("蒙学")).toBe("meng-xue");
    expect(getDynastyDisplayName("meng-xue")).toBe("meng-xue");
    expect(normalizeDynasty("蒙学")).toEqual({ slug: "meng-xue", displayName: "蒙学" });
  });

  it("DYNASTY_ENTRIES 含唐宋元明清等", () => {
    const slugs = DYNASTY_ENTRIES.map((e) => e.slug);
    expect(slugs).toContain("tang");
    expect(slugs).toContain("song");
    expect(slugs).toContain("qing");
  });
});
