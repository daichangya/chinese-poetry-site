"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 随机一首：请求 /api/poems/random?n=1，跳转至该诗详情。
 * @author poetry
 */
export default function RandomPoemPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "done">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/poems/random?n=1");
        if (!res.ok || cancelled) {
          router.replace("/poems/");
          return;
        }
        const data = (await res.json()) as { slug: string; title: string; author_name: string }[];
        if (!Array.isArray(data) || data.length === 0) {
          router.replace("/poems/");
          return;
        }
        const slug = data[0]!.slug;
        if (!cancelled) router.replace(`/poems/${slug}/`);
      } catch {
        if (!cancelled) router.replace("/poems/");
      } finally {
        if (!cancelled) setStatus("done");
      }
    })();
  }, [router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-text/70">
        随机抽取中…
      </div>
    );
  }
  return null;
}
