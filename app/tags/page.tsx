import type { Metadata } from "next";
import { getTags } from "@/lib/db";
import LayoutWithSidebar from "../../components/LayoutWithSidebar";
import SidebarLeftServer from "../../components/SidebarLeftServer";
import FilterableList from "../../components/FilterableList";

export const metadata: Metadata = {
  title: "标签",
  description: "按标签浏览诗词",
};

/** ISR：每小时重新生成一次，数据极少变化 */
export const revalidate = 3600;

/**
 * 标签列表：链接到该标签下诗词。支持客户端按名称过滤。
 * @author poetry
 */
export default async function TagsListPage() {
  const tags = await getTags();

  return (
    <LayoutWithSidebar sidebarLeft={<SidebarLeftServer />}>
      <div className="max-w-4xl space-y-8">
        <h1 className="font-serif text-2xl font-bold text-primary md:text-3xl">
          标签
        </h1>
        <p className="text-text/70">
          按标签浏览诗词，点击进入该标签下的作品列表。
        </p>
        <FilterableList
          items={tags}
          hrefPrefix="/poems/?tag="
          placeholder="搜索标签…"
          emptyText="暂无数据。去浏览诗文"
        />
      </div>
    </LayoutWithSidebar>
  );
}
