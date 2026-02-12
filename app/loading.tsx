/**
 * 全局路由级 loading 骨架：在服务端渲染完成前展示，避免白屏。
 * @author poetry
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="mx-auto h-8 w-48 rounded bg-secondary/20" />
      <div className="mx-auto h-4 w-64 rounded bg-secondary/10" />
      <div className="flex justify-center gap-4">
        <div className="h-12 w-28 rounded-lg bg-secondary/20" />
        <div className="h-12 w-28 rounded-lg bg-secondary/10" />
        <div className="h-12 w-20 rounded-lg bg-secondary/10" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-secondary/10 p-4">
            <div className="h-5 w-3/4 rounded bg-secondary/15" />
            <div className="mt-2 h-3 w-1/2 rounded bg-secondary/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
