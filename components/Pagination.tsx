/**
 * 通用分页：上一页 / 第 x / y 页 / 下一页，键盘可聚焦。
 * @author poetry
 */

import Link from "next/link";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  /** 不含 page 的查询串，如 "" 或 "?dynasty=唐&tag=宋词" */
  queryString?: string;
}

function buildPageHref(basePath: string, queryString: string, page: number): string {
  if (page <= 1) {
    return queryString ? `${basePath}${queryString}` : basePath;
  }
  return queryString
    ? `${basePath}${queryString}&page=${page}`
    : `${basePath}?page=${page}`;
}

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
  queryString = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevHref = buildPageHref(basePath, queryString, currentPage - 1);
  const nextHref = buildPageHref(basePath, queryString, currentPage + 1);

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-2"
      aria-label="分页"
    >
      {currentPage > 1 && (
        <Link
          href={prevHref}
          className="cursor-pointer rounded border border-primary px-3 py-1 text-primary transition-colors duration-200 hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="上一页"
        >
          上一页
        </Link>
      )}
      <span className="px-3 text-text/70" aria-current="page">
        第 {currentPage} / {totalPages} 页
      </span>
      {currentPage < totalPages && (
        <Link
          href={nextHref}
          className="cursor-pointer rounded border border-primary px-3 py-1 text-primary transition-colors duration-200 hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="下一页"
        >
          下一页
        </Link>
      )}
    </nav>
  );
}
