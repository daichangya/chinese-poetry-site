"use client";

/**
 * 诗词详情页右侧栏：纠错与完善、阅读设置、作者信息、同朝代诗词。
 * 样式参考 docs/右侧边样式.png。
 * @author poetry
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Poem } from "../lib/types";
import { useReadingSettings, type PoemFont } from "../context/ReadingSettingsContext";
import { pinyinNumLineToSymbol } from "../lib/pinyin_display";
import Toggle from "./Toggle";

function convertToTraditional(text: string, converter: ((s: string) => string) | null): string {
  if (!converter || !text) return text;
  try {
    return converter(text);
  } catch {
    return text;
  }
}

interface PoemDetailSidebarProps {
  poem: Poem;
  sameDynastyPoems: Poem[];
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-secondary/20 bg-background p-4 shadow-sm transition-colors duration-200 ${className}`}>
      {children}
    </section>
  );
}

/** 纠错与完善：居中深色按钮 + 下方「首次贡献? 点击 查看教程~」，参考右侧边样式图 */
function CorrectionCard({
  buttonHref,
  tutorialHref,
}: {
  buttonHref: string;
  tutorialHref: string;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-2 text-center">
        <a
          href={buttonHref}
          target={buttonHref.startsWith("http") ? "_blank" : undefined}
          rel={buttonHref.startsWith("http") ? "noopener noreferrer" : undefined}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-text px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          <PencilIcon />
          纠错与完善/内容贡献
        </a>
        <span className="text-xs text-text/60">
          首次贡献? 点击{" "}
          <a
            href={tutorialHref}
            target={tutorialHref.startsWith("http") ? "_blank" : undefined}
            rel={tutorialHref.startsWith("http") ? "noopener noreferrer" : undefined}
            className="cursor-pointer text-primary hover:underline"
          >
            查看教程
          </a>
          ~
        </span>
      </div>
    </Card>
  );
}

