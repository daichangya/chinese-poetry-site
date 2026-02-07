/**
 * 数据库抽象类型：统一 SQLite / PostgreSQL 的访问接口。
 * 业务层使用 ? 占位符；PG 适配器内部转换为 $1, $2, ...
 * @author poetry
 */

export type Dialect = "sqlite" | "postgres";

export interface DbClient {
  /** 单行查询，无结果返回 undefined */
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  /** 多行查询 */
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** 执行 INSERT/UPDATE/DELETE，返回 changes/lastID 等（实现可简化） */
  run(sql: string, params?: unknown[]): Promise<{ changes?: number; lastID?: number }>;
  /** 执行多条 DDL（如 CREATE TABLE），无返回值；PG 可能逐条执行 */
  exec(sql: string): Promise<void>;
  /** 当前 dialect，用于 seed 等需要区分语法的场景 */
  readonly dialect: Dialect;
}
