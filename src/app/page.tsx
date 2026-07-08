import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Flag,
  LineChart,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import {
  MonthPaceChart,
  type MonthPacePoint,
} from "@/components/month-pace-chart";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { TierLadder } from "@/components/tier-ladder";
import {
  adjustedProduction,
  compactDate,
  expectedForScheduleDay,
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
  summarizeQuarterProjectionFromData,
} from "@/lib/bonus-calculations";
import { requireCurrentProfile } from "@/lib/auth";
import { getActiveMonth, getPracticeData } from "@/lib/data";
import type {
  DayType,
  MonthPlan,
  MonthlyGoal,
  ProductionEntry,
  Quarter,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type QuarterRallyWindow = {
  estimatedDoctorDays: number;
  estimatedMonths: string[];
  fridayDoctors: number;
  mthDoctors: number;
  plannedDoctorDays: number;
  totalDoctorDays: number;
};

function mostCommonDoctorCount(
  plan: MonthPlan | undefined,
  dayType: DayType,
  fallback: number,
) {
  const counts = new Map<number, number>();

  for (const day of plan?.scheduledDays ?? []) {
    if (day.dayType !== dayType) {
      continue;
    }

    counts.set(day.doctors, (counts.get(day.doctors) ?? 0) + 1);
  }

  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ??
    fallback
  );
}

function estimateDoctorDaysForMonth(
  month: string,
  mthDoctors: number,
  fridayDoctors: number,
  enteredDates = new Set<string>(),
) {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthIndex = monthNumber - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  let doctorDays = 0;

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, monthIndex, day, 12);
    const weekday = date.getDay();
    const dateKey = `${month}-${String(day).padStart(2, "0")}`;

    if (enteredDates.has(dateKey)) {
      continue;
    }

    if (weekday >= 1 && weekday <= 4) {
      doctorDays += mthDoctors;
    }

    if (weekday === 5) {
      doctorDays += fridayDoctors;
    }
  }

  return doctorDays;
}

function getQuarterRallyWindow({
  activeMonth,
  currentMonthPlan,
  entries,
  goals,
  plans,
  quarter,
}: {
  activeMonth: string;
  currentMonthPlan: MonthPlan | undefined;
  entries: ProductionEntry[];
  goals: MonthlyGoal[];
  plans: MonthPlan[];
  quarter: Quarter;
}): QuarterRallyWindow {
  const mthDoctors = mostCommonDoctorCount(currentMonthPlan, "mth", 6);
  const fridayDoctors = mostCommonDoctorCount(currentMonthPlan, "friday", 3);

  return quarter.months.reduce<QuarterRallyWindow>(
    (window, month) => {
      if (month < activeMonth) {
        return window;
      }

      const plan = getMonthPlanFromData(plans, month);
      const monthEntries = entries.filter((entry) =>
        entry.date.startsWith(month),
      );
      const enteredDates = new Set(monthEntries.map((entry) => entry.date));

      if (plan) {
        const plannedDoctorDays = plan.scheduledDays
          .filter((day) => !enteredDates.has(day.date))
          .reduce((sum, day) => sum + day.doctors, 0);

        return {
          ...window,
          plannedDoctorDays: window.plannedDoctorDays + plannedDoctorDays,
          totalDoctorDays: window.totalDoctorDays + plannedDoctorDays,
        };
      }

      const estimatedDoctorDays = estimateDoctorDaysForMonth(
        month,
        mthDoctors,
        fridayDoctors,
        month === activeMonth ? enteredDates : new Set<string>(),
      );
      const label =
        goals.find((goal) => goal.month === month)?.label ?? month;

      return {
        ...window,
        estimatedDoctorDays: window.estimatedDoctorDays + estimatedDoctorDays,
        estimatedMonths: [...window.estimatedMonths, label],
        totalDoctorDays: window.totalDoctorDays + estimatedDoctorDays,
      };
    },
    {
      estimatedDoctorDays: 0,
      estimatedMonths: [],
      fridayDoctors,
      mthDoctors,
      plannedDoctorDays: 0,
      totalDoctorDays: 0,
    },
  );
}

