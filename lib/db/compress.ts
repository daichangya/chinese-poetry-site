/**
 * 应用层文本压缩：超过阈值时 gzip+base64 存储，减小 SQLite 体积。读时自动解压。
 * 仅用于本地 SQLite 减体积；与后端类型无关，Turso/PostgreSQL 同格式兼容。
 * @author poetry
 */

import { gzipSync, gunzipSync } from "node:zlib";

const PREFIX = "gz:";
const THRESHOLD_BYTES = 200;

function toUtf8Bytes(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

/**
 * 若文本超过阈值则压缩为 "gz:" + base64(gzip(utf8))，否则返回原文。
 */
export function compressText(s: string | null | undefined): string | null {
  if (s == null || s === "") return s === "" ? "" : null;
  if (toUtf8Bytes(s) <= THRESHOLD_BYTES) return s;
  const buf = Buffer.from(s, "utf8");
  const compressed = gzipSync(buf);
  return PREFIX + compressed.toString("base64");
}

/**
 * 若为 "gz:" 前缀则 base64 解码后 gunzip，否则返回原值。
 */
export function decompressText(s: string | null | undefined): string | null {
  if (s == null) return null;
  if (s === "") return "";
  if (!s.startsWith(PREFIX)) return s;
  try {
    const b64 = s.slice(PREFIX.length);
    const compressed = Buffer.from(b64, "base64");
    return gunzipSync(compressed).toString("utf8");
  } catch {
    return s;
  }
}

const GZIP_MAGIC_FIRST = 0x1f;
const GZIP_MAGIC_SECOND = 0x8b;

/**
 * 供 BLOB 列写入：超阈值返回 gzip 字节，否则返回 UTF-8 原文；null/空返回 null。
 */
export function compressToBlob(s: string | null | undefined): Buffer | null {
  if (s == null) return null;
  if (s === "") return null;
  const buf = Buffer.from(s, "utf8");
  if (buf.length <= THRESHOLD_BYTES) return buf;
  return gzipSync(buf);
}

/**
 * 从 BLOB 或旧版 base64 TEXT 读出字符串。BLOB：gzip 魔数则 gunzip，否则 UTF-8；string 则走 decompressText（兼容旧库）。
 * 接受 Buffer 或 Uint8Array（如 LibSQL 返回）。
 */
export function decompressFromBlob(data: Buffer | Uint8Array | string | null | undefined): string | null {
  if (data == null) return null;
  if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (buf.length === 0) return "";
    if (buf.length >= 2 && buf[0] === GZIP_MAGIC_FIRST && buf[1] === GZIP_MAGIC_SECOND) {
      return gunzipSync(buf).toString("utf8");
    }
    return buf.toString("utf8");
  }
  if (typeof data === "string") return decompressText(data);
  return null;
}
