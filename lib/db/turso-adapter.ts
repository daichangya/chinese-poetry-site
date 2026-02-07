/**
 * Turso (LibSQL) 适配器：使用 @libsql/client，实现 DbClient；语法与 SQLite 兼容，dialect 为 sqlite。
 * 用于 Vercel 等 serverless 环境连接 Turso Cloud。
 * @author poetry
 */

import type { Client, InArgs } from "@libsql/client";
import type { DbClient } from "./types";

/** 将 LibSQL Row（列名/索引）转为列名 → 值的对象 */
function rowToObject(columns: string[], row: Record<number, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) out[columns[i]] = row[i];
  return out;
}

export function createTursoClient(client: Client): DbClient {
  return {
    dialect: "sqlite",

    async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      const result = await client.execute(sql, params as InArgs);
      const row = result.rows[0] as Record<number, unknown> | undefined;
      if (!row) return undefined;
      return rowToObject(result.columns, row) as T;
    },

    async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
      const result = await client.execute(sql, params as InArgs);
      return result.rows.map((row) => rowToObject(result.columns, row as Record<number, unknown>) as T);
    },

    async run(sql: string, params: unknown[] = []): Promise<{ changes?: number; lastID?: number }> {
      const result = await client.execute(sql, params as InArgs);
      const lastID = result.lastInsertRowid != null ? Number(result.lastInsertRowid) : undefined;
      return { changes: result.rowsAffected, lastID };
    },

    async exec(sql: string): Promise<void> {
      await client.executeMultiple(sql);
    },
  };
}
