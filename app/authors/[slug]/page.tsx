import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAuthorBySlug, getPoemsByAuthorSlug, getAuthorSlugsForSSG } from "@/lib/db";
import LayoutWithSidebar from "../../../components/LayoutWithSidebar";
import SidebarLeft from "../../../components/SidebarLeft";
import Pagination from "../../../components/Pagination";

export const dynamicParams = true;

/** 分层 SSG：预渲染前 M 个作者（默认 50），其余按需生成；设 BUILD_SSG_AUTHOR_LIMIT=0 可关闭 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const limit = parseInt(process.env.BUILD_SSG_AUTHOR_LIMIT ?? "20000", 10) || 0;
  if (limit <= 0) return [];
  const slugs = await getAuthorSlugsForSSG(limit);
  return slugs.map((slug) => ({ slug }));
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.shi-ci.cn";

/** 作者详情页诗文每页条数，与诗人列表页一致 */
const PAGE_SIZE = 40;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "未找到" };
  const title = `${author.name} - 诗人`;
  const description = `${author.name}，共 ${author.poem_count} 首诗词`;
  const url = `${siteUrl}/authors/${author.slug}/`;
  return {
    title: author.name,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

/**
 * 作者详情：作者名、诗作数量、生平（若有）、名下诗词列表分页。数据来自 SQLite。
 * @author poetry
 */
export default async function AuthorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const totalPages = Math.max(1, Math.ceil(author.poem_count / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, parseInt(pageStr ?? "1", 10) || 1), totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const authorPoems = await getPoemsByAuthorSlug(slug, offset, PAGE_SIZE);

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    url: `${siteUrl}/authors/${author.slug}/`,
  };

  return (
    <LayoutWithSidebar sidebarLeft={<SidebarLeft />}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <div className="max-w-4xl space-y-8">
        <header>
          <h1 className="font-serif text-2xl font-bold text-primary md:text-3xl">
            {author.name}
          </h1>
          <p className="text-text/70">共 {author.poem_count} 首</p>
        </header>
        {author.description && (
          <section className="rounded-lg border border-secondary/20 bg-background p-6 shadow-sm">
            <h2 className="mb-2 font-semibold text-primary">生平</h2>
            <div className="whitespace-pre-wrap text-text/90">{author.description}</div>
          </section>
        )}
        <section>
          <h2 className="mb-3 font-semibold text-primary">诗文</h2>
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {authorPoems.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/poems/${p.slug}/`}
                  className="flex cursor-pointer items-center rounded-lg border border-secondary/20 p-3 text-primary transition-colors duration-200 hover:border-primary hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <span className="min-w-0 truncate font-medium text-text">{p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={`/authors/${author.slug}`}
          />
        </section>
        <p>
          <Link
            href="/authors/"
            className="cursor-pointer text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            ← 返回诗人列表
          </Link>
        </p>
      </div>
    </LayoutWithSidebar>
  );
}
