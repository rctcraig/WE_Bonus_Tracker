import { SetPasswordForm } from "@/app/auth/set-password/set-password-form";

export default function SetPasswordPage() {
  return (
    <main className="grid min-h-[calc(100vh-66px)] place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Invite accepted
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            Set or reset your password
          </h1>
          <p className="mt-2 text-sm text-muted">
            Create a new password to finish setup or regain access.
          </p>
        </div>
        <SetPasswordForm />
      </section>
    </main>
  );
}
