/**
 * 诗人列表 loading 骨架。
 * @author poetry
 */
export default function AuthorsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-24 rounded bg-secondary/20" />
      <div className="h-4 w-32 rounded bg-secondary/10" />
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-secondary/10 p-4">
            <div className="flex items-baseline justify-between">
              <div className="h-4 w-20 rounded bg-secondary/15" />
              <div className="h-3 w-10 rounded bg-secondary/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
