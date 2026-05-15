import { BellRing, MailPlus, ShieldCheck, Smartphone, Users } from "lucide-react";
import { InviteForm } from "@/app/admin/invite-form";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { requireCurrentProfile } from "@/lib/auth";
import { assignableRolesFor, roleLabels } from "@/lib/roles";
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

export default async function AdminPage() {
  const currentProfile = await requireCurrentProfile();
  const assignableRoles = assignableRolesFor(currentProfile.role);
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id,full_name,role,notifications_enabled,created_at")
    .eq("practice_id", currentProfile.practiceId)
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  const profiles = (data ?? []) as ProfileRow[];
  const notificationCount = profiles.filter(
    (profile) => profile.notifications_enabled,
  ).length;

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
        </div>
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Admin</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Invite-only access for Wichita Endodontics. Admins can invite office
          managers, doctors, leadership, and future staff users; office managers
          can invite doctors, leadership, and staff.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
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
        <MetricCard
          title="Push recipients"
          value={notificationCount.toString()}
          detail="Staff role remains notification-off by default"
          icon={<BellRing className="h-4 w-4" aria-hidden="true" />}
          tone="good"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
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

        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Notifications</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
              <dt className="text-muted">Missing entry reminder</dt>
              <dd className="font-semibold text-ink">12:00 PM</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
              <dt className="text-muted">Monday summary</dt>
              <dd className="font-semibold text-ink">8:00 AM</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
              <dt className="text-muted">Drive for Nine threshold</dt>
              <dd className="font-semibold text-ink">Immediate</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">PWA shell</dt>
              <dd className="inline-flex items-center gap-1 font-semibold text-ink">
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                Ready
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-lg font-semibold text-ink">Practice users</h2>
          <p className="text-sm text-muted">
            Roles control who can invite and who can save production entries.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-background text-left text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Notifications</th>
                <th className="px-5 py-3 font-semibold">Access</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.user_id} className="border-t border-line">
                  <td className="px-5 py-3 font-medium text-ink">
                    {profile.full_name}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {roleLabels[profile.role]}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge
                      tone={profile.notifications_enabled ? "good" : "neutral"}
                    >
                      {profile.notifications_enabled ? "Enabled" : "Off"}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {profile.role === "admin" || profile.role === "manager"
                      ? "Can save and invite"
                      : profile.role === "staff"
                        ? "Future staff view"
                        : "View only"}
                  </td>
                </tr>
              ))}
              {!profiles.length ? (
                <tr className="border-t border-line">
                  <td className="px-5 py-8 text-muted" colSpan={4}>
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
