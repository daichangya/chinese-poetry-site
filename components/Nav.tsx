"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";

const SEARCH_DEBOUNCE_MS = 400;

type SearchType = "keyword" | "author" | "dynasty" | "tag" | "rhythmic";
const SEARCH_TYPE_OPTIONS: { value: SearchType; label: string; placeholder: string }[] = [
  { value: "keyword", label: "关键词", placeholder: "标题或作者" },
  { value: "author", label: "诗人", placeholder: "诗人名" },
  { value: "dynasty", label: "朝代", placeholder: "朝代名" },
  { value: "tag", label: "标签", placeholder: "标签名" },
  { value: "rhythmic", label: "词牌", placeholder: "词牌名" },
];

const THEME_STORAGE_KEY = "poetry-theme";
/** 未配置时使用 .md 仓库（导航 GitHub 与详情页纠错与完善同源） */
const DEFAULT_SOURCE_REPO = "https://github.com/daichangya/chinese-poetry-md";

type ThemeId = "pink" | "warm" | "ink" | "blue";
const THEME_OPTIONS: { value: ThemeId; label: string }[] = [
  { value: "pink", label: "浪漫粉" },
  { value: "warm", label: "暖纸·棕" },
  { value: "ink", label: "墨纸·金" },
  { value: "blue", label: "青墨·蓝" },
];

function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "pink";
  const t = localStorage.getItem(THEME_STORAGE_KEY);
  if (t === "warm" || t === "ink" || t === "blue" || t === "pink") return t;
  return "pink";
}

function applyTheme(value: ThemeId) {
  if (value === "pink") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", value);
  }
}

/**
 * 全局导航：左侧 Logo/诗文/诗人/朝代，右侧搜索框。
 * 在诗文页输入时防抖后自动更新 URL 触发搜索，无需点「搜索」。
 * @author poetry
 */
/** 仅关键词写 /poems?q=；诗人/朝代/标签/词牌均跳专题页，不写 poems 筛选。 */
function buildPoemsSearchUrl(type: SearchType, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "/poems";
  if (type !== "keyword") return "/poems";
  const params = new URLSearchParams();
  params.set("q", trimmed);
  return `/poems?${params.toString()}`;
}

