/**
 * 压缩/解压工具单测： round-trip、阈值、空值、兼容未压缩。
 * @author poetry
 */

import { describe, it, expect } from "vitest";
import { compressText, decompressText, compressToBlob, decompressFromBlob } from "./compress.js";

describe("compressText / decompressText", () => {
  it("短文本不压缩，原样返回", () => {
    const s = "短句";
    expect(compressText(s)).toBe(s);
    expect(decompressText(s)).toBe(s);
  });

  it("空字符串与 null 保持原意", () => {
    expect(compressText("")).toBe("");
    expect(compressText(null)).toBeNull();
    expect(decompressText("")).toBe("");
    expect(decompressText(null)).toBeNull();
  });

  it("超过阈值时压缩，解压后与原文一致", () => {
    const long =
      "床前明月光，疑是地上霜。举头望明月，低头思故乡。".repeat(10);
    const compressed = compressText(long);
    expect(compressed).not.toBe(long);
    expect(compressed!.startsWith("gz:")).toBe(true);
    expect(decompressText(compressed)).toBe(long);
  });

  it("未压缩字符串解压时原样返回", () => {
    const s = '["句一","句二"]';
    expect(decompressText(s)).toBe(s);
  });
});

describe("compressToBlob / decompressFromBlob", () => {
  it("null/空返回 null 或空 Buffer", () => {
    expect(compressToBlob(null)).toBeNull();
    expect(compressToBlob("")).toBeNull();
    expect(decompressFromBlob(null)).toBeNull();
    expect(decompressFromBlob(undefined)).toBeNull();
  });

  it("短文本存 UTF-8 Buffer，解压后一致", () => {
    const s = '["句一","句二"]';
    const buf = compressToBlob(s)!;
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString("utf8")).toBe(s);
    expect(decompressFromBlob(buf)).toBe(s);
  });

  it("超阈值存 gzip Buffer，解压后一致", () => {
    const long = "床前明月光，疑是地上霜。".repeat(20);
    const buf = compressToBlob(long)!;
    expect(buf[0]).toBe(0x1f);
    expect(buf[1]).toBe(0x8b);
    expect(decompressFromBlob(buf)).toBe(long);
  });

  it("decompressFromBlob 兼容旧版 base64 字符串", () => {
    const compressed = compressText("较长内容".repeat(30));
    expect(compressed).not.toBeNull();
    expect(decompressFromBlob(compressed)).toBe("较长内容".repeat(30));
  });
});
