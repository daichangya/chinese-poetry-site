import type { Metadata } from "next";
import { getRhythmics } from "@/lib/db";
import LayoutWithSidebar from "../../components/LayoutWithSidebar";
import SidebarLeftServer from "../../components/SidebarLeftServer";
import FilterableList from "../../components/FilterableList";

export const metadata: Metadata = {
  title: "词牌",
  description: "按词牌浏览诗词",
};

/** ISR：每小时重新生成一次，数据极少变化 */
export const revalidate = 3600;

/**
 * 词牌列表：链接到该词牌下诗词。支持客户端按名称过滤。
 * @author poetry
 */
export default async function RhythmicsListPage() {
  const rhythmics = await getRhythmics();

  return (
    <LayoutWithSidebar sidebarLeft={<SidebarLeftServer />}>
      <div className="max-w-4xl space-y-8">
        <h1 className="font-serif text-2xl font-bold text-primary md:text-3xl">
          词牌
        </h1>
        <p className="text-text/70">
          按词牌浏览宋词等，点击进入该词牌下的作品列表。
        </p>
        <FilterableList
          items={rhythmics}
          hrefPrefix="/poems/?rhythmic="
          placeholder="搜索词牌…"
          emptyText="暂无数据。去浏览诗文"
        />
      </div>
    </LayoutWithSidebar>
  );
}
