"use client";

/**
 * 左侧栏：朝代、诗人、标签、词牌导航；手风琴折叠，高亮当前筛选。
 * 支持通过 initialData props 接收服务端预取数据，跳过客户端 API 请求。
 * @author poetry
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect, useCallback, Suspense } from "react";

interface Dynasty {
  slug: string;
  name: string;
  poem_count: number;
}

interface Author {
  slug: string;
  name: string;
  poem_count: number;
}

interface Tag {
  slug: string;
  name: string;
  poem_count: number;
}

interface Rhythmic {
  slug: string;
  name: string;
  poem_count: number;
}

/** 服务端预取的侧边栏数据 */
export interface SidebarInitialData {
  dynasties: Dynasty[];
  authors: Author[];
  tags: Tag[];
  rhythmics: Rhythmic[];
}

type AccordionKey = "dynasty" | "poet" | "tag" | "rhythmic";

function ChevronDown() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SidebarLeftContent({ initialData }: { initialData?: SidebarInitialData }) {
  const searchParams = useSearchParams();
  const currentDynasty = searchParams.get("dynasty") ?? "";
  const currentTag = searchParams.get("tag") ?? "";
  const currentRhythmic = searchParams.get("rhythmic") ?? "";

  const [dynasties, setDynasties] = useState<Dynasty[]>(initialData?.dynasties ?? []);
  const [authors, setAuthors] = useState<Author[]>(initialData?.authors ?? []);
  const [tags, setTags] = useState<Tag[]>(initialData?.tags ?? []);
  const [rhythmics, setRhythmics] = useState<Rhythmic[]>(initialData?.rhythmics ?? []);
  const [loading, setLoading] = useState(!initialData);

  const [expanded, setExpanded] = useState<Record<AccordionKey, boolean>>(() => ({
    dynasty: true,
    poet: false,
    tag: false,
    rhythmic: false,
  }));

  /* 仅当无 initialData 时才发起客户端 API 请求（兼容纯客户端页面） */
  useEffect(() => {
    if (initialData) return;
    const load = async () => {
      try {
        const [dRes, aRes, tRes, rRes] = await Promise.all([
          fetch("/api/dynasties"),
          fetch("/api/authors?limit=500"),
          fetch("/api/tags").catch(() => ({ ok: false })),
          fetch("/api/rhythmics").catch(() => ({ ok: false })),
        ]);
        if (dRes.ok) setDynasties(await dRes.json());
        if (aRes.ok) {
          const body = await aRes.json();
          setAuthors(body?.items ?? []);
        }
        if (tRes.ok && "json" in tRes) setTags(await (tRes as Response).json());
        if (rRes.ok && "json" in rRes) setRhythmics(await (rRes as Response).json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [initialData]);

  useEffect(() => {
    setExpanded((prev) => ({
      ...prev,
      dynasty: !!currentDynasty || (!currentTag && !currentRhythmic),
      poet: false,
      tag: !!currentTag,
      rhythmic: !!currentRhythmic,
    }));
  }, [currentDynasty, currentTag, currentRhythmic]);

  const toggle = useCallback((key: AccordionKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const basePoemsQuery = useMemo(() => {
    const q = searchParams.get("q");
    return q ? `q=${encodeURIComponent(q)}&` : "";
  }, [searchParams]);

  const SIDEBAR_SLICE = 12;

  if (loading) {
    return (
      <div className="rounded-lg border border-secondary/20 p-4 text-sm text-text/60">
        加载中…
      </div>
    );
  }

  return (
    <nav className="space-y-1 rounded-lg border border-secondary/20 p-4" aria-label="筛选导航">
      {/* 朝代 */}
      <div className="rounded-md border border-transparent">
        <button
          type="button"
          onClick={() => toggle("dynasty")}
          aria-expanded={expanded.dynasty}
          aria-controls="sidebar-dynasty"
          className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left text-sm font-semibold text-primary transition-colors duration-200 hover:bg-secondary/10"
        >
          <span>朝代</span>
          {expanded.dynasty ? <ChevronDown /> : <ChevronRight />}
        </button>
        <div
          id="sidebar-dynasty"
          aria-hidden={!expanded.dynasty}
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: expanded.dynasty ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <ul className="space-y-1 pb-1 pt-0.5">
              {dynasties.map((d) => {
                const isActive = currentDynasty === d.name;
                const href = `/poems/?${basePoemsQuery}dynasty=${encodeURIComponent(d.name)}`;
                return (
                  <li key={d.slug}>
                    <Link
                      href={href}
                      className={`cursor-pointer block truncate rounded px-2 py-1 text-sm transition-colors hover:bg-secondary/10 hover:text-primary ${
                        isActive ? "bg-primary/10 font-medium text-primary" : "text-text/90"
                      }`}
                    >
                      {d.name}
                      <span className="ml-1 text-text/50">({d.poem_count})</span>
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  href="/dynasties/"
                  className="cursor-pointer block rounded px-2 py-1 text-sm text-text/70 transition-colors hover:bg-secondary/10 hover:text-primary"
                >
                  全部朝代
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 诗人 */}
      <div className="rounded-md border border-transparent">
        <button
          type="button"
          onClick={() => toggle("poet")}
          aria-expanded={expanded.poet}
          aria-controls="sidebar-poet"
          className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left text-sm font-semibold text-primary transition-colors duration-200 hover:bg-secondary/10"
        >
          <span>诗人</span>
          {expanded.poet ? <ChevronDown /> : <ChevronRight />}
        </button>
        <div
          id="sidebar-poet"
          aria-hidden={!expanded.poet}
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: expanded.poet ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <ul className="space-y-1 pb-1 pt-0.5">
              <li>
                <Link
                  href="/authors/"
                  className="cursor-pointer block truncate rounded px-2 py-1 text-sm text-text/90 transition-colors hover:bg-secondary/10 hover:text-primary"
                >
                  全部诗人
                </Link>
              </li>
              {authors.slice(0, 15).map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/authors/${a.slug}/`}
                    className="cursor-pointer block truncate rounded px-2 py-1 text-sm text-text/90 transition-colors hover:bg-secondary/10 hover:text-primary"
                  >
                    {a.name}
                    <span className="ml-1 text-text/50">({a.poem_count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="rounded-md border border-transparent">
          <button
            type="button"
            onClick={() => toggle("tag")}
            aria-expanded={expanded.tag}
            aria-controls="sidebar-tag"
            className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left text-sm font-semibold text-primary transition-colors duration-200 hover:bg-secondary/10"
          >
            <span>标签</span>
            {expanded.tag ? <ChevronDown /> : <ChevronRight />}
          </button>
          <div
            id="sidebar-tag"
            aria-hidden={!expanded.tag}
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: expanded.tag ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <ul className="space-y-1 pb-1 pt-0.5">
                {tags.slice(0, SIDEBAR_SLICE).map((t) => {
                  const isActive = currentTag === t.name;
                  const href = `/poems/?${basePoemsQuery}tag=${encodeURIComponent(t.name)}`;
                  return (
                    <li key={t.slug}>
                      <Link
                        href={href}
                        className={`cursor-pointer block truncate rounded px-2 py-1 text-sm transition-colors hover:bg-secondary/10 hover:text-primary ${
                          isActive ? "bg-primary/10 font-medium text-primary" : "text-text/90"
                        }`}
                      >
                        {t.name}
                        <span className="ml-1 text-text/50">({t.poem_count})</span>
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/tags/"
                    className="cursor-pointer block rounded px-2 py-1 text-sm text-text/70 transition-colors hover:bg-secondary/10 hover:text-primary"
                  >
                    更多标签
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {rhythmics.length > 0 && (
        <div className="rounded-md border border-transparent">
          <button
            type="button"
            onClick={() => toggle("rhythmic")}
            aria-expanded={expanded.rhythmic}
            aria-controls="sidebar-rhythmic"
            className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left text-sm font-semibold text-primary transition-colors duration-200 hover:bg-secondary/10"
          >
            <span>词牌</span>
            {expanded.rhythmic ? <ChevronDown /> : <ChevronRight />}
          </button>
          <div
            id="sidebar-rhythmic"
            aria-hidden={!expanded.rhythmic}
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: expanded.rhythmic ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <ul className="space-y-1 pb-1 pt-0.5">
                {rhythmics.slice(0, SIDEBAR_SLICE).map((r) => {
                  const isActive = currentRhythmic === r.name || currentRhythmic === r.slug;
                  const href = `/poems/?${basePoemsQuery}rhythmic=${encodeURIComponent(r.name)}`;
                  return (
                    <li key={r.slug}>
                      <Link
                        href={href}
                        className={`cursor-pointer block truncate rounded px-2 py-1 text-sm transition-colors hover:bg-secondary/10 hover:text-primary ${
                          isActive ? "bg-primary/10 font-medium text-primary" : "text-text/90"
                        }`}
                      >
                        {r.name}
                        <span className="ml-1 text-text/50">({r.poem_count})</span>
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/rhythmics/"
                    className="cursor-pointer block rounded px-2 py-1 text-sm text-text/70 transition-colors hover:bg-secondary/10 hover:text-primary"
                  >
                    更多词牌
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default function SidebarLeft({ initialData }: { initialData?: SidebarInitialData }) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-secondary/20 p-4 text-sm text-text/60">
          加载中…
        </div>
      }
    >
      <SidebarLeftContent initialData={initialData} />
    </Suspense>
  );
}
