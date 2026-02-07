/**
 * 从 chinese-poetry JSON 生成 POEMS_DIR 下 .md 文件（中间产出物）。
 * 按 docs/chinese-poetry-data-formats.md 逐源解析，产出符合 docs/markdown-format.md。
 * 数据源中繁体/简体混合，生成 .md 时统一转为简体。
 * @author poetry
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { Converter as OpenCCConverter } from "opencc-js/t2cn";
import type { NormalizedPoem } from "../lib/types.js";
import { toSlug, toPinyinToneNum } from "../lib/slug.js";
import { normalizeDynasty } from "../lib/dynasty.js";

/** 繁转简（OpenCC t→cn），生成中间 .md 时统一为简体 */
const toSimplified = OpenCCConverter({ from: "t", to: "cn" });

function toSimplifiedRaw(raw: {
  title: string;
  paragraphs: string[];
  author: string;
  dynasty: string;
  tags: string[];
}): { title: string; paragraphs: string[]; author: string; dynasty: string; tags: string[] } {
  return {
    title: toSimplified(raw.title),
    paragraphs: raw.paragraphs.map((s) => toSimplified(s)),
    author: toSimplified(raw.author),
    dynasty: toSimplified(raw.dynasty),
    tags: raw.tags.map((t) => toSimplified(String(t))),
  };
}

const CHINESE_POETRY_DIR =
  process.env.CHINESE_POETRY_DIR ?? path.join(process.cwd(), "chinese-poetry");
const MENGXUE_DIR = path.join(CHINESE_POETRY_DIR, "蒙学");
const POEMS_DIR =
  process.env.POEMS_DIR ??
  process.env.POEMS_OUTPUT_DIR ??
  path.join(process.cwd(), "chinese-poetry-md");

/** 测试时仅加载蒙学：GEN_MARKDOWN_MENGXUE_ONLY=1 */
const MENGXUE_ONLY = process.env.GEN_MARKDOWN_MENGXUE_ONLY === "1";

/** 楚辞作者 → 朝代映射（见 chinese-poetry-data-formats 3.8） */
const CHUCI_AUTHOR_DYNASTY: Record<string, string> = {
  屈原: "楚",
  宋玉: "楚",
  贾谊: "西汉",
};

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const MAX_TITLE_SLUG_LENGTH = 80;

function shortHash(s: string): string {
  return crypto.createHash("md5").update(s).digest("hex").slice(0, 8);
}

/** 归一为 NormalizedPoem，并生成 id / titleSlug / authorSlug / dynastySlug 与可选拼音、词牌 */
function normalize(
  raw: {
    title: string;
    paragraphs: string[];
    author: string;
    dynasty: string;
    tags: string[];
    rhythmic?: string;
  },
  seenIds: Set<string>
): NormalizedPoem {
  const authorSlug = toSlug(raw.author);
  let titleSlug = toSlug(raw.title);
  if (titleSlug.length > MAX_TITLE_SLUG_LENGTH) {
    titleSlug = titleSlug.slice(0, 72) + "-" + shortHash(raw.title + raw.author);
  }
  let id = `${authorSlug}-${titleSlug}`;
  let suffix = 2;
  while (seenIds.has(id)) {
    titleSlug = `${toSlug(raw.title).slice(0, 72)}-${suffix}`;
    id = `${authorSlug}-${titleSlug}`;
    suffix += 1;
  }
  seenIds.add(id);

  const { slug: dynastySlug, displayName: dynastyDisplay } = raw.dynasty ? normalizeDynasty(raw.dynasty) : { slug: "", displayName: "" };
  return {
    title: raw.title,
    paragraphs: raw.paragraphs,
    author: raw.author,
    dynasty: dynastyDisplay,
    tags: raw.tags.length ? raw.tags : ["诗词"],
    titleSlug,
    authorSlug,
    dynastySlug,
    id,
    titlePinyin: toPinyinToneNum(raw.title),
    authorPinyin: toPinyinToneNum(raw.author),
    dynastyPinyin: raw.dynasty ? toPinyinToneNum(raw.dynasty) : undefined,
    paragraphsPinyin: raw.paragraphs.map((p) => toPinyinToneNum(p)),
    rhythmic: raw.rhythmic ? toSimplified(raw.rhythmic) : undefined,
  };
}

