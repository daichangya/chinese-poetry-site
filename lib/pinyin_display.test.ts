/**
 * 拼音展示工具单元测试：声调数字→Unicode、字-音节对齐。
 * @author poetry
 */

import { describe, it, expect } from "vitest";
import {
  pinyinNumToSymbol,
  pinyinNumLineToSymbol,
  alignLineWithPinyin,
} from "./pinyin_display";

describe("pinyinNumToSymbol", () => {
  it("converts single syllable with tone 1-4", () => {
    expect(pinyinNumToSymbol("zhang1")).toBe("zhāng");
    expect(pinyinNumToSymbol("yuan2")).toBe("yuán");
    expect(pinyinNumToSymbol("ming2")).toBe("míng");
    expect(pinyinNumToSymbol("hao3")).toBe("hǎo");
    expect(pinyinNumToSymbol("su4")).toBe("sù");
  });

  it("handles neutral tone (0)", () => {
    expect(pinyinNumToSymbol("de0")).toBe("de");
  });

  it("handles iu / ui (tone on u / i)", () => {
    expect(pinyinNumToSymbol("liu2")).toBe("liú");
    expect(pinyinNumToSymbol("hui4")).toBe("huì");
  });

  it("handles v as ü", () => {
    expect(pinyinNumToSymbol("lv3")).toBe("lǚ");
  });

  it("returns original when no trailing digit", () => {
    expect(pinyinNumToSymbol("zhang")).toBe("zhang");
  });
});

describe("pinyinNumLineToSymbol", () => {
  it("converts space-separated line", () => {
    expect(pinyinNumLineToSymbol("jin1 wu1 yu4 tu4")).toBe("jīn wū yù tù");
  });
});

describe("alignLineWithPinyin", () => {
  it("aligns chars with syllables, skips punctuation", () => {
    const line = "金乌玉兔";
    const pinyin = "jīn wū yù tù";
    const pairs = alignLineWithPinyin(line, pinyin);
    expect(pairs).toHaveLength(4);
    expect(pairs[0]).toEqual({ char: "金", pinyin: "jīn" });
    expect(pairs[1]).toEqual({ char: "乌", pinyin: "wū" });
    expect(pairs[2]).toEqual({ char: "玉", pinyin: "yù" });
    expect(pairs[3]).toEqual({ char: "兔", pinyin: "tù" });
  });

  it("gives empty pinyin for punctuation", () => {
    const line = "走如梭，";
    const pinyin = "zǒu rú suō";
    const pairs = alignLineWithPinyin(line, pinyin);
    expect(pairs).toHaveLength(4);
    expect(pairs[0]).toEqual({ char: "走", pinyin: "zǒu" });
    expect(pairs[1]).toEqual({ char: "如", pinyin: "rú" });
    expect(pairs[2]).toEqual({ char: "梭", pinyin: "suō" });
    expect(pairs[3]).toEqual({ char: "，", pinyin: "" });
  });
});
