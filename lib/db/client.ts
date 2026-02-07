/**
 * 数据库连接封装：支持 SQLite 单库、PostgreSQL 与 Turso，通过 DATABASE_TYPE 与环境变量切换。
 * SQLite 时使用 poetry_index.db；默认目录为项目根下 data/，Vercel 上只读打开。
 * Turso 用于 Vercel 等 serverless 环境，无需本地文件。
 * @author poetry
 */

import Database from "better-sqlite3";
import { createClient as createLibsqlClient } from "@libsql/client";
import { Pool } from "pg";
import * as path from "node:path";
import * as fs from "node:fs";
import type { DbClient } from "./types";
import { createSqliteClient } from "./sqlite-adapter";
import { createPgClient } from "./pg-adapter";
import { createTursoClient } from "./turso-adapter";

/** 从 cwd 向上查找包含 package.json 的目录；找不到则退回 process.cwd() */
function getProjectRoot(): string {
  let dir = process.cwd();
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/** 数据目录（仅 SQLite）：优先 DATABASE_DIR；否则 data 或 public/data（兼容旧路径） */
function getDataDir(): string {
  const envDir = process.env.DATABASE_DIR;
  if (envDir && envDir.trim()) return path.resolve(envDir.trim());
  const dataDir = path.join(getProjectRoot(), "data");
  const publicData = path.join(getProjectRoot(), "public", "data");
  if (fs.existsSync(path.join(dataDir, "poetry_index.db"))) return dataDir;
  if (fs.existsSync(path.join(publicData, "poetry_index.db"))) return publicData;
  if (fs.existsSync(dataDir)) return dataDir;
  if (fs.existsSync(publicData)) return publicData;
  return dataDir;
}

/** SQLite 单库路径（PostgreSQL 时不使用） */
export function getDatabasePath(): string {
  return path.join(getDataDir(), "poetry_index.db");
}

let cachedClient: Promise<DbClient> | null = null;
let sqliteNative: Database.Database | null = null;
let pgPool: Pool | null = null;
/** Turso/LibSQL 客户端，供 closeDb 释放 */
let tursoLibsqlClient: ReturnType<typeof createLibsqlClient> | null = null;

/** Vercel 部署时设为 "1"，SQLite 运行时文件系统只读 */
const isVercel = process.env.VERCEL === "1";
const LOG_PREFIX = "[db]";

function dirOrFileExists(filePath: string): boolean {
  const dir = path.dirname(filePath);
  return fs.existsSync(dir) || fs.existsSync(filePath);
}

function openSqlite(dbPath: string, readonly: boolean): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    if (isVercel) {
      throw new Error(`Database directory does not exist: ${dir}. Set DATABASE_PATH or include DB in bundle.`);
    }
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath, { readonly });
  if (!readonly) {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA page_size = 4096;");
  }
  return db;
}

function createClient(): Promise<DbClient> {
  const type = (process.env.DATABASE_TYPE ?? "sqlite").toLowerCase();
  const url = process.env.DATABASE_URL?.trim();
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const tursoToken = process.env.TURSO_AUTH_TOKEN ?? "";

  if (type === "postgres" && url) {
    const pool = new Pool({ connectionString: url });
    pgPool = pool;
    if (LOG_PREFIX) console.log(LOG_PREFIX, "using PostgreSQL");
    return Promise.resolve(createPgClient(pool));
  }

  if (type === "turso" && tursoUrl) {
    const client = createLibsqlClient({ url: tursoUrl, authToken: tursoToken });
    tursoLibsqlClient = client;
    if (LOG_PREFIX) console.log(LOG_PREFIX, "using Turso");
    return Promise.resolve(createTursoClient(client));
  }

  const dbPath = getDatabasePath();
  if (isVercel && !dirOrFileExists(dbPath)) {
    console.error(LOG_PREFIX, "database missing:", "path=" + dbPath);
    throw new Error(`Database not found at ${dbPath}. Include poetry_index.db in serverless bundle or set DATABASE_PATH.`);
  }
  const readonly = isVercel;
  const native = openSqlite(dbPath, readonly);
  sqliteNative = native;
  if (isVercel) console.log(LOG_PREFIX, "database opened:", dbPath);
  return Promise.resolve(createSqliteClient(native));
}

/**
 * 获取数据库连接（单例，异步）。所有表均在此连接；类型由 DATABASE_TYPE / DATABASE_URL 决定。
 */
export async function getDb(): Promise<DbClient> {
  if (cachedClient) return cachedClient;
  cachedClient = createClient();
  return cachedClient;
}

/** @deprecated 兼容旧调用，与 getDb() 等价 */
export async function getIndexDb(): Promise<DbClient> {
  return getDb();
}

/**
 * 关闭连接（用于脚本结束时释放）。
 */
export async function closeDb(): Promise<void> {
  if (sqliteNative) {
    sqliteNative.close();
    sqliteNative = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  if (tursoLibsqlClient) {
    tursoLibsqlClient.close();
    tursoLibsqlClient = null;
  }
  cachedClient = null;
}