/** 全唐诗：poet.tang.*.json / poet.song.*.json，朝代由文件名推断 */
function loadQuantangshi(seenIds: Set<string>): NormalizedPoem[] {
  const dir = path.join(CHINESE_POETRY_DIR, "全唐诗");
  if (!fs.existsSync(dir)) return [];
  const out: NormalizedPoem[] = [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    if (!f.startsWith("poet.")) continue;
    const dynasty = f.includes("tang") ? "唐" : "宋";
    const filePath = path.join(dir, f);
    try {
      const arr = readJson<{ author?: string; paragraphs?: string[]; title?: string }[]>(filePath);
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        const title = item.title ?? "";
        const paragraphs = item.paragraphs ?? [];
        const author = item.author ?? "";
        if (!title || !paragraphs.length) continue;
        out.push(
          normalize(
            toSimplifiedRaw({ title, paragraphs, author, dynasty, tags: ["诗词"] }),
            seenIds
          )
        );
      }
    } catch {
      // skip invalid files
    }
  }
  return out;
}

/** 宋词：ci.song.*.json 与 宋词三百首.json，title = rhythmic，tags 从 item.tags 转 slug */
function loadSongci(seenIds: Set<string>): NormalizedPoem[] {
  const dir = path.join(CHINESE_POETRY_DIR, "宋词");
  if (!fs.existsSync(dir)) return [];
  const out: NormalizedPoem[] = [];
  const allFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const files = allFiles.filter(
    (f) => f.startsWith("ci.song.") || f === "宋词三百首.json"
  );
  for (const f of files) {
    const filePath = path.join(dir, f);
    try {
      const arr = readJson<
        { author?: string; paragraphs?: string[]; rhythmic?: string; tags?: string[] }[]
      >(filePath);
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        const title = item.rhythmic ?? "";
        const paragraphs = item.paragraphs ?? [];
        const author = item.author ?? "";
        if (!title || !paragraphs.length) continue;
        const tags = item.tags?.length ? item.tags : ["诗词"];
        const simplified = toSimplifiedRaw({
          title,
          paragraphs,
          author,
          dynasty: "宋",
          tags,
        });
        out.push(
          normalize(
            {
              ...simplified,
              rhythmic: toSimplified(item.rhythmic ?? ""),
            },
            seenIds
          )
        );
      }
    } catch {
      //
    }
  }
  return out;
}

/** 楚辞：chuci.json，content → paragraphs，朝代映射 */
function loadChuci(seenIds: Set<string>): NormalizedPoem[] {
  const filePath = path.join(CHINESE_POETRY_DIR, "楚辞", "chuci.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const arr = readJson<{ title?: string; author?: string; content?: string[] }[]>(filePath);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item.title && (item.content?.length ?? 0) > 0)
      .map((item) => {
        const title = item.title!;
        const paragraphs = item.content!;
        const author = item.author ?? "";
        const dynasty = (author && CHUCI_AUTHOR_DYNASTY[author]) || "楚";
        return normalize(
          toSimplifiedRaw({ title, paragraphs, author, dynasty, tags: ["诗词"] }),
          seenIds
        );
      });
  } catch {
    return [];
  }
}

/** 论语：lunyu.json，chapter 为标题，无 author，写死 孔子及其弟子/春秋 */
function loadLunyu(seenIds: Set<string>): NormalizedPoem[] {
  const filePath = path.join(CHINESE_POETRY_DIR, "论语", "lunyu.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const arr = readJson<{ chapter?: string; paragraphs?: string[] }[]>(filePath);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item.chapter && (item.paragraphs?.length ?? 0) > 0)
      .map((item) =>
        normalize(
          toSimplifiedRaw({
            title: item.chapter!,
            paragraphs: item.paragraphs!,
            author: "孔子及其弟子",
            dynasty: "春秋",
            tags: ["蒙学", "论语"],
          }),
          seenIds
        )
      );
  } catch {
    return [];
  }
}

/** 元曲：yuanqu.json */
function loadYuanqu(seenIds: Set<string>): NormalizedPoem[] {
  const filePath = path.join(CHINESE_POETRY_DIR, "元曲", "yuanqu.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const arr = readJson<{ title?: string; author?: string; paragraphs?: string[] }[]>(filePath);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item.title && (item.paragraphs?.length ?? 0) > 0)
      .map((item) =>
        normalize(
          toSimplifiedRaw({
            title: item.title!,
            paragraphs: item.paragraphs!,
            author: item.author ?? "",
            dynasty: "元",
            tags: ["诗词"],
          }),
          seenIds
        )
      );
  } catch {
    return [];
  }
}

