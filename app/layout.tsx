import type { Metadata } from "next";
import { Suspense } from "react";
import { Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import AnalyticsOrHeadScripts from "../components/AnalyticsOrHeadScripts";

/**
 * 主字体：Noto Serif SC，通过 next/font 预加载并内联 CSS，
 * 消除 CSS @import 的渲染阻塞问题。display: swap 确保文本立即可见。
 */
const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-noto-serif-sc",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.shi-ci.cn";

export const metadata: Metadata = {
  title: { default: "诗词", template: "%s | 诗词" },
  description: "中文诗词阅读与浏览",
  keywords: ["诗词", "古诗", "唐诗", "宋词", "中文诗词"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "诗词",
    description: "中文诗词阅读与浏览",
    locale: "zh_CN",
    type: "website",
    images: [{ url: "/icon.svg", alt: "诗词" }],
  },
  twitter: {
    card: "summary",
    title: "诗词",
    description: "中文诗词阅读与浏览",
    images: ["/icon.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans" className={notoSerifSC.variable} suppressHydrationWarning>
      <head>
        <meta name="baidu-site-verification" content="codeva-QthFvdvWPv" />
        {/* 预连接 Google Fonts，加速装饰字体按需加载 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("poetry-theme");if(t==="warm"||t==="ink"||t==="blue")document.documentElement.setAttribute("data-theme",t);})();`,
          }}
        />
        <AnalyticsOrHeadScripts />
      </head>
      <body className="flex min-h-screen flex-col">
        <Suspense fallback={<header className="h-14 border-b border-secondary/20" />}>
          <Nav />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 md:px-6 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
