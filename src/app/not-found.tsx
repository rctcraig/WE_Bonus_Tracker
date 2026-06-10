import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[calc(100vh-66px)] place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
          Page not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          The link may be outdated or the page may have moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b]"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
