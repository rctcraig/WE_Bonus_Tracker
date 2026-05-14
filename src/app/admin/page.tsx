import { BellRing, ShieldCheck, Smartphone } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { users } from "@/lib/seed-data";

const roleLabels = {
  admin: "Admin",
  manager: "Manager",
  doctor: "Doctor",
  leadership: "Leadership",
  staff: "Staff",
};

export default function AdminPage() {
  const notificationCount = users.filter((user) => user.notificationEligible)
    .length;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="border-b border-line pb-6">
        <div className="mb-3 flex gap-2">
          <StatusBadge tone="neutral">Roles</StatusBadge>
          <StatusBadge tone="warning">Supabase env pending</StatusBadge>
        </div>
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Admin</h1>
        <p className="mt-2 text-sm text-muted">
          Practice access, notification eligibility, month locks, and audit
          history.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Editable roles"
          value="2"
          detail="Admin and manager"
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          title="Push recipients"
          value={notificationCount.toString()}
          detail="Staff role disabled by default"
          icon={<BellRing className="h-4 w-4" aria-hidden="true" />}
          tone="good"
        />
        <MetricCard
          title="PWA"
          value="Ready"
          detail="Installable shell and notification storage"
          icon={<Smartphone className="h-4 w-4" aria-hidden="true" />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
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
              <dt className="text-muted">Quarter tier change</dt>
              <dd className="font-semibold text-ink">Immediate</dd>
            </div>
          </dl>
        </div>

        <section className="rounded-lg border border-line bg-panel shadow-sm">
          <div className="border-b border-line p-5">
            <h2 className="text-lg font-semibold text-ink">User groups</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead className="bg-background text-left text-xs uppercase tracking-[0.08em] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Group</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Notifications</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.name} className="border-t border-line">
                    <td className="px-5 py-3 font-medium text-ink">
                      {user.name}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {roleLabels[user.role]}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        tone={user.notificationEligible ? "good" : "neutral"}
                      >
                        {user.notificationEligible ? "Enabled" : "Off"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