/** 曹操诗集：caocao.json，无 author，写死 曹操/东汉末年 */
function loadCaocao(seenIds: Set<string>): NormalizedPoem[] {
  const filePath = path.join(CHINESE_POETRY_DIR, "曹操诗集", "caocao.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const arr = readJson<{ title?: string; paragraphs?: string[] }[]>(filePath);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item.title && (item.paragraphs?.length ?? 0) > 0)
      .map((item) =>
        normalize(
          toSimplifiedRaw({
            title: item.title!,
            paragraphs: item.paragraphs!,
            author: "曹操",
            dynasty: "东汉末年",
            tags: ["诗词"],
          }),
          seenIds
        )
      );
  } catch {
    return [];
  }
}

/** 纳兰性德：纳兰性德诗集.json，正文字段 para */
function loadNalanxingde(seenIds: Set<string>): NormalizedPoem[] {
  const filePath = path.join(CHINESE_POETRY_DIR, "纳兰性德", "纳兰性德诗集.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const arr = readJson<{ title?: string; author?: string; para?: string[]; paragraphs?: string[] }[]>(filePath);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item.title && ((item.para?.length ?? item.paragraphs?.length ?? 0) > 0))
      .map((item) => {
        const paragraphs = item.para ?? item.paragraphs ?? [];
        return normalize(
          toSimplifiedRaw({
            title: item.title!,
            paragraphs,
            author: item.author ?? "纳兰性德",
            dynasty: "清",
            tags: ["诗词"],
          }),
          seenIds
        );
      });
  } catch {
    return [];
  }
}

/** 水墨唐诗：shuimotangshi.json，dynasty 唐，tags 水墨唐诗 */
function loadShuimotangshi(seenIds: Set<string>): NormalizedPoem[] {
  const filePath = path.join(CHINESE_POETRY_DIR, "水墨唐诗", "shuimotangshi.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const arr = readJson<{ title?: string; author?: string; paragraphs?: string[] }[]>(filePath);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item.title && (item.paragraphs?.length ?? 0) > 0)
      .map((item) =>
        normalize(
          toSimplifiedRaw({
            title: item.title!,
            paragraphs: item.paragraphs!,
            author: item.author ?? "",
            dynasty: "唐",
            tags: ["水墨唐诗"],
          }),
          seenIds
        )
      );
  } catch {
    return [];
  }
}

/** 御定全唐詩：御定全唐詩/json/*.json，朝代固定唐 */
function loadYudingQuantangshi(seenIds: Set<string>): NormalizedPoem[] {
  const dir = path.join(CHINESE_POETRY_DIR, "御定全唐詩", "json");
  if (!fs.existsSync(dir)) return [];
  const out: NormalizedPoem[] = [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const filePath = path.join(dir, f);
    try {
      const arr = readJson<{ title?: string; author?: string; paragraphs?: string[] }[]>(filePath);
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (!item.title || !(item.paragraphs?.length ?? 0)) continue;
        out.push(
          normalize(
            toSimplifiedRaw({
              title: item.title,
              paragraphs: item.paragraphs!,
              author: item.author ?? "",
              dynasty: "唐",
              tags: ["诗词"],
            }),
            seenIds
          )
        );
      }
    } catch {
      // skip invalid files
    }
  }
  return out;
}

