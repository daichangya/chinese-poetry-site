/**
 * DB 模块入口：client、schema。
 * @author poetry
 */

export {
  getDb,
  getIndexDb,
  getDatabasePath,
  closeDb,
} from "./client";
export { createTables, createTablesSync, createIndexTables, createContentTables } from "./schema";
export type { DbClient, Dialect } from "./types";
export {
  getPoemBySlug,
  getAuthors,
  getAuthorBySlug,
  getDynasties,
  getTags,
  getRhythmics,
  getPoemsByRhythmic,
  countPoemsByRhythmic,
  getPoemsAll,
  getPoemsByDynasty,
  getPoemsByTag,
  countPoemsByTag,
  searchPoems,
  countSearchPoems,
  countPoems,
  countAuthors,
  countDynasties,
  getRandomPoemSlugs,
  getPoemsByAuthorSlug,
  getPoemSlugsForSSG,
  getPoemSlugsForSSGByPopularTags,
  getAuthorSlugsForSSG,
  getPoemSlugsForSitemap,
} from "./queries";

