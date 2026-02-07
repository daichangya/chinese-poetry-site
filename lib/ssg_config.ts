/**
 * 分层 SSG 用「热门选集」tag 配置：curated 列表，供 getPoemSlugsForSSGByPopularTags 使用。
 * @author poetry
 */

/** 默认参与 SSG 的热门选集/体裁 tag slug，合并去重后尽量接近 5000 首 */
export const SSG_POPULAR_TAG_SLUGS: string[] = [
  "tang-shi-san-bai-shou",
  "song-ci-san-bai-shou",
  "qian-jia-shi",
  "meng-xue",
  "gu-wen-guan-zhi",
  "shi-jing",
  "lun-yu",
  "si-shu-wu-jing",
  "you-meng-ying",
  "hua-jian-ji",
  "shui-mo-tang-shi",
  "yue-fu",
  "wu-yan-jue-ju",
  "qi-yan-jue-ju",
  "wu-yan-lu-shi",
  "qi-yan-lu-shi",
  "shi-ci",
];

/** 单 tag 最多取多少首参与 SSG 合并（避免单 tag 过大） */
export const SSG_MAX_SLUGS_PER_TAG = 2000;

/** 参与 SSG 的 tag slug 列表：优先用 BUILD_SSG_TAG_SLUGS 环境变量，否则用默认 curated 列表 */
export function getSSGTagSlugs(): string[] {
  const raw = (process.env.BUILD_SSG_TAG_SLUGS ?? "").trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [...SSG_POPULAR_TAG_SLUGS];
}
