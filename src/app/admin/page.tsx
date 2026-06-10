import { MailPlus, ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { InviteForm } from "@/app/admin/invite-form";
import { SendSetupLinkButton } from "@/app/admin/send-setup-link-button";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { requireCurrentProfile } from "@/lib/auth";
import { assignableRolesFor, canInvite, roleLabels } from "@/lib/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

type ProfileRow = {
  user_id: string;
  full_name: string;
  role: Role;
  notifications_enabled: boolean;
  created_at: string;
};

type PracticeUser = ProfileRow & {
  email: string | null;
  emailConfirmed: boolean;
  lastSignInAt: string | null;
};

export default async function AdminPage() {
  const currentProfile = await requireCurrentProfile();

  if (!canInvite(currentProfile.role)) {
    redirect("/");
  }

  const assignableRoles = assignableRolesFor(currentProfile.role);
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id,full_name,role,notifications_enabled,created_at")
    .eq("practice_id", currentProfile.practiceId)
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });
  const { data: authUsersData, error: authUsersError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  const profiles = (data ?? []) as ProfileRow[];
  const authUsersById = new Map(
    (authUsersData?.users ?? []).map((user) => [user.id, user]),
  );
  const practiceUsers: PracticeUser[] = profiles.map((profile) => {
    const authUser = authUsersById.get(profile.user_id);

    return {
      ...profile,
      email: authUser?.email ?? null,
      emailConfirmed: Boolean(authUser?.email_confirmed_at),
      lastSignInAt: authUser?.last_sign_in_at ?? null,
    };
  });
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="border-b border-line pb-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusBadge tone="neutral">
            Signed in as {roleLabels[currentProfile.role]}
          </StatusBadge>
          <StatusBadge tone={assignableRoles.length ? "good" : "neutral"}>
            {assignableRoles.length ? "Invites enabled" : "View only"}
          </StatusBadge>
          {error ? <StatusBadge tone="danger">Profile load issue</StatusBadge> : null}
          {authUsersError ? (
            <StatusBadge tone="danger">Auth user load issue</StatusBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Admin</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Invite-only access for Wichita Endodontics. Admins can invite office
          managers, doctors, leadership, and future staff users; office managers
          can invite doctors, leadership, and staff.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Active profiles"
          value={profiles.length.toString()}
          detail="Supabase Auth-backed users"
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          title="Invite roles"
          value={assignableRoles.length.toString()}
          detail={
            assignableRoles.length
              ? assignableRoles.map((role) => roleLabels[role]).join(", ")
              : "No invite permission"
          }
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          tone={assignableRoles.length ? "good" : "neutral"}
        />
      </section>

      <section>
        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Invite a user</h2>
              <p className="mt-1 text-sm text-muted">
                New users receive an email link that sends them to password
                setup.
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
              <MailPlus className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          {assignableRoles.length ? (
            <InviteForm roles={assignableRoles} />
          ) : (
            <div className="mt-5 rounded-lg border border-line bg-background px-4 py-3 text-sm text-muted">
              Your current role can view access settings, but only admins and
              office managers can send invites.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-lg font-semibold text-ink">Practice users</h2>
          <p className="text-sm text-muted">
            Send a fresh setup link when an invite expires or a user needs to
            reset their password.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-background text-left text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Access</th>
                <th className="px-5 py-3 font-semibold">Setup</th>
              </tr>
            </thead>
            <tbody>
              {practiceUsers.map((profile) => (
                <tr key={profile.user_id} className="border-t border-line">
                  <td className="px-5 py-3 font-medium text-ink">
                    {profile.full_name}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {profile.email ?? "No email"}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {roleLabels[profile.role]}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge
                      tone={profile.emailConfirmed ? "good" : "warning"}
                    >
                      {profile.emailConfirmed ? "Active" : "Invite pending"}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {profile.role === "admin" || profile.role === "manager"
                      ? "Can save and invite"
                      : profile.role === "staff"
                        ? "Future staff view"
                        : "View only"}
                  </td>
                  <td className="px-5 py-3">
                    <SendSetupLinkButton userId={profile.user_id} />
                  </td>
                </tr>
              ))}
              {!profiles.length ? (
                <tr className="border-t border-line">
                  <td className="px-5 py-8 text-muted" colSpan={6}>
                    No profiles found yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