/** 五代诗词：花间集（rhythmic 作标题）+ 南唐（title），dynasty 五代 */
function loadWudaishici(seenIds: Set<string>): NormalizedPoem[] {
  const out: NormalizedPoem[] = [];
  const huajianjiDir = path.join(CHINESE_POETRY_DIR, "五代诗词", "huajianji");
  if (fs.existsSync(huajianjiDir)) {
    const files = fs
      .readdirSync(huajianjiDir)
      .filter((f) => f.endsWith(".json") && !f.includes("0-preface"));
    for (const f of files) {
      const filePath = path.join(huajianjiDir, f);
      try {
        const arr = readJson<{ title?: string; author?: string; paragraphs?: string[]; rhythmic?: string }[]>(filePath);
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
          const title = item.rhythmic ?? item.title ?? "";
          if (!title || !(item.paragraphs?.length ?? 0)) continue;
          out.push(
            normalize(
              toSimplifiedRaw({
                title,
                paragraphs: item.paragraphs!,
                author: item.author ?? "",
                dynasty: "五代",
                tags: ["花间集"],
              }),
              seenIds
            )
          );
        }
      } catch {
        // skip
      }
    }
  }
  const nantangPath = path.join(CHINESE_POETRY_DIR, "五代诗词", "nantang", "poetrys.json");
  if (fs.existsSync(nantangPath)) {
    try {
      const arr = readJson<{ title?: string; author?: string; paragraphs?: string[] }[]>(nantangPath);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (!item.title || !(item.paragraphs?.length ?? 0)) continue;
          out.push(
            normalize(
              toSimplifiedRaw({
                title: item.title,
                paragraphs: item.paragraphs!,
                author: item.author ?? "",
                dynasty: "五代",
                tags: ["诗词"],
              }),
              seenIds
            )
          );
        }
      }
    } catch {
      // skip
    }
  }
  return out;
}

/** 诗经：shijing.json，content → paragraphs，无 author 写死佚名/先秦 */
function loadShijing(seenIds: Set<string>): NormalizedPoem[] {
  const filePath = path.join(CHINESE_POETRY_DIR, "诗经", "shijing.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const arr = readJson<{ title?: string; chapter?: string; section?: string; content?: string[] }[]>(filePath);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item.title && (item.content?.length ?? 0) > 0)
      .map((item) =>
        normalize(
          toSimplifiedRaw({
            title: item.title!,
            paragraphs: item.content!,
            author: "佚名",
            dynasty: "先秦",
            tags: ["诗经"],
          }),
          seenIds
        )
      );
  } catch {
    return [];
  }
}

/** 四书五经：大学/中庸单对象，孟子数组，author/dynasty 写死 */
function loadSishuwujing(seenIds: Set<string>): NormalizedPoem[] {
  const dir = path.join(CHINESE_POETRY_DIR, "四书五经");
  if (!fs.existsSync(dir)) return [];
  const out: NormalizedPoem[] = [];

  const daxuePath = path.join(dir, "daxue.json");
  if (fs.existsSync(daxuePath)) {
    try {
      const data = readJson<{ chapter?: string; paragraphs?: string[] }>(daxuePath);
      const title = data.chapter ?? "大学";
      const paragraphs = data.paragraphs ?? [];
      if (title && paragraphs.length > 0) {
        out.push(
          normalize(
            toSimplifiedRaw({
              title,
              paragraphs,
              author: "曾子",
              dynasty: "先秦",
              tags: ["四书五经"],
            }),
            seenIds
          )
        );
      }
    } catch {
      // skip
    }
  }

  const zhongyongPath = path.join(dir, "zhongyong.json");
  if (fs.existsSync(zhongyongPath)) {
    try {
      const data = readJson<{ chapter?: string; paragraphs?: string[] }>(zhongyongPath);
      const title = data.chapter ?? "中庸";
      const paragraphs = data.paragraphs ?? [];
      if (title && paragraphs.length > 0) {
        out.push(
          normalize(
            toSimplifiedRaw({
              title,
              paragraphs,
              author: "子思",
              dynasty: "先秦",
              tags: ["四书五经"],
            }),
            seenIds
          )
        );
      }
    } catch {
      // skip
    }
  }

  const mengziPath = path.join(dir, "mengzi.json");
  if (fs.existsSync(mengziPath)) {
    try {
      const arr = readJson<{ chapter?: string; paragraphs?: string[] }[]>(mengziPath);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          const title = item.chapter ?? "";
          const paragraphs = item.paragraphs ?? [];
          if (!title || !paragraphs.length) continue;
          out.push(
            normalize(
              toSimplifiedRaw({
                title,
                paragraphs,
                author: "孟子",
                dynasty: "战国",
                tags: ["四书五经"],
              }),
              seenIds
            )
          );
        }
      }
    } catch {
      // skip
    }
  }
  return out;
}

/** 幽梦影：youmengying.json，无 title 用「幽梦影·第 N 则」，content 单段 */
function loadYoumengying(seenIds: Set<string>): NormalizedPoem[] {
  const filePath = path.join(CHINESE_POETRY_DIR, "幽梦影", "youmengying.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const arr = readJson<{ content?: string; comment?: string[] }[]>(filePath);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item.content && item.content.trim().length > 0)
      .map((item, index) =>
        normalize(
          toSimplifiedRaw({
            title: `幽梦影·第 ${index + 1} 则`,
            paragraphs: [item.content!.trim()],
            author: "张潮",
            dynasty: "清",
            tags: ["幽梦影"],
          }),
          seenIds
        )
      );
  } catch {
    return [];
  }
}

