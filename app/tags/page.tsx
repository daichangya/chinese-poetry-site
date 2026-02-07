import Link from "next/link";
import type { Metadata } from "next";
import { getTags } from "@/lib/db";
import LayoutWithSidebar from "../../components/LayoutWithSidebar";
import SidebarLeft from "../../components/SidebarLeft";

export const metadata: Metadata = {
  title: "标签",
  description: "按标签浏览诗词",
};

/** 构建时静态生成 */
export const dynamic = "force-static";

/**
 * 标签列表：链接到该标签下诗词。数据来自 SQLite / JSON。
 * @author poetry
 */
export default async function TagsListPage() {
  const tags = await getTags();

  return (
    <LayoutWithSidebar sidebarLeft={<SidebarLeft />}>
      <div className="max-w-4xl space-y-8">
        <h1 className="font-serif text-2xl font-bold text-primary md:text-3xl">
          标签
        </h1>
        <p className="text-text/70">
          按标签浏览诗词，点击进入该标签下的作品列表。
        </p>
        {tags.length === 0 ? (
          <p className="text-text/70">暂无数据。去浏览诗文</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {tags.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/poems/?tag=${encodeURIComponent(t.name)}`}
                  className="cursor-pointer flex items-baseline justify-between gap-2 rounded-lg border border-secondary/20 p-4 transition-colors duration-200 hover:border-primary hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <span className="min-w-0 truncate font-semibold text-text">
                    {t.name}
                  </span>
                  <span className="shrink-0 text-sm text-text/60">
                    {t.poem_count} 首
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
