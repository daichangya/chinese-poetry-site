import Link from "next/link";
import type { Metadata } from "next";
import { countPoems, countAuthors, countDynasties } from "@/lib/db";
import LayoutWithSidebar from "../components/LayoutWithSidebar";
import SidebarLeft from "../components/SidebarLeft";
import HomeRecommendations from "../components/HomeRecommendations";

const HOME_RECOMMEND_SIZE = 10;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shi-ci.cn";

export const metadata: Metadata = {
  title: "诗词",
  description: "浏览与搜索中文古诗词，按朝代、诗人、标签筛选",
  keywords: ["诗词", "古诗", "唐诗", "宋词", "中文诗词"],
};

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: siteUrl,
  name: "诗词",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/poems/?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

/**
 * 首页：统计、入口、推荐几首（客户端请求 /api/poems/random）。
 * @author poetry
 */
export default async function HomePage() {
  const totalPoems = await countPoems();
  const totalAuthors = await countAuthors();
  const totalDynasties = await countDynasties();

  return (
    <LayoutWithSidebar sidebarLeft={<SidebarLeft />}>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
    />
    <div className="space-y-10">
      <section className="text-center">
        <h1 className="font-serif text-3xl font-bold text-primary md:text-4xl">
          诗词
        </h1>
        <p className="mt-2 text-text/80">中文诗词阅读与浏览</p>
        <p className="mt-3 text-sm text-text/60">
          共 {totalPoems.toLocaleString()} 首诗词 · {totalAuthors.toLocaleString()} 位诗人 · {totalDynasties} 个朝代
        </p>
      </section>
      <section className="flex flex-wrap justify-center gap-4">
        <Link
          href="/poems/"
          className="cursor-pointer rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-secondary"
        >
          浏览诗文
        </Link>
        <Link
          href="/poems/random/"
          className="cursor-pointer rounded-lg border-2 border-primary px-6 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
        >
          随机一首
        </Link>
        <Link
          href="/authors/"
          className="cursor-pointer rounded-lg border-2 border-cta px-6 py-3 font-medium text-cta transition-colors hover:bg-cta hover:text-white"
        >
          诗人
        </Link>
        <Link
          href="/dynasties/"
          className="cursor-pointer rounded-lg border-2 border-secondary px-6 py-3 font-medium text-secondary transition-colors hover:bg-secondary hover:text-white"
        >
          朝代
        </Link>
      </section>
      <HomeRecommendations count={HOME_RECOMMEND_SIZE} />
    </div>
    </LayoutWithSidebar>
  );
}
