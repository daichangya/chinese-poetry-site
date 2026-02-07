/**
 * Slug 与拼音工具，无声调拼音 + 连字符，与 docs/tech-overview、markdown-format 一致。
 * @author poetry
 */

import { pinyin } from "pinyin-pro";
import slugify from "slugify";

/**
 * 中文转 slug：无声调拼音 + 连字符，小写。
 */
export function toSlug(text: string): string {
  if (!text || !text.trim()) return "";
  const py = pinyin(text.trim(), { toneType: "none" });
  const withHyphen = py.replace(/\s+/g, "-").toLowerCase();
  return slugify(withHyphen, { lower: true, strict: true }) || withHyphen;
}

/**
 * 中文转带声调数字的拼音（如 zhang1 yuan2），用于 .md 的 titlePinyin、拼音区块等。
 */
export function toPinyinToneNum(text: string): string {
  if (!text || !text.trim()) return "";
  return pinyin(text.trim(), { toneType: "num" });
}

/**
 * 取字符串首字的拼音首字母（a–z），用于搜索索引分片与前端按 q 拉片。
 * 首字为 a–z 时直接返回小写；中文取拼音首字符；否则返回 "_" 归入兜底片。
 */
export function getPinyinInitial(str: string): string {
  const s = str.trim();
  if (!s) return "_";
  const first = s[0]!;
  const code = first.codePointAt(0) ?? 0;
  if (code >= 0x61 && code <= 0x7a) return first.toLowerCase();
  if (code >= 0x41 && code <= 0x5a) return first.toLowerCase();
  const py = pinyin(first, { toneType: "none" }).trim();
  if (py.length > 0) {
    const c = py[0]!.toLowerCase();
    if (c >= "a" && c <= "z") return c;
  }
  return "_";
}

/**
 * 取字符串前两字的拼音首字母（各 a–z 或 _），用于搜索/朝代两字母分片。
 * 标题 ≥2 字：如「静夜思」→ "jy"；标题 1 字：如「静」→ "j_"；空串或无拼音 → "__"。
 */
export function getPinyinInitial2(str: string): string {
  const s = str.trim();
  if (!s) return "__";
  const c1 = s[0]!;
  const a1 = getPinyinInitial(c1);
  if (s.length === 1) return a1 + "_";
  const c2 = s[1]!;
  const a2 = getPinyinInitial(c2);
  return a1 + a2;
}
