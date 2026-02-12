import LayoutWithSidebar from "../../components/LayoutWithSidebar";
import SidebarLeftServer from "../../components/SidebarLeftServer";
import PoemsListClient from "../../components/PoemsListClient";

/**
 * 诗词列表页（服务端组件）：侧边栏通过 SidebarLeftServer 服务端预取，
 * 诗词列表由 PoemsListClient 客户端组件仅发起 1 个 /api/poems 请求。
 * @author poetry
 */
export default function PoemsListPage() {
  return (
    <LayoutWithSidebar sidebarLeft={<SidebarLeftServer />}>
      <PoemsListClient />
    </LayoutWithSidebar>
  );
}
