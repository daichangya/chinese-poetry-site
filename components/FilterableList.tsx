"use client";

/**
 * 通用可过滤列表：接收服务端预取的数据，前端实时过滤。
 * 用于朝代、标签、词牌等数据量小的列表页，取代 force-dynamic 服务端过滤。
 * @author poetry
 */

import Link from "next/link";
import { useState, useMemo } from "react";

interface ListItem {
  slug: string;
  name: string;
  poem_count: number;
}

interface FilterableListProps {
  items: ListItem[];
  /** 链接前缀，name 会 encodeURIComponent 后拼接 */
  hrefPrefix: string;
  placeholder?: string;
  emptyText?: string;
}

export default function FilterableList({
  items,
  hrefPrefix,
  placeholder = "搜索…",
  emptyText = "暂无数据",
}: FilterableListProps) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q)
    );
  }, [items, filter]);

  return (
    <>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={placeholder}
        className="w-full max-w-xs rounded-md border border-secondary/30 bg-background px-3 py-2 text-sm text-text placeholder:text-text/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {filtered.length === 0 ? (
        <p className="text-text/70">{emptyText}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.slug}>
              <Link
                href={`${hrefPrefix}${encodeURIComponent(item.name)}`}
                className="cursor-pointer flex items-baseline justify-between gap-2 rounded-lg border border-secondary/20 p-4 transition-colors duration-200 hover:border-primary hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <span className="min-w-0 truncate font-semibold text-text">
                  {item.name}
                </span>
                <span className="shrink-0 text-sm text-text/60">
                  {item.poem_count} 首
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
