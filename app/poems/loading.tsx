/**
 * 诗文列表 loading 骨架。
 * @author poetry
 */
export default function PoemsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-32 rounded bg-secondary/20" />
      <div className="h-4 w-24 rounded bg-secondary/10" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-secondary/10 p-4">
            <div className="h-5 w-2/3 rounded bg-secondary/15" />
            <div className="mt-2 flex gap-2">
              <div className="h-3 w-16 rounded bg-secondary/10" />
              <div className="h-3 w-12 rounded bg-secondary/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
