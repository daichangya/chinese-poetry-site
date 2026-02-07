/**
 * 诗词相关类型，供 gen_markdown 与 load_data 共用。
 * @author poetry
 */

/** 归一后单首诗（gen_markdown 输出 / load_data 解析前） */
export interface NormalizedPoem {
  title: string;
  paragraphs: string[];
  author: string;
  dynasty: string;
  tags: string[];
  titleSlug: string;
  authorSlug: string;
  dynastySlug: string;
  id: string;
  /** 可选：标题拼音带声调数字 */
  titlePinyin?: string;
  /** 可选：作者拼音带声调数字 */
  authorPinyin?: string;
  /** 可选：朝代拼音带声调数字 */
  dynastyPinyin?: string;
  /** 可选：每句正文对应拼音（与 paragraphs 一一对应） */
  paragraphsPinyin?: string[];
  /** 可选：词牌名（宋词、花间集等） */
  rhythmic?: string;
}

/** load_data 解析后的单首诗（详情页与构建用） */
export interface Poem extends NormalizedPoem {
  /** 诗的唯一标识，用于 URL 与 DB 主键；优先取 id（authorSlug-titleSlug），无则 titleSlug */
  slug: string;
  /** 译文（## 译文 区块） */
  translation?: string;
  /** 赏析（## 赏析 区块） */
  appreciation?: string;
  /** 注释（## 注释 区块） */
  annotation?: string;
  /** 列表用摘要（首句截断），列表查询时由 DB 直接返回 */
  excerpt?: string;
}

/** 搜索索引单条（data/poems.json，前端搜索用） */
export interface PoemSearchItem {
  slug: string;
  title: string;
  author_name: string;
  dynasty_name: string;
  title_pinyin?: string;
  tags?: string[];
}

/** 作者（由 poems 推导；description 来自 poems/<slug>/bio.md） */
export interface Author {
  slug: string;
  name: string;
  poem_count: number;
  /** 作者简介，来自 bio.md 正文 */
  description?: string;
}

/** 朝代（由 poems 推导） */
export interface Dynasty {
  slug: string;
  name: string;
  poem_count: number;
}

/** 标签（由 poems 的 tags 聚合） */
export interface Tag {
  slug: string;
  name: string;
  poem_count: number;
}

/** loadAll 返回值 */
export interface LoadDataResult {
  poems: Poem[];
  authors: Author[];
  dynasties: Dynasty[];
  tags: Tag[];
}