/** 阅读设置：标题 + 四行「标签左、开关右」 */
function ReadingSettingsCard({ hasAnnotation }: { hasAnnotation: boolean }) {
  const { settings, set } = useReadingSettings();
  return (
    <Card>
      <h2 className="mb-3 text-base font-bold text-primary">阅读设置</h2>
      <div className="space-y-0">
        <Toggle
          label="简体/繁体"
          checked={settings.variant === "t"}
          onChange={(on) => set("variant", on ? "t" : "s")}
          aria-label="简繁转换"
        />
        <div className="py-2">
          <p className="mb-2 text-sm font-medium text-text/90">正文字体</p>
          <div
            className="flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="正文字体"
          >
            {(
              [
                { value: "song" as PoemFont, label: "宋体" },
                { value: "kai" as PoemFont, label: "楷体" },
                { value: "calligraphy" as PoemFont, label: "书法" },
                { value: "handwriting" as PoemFont, label: "手写" },
                { value: "artistic" as PoemFont, label: "艺术" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={settings.font === value}
                onClick={() => set("font", value)}
                className={
                  settings.font === value
                    ? "cursor-pointer rounded-md bg-primary px-2.5 py-1.5 text-sm text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    : "cursor-pointer rounded-md bg-secondary/20 px-2.5 py-1.5 text-sm text-text/90 transition-colors duration-200 hover:bg-secondary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Toggle
          label="拼音标注"
          checked={settings.showPinyin}
          onChange={(v) => set("showPinyin", v)}
          aria-label="显示拼音"
        />
        {hasAnnotation && (
          <Toggle
            label="原文注解"
            checked={settings.showAnnotation}
            onChange={(v) => set("showAnnotation", v)}
            aria-label="显示原文注解"
          />
        )}
      </div>
    </Card>
  );
}

/** 朗读：Web Speech API 朗读标题、作者与正文，随阅读设置简繁；支持停止。 */
function ReadAloudCard({ poem }: { poem: Poem }) {
  const { settings } = useReadingSettings();
  const [converter, setConverter] = useState<((s: string) => string) | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (settings.variant !== "t") {
      setConverter(null);
      return;
    }
    let cancelled = false;
    import("opencc-js/cn2t").then((mod) => {
      if (cancelled) return;
      const c = mod.Converter({ from: "cn", to: "t" });
      setConverter(() => (s: string) => c(s));
    }).catch(() => setConverter(null));
    return () => {
      cancelled = true;
    };
  }, [settings.variant]);

  const displayTitle = useMemo(
    () => convertToTraditional(poem.title, converter),
    [poem.title, converter]
  );
  const displayAuthor = useMemo(
    () => convertToTraditional(poem.author, converter),
    [poem.author, converter]
  );
  const displayParagraphs = useMemo(
    () => poem.paragraphs.map((p) => convertToTraditional(p, converter)),
    [poem.paragraphs, converter]
  );

  const speakText = useMemo(
    () => `《${displayTitle}》${displayAuthor}。${displayParagraphs.join("，")}`,
    [displayTitle, displayAuthor, displayParagraphs]
  );

  const stop = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speakText);
    utterance.lang = "zh-CN";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <Card>
      <h2 className="mb-3 text-base font-bold text-primary">朗读</h2>
      <div className="flex flex-col items-center gap-2">
        {isSpeaking ? (
          <button
            type="button"
            onClick={stop}
            aria-label="停止朗读"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-text transition-colors duration-200 hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={speak}
            aria-label="朗读全文"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            朗读全文
          </button>
        )}
      </div>
    </Card>
  );
}

/** 作者信息：圆形头像（前两字）+ 姓名、拼音、历 + 朝代，参考右侧边样式图 */
function AuthorCard({ poem }: { poem: Poem }) {
  const initials = [...poem.author].slice(0, 2).join("") || poem.author;
  const pinyinDisplay = poem.authorPinyin
    ? pinyinNumLineToSymbol(poem.authorPinyin)
    : "";
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-lg font-semibold text-text"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/authors/${poem.authorSlug}/`}
            className="cursor-pointer block truncate font-bold text-text hover:text-primary"
          >
            {poem.author}
          </Link>
          {pinyinDisplay && (
            <p className="mt-0.5 text-sm text-text/70">{pinyinDisplay}</p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-text/60">
            <CalendarIcon />
            <span>?年一?年</span>
            {poem.dynasty && <span> · {poem.dynasty}</span>}
          </p>
        </div>
      </div>
    </Card>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-text/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

const CONTRIBUTE_PATH = "/contribute";

/** 未配置时使用 .md 仓库（纠错与完善指向该仓库下的 author_slug/slug.md） */
const DEFAULT_SOURCE_REPO = "https://github.com/daichangya/chinese-poetry-md";

export default function PoemDetailSidebar({
  poem,
  sameDynastyPoems,
}: PoemDetailSidebarProps) {
  const rawRepo =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_SOURCE_REPO ?? DEFAULT_SOURCE_REPO)
      : DEFAULT_SOURCE_REPO;
  const repoRoot = rawRepo.replace(/\/$/, "");
  const isGitHub = repoRoot.includes("github.com");
  /** 在 chinese-poetry-md 中路径为 poems/author_slug/slug.md */
  const editHref = isGitHub
    ? `${repoRoot}/edit/main/poems/${poem.authorSlug}/${poem.slug}.md`
    : `${repoRoot}/poems/${poem.authorSlug}/${poem.slug}.md`;
  const tutorialHref =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONTRIBUTE_GUIDE_URL) ||
    (isGitHub ? `${repoRoot}/blob/main/README.md` : null) ||
    CONTRIBUTE_PATH;
  const buttonHref = editHref || repoRoot || CONTRIBUTE_PATH;

  const hasAnnotation = !!(poem.translation || poem.annotation || poem.appreciation);

  return (
    <aside className="space-y-6">
      <CorrectionCard buttonHref={buttonHref} tutorialHref={tutorialHref} />
      <ReadingSettingsCard hasAnnotation={hasAnnotation} />
      <ReadAloudCard poem={poem} />
      <AuthorCard poem={poem} />
      {sameDynastyPoems.length > 0 && poem.dynasty && (
        <Card>
          <h2 className="mb-2 text-base font-bold text-primary">
            同朝代（{poem.dynasty}）
          </h2>
          <ul className="space-y-1">
            {sameDynastyPoems.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/poems/${p.slug}/`}
                  className="cursor-pointer block truncate text-sm text-text/90 transition-colors hover:text-primary"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </aside>
  );
}
