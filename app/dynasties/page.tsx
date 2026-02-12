import type { Metadata } from "next";
import { getDynasties } from "@/lib/db";
import LayoutWithSidebar from "../../components/LayoutWithSidebar";
import SidebarLeftServer from "../../components/SidebarLeftServer";
import FilterableList from "../../components/FilterableList";

export const metadata: Metadata = {
  title: "朝代",
  description: "按朝代浏览诗词",
};

/** ISR：每小时重新生成一次，数据极少变化 */
export const revalidate = 3600;

/**
 * 朝代列表：链接到该朝代诗词。支持客户端按名称过滤。
 * @author poetry
 */
export default async function DynastiesListPage() {
  const dynasties = await getDynasties();

  return (
    <LayoutWithSidebar sidebarLeft={<SidebarLeftServer />}>
      <div className="max-w-4xl space-y-8">
        <h1 className="font-serif text-2xl font-bold text-primary md:text-3xl">
          朝代
        </h1>
        <p className="text-text/70">
          按朝代浏览诗词，点击进入该朝代下的诗作列表。
        </p>
        <FilterableList
          items={dynasties}
          hrefPrefix="/poems/?dynasty="
          placeholder="搜索朝代…"
          emptyText="暂无数据。去浏览诗文"
        />
      </div>
    </LayoutWithSidebar>
  );
}