/** 蒙学 tags 字符串 → 朝代（用于单书单篇） */
function mengxueTagsToDynasty(tags: string | string[] | undefined): string {
  const t = Array.isArray(tags) ? tags[0] : tags;
  if (t === "北宋") return "宋";
  if (t === "南北朝") return "南北朝";
  return "蒙学";
}

/** 三字经、朱子家训单独归为蒙学，不随源数据 tags 标宋/明 */
const MENGXUE_DYNASTY_OVERRIDE_TITLES = new Set(["三字经", "朱子家训"]);
const MENGXUE_DYNASTY_OVERRIDE_FILES = new Set(["sanzijing-new.json", "sanzijing-traditional.json", "zhuzijiaxun.json"]);

/** 蒙学 Type A：单书单篇（qianziwen, sanzijing-*, baijiaxing, zhuzijiaxun） */
function loadMengxueFlat(seenIds: Set<string>): NormalizedPoem[] {
  if (!fs.existsSync(MENGXUE_DIR)) return [];
  const files = [
    "qianziwen.json",
    "sanzijing-new.json",
    "sanzijing-traditional.json",
    "baijiaxing.json",
    "zhuzijiaxun.json",
  ];
  const out: NormalizedPoem[] = [];
  for (const f of files) {
    const filePath = path.join(MENGXUE_DIR, f);
    if (!fs.existsSync(filePath)) continue;
    try {
      const data = readJson<{
        title?: string;
        author?: string;
        tags?: string | string[];
        paragraphs?: string[];
      }>(filePath);
      const title = data.title ?? "";
      const paragraphs = data.paragraphs ?? [];
      if (!title || !paragraphs.length) continue;
      const author = data.author ?? "";
      const tagsArr = Array.isArray(data.tags)
        ? data.tags
        : data.tags
          ? [data.tags]
          : [];
      const tags = [...new Set([...tagsArr, "蒙学"])];
      const dynastyOverride =
        MENGXUE_DYNASTY_OVERRIDE_TITLES.has(title) || MENGXUE_DYNASTY_OVERRIDE_FILES.has(f);
      const dynasty = dynastyOverride ? "蒙学" : mengxueTagsToDynasty(data.tags);
      out.push(
        normalize(
          toSimplifiedRaw({ title, paragraphs, author, dynasty, tags }),
          seenIds
        )
      );
    } catch {
      // skip invalid
    }
  }
  return out;
}

