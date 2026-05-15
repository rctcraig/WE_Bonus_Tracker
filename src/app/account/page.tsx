import { KeyRound, UserCircle } from "lucide-react";
import { ChangePasswordForm } from "@/app/account/change-password-form";
import { StatusBadge } from "@/components/status-badge";
import { requireCurrentProfile } from "@/lib/auth";
import { roleLabels } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await requireCurrentProfile();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="border-b border-line pb-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusBadge tone="neutral">{roleLabels[profile.role]}</StatusBadge>
          <StatusBadge tone="good">Signed in</StatusBadge>
        </div>
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">
          Account
        </h1>
        <p className="mt-2 text-sm text-muted">
          Manage your WE Bonus Tracker sign-in.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
              <UserCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink">
                {profile.fullName}
              </h2>
              <p className="mt-1 break-all text-sm text-muted">
                {profile.email}
              </p>
            </div>
          </div>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
              <dt className="text-muted">Role</dt>
              <dd className="font-semibold text-ink">
                {roleLabels[profile.role]}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Notifications</dt>
              <dd className="font-semibold text-ink">
                {profile.notificationsEnabled ? "Enabled" : "Off"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Change password
              </h2>
              <p className="mt-1 text-sm text-muted">
                Use at least 8 characters.
              </p>
            </div>
          </div>
          <ChangePasswordForm />
        </div>
      </section>
    </main>
  );
}
