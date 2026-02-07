/**
 * 主内容 + 左侧栏（+ 可选右侧栏）布局，列表页与详情页共用。
 * @author poetry
 */

import type { ReactNode } from "react";

interface LayoutWithSidebarProps {
  sidebarLeft: ReactNode;
  sidebarRight?: ReactNode;
  children: ReactNode;
}

export default function LayoutWithSidebar({
  sidebarLeft,
  sidebarRight,
  children,
}: LayoutWithSidebarProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <aside className="order-1 w-full shrink-0 lg:sticky lg:top-20 lg:w-52">
        {sidebarLeft}
      </aside>
      <div className="order-2 min-w-0 flex-1">
        {children}
      </div>
      {sidebarRight && (
        <aside className="order-3 w-full shrink-0 lg:w-56">
          {sidebarRight}
        </aside>
      )}
    </div>
  );
}
