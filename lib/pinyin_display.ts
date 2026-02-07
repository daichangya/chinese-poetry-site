/**
 * 拼音展示：声调数字 → Unicode 声调符号（如 zhang1 → zhāng）。
 * 用于详情页正文、标题等拼音展示，与 docs/poem-style.md、tech-overview 约定一致。
 * @author poetry
 */

const VOWELS = "aeiouüv" as const;
const TONE_MAP: Record<string, [string, string, string, string]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
  v: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

/**
 * 单音节声调数字转 Unicode：zhang1 → zhāng，lv3 → lǚ。
 * 规则：声调标在主元音上，主元音顺序 a > o > e > iu(u) / ui(i)。
 */
export function pinyinNumToSymbol(syllable: string): string {
  const m = syllable.trim().match(/^(.+?)([0-4])$/);
  if (!m) return syllable;
  const base = m[1]!;
  const tone = m[2]!;
  if (tone === "0") return base; // 轻声
  const t = parseInt(tone, 10) - 1;
  if (t < 0 || t > 3) return base;

  const lower = base.toLowerCase();
  // 主元音位置：优先 a, o, e；iu/iü 标在 u 上，ui 标在 i 上
  let idx = -1;
  if (lower.includes("a")) idx = lower.indexOf("a");
  else if (lower.includes("o")) idx = lower.indexOf("o");
  else if (lower.includes("e")) idx = lower.indexOf("e");
  else if (lower.includes("iu") || lower.includes("iü")) idx = Math.max(lower.indexOf("u"), lower.indexOf("ü") >= 0 ? lower.indexOf("ü") : -1, lower.indexOf("v") >= 0 ? lower.indexOf("v") : -1);
  else if (lower.includes("ui")) idx = lower.indexOf("i");
  else if (lower.includes("i")) idx = lower.indexOf("i");
  else if (lower.includes("u")) idx = lower.indexOf("u");
  else if (lower.includes("ü") || lower.includes("v")) idx = lower.indexOf("ü") >= 0 ? lower.indexOf("ü") : lower.indexOf("v");

  if (idx < 0) return base;
  const v = lower[idx]!;
  const key = v === "v" ? "v" : v;
  const row = TONE_MAP[key];
  if (!row) return base;
  const accented = row[t];
  const before = base.slice(0, idx);
  const after = base.slice(idx + 1);
  return before + accented + after;
}

/**
 * 一行拼音（空格分隔音节）转为 Unicode 声调符号。
 */
export function pinyinNumLineToSymbol(line: string): string {
  if (!line || !line.trim()) return line;
  return line
    .trim()
    .split(/\s+/)
    .map(pinyinNumToSymbol)
    .join(" ");
}

/**
 * 将一行汉字与一行拼音（空格分隔）对齐为「字-音节」对。
 * 标点不占音节；若音节不足则无拼音，多出音节挂在最后一字后（少见）。
 */
export function alignLineWithPinyin(
  line: string,
  pinyinLine: string
): Array<{ char: string; pinyin: string }> {
  const chars = [...line];
  const syllables = pinyinLine.trim().split(/\s+/).filter(Boolean);
  const result: Array<{ char: string; pinyin: string }> = [];
  let j = 0;
  for (const char of chars) {
    if (/[\s，。、？！；：…—]/.test(char)) {
      result.push({ char, pinyin: "" });
    } else {
      result.push({ char, pinyin: syllables[j] ?? "" });
      j += 1;
    }
  }
  return result;
}
