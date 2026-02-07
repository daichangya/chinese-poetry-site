/**
 * 站脚：版权、关于/纠错入口、可选站点统计。
 * @author poetry
 */

import Link from "next/link";

const SITE_NAME = "诗词";
/** 未配置时使用 .md 仓库（纠错/反馈指向该仓库） */
const REPO = process.env.NEXT_PUBLIC_SOURCE_REPO ?? "https://github.com/daichangya/chinese-poetry-md";

/** 诗词原始数据来源（chinese-poetry） */
const DATA_SOURCE_URL = "https://github.com/daichangya/chinese-poetry";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-secondary/20 bg-background">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-text/70">
          <span>
            © {year} {SITE_NAME}
          </span>
          <nav className="flex flex-wrap items-center gap-4">
            <a
              href={DATA_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer rounded transition-colors duration-200 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              数据来源
            </a>
            <Link
              href="/dynasties/"
              className="cursor-pointer rounded transition-colors duration-200 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              朝代
            </Link>
            <Link
              href="/authors/"
              className="cursor-pointer rounded transition-colors duration-200 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              诗人
            </Link>
            {REPO && (
              <a
                href={REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer rounded transition-colors duration-200 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                纠错 / 反馈
              </a>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
