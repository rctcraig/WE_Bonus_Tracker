import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/";

  return (
    <main className="grid min-h-[calc(100vh-66px)] place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Wichita Endodontics
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            Sign in to WE Bonus Tracker
          </h1>
          <p className="mt-2 text-sm text-muted">
            Use the email and password from your invite.
          </p>
        </div>
        {params.error === "profile" ? (
          <p className="mb-4 rounded-lg border border-[#f3bbb5] bg-[#fff0ee] px-3 py-2 text-sm font-medium text-danger">
            Your sign-in works, but this account has not been assigned to the
            practice yet. Ask an admin to resend the invite.
          </p>
        ) : null}
        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
