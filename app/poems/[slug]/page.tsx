import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPoemBySlug, getPoemsByDynasty, getPoemSlugsForSSGByPopularTags } from "@/lib/db";
import LayoutWithSidebar from "../../../components/LayoutWithSidebar";
import SidebarLeft from "../../../components/SidebarLeft";
import PoemDetailSidebar from "../../../components/PoemDetailSidebar";
import PoemReader from "../../../components/PoemReader";
import { ReadingSettingsProvider } from "../../../context/ReadingSettingsContext";

export const dynamicParams = true;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.shi-ci.cn";

/** 分层 SSG：从热门选集 tag 中收集约 N 首诗预渲染（默认 5000），其余按需生成；设 BUILD_SSG_POEM_LIMIT=0 可关闭 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const limit = parseInt(process.env.BUILD_SSG_POEM_LIMIT ?? "5000", 10) || 0;
  if (limit <= 0) return [];
  const slugs = await getPoemSlugsForSSGByPopularTags(limit);
  return slugs.map((slug) => ({ slug }));
}

/** 详情页侧栏「同朝代」最多展示条数 */
const SAME_DYNASTY_PREVIEW_LIMIT = 10;

const DESCRIPTION_MAX_LEN = 150;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const poem = await getPoemBySlug(slug);
  if (!poem) return { title: "未找到" };
  const title = `《${poem.title}》 - ${poem.author}`;
  const excerpt =
    poem.paragraphs.slice(0, 2).join("").replace(/\s+/g, "") ||
    poem.appreciation?.slice(0, 80) ||
    "中文诗词";
  const descPrefix = poem.dynasty
    ? `${poem.author}《${poem.title}》（${poem.dynasty}）：`
    : `${poem.author}《${poem.title}》：`;
  const description =
    descPrefix.length + excerpt.length <= DESCRIPTION_MAX_LEN
      ? descPrefix + excerpt
      : descPrefix + excerpt.slice(0, DESCRIPTION_MAX_LEN - descPrefix.length - 1) + "…";
  const url = `${siteUrl}/poems/${poem.slug}/`;
  const keywords = [
    poem.title,
    poem.author,
    ...(poem.dynasty ? [poem.dynasty] : []),
    ...(poem.tags?.length ? poem.tags : ["诗词"]),
    ...(poem.rhythmic ? [poem.rhythmic] : []),
    "中文诗词",
  ].filter(Boolean);
  return {
    title: `《${poem.title}》`,
    description,
    keywords: keywords as string[],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: "/icon.svg", alt: `《${poem.title}》` }],
    },
    twitter: { card: "summary", title, description },
  };
}

/**
 * 诗词详情：正文、拼音、作者、朝代；阅读设置。数据来自 SQLite。
 * @author poetry
 */
export default async function PoemDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const poem = await getPoemBySlug(slug);
  if (!poem) notFound();

  const sameDynastyPoems = poem.dynastySlug
    ? (await getPoemsByDynasty(poem.dynastySlug, 0, SAME_DYNASTY_PREVIEW_LIMIT + 1)).filter((p) => p.slug !== poem.slug).slice(0, SAME_DYNASTY_PREVIEW_LIMIT)
    : [];

  const poemUrl = `${siteUrl}/poems/${poem.slug}/`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: poem.title,
    author: { "@type": "Person", name: poem.author },
    inLanguage: "zh-Hans",
    text: poem.paragraphs.join("\n"),
    url: poemUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": poemUrl },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: siteUrl + "/" },
      { "@type": "ListItem", position: 2, name: "诗文", item: siteUrl + "/poems/" },
      { "@type": "ListItem", position: 3, name: poem.title, item: poemUrl },
    ],
  };

  return (
    <ReadingSettingsProvider>
      <LayoutWithSidebar
        sidebarLeft={<SidebarLeft />}
        sidebarRight={
          <PoemDetailSidebar poem={poem} sameDynastyPoems={sameDynastyPoems} />
        }
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <article className="mx-auto max-w-2xl space-y-8">
          <PoemReader
            title={poem.title}
            author={poem.author}
            authorSlug={poem.authorSlug}
            dynasty={poem.dynasty ?? ""}
            titlePinyin={poem.titlePinyin}
            authorPinyin={poem.authorPinyin}
            rhythmic={poem.rhythmic}
            tags={poem.tags ?? []}
            paragraphs={poem.paragraphs}
            paragraphsPinyin={poem.paragraphsPinyin}
            translation={poem.translation}
            annotation={poem.annotation}
            appreciation={poem.appreciation}
          />
          <p className="flex flex-wrap items-center gap-4 pt-4">
            <Link href="/poems/" className="cursor-pointer text-primary hover:underline">
              ← 返回诗文列表
            </Link>
          </p>
        </article>
      </LayoutWithSidebar>
    </ReadingSettingsProvider>
  );
}
