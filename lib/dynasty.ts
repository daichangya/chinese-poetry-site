/**
 * 朝代枚举与归一化：统一「唐/唐代」等写法为规范展示名与 slug，便于列表/筛选/展示一致。
 * @author poetry
 */

import { toSlug } from "./slug";

/** 单条朝代：规范 slug、展示名、别名（含单字/带「代」等） */
export type DynastyEntry = {
  slug: string;
  displayName: string;
  aliases: string[];
};

/**
 * 已知朝代规范表：slug 与展示名一致于全站（列表、筛选、详情）。
 * 单字朝代展示为「X代」，多字保持原名；别名用于 raw 归一。
 */
export const DYNASTY_ENTRIES: DynastyEntry[] = [
  { slug: "xian-qin", displayName: "先秦", aliases: ["先秦"] },
  { slug: "chun-qiu", displayName: "春秋", aliases: ["春秋"] },
  { slug: "zhan-guo", displayName: "战国", aliases: ["战国"] },
  { slug: "qin", displayName: "秦", aliases: ["秦", "秦代"] },
  { slug: "han", displayName: "汉", aliases: ["汉", "汉代", "西汉", "东汉","西汉末年","东汉末年","两汉"] },
  { slug: "dong-han-mo-nian", displayName: "东汉末年", aliases: ["东汉末年"] },
  { slug: "san-guo", displayName: "三国", aliases: ["三国", "三国时期"] },
  { slug: "jin", displayName: "晋", aliases: ["晋", "晋代", "西晋", "东晋","魏晋"] },
  { slug: "nan-bei-chao", displayName: "南北朝", aliases: ["南北朝"] },
  { slug: "sui", displayName: "隋", aliases: ["隋", "隋代"] },
  { slug: "tang", displayName: "唐代", aliases: ["唐", "唐代"] },
  { slug: "chu", displayName: "楚", aliases: ["楚"] },
  { slug: "wu-dai", displayName: "五代", aliases: ["五代", "五代十国"] },
  { slug: "song", displayName: "宋代", aliases: ["宋", "宋代"] },
  { slug: "yuan", displayName: "元代", aliases: ["元", "元代"] },
  { slug: "ming", displayName: "明代", aliases: ["明", "明代"] },
  { slug: "qing", displayName: "清代", aliases: ["清", "清代"] },
];

const slugToEntry = new Map<string, DynastyEntry>(DYNASTY_ENTRIES.map((e) => [e.slug, e]));
const aliasToEntry = new Map<string, DynastyEntry>();
for (const e of DYNASTY_ENTRIES) {
  for (const a of e.aliases) {
    const key = a.trim().toLowerCase();
    if (!aliasToEntry.has(key)) aliasToEntry.set(key, e);
  }
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * 将原始朝代名（如「唐」「唐代」）转为规范 slug（如 tang）。
 * 未命中枚举时退回 toSlug(raw)，保证兼容。
 */
export function getDynastySlug(raw: string): string {
  if (!raw || !raw.trim()) return "";
  const entry = aliasToEntry.get(normalizeKey(raw));
  return entry ? entry.slug : toSlug(raw);
}

/**
 * 将 slug 或原始朝代名转为规范展示名（如 tang / 唐 / 唐代 -> 唐代）。
 * 未命中枚举时返回原字符串。
 */
export function getDynastyDisplayName(slugOrRaw: string): string {
  if (!slugOrRaw || !slugOrRaw.trim()) return "";
  const bySlug = slugToEntry.get(slugOrRaw.trim());
  if (bySlug) return bySlug.displayName;
  const byAlias = aliasToEntry.get(normalizeKey(slugOrRaw));
  if (byAlias) return byAlias.displayName;
  return slugOrRaw.trim();
}

/**
 * 仅当 slug 在已知枚举中时返回规范展示名，否则返回 fallback（如 DB/JSON 中的 name）。
 * 用于 API 列表：枚举内用规范名，枚举外（如 liang-han）用入库时的中文名。
 */
export function getDynastyDisplayNameOrFallback(slug: string, fallbackName: string): string {
  if (!slug?.trim()) return fallbackName?.trim() ?? "";
  const entry = slugToEntry.get(slug.trim());
  return entry ? entry.displayName : (fallbackName?.trim() || slug.trim());
}

/**
 * 归一化原始朝代：返回规范 slug 与展示名，用于写入 .md / DB。
 * 未命中枚举时 slug = toSlug(raw)，displayName = raw。
 */
export function normalizeDynasty(raw: string): { slug: string; displayName: string } {
  if (!raw || !raw.trim()) return { slug: "", displayName: "" };
  const entry = aliasToEntry.get(normalizeKey(raw));
  if (entry) return { slug: entry.slug, displayName: entry.displayName };
  const slug = toSlug(raw);
  return { slug, displayName: raw.trim() };
}
