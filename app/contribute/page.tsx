import Link from "next/link";
import type { Metadata } from "next";

/**
 * 贡献指南：纠错与完善、内容贡献说明。
 * 诗词详情页右侧栏「查看教程」在未配置外部教程链接时指向本页。
 * @author poetry
 */

export const metadata: Metadata = {
  title: "贡献指南",
  description: "诗词内容纠错与完善、贡献方式说明",
};

/** 未配置时使用 .md 仓库（纠错与完善、贡献入口） */
const REPO = process.env.NEXT_PUBLIC_SOURCE_REPO ?? "https://github.com/daichangya/chinese-poetry-md";

/** 诗词原始数据来源仓库（chinese-poetry） */
const DATA_SOURCE_URL = "https://github.com/daichangya/chinese-poetry";

export default function ContributePage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-bold text-primary md:text-3xl">
          贡献指南
        </h1>
        <p className="mt-2 text-text/80">
          欢迎参与诗词内容的纠错与完善。
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-primary">数据来源</h2>
        <p className="text-sm text-text/80">
          本站诗词原始数据来源于开源仓库
          <a
            href={DATA_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer text-primary hover:underline"
          >
            chinese-poetry
          </a>
          ，最全中华古诗词数据库（唐诗、宋诗、宋词等）。
        </p>
      </section>

      <section className="space-y-3 text-text/90">
        <h2 className="text-lg font-semibold text-primary">如何贡献</h2>
        <ul className="list-inside list-disc space-y-2 text-sm">
          <li>
            在<strong>诗词详情页</strong>右侧栏点击「纠错与完善/内容贡献」按钮，可跳转到该首诗的源文件（Markdown）进行编辑。
          </li>
          <li>
            每首诗对应一个 <code className="rounded bg-secondary/20 px-1">poems/作者slug/诗题slug.md</code> 文件，可增补或修改正文、译文、注释、赏析、拼音等。
          </li>
          <li>
            修改后执行站点的构建流程（如 <code className="rounded bg-secondary/20 px-1">npm run build</code>）即可更新站点与搜索索引。
          </li>
        </ul>
      </section>

      {REPO && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary">仓库与文档</h2>
          <p className="text-sm text-text/80">
            本站网站与 Markdown 内容托管于以下仓库，可在仓库中参与编辑与讨论：
          </p>
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            前往仓库
          </a>
        </section>
      )}

      <p className="pt-4">
        <Link
          href="/"
          className="cursor-pointer text-primary hover:underline"
        >
          ← 返回首页
        </Link>
      </p>
    </article>
  );
}