/** 蒙学 Type B：书+章（dizigui, zengguangxianwen） */
function loadMengxueContentChapters(seenIds: Set<string>): NormalizedPoem[] {
  const out: NormalizedPoem[] = [];
  const config: { file: string; dynasty: string }[] = [
    { file: "dizigui.json", dynasty: "清" },
    { file: "zengguangxianwen.json", dynasty: "明" },
  ];
  for (const { file, dynasty } of config) {
    const filePath = path.join(MENGXUE_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    try {
      const data = readJson<{
        title?: string;
        author?: string;
        content?: Array<{ chapter?: string; paragraphs?: string[] }>;
      }>(filePath);
      const bookTitle = data.title ?? "";
      const author = data.author ?? "";
      const content = data.content ?? [];
      for (const item of content) {
        const chapter = item.chapter ?? "";
        const paragraphs = item.paragraphs ?? [];
        if (!chapter || !paragraphs.length) continue;
        const title = `${bookTitle}·${chapter}`;
        out.push(
          normalize(
            toSimplifiedRaw({
              title,
              paragraphs,
              author,
              dynasty,
              tags: ["蒙学"],
            }),
            seenIds
          )
        );
      }
    } catch {
      //
    }
  }
  return out;
}

/** 蒙学 Type C：书+卷+章（youxueqionglin, shenglvqimeng） */
function loadMengxueContentNested(seenIds: Set<string>): NormalizedPoem[] {
  const out: NormalizedPoem[] = [];
  const config: { file: string; dynasty: string }[] = [
    { file: "youxueqionglin.json", dynasty: "明" },
    { file: "shenglvqimeng.json", dynasty: "清" },
  ];
  for (const { file, dynasty } of config) {
    const filePath = path.join(MENGXUE_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    try {
      const data = readJson<{
        title?: string;
        author?: string;
        content?: Array<{
          title?: string;
          content?: Array<{ chapter?: string; paragraphs?: string[] }>;
        }>;
      }>(filePath);
      const bookTitle = data.title ?? "";
      const author = data.author ?? "";
      const content = data.content ?? [];
      for (const vol of content) {
        const sections = vol.content ?? [];
        for (const item of sections) {
          const chapter = item.chapter ?? "";
          const paragraphs = item.paragraphs ?? [];
          if (!chapter || !paragraphs.length) continue;
          const title = `${bookTitle}·${chapter}`;
          out.push(
            normalize(
              toSimplifiedRaw({
                title,
                paragraphs,
                author,
                dynasty,
                tags: ["蒙学"],
              }),
              seenIds
            )
          );
        }
      }
    } catch {
      //
    }
  }
  return out;
}

/** 解析「（唐）孟浩然」→ { dynasty: "唐", author: "孟浩然" } */
function parseAuthorBracket(s: string): { dynasty: string; author: string } {
  const m = s.trim().match(/^[（(]([^）)]+)[）)]\s*(.+)$/);
  if (m) return { dynasty: m[1]!, author: m[2]!.trim() };
  return { dynasty: "唐", author: s.trim() };
}

/** 解析「先秦：左丘明 」→ { dynasty: "先秦", author: "左丘明" } */
function parseAuthorColon(s: string): { dynasty: string; author: string } {
  const idx = s.indexOf("：");
  const idx2 = s.indexOf(":");
  const i = idx >= 0 ? idx : idx2;
  if (i >= 0) {
    const dynasty = s.slice(0, i).trim();
    const author = s.slice(i + (idx >= 0 ? 2 : 1)).trim();
    return { dynasty: dynasty || "先秦", author: author || s };
  }
  return { dynasty: "蒙学", author: s.trim() };
}

/** 蒙学 Type D：诗集（qianjiashi, tangshisanbaishou） */
function loadMengxueContentPoems(seenIds: Set<string>): NormalizedPoem[] {
  const out: NormalizedPoem[] = [];
  const qianjiashiPath = path.join(MENGXUE_DIR, "qianjiashi.json");
  if (fs.existsSync(qianjiashiPath)) {
    try {
      const data = readJson<{
        content?: Array<{
          type?: string;
          content?: Array<{
            chapter?: string;
            author?: string;
            paragraphs?: string[];
          }>;
        }>;
      }>(qianjiashiPath);
      const topContent = data.content ?? [];
      for (const typeBlock of topContent) {
        const items = typeBlock.content ?? [];
        const typeTag = typeBlock.type ? toSimplified(typeBlock.type) : "";
        const tags = ["蒙学", "千家诗", ...(typeTag ? [typeTag] : [])];
        for (const item of items) {
          const title = item.chapter ?? "";
          const paragraphs = item.paragraphs ?? [];
          if (!title || !paragraphs.length) continue;
          const { dynasty, author } = parseAuthorBracket(item.author ?? "");
          out.push(
            normalize(
              toSimplifiedRaw({
                title,
                paragraphs,
                author,
                dynasty,
                tags,
              }),
              seenIds
            )
          );
        }
      }
    } catch {
      //
    }
  }
  const tangPath = path.join(MENGXUE_DIR, "tangshisanbaishou.json");
  if (fs.existsSync(tangPath)) {
    try {
      const data = readJson<{
        content?: Array<{
          type?: string;
          content?: Array<{
            chapter?: string;
            subchapter?: string | null;
            author?: string;
            paragraphs?: string[];
          }>;
        }>;
      }>(tangPath);
      const topContent = data.content ?? [];
      for (const typeBlock of topContent) {
        const items = typeBlock.content ?? [];
        const typeTag = typeBlock.type ? toSimplified(typeBlock.type) : "";
        const tags = ["蒙学", "唐诗三百首", ...(typeTag ? [typeTag] : [])];
        for (const item of items) {
          let title = item.chapter ?? "";
          if (item.subchapter) title = `${title}·${item.subchapter}`;
          const paragraphs = item.paragraphs ?? [];
          if (!title || !paragraphs.length) continue;
          const author = (item.author ?? "").trim();
          out.push(
            normalize(
              toSimplifiedRaw({
                title,
                paragraphs,
                author,
                dynasty: "唐",
                tags,
              }),
              seenIds
            )
          );
        }
      }
    } catch {
      //
    }
  }
  return out;
}

/** 蒙学 Type E：古文观止 */
function loadMengxueGuwenguanzhi(seenIds: Set<string>): NormalizedPoem[] {
  const filePath = path.join(MENGXUE_DIR, "guwenguanzhi.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = readJson<{
      content?: Array<{
        title?: string;
        content?: Array<{
          chapter?: string;
          author?: string;
          source?: string;
          paragraphs?: string[];
        }>;
      }>;
    }>(filePath);
    const out: NormalizedPoem[] = [];
    const topContent = data.content ?? [];
    for (const vol of topContent) {
      const items = vol.content ?? [];
      const volTitleTag = vol.title ? toSimplified(vol.title) : "";
      const tags = ["蒙学", "古文观止", ...(volTitleTag ? [volTitleTag] : [])];
      for (const item of items) {
        const title = item.chapter ?? "";
        const paragraphs = item.paragraphs ?? [];
        if (!title || !paragraphs.length) continue;
        const { dynasty, author } = parseAuthorColon(item.author ?? "");
        out.push(
          normalize(
            toSimplifiedRaw({
              title,
              paragraphs,
              author,
              dynasty,
              tags,
            }),
            seenIds
          )
        );
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** 蒙学 Type F：文字蒙求（content 为 { title, paragraphs }[]） */
function loadMengxueWenzimengqiu(seenIds: Set<string>): NormalizedPoem[] {
  const filePath = path.join(MENGXUE_DIR, "wenzimengqiu.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = readJson<{
      title?: string;
      author?: string;
      content?: Array<{ title?: string; paragraphs?: string[] }>;
    }>(filePath);
    const bookTitle = data.title ?? "文字蒙求";
    const authorRaw = data.author ?? "";
    const author = authorRaw.includes("王筠") ? "王筠" : authorRaw.slice(0, 6) || "佚名";
    const content = data.content ?? [];
    const out: NormalizedPoem[] = [];
    for (const item of content) {
      const volTitle = item.title ?? "";
      const paragraphs = item.paragraphs ?? [];
      if (!volTitle || !paragraphs.length) continue;
      const title = `${bookTitle}·${volTitle}`;
      out.push(
        normalize(
          toSimplifiedRaw({
            title,
            paragraphs,
            author,
            dynasty: "清",
            tags: ["蒙学"],
          }),
          seenIds
        )
      );
    }
    return out;
  } catch {
    return [];
  }
}

/** 正文指纹：用于判定同作者同标题下正文是否一致（去重键的一部分） */
export function contentFingerprint(p: NormalizedPoem): string {
  return p.paragraphs.map((s) => s.trim()).join("");
}

/**
 * 按「作者 + 标题 + 正文指纹」去重，只保留一条；同键时保留 paragraphs 条数更多的（格式更清晰）。
 * 保留条的 id / titleSlug 规范为无后缀形式。
 */
export function deduplicateByAuthorTitleContent(poems: NormalizedPoem[]): NormalizedPoem[] {
  const keyToPoem = new Map<string, NormalizedPoem>();
  for (const p of poems) {
    const key = p.authorSlug + "\0" + toSlug(p.title) + "\0" + contentFingerprint(p);
    const existing = keyToPoem.get(key);
    if (!existing || p.paragraphs.length > existing.paragraphs.length) {
      keyToPoem.set(key, p);
    }
  }
  const result: NormalizedPoem[] = [];
  for (const p of keyToPoem.values()) {
    let canonicalTitleSlug = toSlug(p.title);
    if (canonicalTitleSlug.length > MAX_TITLE_SLUG_LENGTH) {
      canonicalTitleSlug = canonicalTitleSlug.slice(0, 72) + "-" + shortHash(p.title + p.author);
    }
    result.push({
      ...p,
      id: p.authorSlug + "-" + canonicalTitleSlug,
      titleSlug: canonicalTitleSlug,
    });
  }
  return result;
}

/** 将 NormalizedPoem 转为 .md 内容（Frontmatter + ## 正文 / ## 拼音 / ## 注释 / ## 译文 / ## 赏析） */
function toMarkdown(p: NormalizedPoem): string {
  const frontmatter: Record<string, unknown> = {
    id: p.id,
    title: p.title,
    titlePinyin: p.titlePinyin ?? "",
    titleSlug: p.titleSlug,
    author: p.author,
    authorPinyin: p.authorPinyin ?? "",
    authorSlug: p.authorSlug,
    dynasty: p.dynasty,
    dynastyPinyin: p.dynastyPinyin ?? "",
    dynastySlug: p.dynastySlug,
    tags: p.tags,
  };
  if (p.rhythmic) frontmatter.rhythmic = p.rhythmic;
  const bodyLines: string[] = [];
  bodyLines.push("## 正文");
  for (const line of p.paragraphs) bodyLines.push(`- ${line}`);
  bodyLines.push("");
  bodyLines.push("## 拼音");
  const pinyinLines = p.paragraphsPinyin ?? p.paragraphs.map((s) => toPinyinToneNum(s));
  for (const line of pinyinLines) bodyLines.push(`- ${line}`);
  bodyLines.push("");
  bodyLines.push("## 注释");
  bodyLines.push("");
  bodyLines.push("## 译文");
  bodyLines.push("");
  bodyLines.push("## 赏析");
  const body = bodyLines.join("\n");
  // gray-matter 运行时支持 lineWidth，类型定义未包含
return matter.stringify(body, frontmatter, { lineWidth: -1 } as Record<string, unknown>);
}

function main(): void {
  const seenIds = new Set<string>();
  const all: NormalizedPoem[] = [];

  if (MENGXUE_ONLY) {
    for (const p of loadSongci(seenIds)) all.push(p);
    for (const p of loadMengxueFlat(seenIds)) all.push(p);
    for (const p of loadMengxueContentChapters(seenIds)) all.push(p);
    for (const p of loadMengxueContentNested(seenIds)) all.push(p);
    for (const p of loadMengxueContentPoems(seenIds)) all.push(p);
    for (const p of loadMengxueGuwenguanzhi(seenIds)) all.push(p);
    for (const p of loadMengxueWenzimengqiu(seenIds)) all.push(p);
    if (all.length > 0) console.log(`gen_markdown: MENGXUE_ONLY, loaded ${all.length} mengxue poems`);
  } else {
    for (const p of loadSongci(seenIds)) all.push(p);
    for (const p of loadQuantangshi(seenIds)) all.push(p);
    for (const p of loadChuci(seenIds)) all.push(p);
    for (const p of loadLunyu(seenIds)) all.push(p);
    for (const p of loadYuanqu(seenIds)) all.push(p);
    for (const p of loadCaocao(seenIds)) all.push(p);
    for (const p of loadNalanxingde(seenIds)) all.push(p);
    for (const p of loadShuimotangshi(seenIds)) all.push(p);
    for (const p of loadYudingQuantangshi(seenIds)) all.push(p);
    for (const p of loadWudaishici(seenIds)) all.push(p);
    for (const p of loadShijing(seenIds)) all.push(p);
    for (const p of loadSishuwujing(seenIds)) all.push(p);
    for (const p of loadYoumengying(seenIds)) all.push(p);
    for (const p of loadMengxueFlat(seenIds)) all.push(p);
    for (const p of loadMengxueContentChapters(seenIds)) all.push(p);
    for (const p of loadMengxueContentNested(seenIds)) all.push(p);
    for (const p of loadMengxueContentPoems(seenIds)) all.push(p);
    for (const p of loadMengxueGuwenguanzhi(seenIds)) all.push(p);
    for (const p of loadMengxueWenzimengqiu(seenIds)) all.push(p);
  }

  const deduped = deduplicateByAuthorTitleContent(all);
  if (all.length !== deduped.length) {
    console.log(`gen_markdown: deduped ${all.length} -> ${deduped.length} poems`);
  }
  const poemsSubdir = path.join(POEMS_DIR, "poems");
  ensureDir(poemsSubdir);
  let written = 0;
  for (const p of deduped) {
    const authorDir = path.join(poemsSubdir, p.authorSlug);
    ensureDir(authorDir);
    const mdPath = path.join(authorDir, `${p.titleSlug}.md`);
    fs.writeFileSync(mdPath, toMarkdown(p), "utf-8");
    written += 1;
  }
  console.log(`gen_markdown: wrote ${written} poems to ${poemsSubdir}`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
