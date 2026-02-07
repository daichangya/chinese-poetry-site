"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import LayoutWithSidebar from "../../components/LayoutWithSidebar";
import SidebarLeft from "../../components/SidebarLeft";
import Pagination from "../../components/Pagination";

const PAGE_SIZE = 20;

type ListItem = {
  slug: string;
  title: string;
  author_name: string;
  dynasty_name?: string;
  rhythmic?: string;
  excerpt?: string;
};
type DynastyItem = { slug: string; name: string; poem_count: number };
type AuthorItem = { slug: string; name: string; poem_count: number };
type TagItem = { slug: string; name: string; poem_count: number };

function PoemsListContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const dynasty = searchParams.get("dynasty") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const rhythmic = searchParams.get("rhythmic") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const [dynasties, setDynasties] = useState<DynastyItem[]>([]);
  const [authors, setAuthors] = useState<AuthorItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dynasties").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/authors?limit=10000").then((r) => (r.ok ? r.json().then((d: { items: AuthorItem[] }) => d.items) : [])).catch(() => []),
      fetch("/api/tags").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([dyn, auth, tagList]) => {
      setDynasties(dyn);
      setAuthors(Array.isArray(auth) ? auth : []);
      setTags(tagList ?? []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (rhythmic.trim()) {
      params.set("rhythmic", rhythmic.trim());
    } else if (dynasty) {
      const dynastySlug = dynasties.find((d) => d.name === dynasty)?.slug ?? dynasty;
      params.set("dynasty", dynastySlug);
    } else if (tag.trim()) {
      const tagSlug = tags.find((t) => t.name === tag.trim() || t.slug === tag.trim())?.slug ?? tag.trim();
      params.set("tag", tagSlug);
    } else if (q.trim()) {
      params.set("q", q.trim());
    }
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    fetch(`/api/poems?${params.toString()}`)
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
  }, [dynasty, tag, rhythmic, q, page, dynasties, tags]);

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
    ? `“${q.trim()}”`
    : dynasty
      ? `“${dynasty}”`
      : tag.trim()
        ? `“${tag.trim()}”`
        : rhythmic.trim()
          ? `“${rhythmic.trim()}”`
          : "";

  return (
    <LayoutWithSidebar sidebarLeft={<SidebarLeft />}>
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
    </LayoutWithSidebar>
  );
}

/**
 * 诗词列表：按 dynasty/q/tag 请求 /api/poems?dynasty=&q=&tag=&page=&limit=；dynasties/authors/tags 来自 /api/dynasties、/api/authors、/api/tags。
 * @author poetry
 */
export default function PoemsListPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><h1 className="font-serif text-2xl font-bold text-primary">诗文</h1><p className="text-text/70">加载中…</p></div>}>
      <PoemsListContent />
    </Suspense>
  );
}
