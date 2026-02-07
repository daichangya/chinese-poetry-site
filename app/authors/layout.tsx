import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "诗人",
  description: "浏览诗人列表与诗词",
};

export default function AuthorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
