import Link from "next/link";
import type { Metadata } from "next";
import { getAuthors, countAuthors } from "@/lib/db";
import LayoutWithSidebar from "../../components/LayoutWithSidebar";
import SidebarLeft from "../../components/SidebarLeft";
import Pagination from "../../components/Pagination";

export const metadata: Metadata = {
  title: "诗人",
  description: "浏览诗人列表与诗词",
};

const PAGE_SIZE = 40;

/**
 * 作者列表：分页，从 DB 读取。
 * @author poetry
 */
export default async function AuthorsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageStr, q } = await searchParams;
  const filter = (q ?? "").trim().toLowerCase();
  const hasFilter = filter.length > 0;

  let authors: Awaited<ReturnType<typeof getAuthors>>;
  let total: number;
  let totalPages: number;
  let currentPage: number;

  if (hasFilter) {
    const raw = await getAuthors(0, 10000);
    const filtered = raw.filter(
      (a) => a.name.toLowerCase().includes(filter) || a.slug.toLowerCase().includes(filter)
    );
    authors = filtered;
    total = filtered.length;
    totalPages = 1;
    currentPage = 1;
  } else {
    const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
    total = await countAuthors();
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * PAGE_SIZE;
    authors = await getAuthors(offset, PAGE_SIZE);
  }

  return (
    <LayoutWithSidebar sidebarLeft={<SidebarLeft />}>
      <div className="max-w-4xl space-y-8">
        <h1 className="font-serif text-2xl font-bold text-primary md:text-3xl">
          诗人
        </h1>
        <p className="text-text/70">共 {total} 位作者</p>
        <p className="text-text/70">
          按诗人浏览，点击进入该作者的诗作与简介。
        </p>
        {authors.length === 0 ? (
          <p className="text-text/70">暂无数据。去浏览诗文</p>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {authors.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/authors/${a.slug}/`}
                    className="cursor-pointer flex items-baseline justify-between gap-2 rounded-lg border border-secondary/20 p-4 transition-colors duration-200 hover:border-primary hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <span className="min-w-0 truncate font-semibold text-text">
                      {a.name}
                    </span>
                    <span className="shrink-0 text-sm text-text/60">
                      {a.poem_count} 首
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {!hasFilter && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath="/authors"
              />
            )}
          </>
        )}
      </div>
    </LayoutWithSidebar>
  );
}
