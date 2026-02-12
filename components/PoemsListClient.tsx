"use client";

/**
 * 诗词列表客户端组件：仅发起 1 个 /api/poems 请求获取诗词数据。
 * 筛选参数（dynasty/tag/rhythmic/q）直接传给 API，由后端做 name/slug 双向匹配，
 * 无需客户端先获取 dynasties/authors/tags 做 slug 解析。
 * @author poetry
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Pagination from "./Pagination";

const PAGE_SIZE = 20;

type ListItem = {
  slug: string;
  title: string;
  author_name: string;
  dynasty_name?: string;
  rhythmic?: string;
  excerpt?: string;
};

function PoemsListInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const dynasty = searchParams.get("dynasty") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const rhythmic = searchParams.get("rhythmic") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  /* 仅 1 个 API 调用：将 URL 参数直接传给 /api/poems，后端已支持 name/slug 双向匹配 */
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (rhythmic.trim()) params.set("rhythmic", rhythmic.trim());
    else if (dynasty) params.set("dynasty", dynasty);
    else if (tag.trim()) params.set("tag", tag.trim());
    else if (q.trim()) params.set("q", q.trim());
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    fetch(`/api/poems/?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { items: [], total: 0 }))
      .then((data: { items: ListItem[]; total: number }) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [dynasty, tag, rhythmic, q, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const queryParts = [
    dynasty && `dynasty=${encodeURIComponent(dynasty)}`,
    tag && `tag=${encodeURIComponent(tag)}`,
    rhythmic.trim() && `rhythmic=${encodeURIComponent(rhythmic.trim())}`,
    q && `q=${encodeURIComponent(q)}`,
  ].filter(Boolean);
  const queryStr = queryParts.length ? "?" + queryParts.join("&") : "";

  const pageTitle = dynasty
    ? `朝代：${dynasty}`
    : tag
      ? `标签：${tag}`
      : rhythmic.trim()
        ? `词牌：${rhythmic.trim()}`
        : q
          ? `搜索：${q}`
          : "诗文";

  const emptyQueryLabel = q.trim()
    ? `"${q.trim()}"`
    : dynasty
      ? `"${dynasty}"`
      : tag.trim()
        ? `"${tag.trim()}"`
        : rhythmic.trim()
          ? `"${rhythmic.trim()}"`
          : "";

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="font-serif text-2xl font-bold text-primary md:text-3xl">
        {pageTitle}
      </h1>
      {loading ? (
        <p className="text-text/70">加载中…</p>
      ) : (
        <>
          <p className="text-text/70">共 {total} 首</p>
          {items.length === 0 ? (
            <div className="space-y-2">
              <p className="text-text/70">
                {emptyQueryLabel
                  ? `未找到与${emptyQueryLabel}相关的诗词。`
                  : "暂无诗文。"}
              </p>
              <Link
                href="/poems/"
                className="cursor-pointer text-primary underline transition-colors duration-200 hover:text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                查看全部诗文
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {items.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/poems/${p.slug}/`}
                      className="cursor-pointer block rounded-lg border border-secondary/20 p-4 transition-colors duration-200 hover:border-primary hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <div className="text-lg font-semibold text-text">{p.title}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-text/70">
                        <span>{p.author_name}</span>
                        {p.dynasty_name && (
                          <>
                            <span className="text-text/50" aria-hidden>·</span>
                            <span>{p.dynasty_name}</span>
                          </>
                        )}
                        {p.rhythmic && (
                          <>
                            <span className="text-text/50" aria-hidden>·</span>
                            <span>{p.rhythmic}</span>
                          </>
                        )}
                      </div>
                      {p.excerpt && (
                        <div className="mt-1.5 text-sm text-text/60 line-clamp-2">
                          {p.excerpt}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath="/poems"
                  queryString={queryStr}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function PoemsListClient() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl space-y-6">
          <h1 className="font-serif text-2xl font-bold text-primary">诗文</h1>
          <p className="text-text/70">加载中…</p>
        </div>
      }
    >
      <PoemsListInner />
    </Suspense>
  );
}
