import Link from "next/link";
import type { Metadata } from "next";
import { getRhythmics } from "@/lib/db";
import LayoutWithSidebar from "../../components/LayoutWithSidebar";
import SidebarLeft from "../../components/SidebarLeft";

export const metadata: Metadata = {
  title: "词牌",
  description: "按词牌浏览诗词",
};

/** 支持 ?q= 时过滤，需按请求渲染 */
export const dynamic = "force-dynamic";

/**
 * 词牌列表：链接到该词牌下诗词。支持 ?q= 按名称过滤。
 * @author poetry
 */
export default async function RhythmicsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const raw = await getRhythmics();
  const filter = (q ?? "").trim().toLowerCase();
  const rhythmics = filter
    ? raw.filter((r) => r.name.toLowerCase().includes(filter) || (r.slug && r.slug.toLowerCase().includes(filter)))
    : raw;

  return (
    <LayoutWithSidebar sidebarLeft={<SidebarLeft />}>
      <div className="max-w-4xl space-y-8">
        <h1 className="font-serif text-2xl font-bold text-primary md:text-3xl">
          词牌
        </h1>
        <p className="text-text/70">
          按词牌浏览宋词等，点击进入该词牌下的作品列表。
        </p>
        {rhythmics.length === 0 ? (
          <p className="text-text/70">暂无数据。去浏览诗文</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {rhythmics.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/poems/?rhythmic=${encodeURIComponent(r.name)}`}
                  className="cursor-pointer flex items-baseline justify-between gap-2 rounded-lg border border-secondary/20 p-4 transition-colors duration-200 hover:border-primary hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <span className="min-w-0 truncate font-semibold text-text">
                    {r.name}
                  </span>
                  <span className="shrink-0 text-sm text-text/60">
                    {r.poem_count} 首
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </LayoutWithSidebar>
  );
}
