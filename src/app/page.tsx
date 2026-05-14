import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Flag,
  LineChart,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { TierLadder } from "@/components/tier-ladder";
import {
  compactDate,
  fullDate,
  getDriveForNineCampaignFromData,
  getMonthGoalFromData,
  getMonthPlanFromData,
  getQuarterForMonthFromData,
  money,
  percent,
  summarizeDriveForNine,
  summarizeMonth,
  summarizeQuarterFromData,
} from "@/lib/bonus-calculations";
import { getActiveMonth, getPracticeData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getPracticeData();
  const activeMonth = getActiveMonth(data.monthlyGoals);
  const monthGoal = getMonthGoalFromData(data.monthlyGoals, activeMonth);
  const currentMonthPlan = getMonthPlanFromData(data.monthPlans, activeMonth);
  const monthEntries = data.productionEntries.filter((entry) =>
    entry.date.startsWith(activeMonth),
  );
  const currentMonthSummary = summarizeMonth(
    monthGoal,
    currentMonthPlan,
    monthEntries,
  );
  const currentQuarterSummary = summarizeQuarterFromData(
    getQuarterForMonthFromData(data.quarters, activeMonth),
    data.monthlyGoals,
    data.monthPlans,
    data.productionEntries,
    data.bonusTiers,
  );
  const currentDriveForNineSummary = summarizeDriveForNine(
    getDriveForNineCampaignFromData(data.driveForNineCampaigns, activeMonth),
    currentMonthSummary,
  );
  const nextDriveForNine = data.driveForNineCampaigns.find(
    (campaign) => campaign.active && campaign.month > activeMonth,
  );
  const lastEntry = monthEntries.at(-1);
  const monthForecastVariance =
    currentMonthSummary.forecast - monthGoal.s1pGoal;
  const schedulePaceVariance =
    currentMonthSummary.actual - currentMonthSummary.expectedThroughEntries;
  const remainingCapacityNeed =
    currentMonthSummary.remainingExpected > 0
      ? (currentMonthSummary.remainingNeeded /
          currentMonthSummary.remainingExpected) *
        100
      : 0;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <StatusBadge tone="neutral">{monthGoal.label} open</StatusBadge>
            <StatusBadge tone="good">Q1 paid tier tracked</StatusBadge>
            <StatusBadge tone="warning">Q2 profitability pending</StatusBadge>
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold text-ink sm:text-4xl">
            Daily production progress
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Adjusted production is calculated from total production minus credit
            adjustments. {monthGoal.label} includes the doctor-out schedule
            change on May 19.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-panel px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Last production entry
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            {lastEntry ? fullDate(lastEntry.date) : "No entry yet"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={`${monthGoal.label} adjusted`}
          value={money(currentMonthSummary.actual)}
          detail={`${percent(currentMonthSummary.pctOfGoal)} of ${money(
            monthGoal.s1pGoal,
          )} S1P goal`}
          icon={<LineChart className="h-4 w-4" aria-hidden="true" />}
          tone="neutral"
        />
        <MetricCard
          title="Remaining to goal"
          value={money(currentMonthSummary.remainingNeeded)}
          detail={`${percent(
            remainingCapacityNeed,
          )} of remaining scheduled capacity needed`}
          icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
          tone="warning"
        />
        <MetricCard
          title="Forecast"
          value={money(currentMonthSummary.forecast)}
          detail={`${money(
            Math.abs(monthForecastVariance),
          )} ${monthForecastVariance >= 0 ? "ahead of" : "behind"} ${
            monthGoal.label
          } goal`}
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          tone={monthForecastVariance >= 0 ? "good" : "danger"}
        />
        <MetricCard
          title="Drive for Nine"
          value={currentDriveForNineSummary.shortLabel}
          detail={
            currentDriveForNineSummary.active
              ? `${money(
                  currentDriveForNineSummary.toQualify,
                )} needed to reach 115%`
              : nextDriveForNine
                ? `Next active campaign is ${getMonthGoalFromData(
                    data.monthlyGoals,
                    nextDriveForNine.month,
                  ).label}`
                : "No upcoming campaign"
          }
          icon={<Flag className="h-4 w-4" aria-hidden="true" />}
          tone={currentDriveForNineSummary.qualified ? "good" : "neutral"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {monthGoal.label} pace
              </h2>
              <p className="text-sm text-muted">
                Official goal progress and schedule-capacity pace.
              </p>
            </div>
            <StatusBadge tone={schedulePaceVariance >= 0 ? "good" : "danger"}>
              {money(Math.abs(schedulePaceVariance))}{" "}
              {schedulePaceVariance >= 0 ? "ahead" : "behind"} plan
            </StatusBadge>
          </div>

          <div className="mt-6 space-y-6">
            <ProgressBar
              value={currentMonthSummary.pctOfGoal}
              label={`${monthGoal.label} S1P goal: ${percent(
                currentMonthSummary.pctOfGoal,
              )}`}
            />
            <ProgressBar
              value={
                currentMonthSummary.expectedThroughEntries > 0
                  ? (currentMonthSummary.actual /
                      currentMonthSummary.expectedThroughEntries) *
                    100
                  : 0
              }
              marker={100}
              label={`Schedule pace through ${lastEntry ? compactDate(lastEntry.date) : "latest entry"}`}
            />
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="border-t border-line pt-3">
              <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                Expected entered days
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ink">
                {money(currentMonthSummary.expectedThroughEntries)}
              </dd>
            </div>
            <div className="border-t border-line pt-3">
              <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                Remaining capacity
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ink">
                {money(currentMonthSummary.remainingExpected)}
              </dd>
            </div>
            <div className="border-t border-line pt-3">
              <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                Schedule change
              </dt>
              <dd className="mt-1 text-lg font-semibold text-danger">
                {money(currentMonthSummary.scheduleChangeImpact)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Q2 staff bonus</h2>
              <p className="text-sm text-muted">
                Estimated until profitability is marked favorable.
              </p>
            </div>
            <StatusBadge tone="warning">Profitability unknown</StatusBadge>
          </div>
          <div className="mt-5">
            <p className="text-3xl font-semibold text-ink">
              {percent(currentQuarterSummary.pct)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {money(currentQuarterSummary.actual)} of{" "}
              {money(currentQuarterSummary.goal)}
            </p>
          </div>
          <div className="mt-5">
            <TierLadder
              percentValue={currentQuarterSummary.pct}
              tiers={data.bonusTiers}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex flex-col gap-2 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Remaining {monthGoal.label} schedule
            </h2>
            <p className="text-sm text-muted">
              Doctor-day counts drive the remaining production forecast.
            </p>
          </div>
          <StatusBadge tone="good">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            20 planned dates cross-checked
          </StatusBadge>
        </div>
        <div className="divide-y divide-line md:hidden">
          {currentMonthSummary.remainingSchedule.map((day) => {
            const expected =
              day.dayType === "friday"
                ? day.doctors * (currentMonthPlan?.avgFridayDoctorDay ?? 0)
                : day.doctors * (currentMonthPlan?.avgMthDoctorDay ?? 0);

            return (
              <div key={day.date} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{fullDate(day.date)}</p>
                    <p className="mt-1 text-sm text-muted">
                      {day.dayType === "friday" ? "Friday" : "M-Th"} -{" "}
                      {day.doctors} doctors
                    </p>
                  </div>
                  <p className="font-mono font-semibold text-ink">
                    {money(expected)}
                  </p>
                </div>
                {day.changeReason ? (
                  <p className="mt-3 inline-flex items-center gap-1 text-sm text-danger">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {day.changeReason}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-background text-left text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 text-right font-semibold">Doctors</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Expected
                </th>
                <th className="px-5 py-3 font-semibold">Change</th>
              </tr>
            </thead>
            <tbody>
              {currentMonthSummary.remainingSchedule.map((day) => {
                const expected =
                  day.dayType === "friday"
                    ? day.doctors * (currentMonthPlan?.avgFridayDoctorDay ?? 0)
                    : day.doctors * (currentMonthPlan?.avgMthDoctorDay ?? 0);

                return (
                  <tr key={day.date} className="border-t border-line">
                    <td className="px-5 py-3 font-medium text-ink">
                      {fullDate(day.date)}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {day.dayType === "friday" ? "Friday" : "M-Th"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-ink">
                      {day.doctors}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-ink">
                      {money(expected)}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {day.changeReason ? (
                        <span className="inline-flex items-center gap-1 text-danger">
                          <AlertTriangle
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          {day.changeReason}
                        </span>
                      ) : (
                        "On plan"
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
