/**
 * SQLite 适配器：包装 better-sqlite3，实现 DbClient（Promise 包装同步 API）。
 * @author poetry
 */

import type { Database as SqliteDb } from "better-sqlite3";
import type { DbClient } from "./types";

export function createSqliteClient(native: SqliteDb): DbClient {
  return {
    dialect: "sqlite",

    async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      const row = native.prepare(sql).get(...params) as T | undefined;
      return row;
    },

    async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
      const rows = native.prepare(sql).all(...params) as T[];
      return rows;
    },

    async run(sql: string, params: unknown[] = []): Promise<{ changes?: number; lastID?: number }> {
      const result = native.prepare(sql).run(...params);
      return { changes: result.changes, lastID: result.lastInsertRowid as number };
    },

    async exec(sql: string): Promise<void> {
      native.exec(sql);
    },
  };
}
