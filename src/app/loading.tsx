export default function Loading() {
  return (
    <main
      className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-24 animate-pulse rounded-lg border border-line bg-panel" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-lg border border-line bg-panel"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="h-72 animate-pulse rounded-lg border border-line bg-panel" />
        <div className="h-72 animate-pulse rounded-lg border border-line bg-panel" />
      </div>
    </main>
  );
}
