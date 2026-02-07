/**
 * PostgreSQL 适配器：使用 pg Pool，实现 DbClient；将 ? 占位符转换为 $1, $2, ...
 * @author poetry
 */

import { Pool } from "pg";
import type { DbClient } from "./types";

function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export function createPgClient(pool: Pool): DbClient {
  return {
    dialect: "postgres",

    async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      const pgSql = toPgPlaceholders(sql);
      const res = await pool.query(pgSql, params);
      const row = res.rows[0] as T | undefined;
      return row;
    },

    async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
      const pgSql = toPgPlaceholders(sql);
      const res = await pool.query(pgSql, params);
      return res.rows as T[];
    },

    async run(sql: string, params: unknown[] = []): Promise<{ changes?: number; lastID?: number }> {
      const pgSql = toPgPlaceholders(sql);
      const res = await pool.query(pgSql, params);
      return { changes: res.rowCount ?? 0 };
    },

    async exec(sql: string): Promise<void> {
      const pgSql = toPgPlaceholders(sql);
      await pool.query(pgSql);
    },
  };
}
