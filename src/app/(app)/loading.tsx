export default function Loading() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-48 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface h-24 animate-pulse bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
