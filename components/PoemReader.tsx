"use client";

/**
 * 诗词正文：标题、作者、正文（字级拼音）、译文/注释/赏析。
 * 阅读设置由右侧栏 ReadingSettingsCard 控制，状态来自 ReadingSettingsContext。
 * @author poetry
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { pinyinNumLineToSymbol, alignLineWithPinyin } from "../lib/pinyin_display";
import { useReadingSettings } from "../context/ReadingSettingsContext";

export interface PoemReaderProps {
  title: string;
  author: string;
  authorSlug?: string;
  dynasty: string;
  titlePinyin?: string;
  authorPinyin?: string;
  /** 词牌名（宋词等），有则展示 */
  rhythmic?: string;
  /** 标签名列表，有则展示为可点击链接（跳转到按标签筛选的诗文列表） */
  tags?: string[];
  paragraphs: string[];
  paragraphsPinyin?: string[];
  translation?: string;
  annotation?: string;
  appreciation?: string;
}

function convertToTraditional(text: string, converter: ((s: string) => string) | null): string {
  if (!converter || !text) return text;
  try {
    return converter(text);
  } catch {
    return text;
  }
}

export default function PoemReader({
  title,
  author,
  authorSlug,
  dynasty,
  titlePinyin,
  authorPinyin,
  rhythmic,
  tags,
  paragraphs,
  paragraphsPinyin,
  translation,
  annotation,
  appreciation,
}: PoemReaderProps) {
  const { settings } = useReadingSettings();
  const [converter, setConverter] = useState<((s: string) => string) | null>(null);

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
    return () => { cancelled = true; };
  }, [settings.variant]);

  const fontFamilyMap: Record<string, string> = {
    song: '"Songti SC", "SimSun", "宋体", "Noto Serif SC", "Noto Serif JP", serif',
    kai: '"Kaiti SC", "KaiTi", "楷体", "Noto Serif SC", "Noto Serif JP", serif',
    calligraphy: '"Ma Shan Zheng", cursive',
    handwriting: '"Zhi Mang Xing", cursive',
    artistic: '"Long Cang", cursive',
  };
  const fontFamily = fontFamilyMap[settings.font] ?? fontFamilyMap.song;
  const displayTitle = useMemo(
    () => convertToTraditional(title, converter),
    [title, converter]
  );
  const displayAuthor = useMemo(
    () => convertToTraditional(author, converter),
    [author, converter]
  );
  const displayParagraphs = useMemo(
    () => paragraphs.map((p) => convertToTraditional(p, converter)),
    [paragraphs, converter]
  );
  const displayTranslation = useMemo(
    () => translation ? convertToTraditional(translation, converter) : "",
    [translation, converter]
  );
  const displayAnnotation = useMemo(
    () => annotation ? convertToTraditional(annotation, converter) : "",
    [annotation, converter]
  );
  const displayAppreciation = useMemo(
    () => appreciation ? convertToTraditional(appreciation, converter) : "",
    [appreciation, converter]
  );
  const displayDynasty = useMemo(
    () => dynasty ? convertToTraditional(dynasty, converter) : "",
    [dynasty, converter]
  );
  const displayRhythmic = useMemo(
    () => rhythmic ? convertToTraditional(rhythmic, converter) : "",
    [rhythmic, converter]
  );
  const displayTags = useMemo(
    () => (tags ?? []).map((t) => convertToTraditional(t, converter)),
    [tags, converter]
  );

  const hasAnnotation = !!(translation || annotation || appreciation);

  const titleSymbolLine = titlePinyin ? pinyinNumLineToSymbol(titlePinyin) : "";
  const titlePairs = titlePinyin && settings.showPinyin
    ? alignLineWithPinyin(displayTitle, titleSymbolLine)
    : null;
  const authorSymbolLine = authorPinyin ? pinyinNumLineToSymbol(authorPinyin) : "";
  const authorPairs = authorPinyin && settings.showPinyin
    ? alignLineWithPinyin(displayAuthor, authorSymbolLine)
    : null;

  const renderAuthorContent = () => {
    if (authorPairs) {
      return (
        <span className="inline-flex flex-wrap justify-center gap-x-0.5">
          {authorPairs.map(({ char, pinyin }, k) =>
            pinyin ? (
              <ruby key={k} className="ruby">
                {char}
                <rt className="font-sans text-xs text-text/60">{pinyin}</rt>
              </ruby>
            ) : (
              <span key={k}>{char}</span>
            )
          )}
        </span>
      );
    }
    return <>{displayAuthor}</>;
  };

  const linkClass =
    "cursor-pointer text-primary transition-colors duration-200 hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2";

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1
          className="text-2xl font-bold text-primary md:text-3xl"
          style={{ fontFamily }}
        >
          {titlePairs ? (
            <span className="inline-flex flex-wrap justify-center gap-x-0.5">
              {titlePairs.map(({ char, pinyin }, k) =>
                pinyin ? (
                  <ruby key={k} className="ruby">
                    {char}
                    <rt className="font-sans text-xs text-text/60">{pinyin}</rt>
                  </ruby>
                ) : (
                  <span key={k}>{char}</span>
                )
              )}
            </span>
          ) : (
            displayTitle
          )}
        </h1>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-1 text-text/80">
          {authorSlug ? (
            <Link href={`/authors/${authorSlug}/`} className={linkClass}>
              {renderAuthorContent()}
            </Link>
          ) : (
            renderAuthorContent()
          )}
          {dynasty ? (
            <>
              <span className="text-text/60"> · </span>
              <Link
                href={`/poems/?dynasty=${encodeURIComponent(dynasty)}`}
                className={linkClass}
              >
                {displayDynasty}
              </Link>
            </>
          ) : null}
          {rhythmic ? (
            <>
              <span className="text-text/60"> · </span>
              <span className="text-text/70">词牌：</span>
              <Link
                href={`/poems/?rhythmic=${encodeURIComponent(rhythmic)}`}
                className={linkClass}
              >
                {displayRhythmic}
              </Link>
            </>
          ) : null}
        </p>
        {displayTags.length > 0 && tags ? (
          <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-text/80">
            <span className="shrink-0 text-text/60">标签：</span>
            {displayTags.map((displayName, i) => (
              <Link
                key={i}
                href={`/poems/?tag=${encodeURIComponent(tags[i])}`}
                className="cursor-pointer rounded px-2 py-0.5 text-primary transition-colors duration-200 hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {displayName}
              </Link>
            ))}
          </p>
        ) : null}
      </header>

      <section
        className="mb-8 space-y-3 text-lg leading-loose"
        style={{ fontFamily }}
      >
        {(paragraphsPinyin && paragraphsPinyin.length > 0 && settings.showPinyin
          ? displayParagraphs.map((line, i) => ({
              line,
              pinyinLine: paragraphsPinyin[i] ?? "",
            }))
          : displayParagraphs.map((line) => ({ line, pinyinLine: "" }))
        ).map(({ line, pinyinLine }, i) => {
          const symbolLine = pinyinLine ? pinyinNumLineToSymbol(pinyinLine) : "";
          const pairs = alignLineWithPinyin(line, symbolLine);
          return (
            <p key={i} className="flex flex-wrap justify-center gap-x-0.5">
              {pairs.map(({ char, pinyin }, k) =>
                pinyin ? (
                  <ruby key={k} className="ruby">
                    {char}
                    <rt className="font-sans text-xs text-text/60">{pinyin}</rt>
                  </ruby>
                ) : (
                  <span key={k}>{char}</span>
                )
              )}
            </p>
          );
        })}
      </section>

      {settings.showAnnotation && hasAnnotation && (
        <section className="space-y-6 border-t border-secondary/20 pt-8">
          {displayTranslation && (
            <div className="rounded-lg border border-secondary/20 p-4">
              <h2 className="font-semibold text-primary">译文</h2>
              <p className="mt-1 whitespace-pre-wrap text-text/90">{displayTranslation}</p>
            </div>
          )}
          {displayAnnotation && (
            <div className="rounded-lg border border-secondary/20 p-4">
              <h2 className="font-semibold text-primary">注释</h2>
              <p className="mt-1 whitespace-pre-wrap text-text/90">{displayAnnotation}</p>
            </div>
          )}
          {displayAppreciation && (
            <div className="rounded-lg border border-secondary/20 p-4">
              <h2 className="font-semibold text-primary">赏析</h2>
              <p className="mt-1 whitespace-pre-wrap text-text/90">{displayAppreciation}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