// Day-by-day cumulative series for the pace chart: scheduled capacity walks
// the plan, actuals walk the entered days (union of both date sets, so an
// unscheduled entered day still appears).
function buildPacePoints(
  plan: MonthPlan | undefined,
  monthEntries: ProductionEntry[],
): MonthPacePoint[] {
  const scheduleByDate = new Map(
    (plan?.scheduledDays ?? []).map((day) => [day.date, day]),
  );
  const entryByDate = new Map(monthEntries.map((entry) => [entry.date, entry]));
  const dates = [
    ...new Set([...scheduleByDate.keys(), ...entryByDate.keys()]),
  ].sort();
  const lastEntryDate = monthEntries.at(-1)?.date;
  let expected = 0;
  let actual = 0;

  return dates.map((date) => {
    const day = scheduleByDate.get(date);

    if (day && plan) {
      expected += expectedForScheduleDay(day, plan);
    }

    const entry = entryByDate.get(date);

    if (entry) {
      actual += adjustedProduction(entry);
    }

    return {
      date,
      expected,
      actual: lastEntryDate && date <= lastEntryDate ? actual : undefined,
    };
  });
}

export default async function Home() {
  await requireCurrentProfile();
  const data = await getPracticeData();

  // A fresh database has no monthly goals yet; every summary below assumes at
  // least one, so point at Setup instead of crashing with "Missing goal".
  if (data.monthlyGoals.length === 0) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-panel p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">
            No months set up yet
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
            The tracker needs at least one month with an S1P goal before it can
            show production progress. An admin or office manager can add the
            first month from the Setup page.
          </p>
          <Link
            href="/setup"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b]"
          >
            Go to Setup
          </Link>
        </section>
      </main>
    );
  }

  const activeMonth = getActiveMonth(data.monthlyGoals);
  const monthGoal = getMonthGoalFromData(data.monthlyGoals, activeMonth);
  const currentMonthPlan = getMonthPlanFromData(data.monthPlans, activeMonth);
  const currentQuarter = getQuarterForMonthFromData(data.quarters, activeMonth);
  const monthEntries = data.productionEntries.filter((entry) =>
    entry.date.startsWith(activeMonth),
  );
  const currentMonthSummary = summarizeMonth(
    monthGoal,
    currentMonthPlan,
    monthEntries,
  );
  const currentQuarterSummary = summarizeQuarterFromData(
    currentQuarter,
    data.monthlyGoals,
    data.monthPlans,
    data.productionEntries,
    data.bonusTiers,
  );
  const currentQuarterProjection = summarizeQuarterProjectionFromData(
    currentQuarter,
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
  const quarterRallyWindow = getQuarterRallyWindow({
    activeMonth,
    currentMonthPlan,
    entries: data.productionEntries,
    goals: data.monthlyGoals,
    plans: data.monthPlans,
    quarter: currentQuarter,
  });
  // bonusTiers arrive ordered by threshold ascending from the data layer.
  const lowestTier = data.bonusTiers[0];
  const nextQuarterTier = currentQuarterProjection.nextProjectedTier;
  const nextQuarterTierTarget = nextQuarterTier
    ? currentQuarterProjection.goal * (nextQuarterTier.thresholdPct / 100)
    : currentQuarterProjection.projected;
  const nextQuarterTierGap = Math.max(
    nextQuarterTierTarget - currentQuarterProjection.projected,
    0,
  );
  const extraPerRemainingDoctorDay =
    quarterRallyWindow.totalDoctorDays > 0
      ? nextQuarterTierGap / quarterRallyWindow.totalDoctorDays
      : 0;
  const normalDayExtra =
    extraPerRemainingDoctorDay * quarterRallyWindow.mthDoctors;
  const fridayExtra =
    extraPerRemainingDoctorDay * quarterRallyWindow.fridayDoctors;
  const profitabilityTone =
    currentQuarter.profitabilityStatus === "favorable"
      ? "good"
      : currentQuarter.profitabilityStatus === "unfavorable"
        ? "danger"
        : "warning";
  const profitabilityLabel =
    currentQuarter.profitabilityStatus === "favorable"
      ? "profitability favorable"
      : currentQuarter.profitabilityStatus === "unfavorable"
        ? "profitability unfavorable"
        : "profitability pending";
  const pacePoints = buildPacePoints(currentMonthPlan, monthEntries);
  const scheduleChangeDays = (currentMonthPlan?.scheduledDays ?? []).filter(
    (day) => day.changeReason,
  );
  const plannedDatesCount =
    currentMonthPlan?.scheduledDays.length ??
    currentMonthPlan?.plannedWorkdayCount ??
    0;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <StatusBadge tone="neutral">{monthGoal.label} open</StatusBadge>
            <StatusBadge tone="neutral">
              {currentQuarter.label} staff bonus tracked
            </StatusBadge>
            <StatusBadge tone={profitabilityTone}>
              {currentQuarter.label} {profitabilityLabel}
            </StatusBadge>
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold text-ink sm:text-4xl">
            Daily production progress
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Adjusted production is calculated from total production minus credit
            adjustments.
            {scheduleChangeDays.length > 0
              ? ` ${monthGoal.label} includes ${scheduleChangeDays.length} schedule ${
                  scheduleChangeDays.length === 1 ? "change" : "changes"
                } (${scheduleChangeDays[0].changeReason} on ${compactDate(
                  scheduleChangeDays[0].date,
                )}).`
              : ""}
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
                )} needed to reach ${currentDriveForNineSummary.qualificationPct}%`
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

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {monthGoal.label} S1P target
              </h2>
              <p className="text-sm text-muted">
                Official goal first; doctor-day capacity tells us how much room
                we have.
              </p>
            </div>
            <StatusBadge tone={monthForecastVariance >= 0 ? "good" : "danger"}>
              Forecast {monthForecastVariance >= 0 ? "ahead" : "behind"} by{" "}
              {money(Math.abs(monthForecastVariance))}
            </StatusBadge>
          </div>

          <div className="mt-6 space-y-6">
            <ProgressBar
              value={currentMonthSummary.pctOfGoal}
              label={`S1P monthly goal progress: ${percent(
                currentMonthSummary.pctOfGoal,
              )}`}
            />
            <ProgressBar
              value={remainingCapacityNeed}
              marker={100}
              label={`Required from remaining schedule: ${percent(
                remainingCapacityNeed,
              )} of expected capacity`}
            />
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="border-t border-line pt-3">
              <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                Need from here
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ink">
                {money(currentMonthSummary.remainingNeeded)}
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
                Capacity cushion
              </dt>
              <dd
                className={`mt-1 text-lg font-semibold ${
                  monthForecastVariance >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {money(monthForecastVariance)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 rounded-lg bg-background px-3 py-2 text-sm text-muted">
            Internal doctor-day pace through{" "}
            {lastEntry ? compactDate(lastEntry.date) : "latest entry"} is{" "}
            {money(Math.abs(schedulePaceVariance))}{" "}
            {schedulePaceVariance >= 0 ? "above" : "below"} expected. Useful
            context, but the S1P goal is the scoreboard.
          </p>
        </div>

        <div className="rounded-lg border-2 border-success bg-panel p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {currentQuarter.label} staff bonus
              </h2>
              <p className="text-sm text-muted">
                Projected from entered actuals, open-month forecasts, and S1P
                goals for future months until setup is entered.
              </p>
            </div>
            <StatusBadge tone={profitabilityTone}>
              {currentQuarter.profitabilityStatus === "favorable"
                ? "Profitability favorable"
                : currentQuarter.profitabilityStatus === "unfavorable"
                  ? "Profitability unfavorable"
                  : "Profitability unknown"}
            </StatusBadge>
          </div>
          <div className="mt-5 rounded-lg bg-[#edf7f0] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-success">
              Tracking to
            </p>
            <p className="mt-1 text-3xl font-semibold text-success">
              {currentQuarterProjection.projectedTier
                ? `${currentQuarterProjection.projectedTier.thresholdPct.toFixed(
                    0,
                  )}% tier`
                : "No tier yet"}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              {currentQuarterProjection.projectedTier
                ? `${money(
                    currentQuarterProjection.projectedTier.amount,
                  )} estimated staff bonus`
                : lowestTier
                  ? `Build toward the ${lowestTier.thresholdPct.toFixed(0)}% threshold`
                  : "No bonus tiers configured yet"}
            </p>
            <p className="mt-1 text-sm text-muted">
              Projected {currentQuarter.label}:{" "}
              {money(currentQuarterProjection.projected)} (
              {percent(currentQuarterProjection.projectedPct)})
            </p>
          </div>

          {nextQuarterTier ? (
            <div className="mt-4 rounded-lg border border-[#eed4a9] bg-[#fff6e8] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-warning">
                Rally target
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">
                Add {money(extraPerRemainingDoctorDay)} per doctor per day
              </p>
              <p className="mt-1 text-sm text-muted">
                About {money(normalDayExtra)} extra on a{" "}
                {quarterRallyWindow.mthDoctors}-doctor day or{" "}
                {money(fridayExtra)} extra on a{" "}
                {quarterRallyWindow.fridayDoctors}-doctor Friday.
              </p>
              <p className="mt-2 text-sm text-muted">
                Spread across {quarterRallyWindow.totalDoctorDays} remaining{" "}
                {currentQuarter.label} doctor-days, that closes the{" "}
                {money(nextQuarterTierGap)} gap to the{" "}
                {nextQuarterTier.thresholdPct.toFixed(0)}% tier (
                {money(nextQuarterTier.amount)}).
              </p>
              {quarterRallyWindow.estimatedDoctorDays > 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Includes {quarterRallyWindow.plannedDoctorDays} planned
                  doctor-days and {quarterRallyWindow.estimatedDoctorDays}{" "}
                  estimated doctor-days for{" "}
                  {quarterRallyWindow.estimatedMonths.join(", ")} until that
                  setup is entered.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Uses the entered remaining {currentQuarter.label} schedule
                  and will update when setup changes.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-[#b6d8c4] bg-[#edf7f0] p-4">
              <p className="text-sm font-semibold text-success">
                Top tier is already projected.
              </p>
            </div>
          )}

          <p className="mt-4 text-sm text-muted">
            {currentQuarter.label} actual entered so far:{" "}
            {money(currentQuarterSummary.actual)} of{" "}
            {money(currentQuarterSummary.goal)} (
            {percent(currentQuarterSummary.pct)}).
          </p>
          <div className="mt-5">
            <TierLadder
              percentValue={currentQuarterProjection.projectedPct}
              tiers={data.bonusTiers}
              activeThreshold={
                currentQuarterProjection.projectedTier?.thresholdPct
              }
              nextThreshold={nextQuarterTier?.thresholdPct}
            />
          </div>
        </div>
      </section>

      {pacePoints.length > 0 ? (
        <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {monthGoal.label} daily pace
              </h2>
              <p className="text-sm text-muted">
                Cumulative adjusted production against the scheduled doctor-day
                pace and the S1P goal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 text-accent">
                <span className="h-2 w-5 rounded-full bg-accent" />
                Actual
              </span>
              <span className="inline-flex items-center gap-1 text-muted">
                <span className="h-2 w-5 rounded-full bg-[#c8c1b5]" />
                Scheduled pace
              </span>
              <span className="inline-flex items-center gap-1 text-ink">
                <span className="h-0.5 w-5 bg-ink" />
                Goal {money(monthGoal.s1pGoal)}
              </span>
            </div>
          </div>
          <div className="mt-6">
            <MonthPaceChart goal={monthGoal.s1pGoal} points={pacePoints} />
          </div>
          {monthEntries.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No production entered yet for {monthGoal.label}; the teal actual
              line appears with the first saved day.
            </p>
          ) : null}
        </section>
      ) : null}

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
            {plannedDatesCount} planned{" "}
            {plannedDatesCount === 1 ? "date" : "dates"} cross-checked
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
