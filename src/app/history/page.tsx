import { Lock, Trophy } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
  getDriveForNineCampaignFromData,
  getMonthPlanFromData,
  money,
  percent,
  summarizeDriveForNine,
  summarizeMonth,
  summarizeQuarterFromData,
} from "@/lib/bonus-calculations";
import { requireCurrentProfile } from "@/lib/auth";
import { getPracticeData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  await requireCurrentProfile();
  const data = await getPracticeData();
  const years = [
    ...new Set(data.monthlyGoals.map((goal) => goal.month.slice(0, 4))),
  ].sort();
  const yearLabel = years.length > 0 ? years.join(", ") : "All time";
  const wonCampaign = data.driveForNineCampaigns.find(
    (campaign) => campaign.result === "won",
  );
  const wonCampaignLabel = wonCampaign
    ? (data.monthlyGoals.find((goal) => goal.month === wonCampaign.month)
        ?.label ?? wonCampaign.month)
    : null;
  const rows = data.monthlyGoals.map((goal) => {
    const entries = data.productionEntries.filter((entry) =>
      entry.date.startsWith(goal.month),
    );
    const summary = summarizeMonth(
      goal,
      getMonthPlanFromData(data.monthPlans, goal.month),
      entries,
    );
    const drive = summarizeDriveForNine(
      getDriveForNineCampaignFromData(data.driveForNineCampaigns, goal.month),
      summary,
    );

    return { drive, goal, summary };
  });

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="border-b border-line pb-6">
        <div className="mb-3 flex gap-2">
          <StatusBadge tone="neutral">{yearLabel}</StatusBadge>
          {wonCampaignLabel ? (
            <StatusBadge tone="good">
              {wonCampaignLabel} Drive for Nine won
            </StatusBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">
          History
        </h1>
        <p className="mt-2 text-sm text-muted">
          Closed months stay locked unless an admin records a change note.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {data.quarters.map((quarter) => {
          const summary = summarizeQuarterFromData(
            quarter,
            data.monthlyGoals,
            data.monthPlans,
            data.productionEntries,
            data.bonusTiers,
          );

          return (
            <div
              key={quarter.label}
              className="rounded-lg border border-line bg-panel p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                    {quarter.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink">
                    {percent(summary.pct)}
                  </p>
                </div>
                <StatusBadge
                  tone={
                    summary.profitabilityStatus === "favorable"
                      ? "good"
                      : "warning"
                  }
                >
                  {summary.profitabilityStatus}
                </StatusBadge>
              </div>
              <p className="mt-3 text-sm text-muted">
                {money(summary.actual)} of {money(summary.goal)}
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {summary.tier
                  ? `${money(summary.tier.amount)} estimated tier`
                  : "No tier reached"}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="bg-background text-left text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Month</th>
                <th className="px-5 py-3 text-right font-semibold">Goal</th>
                <th className="px-5 py-3 text-right font-semibold">Actual</th>
                <th className="px-5 py-3 text-right font-semibold">%</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Variance
                </th>
                <th className="px-5 py-3 font-semibold">Drive for Nine</th>
                <th className="px-5 py-3 font-semibold">Lock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ drive, goal, summary }) => {
                const variance = summary.actual - goal.s1pGoal;

                return (
                  <tr key={goal.month} className="border-t border-line">
                    <td className="px-5 py-3 font-medium text-ink">
                      {goal.label}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-ink">
                      {money(goal.s1pGoal)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-ink">
                      {summary.actual ? money(summary.actual) : "-"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-ink">
                      {summary.actual ? percent(summary.pctOfGoal, 2) : "-"}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono ${
                        variance >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {summary.actual ? money(variance) : "-"}
                    </td>
                    <td className="px-5 py-3">
                      {drive.active ? (
                        <StatusBadge tone={drive.qualified ? "good" : "warning"}>
                          <Trophy
                            className="mr-1 h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          {drive.shortLabel}
                        </StatusBadge>
                      ) : (
                        <span className="text-muted">Not active</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {goal.closed ? (
                        <StatusBadge tone="neutral">
                          <Lock
                            className="mr-1 h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Closed
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="good">Open</StatusBadge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
