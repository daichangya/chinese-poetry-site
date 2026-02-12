/**
 * 侧边栏静态数据：服务端获取朝代、热门诗人、标签、词牌。
 * 数据在部署后基本固定，供 SidebarLeftServer 服务端组件使用，
 * 结果内嵌在 HTML 中，消除客户端 API roundtrip。
 * @author poetry
 */

import "server-only";
import { getDynasties, getAuthors, getTags, getRhythmics } from "@/lib/db";

export interface SidebarData {
  dynasties: Array<{ slug: string; name: string; poem_count: number }>;
  authors: Array<{ slug: string; name: string; poem_count: number }>;
  tags: Array<{ slug: string; name: string; poem_count: number }>;
  rhythmics: Array<{ slug: string; name: string; poem_count: number }>;
}

/** 侧边栏显示的诗人数量上限 */
const SIDEBAR_AUTHOR_LIMIT = 500;

/** 内存缓存，同一进程内只查一次 DB */
let cachedData: SidebarData | null = null;

/**
 * 获取侧边栏数据（服务端）。结果缓存在进程内存中，
 * 对 serverless 每次冷启动查一次 DB，热调用直接返回缓存。
 */
export async function getSidebarData(): Promise<SidebarData> {
  if (cachedData) return cachedData;

  const [dynasties, authors, tags, rhythmics] = await Promise.all([
    getDynasties(),
    getAuthors(0, SIDEBAR_AUTHOR_LIMIT),
    getTags(),
    getRhythmics(),
  ]);

  cachedData = { dynasties, authors, tags, rhythmics };
  return cachedData;
}
