/**
 * Schema：单库，含 poems、authors、dynasties、tags、poem_tags、poem_content、schema_version。
 * 支持 SQLite 与 PostgreSQL，通过 DbClient.dialect 分支 DDL。
 * 拼音不再落库，详情请求时实时计算。
 * @author poetry
 */

import type { Database as SqliteDb } from "better-sqlite3";
import type { DbClient } from "./types";

const SCHEMA_VERSION_TABLE = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  update_time TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

/** 轻表：列表/首页/SSG 只查此表 */
const POEMS_TABLE = `
CREATE TABLE IF NOT EXISTS poems (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author_slug TEXT NOT NULL,
  dynasty_slug TEXT NOT NULL,
  rhythmic TEXT DEFAULT NULL,
  excerpt TEXT DEFAULT NULL
);
`;

/** 重表：详情页按 slug 查 */
const POEM_CONTENT_TABLE = `
CREATE TABLE IF NOT EXISTS poem_content (
  slug TEXT PRIMARY KEY,
  paragraphs TEXT NOT NULL,
  translation TEXT DEFAULT NULL,
  appreciation TEXT DEFAULT NULL,
  annotation TEXT DEFAULT NULL
);
`;

/** 诗词-标签多对多 */
const POEM_TAGS_TABLE = `
CREATE TABLE IF NOT EXISTS poem_tags (
  poem_slug TEXT NOT NULL,
  tag_slug TEXT NOT NULL,
  PRIMARY KEY (poem_slug, tag_slug),
  FOREIGN KEY (poem_slug) REFERENCES poems(slug) ON DELETE CASCADE,
  FOREIGN KEY (tag_slug) REFERENCES tags(slug) ON DELETE CASCADE
);
`;

const AUTHORS_TABLE = `
CREATE TABLE IF NOT EXISTS authors (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  poem_count INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT NULL
);
`;

const DYNASTIES_TABLE = `
CREATE TABLE IF NOT EXISTS dynasties (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  poem_count INTEGER NOT NULL DEFAULT 0
);
`;

const TAGS_TABLE = `
CREATE TABLE IF NOT EXISTS tags (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  poem_count INTEGER NOT NULL DEFAULT 0
);
`;

/** PostgreSQL 等价 DDL（无 INSERT OR REPLACE，schema_version 用 ON CONFLICT） */
const PG_SCHEMA_VERSION_TABLE = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  update_time TEXT DEFAULT (current_timestamp::text)
);
`;
const PG_INSERT_SCHEMA_VERSION = `
INSERT INTO schema_version (version) VALUES (1)
ON CONFLICT (version) DO UPDATE SET update_time = current_timestamp::text
`;

/** 单库：创建所有表（异步，支持 SQLite / PostgreSQL） */
export async function createTables(client: DbClient): Promise<void> {
  if (client.dialect === "postgres") {
    await client.exec(PG_SCHEMA_VERSION_TABLE);
    const row = await client.get<{ version: number }>("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1");
    const currentVersion = row?.version ?? 0;
    if (currentVersion < 1) {
      await client.exec(POEMS_TABLE);
      await client.exec(AUTHORS_TABLE);
      await client.exec(DYNASTIES_TABLE);
      await client.exec(TAGS_TABLE);
      await client.exec(POEM_TAGS_TABLE);
      await client.exec(POEM_CONTENT_TABLE);
      await client.exec("CREATE INDEX IF NOT EXISTS idx_poems_dynasty_slug ON poems(dynasty_slug)");
      await client.exec("CREATE INDEX IF NOT EXISTS idx_poems_author_slug ON poems(author_slug)");
      await client.exec("CREATE INDEX IF NOT EXISTS idx_poem_tags_tag_slug ON poem_tags(tag_slug)");
      await client.exec(PG_INSERT_SCHEMA_VERSION);
    }
    return;
  }

  await client.exec(SCHEMA_VERSION_TABLE);
  const row = await client.get<{ version: number }>("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1");
  const currentVersion = row?.version ?? 0;
  if (currentVersion < 1) {
    await client.exec(POEMS_TABLE);
    await client.exec(AUTHORS_TABLE);
    await client.exec(DYNASTIES_TABLE);
    await client.exec(TAGS_TABLE);
    await client.exec(POEM_TAGS_TABLE);
    await client.exec(POEM_CONTENT_TABLE);
    await client.exec("CREATE INDEX IF NOT EXISTS idx_poems_dynasty_slug ON poems(dynasty_slug)");
    await client.exec("CREATE INDEX IF NOT EXISTS idx_poems_author_slug ON poems(author_slug)");
    await client.exec("CREATE INDEX IF NOT EXISTS idx_poem_tags_tag_slug ON poem_tags(tag_slug)");
    await client.exec("INSERT OR REPLACE INTO schema_version (version) VALUES (1)");
  }
}

/** 同步版：仅用于 SQLite 原生连接（如单测中临时使用） */
export function createTablesSync(db: SqliteDb): void {
  db.exec(SCHEMA_VERSION_TABLE);
  const row = db.prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1").get() as { version: number } | undefined;
  const currentVersion = row?.version ?? 0;
  if (currentVersion < 1) {
    db.exec(POEMS_TABLE);
    db.exec(AUTHORS_TABLE);
    db.exec(DYNASTIES_TABLE);
    db.exec(TAGS_TABLE);
    db.exec(POEM_TAGS_TABLE);
    db.exec(POEM_CONTENT_TABLE);
    db.exec("CREATE INDEX IF NOT EXISTS idx_poems_dynasty_slug ON poems(dynasty_slug)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_poems_author_slug ON poems(author_slug)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_poem_tags_tag_slug ON poem_tags(tag_slug)");
    db.exec("INSERT OR REPLACE INTO schema_version (version) VALUES (1)");
  }
}

/** @deprecated 仅内部兼容，请使用 createTables(client) */
export function createIndexTables(db: SqliteDb): void {
  db.exec(SCHEMA_VERSION_TABLE);
  const row = db.prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1").get() as { version: number } | undefined;
  const currentVersion = row?.version ?? 0;
  if (currentVersion < 1) {
    db.exec(POEMS_TABLE);
    db.exec(AUTHORS_TABLE);
    db.exec(DYNASTIES_TABLE);
    db.exec(TAGS_TABLE);
    db.exec(POEM_TAGS_TABLE);
    db.exec("CREATE INDEX IF NOT EXISTS idx_poems_dynasty_slug ON poems(dynasty_slug);");
    db.exec("CREATE INDEX IF NOT EXISTS idx_poems_author_slug ON poems(author_slug);");
    db.exec("CREATE INDEX IF NOT EXISTS idx_poem_tags_tag_slug ON poem_tags(tag_slug);");
    db.exec("INSERT OR REPLACE INTO schema_version (version) VALUES (1)");
  }
}

/** @deprecated 仅内部兼容，请使用 createTables */
export function createContentTables(db: SqliteDb): void {
  db.exec(POEM_CONTENT_TABLE);
}
