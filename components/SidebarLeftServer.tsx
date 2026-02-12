/**
 * SidebarLeft 服务端 wrapper：在服务端获取侧边栏数据，通过 props 传给客户端组件，
 * 消除客户端 4 个 API roundtrip。用于所有服务端渲染的页面。
 * @author poetry
 */

import { getSidebarData } from "@/lib/sidebar-data";
import SidebarLeft from "./SidebarLeft";

export default async function SidebarLeftServer() {
  const data = await getSidebarData();
  return <SidebarLeft initialData={data} />;
}
