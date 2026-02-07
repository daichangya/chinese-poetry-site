import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "诗文",
  description: "浏览与搜索诗词，按朝代、诗人、标签筛选",
};

export default function PoemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
