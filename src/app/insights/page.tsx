import { redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Target,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import {
  getMonthPlanFromData,
  money,
  percent,
  summarizeMonth,
} from "@/lib/bonus-calculations";
import { requireCurrentProfile } from "@/lib/auth";
import { getActiveMonth, getPracticeData } from "@/lib/data";
import { canViewInsights } from "@/lib/roles";
import type { MonthPlan, MonthlyGoal, ProductionEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

type MonthInsight = {
  month: string;
  label: string;
  shortLabel: string;
  goal: number;
  actual: number;
  forecast: number;
  pct: number;
  forecastPct: number;
  variance: number;
  forecastVariance: number;
  enteredDays: number;
  sourceLabel: string;
  usesHistoricalActual: boolean;
};

function shortMonth(month: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    new Date(`${month}-01T12:00:00`),
  );
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function monthRows(
  goals: MonthlyGoal[],
  plans: MonthPlan[],
  entries: ProductionEntry[],
  activeMonth: string,
) {
  const currentYear = activeMonth.slice(0, 4);

  return goals
    .filter((goal) => goal.month.startsWith(currentYear))
    .filter((goal) => goal.month <= activeMonth)
    .map((goal): MonthInsight => {
      const monthEntries = entries.filter((entry) =>
        entry.date.startsWith(goal.month),
      );
      const summary = summarizeMonth(
        goal,
        getMonthPlanFromData(plans, goal.month),
        monthEntries,
      );
      const forecast = goal.month === activeMonth ? summary.forecast : summary.actual;
      const usesHistoricalActual =
        typeof goal.historicalAdjustedActual === "number";

      return {
        month: goal.month,
        label: goal.label,
        shortLabel: shortMonth(goal.month),
        goal: goal.s1pGoal,
        actual: summary.actual,
        forecast,
        pct: summary.pctOfGoal,
        forecastPct: goal.s1pGoal > 0 ? (forecast / goal.s1pGoal) * 100 : 0,
        variance: summary.actual - goal.s1pGoal,
        forecastVariance: forecast - goal.s1pGoal,
        enteredDays: monthEntries.length,
        sourceLabel:
          monthEntries.length > 0
            ? `${monthEntries.length} entered days`
            : usesHistoricalActual
              ? "Historical actual"
              : "No entered days",
        usesHistoricalActual,
      };
    });
}

function cumulativePoints(
  rows: MonthInsight[],
  maxValue: number,
  key: "goal" | "forecast",
) {
  let running = 0;

  return rows
    .map((row, index) => {
      running += row[key];
      const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100;
      const y = 52 - (running / maxValue) * 46;

      return `${x.toFixed(2)},${clamp(y, 4, 52).toFixed(2)}`;
    })
    .join(" ");
}

export default async function InsightsPage() {
  const profile = await requireCurrentProfile();

  if (!canViewInsights(profile.role)) {
    redirect("/");
  }

  const data = await getPracticeData();
  const activeMonth = getActiveMonth(data.monthlyGoals);
  const rows = monthRows(
    data.monthlyGoals,
    data.monthPlans,
    data.productionEntries,
    activeMonth,
  );
  const ytdGoal = rows.reduce((sum, row) => sum + row.goal, 0);
  const ytdActual = rows.reduce((sum, row) => sum + row.actual, 0);
  const ytdForecast = rows.reduce((sum, row) => sum + row.forecast, 0);
  const annualGoal = data.monthlyGoals.reduce((sum, goal) => sum + goal.s1pGoal, 0);
  const ytdPct = ytdGoal > 0 ? (ytdActual / ytdGoal) * 100 : 0;
  const ytdForecastPct = ytdGoal > 0 ? (ytdForecast / ytdGoal) * 100 : 0;
  const ytdVariance = ytdActual - ytdGoal;
  const forecastVariance = ytdForecast - ytdGoal;
  const maxMonthly = Math.max(
    1,
    ...rows.flatMap((row) => [row.goal, row.actual, row.forecast]),
  );
  const maxCumulative = Math.max(ytdGoal, ytdForecast, ytdActual, 1) * 1.08;
  const goalPoints = cumulativePoints(rows, maxCumulative, "goal");
  const forecastPoints = cumulativePoints(rows, maxCumulative, "forecast");
  const forecastPointList = forecastPoints ? forecastPoints.split(" ") : [];
  const currentMonth = rows.at(-1);
  const enteredDayCount = rows.reduce((sum, row) => sum + row.enteredDays, 0);
  const historicalMonthCount = rows.filter(
    (row) => row.usesHistoricalActual,
  ).length;
  const bestMonth = rows.reduce<MonthInsight | null>(
    (best, row) => (!best || row.pct > best.pct ? row : best),
    null,
  );

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <StatusBadge tone="neutral">Management view</StatusBadge>
            <StatusBadge tone={forecastVariance >= 0 ? "good" : "warning"}>
              {forecastVariance >= 0 ? "Tracking ahead" : "Tracking behind"}
            </StatusBadge>
            <StatusBadge tone="neutral">
              Through {currentMonth?.label ?? "YTD"}
            </StatusBadge>
          </div>
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">
            YTD production insights
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            A bigger-picture view of adjusted production against S1P goals,
            separate from the staff bonus tier view.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-panel px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Best month
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            {bestMonth
              ? `${bestMonth.label} at ${percent(bestMonth.pct)}`
              : "No months yet"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="YTD adjusted"
          value={money(ytdActual)}
          detail={`${percent(ytdPct)} of ${money(ytdGoal)} YTD goal`}
          icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
          tone={ytdVariance >= 0 ? "good" : "warning"}
        />
        <MetricCard
          title="YTD variance"
          value={money(Math.abs(ytdVariance))}
          detail={ytdVariance >= 0 ? "Ahead of goal" : "Behind goal"}
          icon={<Target className="h-4 w-4" aria-hidden="true" />}
          tone={ytdVariance >= 0 ? "good" : "danger"}
        />
        <MetricCard
          title="YTD forecast"
          value={money(ytdForecast)}
          detail={`${money(Math.abs(forecastVariance))} ${
            forecastVariance >= 0 ? "ahead" : "behind"
          } if current schedule holds`}
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          tone={forecastVariance >= 0 ? "good" : "warning"}
        />
        <MetricCard
          title="Annual orientation"
          value={percent(annualGoal > 0 ? (ytdActual / annualGoal) * 100 : 0)}
          detail={`${money(ytdActual)} of ${money(annualGoal)} annual goal`}
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Cumulative YTD path
              </h2>
              <p className="text-sm text-muted">
                Goal line compared with actuals and current-month forecast.
              </p>
            </div>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 text-muted">
                <span className="h-2 w-5 rounded-full bg-[#c8c1b5]" />
                Goal
              </span>
              <span className="inline-flex items-center gap-1 text-accent">
                <span className="h-2 w-5 rounded-full bg-accent" />
                Actual/forecast
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-line bg-background p-4">
            <svg
              viewBox="0 0 100 56"
              className="h-72 w-full overflow-visible"
              role="img"
              aria-label="Cumulative YTD production compared with goal"
            >
              <line x1="0" y1="52" x2="100" y2="52" stroke="#dfddd5" />
              <line x1="0" y1="28" x2="100" y2="28" stroke="#ebe8df" />
              <line x1="0" y1="4" x2="100" y2="4" stroke="#ebe8df" />
              <polyline
                points={goalPoints}
                fill="none"
                stroke="#a8a196"
                strokeDasharray="3 3"
                strokeLinecap="round"
                strokeWidth="1.8"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={forecastPoints}
                fill="none"
                stroke="#0f766e"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.8"
                vectorEffect="non-scaling-stroke"
              />
              {forecastPointList.map((point, index) => {
                const [cx, cy] = point.split(",").map(Number);

                return (
                  <circle
                    key={`${point}-${index}`}
                    cx={cx}
                    cy={cy}
                    r="1.4"
                    fill="#ffffff"
                    stroke="#0f766e"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
            <div
              className="mt-3 grid text-center text-xs font-semibold text-muted"
              style={{
                gridTemplateColumns: `repeat(${Math.max(rows.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {rows.map((row) => (
                <span key={row.month}>{row.shortLabel}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">YTD pace</h2>
          <p className="text-sm text-muted">
            Actuals to date and forecast against the YTD target.
          </p>
          <div className="mt-6 space-y-6">
            <ProgressBar
              value={ytdPct}
              marker={100}
              label={`Actual YTD: ${percent(ytdPct)}`}
            />
            <ProgressBar
              value={ytdForecastPct}
              marker={100}
              label={`Forecast YTD: ${percent(ytdForecastPct)}`}
            />
          </div>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="border-t border-line pt-3">
              <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                Forecast variance
              </dt>
              <dd
                className={
                  forecastVariance >= 0
                    ? "mt-1 text-xl font-semibold text-success"
                    : "mt-1 text-xl font-semibold text-danger"
                }
              >
                {money(forecastVariance)}
              </dd>
            </div>
            <div className="border-t border-line pt-3">
              <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                YTD source
              </dt>
              <dd className="mt-1 text-base font-semibold text-ink">
                {historicalMonthCount} imported months · {enteredDayCount}{" "}
                entered days
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Monthly view</h2>
            <p className="text-sm text-muted">
              Each row compares adjusted production with the S1P monthly goal.
            </p>
          </div>
          <StatusBadge tone="neutral">
            <Activity className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            YTD only
          </StatusBadge>
        </div>

        <div className="mt-5 space-y-4">
          {rows.map((row) => {
            const goalLeft = clamp((row.goal / maxMonthly) * 100);
            const actualWidth = clamp((row.actual / maxMonthly) * 100);
            const forecastWidth = clamp((row.forecast / maxMonthly) * 100);
            const extensionWidth = clamp(forecastWidth - actualWidth);
            const variance =
              row.month === activeMonth ? row.forecastVariance : row.variance;
            const comparisonPct =
              row.month === activeMonth ? row.forecastPct : row.pct;

            return (
              <div
                key={row.month}
                className="grid gap-3 rounded-lg border border-line bg-background p-4 lg:grid-cols-[92px_1fr_180px]"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{row.label}</p>
                  <p className="mt-1 text-xs text-muted">
                    {row.sourceLabel}
                  </p>
                </div>
                <div>
                  <div className="relative h-7 overflow-hidden rounded-lg bg-[#e7e3d8]">
                    <div
                      className="absolute left-0 top-0 h-full rounded-lg bg-accent"
                      style={{ width: `${actualWidth}%` }}
                    />
                    {extensionWidth > 0 ? (
                      <div
                        className="absolute top-0 h-full rounded-r-lg bg-[#9ccdc7]"
                        style={{
                          left: `${actualWidth}%`,
                          width: `${extensionWidth}%`,
                        }}
                      />
                    ) : null}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-ink"
                      style={{ left: `${goalLeft}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>Actual {money(row.actual)}</span>
                    {row.month === activeMonth ? (
                      <span>Forecast {money(row.forecast)}</span>
                    ) : null}
                    <span>Goal {money(row.goal)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end lg:justify-center">
                  <p className="font-mono text-lg font-semibold text-ink">
                    {percent(comparisonPct)}
                  </p>
                  <p
                    className={
                      variance >= 0
                        ? "text-sm font-semibold text-success"
                        : "text-sm font-semibold text-danger"
                    }
                  >
                    {variance >= 0 ? "+" : "-"}
                    {money(Math.abs(variance))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