function deriveSearchStateFromUrl(searchParams: URLSearchParams): { type: SearchType; query: string } {
  if (searchParams.has("rhythmic")) {
    return { type: "rhythmic", query: searchParams.get("rhythmic") ?? "" };
  }
  if (searchParams.has("dynasty")) {
    return { type: "dynasty", query: searchParams.get("dynasty") ?? "" };
  }
  if (searchParams.has("tag")) {
    return { type: "tag", query: searchParams.get("tag") ?? "" };
  }
  if (searchParams.has("q")) {
    return { type: "keyword", query: searchParams.get("q") ?? "" };
  }
  return { type: "keyword", query: "" };
}

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPoems = pathname === "/poems";
  const urlState = useMemo(() => (isPoems ? deriveSearchStateFromUrl(searchParams) : null), [isPoems, searchParams]);

  const [searchType, setSearchType] = useState<SearchType>("keyword");
  const [query, setQuery] = useState("");
  const [theme, setThemeState] = useState<ThemeId>("pink");

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  useEffect(() => {
    if (urlState) {
      setSearchType(urlState.type);
      setQuery(urlState.query);
    } else {
      setQuery("");
    }
  }, [isPoems, searchParams.get("q"), searchParams.get("dynasty"), searchParams.get("tag"), searchParams.get("rhythmic")]);

  const setTheme = useCallback((value: ThemeId) => {
    localStorage.setItem(THEME_STORAGE_KEY, value);
    applyTheme(value);
    setThemeState(value);
  }, []);

  useEffect(() => {
    if (!isPoems || searchType !== "keyword") return;
    const t = setTimeout(() => {
      const targetUrl = buildPoemsSearchUrl("keyword", query);
      const current = deriveSearchStateFromUrl(searchParams);
      const currentUrl = buildPoemsSearchUrl(current.type, current.query);
      if (targetUrl === currentUrl) return;
      router.replace(targetUrl);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [isPoems, searchType, query, router, searchParams]);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (searchType === "author") {
        router.push(trimmed ? `/authors/?q=${encodeURIComponent(trimmed)}` : "/authors");
        return;
      }
      if (searchType === "dynasty") {
        router.push(trimmed ? `/dynasties/?q=${encodeURIComponent(trimmed)}` : "/dynasties");
        return;
      }
      if (searchType === "tag") {
        router.push(trimmed ? `/tags/?q=${encodeURIComponent(trimmed)}` : "/tags");
        return;
      }
      if (searchType === "rhythmic") {
        router.push(trimmed ? `/rhythmics/?q=${encodeURIComponent(trimmed)}` : "/rhythmics");
        return;
      }
      router.push(buildPoemsSearchUrl("keyword", query));
    },
    [searchType, query, router]
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as SearchType;
      setSearchType(newType);
      const targetUrl = buildPoemsSearchUrl(newType, query);
      if (isPoems) router.replace(targetUrl);
    },
    [query, isPoems, router]
  );

  const currentPlaceholder = SEARCH_TYPE_OPTIONS.find((o) => o.value === searchType)?.placeholder ?? "搜索";

  return (
    <header className="sticky top-0 z-10 border-b border-secondary/20 bg-background backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="cursor-pointer rounded text-lg font-semibold text-primary transition-colors duration-200 hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            诗词
          </Link>
          <Link
            href={
              pathname === "/poems" &&
              (searchParams.get("dynasty") || searchParams.get("tag") || searchParams.get("rhythmic"))
                ? `/poems?${[
                    searchParams.get("dynasty") && `dynasty=${encodeURIComponent(searchParams.get("dynasty")!)}`,
                    searchParams.get("tag") && `tag=${encodeURIComponent(searchParams.get("tag")!)}`,
                    searchParams.get("rhythmic") && `rhythmic=${encodeURIComponent(searchParams.get("rhythmic")!)}`,
                  ]
                    .filter(Boolean)
                    .join("&")}`
                : "/poems/"
            }
            className="cursor-pointer rounded text-text/90 transition-colors duration-200 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            诗文
          </Link>
          <Link
            href="/authors/"
            className="cursor-pointer rounded text-text/90 transition-colors duration-200 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            诗人
          </Link>
          <Link
            href="/dynasties/"
            className="cursor-pointer rounded text-text/90 transition-colors duration-200 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            朝代
          </Link>
          <Link
            href="/rhythmics/"
            className="cursor-pointer rounded text-text/90 transition-colors duration-200 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            词牌
          </Link>
          <Link
            href="/tags/"
            className="cursor-pointer rounded text-text/90 transition-colors duration-200 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            标签
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <label className="flex items-center gap-1">
              <span className="sr-only">搜索类型</span>
              <select
                value={searchType}
                onChange={handleTypeChange}
                aria-label="搜索类型：关键词、诗人、朝代、标签、词牌"
                className="cursor-pointer rounded-md border border-secondary/30 bg-background px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                {SEARCH_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <input
              type="search"
              placeholder={currentPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={currentPlaceholder}
              className="w-40 rounded-md border border-secondary/30 bg-background px-3 py-1.5 text-sm text-text placeholder:text-text/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary md:w-52"
            />
            <button
              type="submit"
              className="cursor-pointer ml-2 rounded-md bg-cta px-3 py-1.5 text-sm font-medium text-white transition-colors duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              搜索
            </button>
          </form>
          <label className="flex items-center gap-2">
            <span className="sr-only">主题</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
              aria-label="选择主题：浪漫粉、暖纸·棕、墨纸·金、青墨·蓝"
              className="cursor-pointer rounded-md border border-secondary/30 bg-background px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <a
            href={(typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SOURCE_REPO : undefined) ?? DEFAULT_SOURCE_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer rounded text-sm text-text/90 transition-colors duration-200 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
