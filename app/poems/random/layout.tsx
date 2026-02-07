import type { Metadata } from "next";

/**
 * 随机一首页 layout：设置 noindex，避免收录跳转中间页。
 * @author poetry
 */
export const metadata: Metadata = {
  title: "随机一首",
  description: "随机跳转到一首诗词",
  robots: { index: false, follow: true },
};

export default function RandomPoemLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
