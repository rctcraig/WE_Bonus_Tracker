"use client";

import {
  Calculator,
  CalendarPlus,
  ClipboardCheck,
  Plus,
  Save,
  Trash2,
  UserMinus,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveMonthSetup } from "@/app/setup/actions";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { adjustedProduction, fullDate, money } from "@/lib/bonus-calculations";
import type {
  DayType,
  MonthPlan,
  MonthlyGoal,
  ProductionEntry,
} from "@/lib/types";

type DraftScheduleDay = {
  id: string;
  date: string;
  dayType: DayType;
  doctors: number;
  originalDoctors: number;
  changeReason: string;
};

type SetupDraft = {
  month: string;
  s1pGoal: number;
  avgMthDoctorDay: number;
  avgFridayDoctorDay: number;
  plannedWorkdayCount: number;
  scheduleDays: DraftScheduleDay[];
};

type SetupClientProps = {
  canEditSetup: boolean;
  goals: MonthlyGoal[];
  initialMonth: string;
  plans: MonthPlan[];
  productionEntries: ProductionEntry[];
};

type AverageRecommendation = {
  mthAverage?: number;
  fridayAverage?: number;
  mthDoctorDays: number;
  fridayDoctorDays: number;
  mthEntryDays: number;
  fridayEntryDays: number;
};

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T12:00:00`));
}

function newRow(date: string, dayType: DayType, doctors: number) {
  return {
    id: crypto.randomUUID(),
    date,
    dayType,
    doctors,
    originalDoctors: doctors,
    changeReason: "",
  } satisfies DraftScheduleDay;
}

function draftForMonth(
  month: string,
  goals: MonthlyGoal[],
  plans: MonthPlan[],
  recommendation: AverageRecommendation,
): SetupDraft {
  const goal = goals.find((item) => item.month === month);
  const plan = plans.find((item) => item.month === month);
  const priorPlan = plans
    .filter((item) => item.month < month)
    .sort((a, b) => b.month.localeCompare(a.month))[0];

  return {
    month,
    s1pGoal: Math.round(goal?.s1pGoal ?? 0),
    avgMthDoctorDay:
      plan?.avgMthDoctorDay ??
      recommendation.mthAverage ??
      priorPlan?.avgMthDoctorDay ??
      10800,
    avgFridayDoctorDay:
      plan?.avgFridayDoctorDay ??
      recommendation.fridayAverage ??
      priorPlan?.avgFridayDoctorDay ??
      5500,
    plannedWorkdayCount:
      plan?.plannedWorkdayCount ?? plan?.scheduledDays.length ?? 0,
    scheduleDays:
      plan?.scheduledDays.map((day) => ({
        id: day.date,
        date: day.date,
        dayType: day.dayType,
        doctors: day.doctors,
        originalDoctors: day.originalDoctors ?? day.doctors,
        changeReason: day.changeReason ?? "",
      })) ?? [],
  };
}

function averageRecommendationForMonth(
  month: string,
  plans: MonthPlan[],
  productionEntries: ProductionEntry[],
): AverageRecommendation {
  const entryByDate = new Map(
    productionEntries
      .filter((entry) => entry.date < `${month}-01`)
      .map((entry) => [entry.date, entry]),
  );
  const totals = {
    mth: { adjusted: 0, doctorDays: 0, entryDays: 0 },
    friday: { adjusted: 0, doctorDays: 0, entryDays: 0 },
  };

  for (const plan of plans) {
    for (const day of plan.scheduledDays) {
      const entry = entryByDate.get(day.date);

      if (!entry || day.doctors <= 0) {
        continue;
      }

      totals[day.dayType].adjusted += adjustedProduction(entry);
      totals[day.dayType].doctorDays += day.doctors;
      totals[day.dayType].entryDays += 1;
    }
  }

  return {
    mthAverage:
      totals.mth.doctorDays > 0
        ? Math.round(totals.mth.adjusted / totals.mth.doctorDays)
        : undefined,
    fridayAverage:
      totals.friday.doctorDays > 0
        ? Math.round(totals.friday.adjusted / totals.friday.doctorDays)
        : undefined,
    mthDoctorDays: totals.mth.doctorDays,
    fridayDoctorDays: totals.friday.doctorDays,
    mthEntryDays: totals.mth.entryDays,
    fridayEntryDays: totals.friday.entryDays,
  };
}

function generateWeekdaysForMonth(
  month: string,
  mthDoctors: number,
  fridayDoctors: number,
) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1, 12);
  const rows: DraftScheduleDay[] = [];

  while (date.getMonth() === monthNumber - 1) {
    const day = date.getDay();

    if (day >= 1 && day <= 5) {
      const dayType: DayType = day === 5 ? "friday" : "mth";
      rows.push(
        newRow(
          date.toISOString().slice(0, 10),
          dayType,
          dayType === "friday" ? fridayDoctors : mthDoctors,
        ),
      );
    }

    date.setDate(date.getDate() + 1);
  }

  return rows;
}

export function SetupClient({
  canEditSetup,
  goals,
  initialMonth,
  plans,
  productionEntries,
}: SetupClientProps) {
  const initialRecommendation = averageRecommendationForMonth(
    initialMonth,
    plans,
    productionEntries,
  );
  const [draft, setDraft] = useState(() =>
    draftForMonth(initialMonth, goals, plans, initialRecommendation),
  );
  const [defaultMthDoctors, setDefaultMthDoctors] = useState(6);
  const [defaultFridayDoctors, setDefaultFridayDoctors] = useState(3);
  const [status, setStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const recommendation = useMemo(
    () => averageRecommendationForMonth(draft.month, plans, productionEntries),
    [draft.month, plans, productionEntries],
  );

  const monthOptions = useMemo(
    () => goals.map((goal) => goal.month).sort(),
    [goals],
  );
  const sortedDays = useMemo(
    () => [...draft.scheduleDays].sort((a, b) => a.date.localeCompare(b.date)),
    [draft.scheduleDays],
  );
  const mthDoctorDays = sortedDays
    .filter((day) => day.dayType === "mth")
    .reduce((sum, day) => sum + day.doctors, 0);
  const fridayDoctorDays = sortedDays
    .filter((day) => day.dayType === "friday")
    .reduce((sum, day) => sum + day.doctors, 0);
  const expectedCapacity = sortedDays.reduce(
    (sum, day) =>
      sum +
      day.doctors *
        (day.dayType === "friday"
          ? draft.avgFridayDoctorDay
          : draft.avgMthDoctorDay),
    0,
  );
  const scheduleChangeImpact = sortedDays.reduce(
    (sum, day) =>
      sum +
      (day.doctors - day.originalDoctors) *
        (day.dayType === "friday"
          ? draft.avgFridayDoctorDay
          : draft.avgMthDoctorDay),
    0,
  );
  const changedDays = sortedDays.filter(
    (day) => day.doctors !== day.originalDoctors,
  );
  const dateCountMatches = sortedDays.length === draft.plannedWorkdayCount;

  function selectMonth(month: string) {
    setStatus(null);
    setDraft(
      draftForMonth(
        month,
        goals,
        plans,
        averageRecommendationForMonth(month, plans, productionEntries),
      ),
    );
  }

  function applyCalculatedAverage(field: "avgMthDoctorDay" | "avgFridayDoctorDay") {
    const value =
      field === "avgMthDoctorDay"
        ? recommendation.mthAverage
        : recommendation.fridayAverage;

    if (value === undefined) {
      return;
    }

    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDraft(field: keyof SetupDraft, value: number | string) {
    setDraft((current) => ({
      ...current,
      [field]: typeof value === "number" ? value : Number(value),
    }));
  }

  function updateDay(
    id: string,
    field: keyof DraftScheduleDay,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      scheduleDays: current.scheduleDays.map((day) => {
        if (day.id !== id) {
          return day;
        }

        if (
          field === "doctors" ||
          field === "originalDoctors"
        ) {
          return { ...day, [field]: Number(value) };
        }

        return { ...day, [field]: value };
      }),
    }));
  }

  function addScheduleDay() {
    setDraft((current) => ({
      ...current,
      scheduleDays: [
        ...current.scheduleDays,
        newRow(`${current.month}-01`, "mth", defaultMthDoctors),
      ],
    }));
  }

  function removeScheduleDay(id: string) {
    setDraft((current) => ({
      ...current,
      scheduleDays: current.scheduleDays.filter((day) => day.id !== id),
    }));
  }

  function generateWeekdays() {
    if (
      draft.scheduleDays.length > 0 &&
      !window.confirm("Replace the current date grid for this month?")
    ) {
      return;
    }

    const rows = generateWeekdaysForMonth(
      draft.month,
      defaultMthDoctors,
      defaultFridayDoctors,
    );
    setDraft((current) => ({
      ...current,
      plannedWorkdayCount: rows.length,
      scheduleDays: rows,
    }));
  }

  function saveSetup() {
    setStatus(null);
    startTransition(async () => {
      const result = await saveMonthSetup({
        month: draft.month,
        s1pGoal: draft.s1pGoal,
        avgMthDoctorDay: draft.avgMthDoctorDay,
        avgFridayDoctorDay: draft.avgFridayDoctorDay,
        plannedWorkdayCount: draft.plannedWorkdayCount,
        scheduleDays: sortedDays.map((day) => ({
          date: day.date,
          dayType: day.dayType,
          doctors: day.doctors,
          originalDoctors: day.originalDoctors,
          changeReason: day.changeReason,
        })),
      });

      setStatus(result);
    });
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <StatusBadge tone="neutral">{monthLabel(draft.month)}</StatusBadge>
            <StatusBadge tone={canEditSetup ? "good" : "neutral"}>
              {canEditSetup ? "Editable" : "View only"}
            </StatusBadge>
            <StatusBadge tone={dateCountMatches ? "good" : "warning"}>
              {sortedDays.length} of {draft.plannedWorkdayCount} dates
            </StatusBadge>
          </div>
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">
            Monthly schedule plan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Select a future month to build it in advance. For a last-minute
            call-out, edit the current doctor count for that date and add the
            reason.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="setup-month">
            Month
          </label>
          <select
            id="setup-month"
            value={draft.month}
            onChange={(event) => selectMonth(event.target.value)}
            className="h-11 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink"
          >
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)}
              </option>
            ))}
          </select>
          {canEditSetup ? (
            <button
              type="button"
              onClick={saveSetup}
              disabled={isPending}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isPending ? "Saving" : "Save setup"}
            </button>
          ) : null}
        </div>
      </section>

      {status ? (
        <div
          className={
            status.ok
              ? "rounded-lg border border-[#b6d8c4] bg-[#edf7f0] px-4 py-3 text-sm font-medium text-success"
              : "rounded-lg border border-[#f3bbb5] bg-[#fff0ee] px-4 py-3 text-sm font-medium text-danger"
          }
        >
          {status.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="S1P goal"
          value={money(draft.s1pGoal)}
          detail={`${money(expectedCapacity)} scheduled capacity`}
          icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          title="M-Th doctor-days"
          value={mthDoctorDays.toFixed(0)}
          detail={`${money(draft.avgMthDoctorDay)} average per doctor-day`}
          icon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          title="Friday doctor-days"
          value={fridayDoctorDays.toFixed(0)}
          detail={`${money(draft.avgFridayDoctorDay)} average per doctor-day`}
          icon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          title="Schedule changes"
          value={changedDays.length.toString()}
          detail={`${money(scheduleChangeImpact)} production impact`}
          icon={<UserMinus className="h-4 w-4" aria-hidden="true" />}
          tone={changedDays.length ? "warning" : "good"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Month inputs</h2>
              <p className="mt-1 text-sm text-muted">
                Averages are suggested from prior dates with actual production
                and doctor counts.
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
              <Calculator className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              S1P goal
              <input
                type="number"
                min="0"
                value={draft.s1pGoal}
                disabled={!canEditSetup}
                onChange={(event) => updateDraft("s1pGoal", event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-right font-mono text-ink disabled:bg-background disabled:text-muted"
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Expected workdays
              <input
                type="number"
                min="0"
                value={draft.plannedWorkdayCount}
                disabled={!canEditSetup}
                onChange={(event) =>
                  updateDraft("plannedWorkdayCount", event.target.value)
                }
                className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-right font-mono text-ink disabled:bg-background disabled:text-muted"
              />
            </label>
            <div>
              <label className="text-sm font-medium text-ink">
                M-Th average
                <input
                  type="number"
                  min="0"
                  value={draft.avgMthDoctorDay}
                  disabled={!canEditSetup}
                  onChange={(event) =>
                    updateDraft("avgMthDoctorDay", event.target.value)
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-right font-mono text-ink disabled:bg-background disabled:text-muted"
                />
              </label>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {recommendation.mthAverage !== undefined
                    ? `${money(recommendation.mthAverage)} from ${
                        recommendation.mthDoctorDays
                      } doctor-days / ${recommendation.mthEntryDays} days`
                    : "No calculated M-Th average yet"}
                </p>
                <button
                  type="button"
                  disabled={
                    !canEditSetup || recommendation.mthAverage === undefined
                  }
                  onClick={() => applyCalculatedAverage("avgMthDoctorDay")}
                  className="shrink-0 text-xs font-semibold text-ink underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
                >
                  Use calculated
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-ink">
                Friday average
                <input
                  type="number"
                  min="0"
                  value={draft.avgFridayDoctorDay}
                  disabled={!canEditSetup}
                  onChange={(event) =>
                    updateDraft("avgFridayDoctorDay", event.target.value)
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-right font-mono text-ink disabled:bg-background disabled:text-muted"
                />
              </label>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {recommendation.fridayAverage !== undefined
                    ? `${money(recommendation.fridayAverage)} from ${
                        recommendation.fridayDoctorDays
                      } doctor-days / ${recommendation.fridayEntryDays} days`
                    : "No calculated Friday average yet"}
                </p>
                <button
                  type="button"
                  disabled={
                    !canEditSetup || recommendation.fridayAverage === undefined
                  }
                  onClick={() => applyCalculatedAverage("avgFridayDoctorDay")}
                  className="shrink-0 text-xs font-semibold text-ink underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
                >
                  Use calculated
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Quick build</h2>
          <p className="mt-1 text-sm text-muted">
            Generate Mon-Fri rows, then remove holidays and adjust doctor counts.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-medium text-ink">
              M-Th doctors
              <input
                type="number"
                min="0"
                value={defaultMthDoctors}
                disabled={!canEditSetup}
                onChange={(event) =>
                  setDefaultMthDoctors(Number(event.target.value))
                }
                className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-right font-mono text-ink disabled:bg-background disabled:text-muted"
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Friday doctors
              <input
                type="number"
                min="0"
                value={defaultFridayDoctors}
                disabled={!canEditSetup}
                onChange={(event) =>
                  setDefaultFridayDoctors(Number(event.target.value))
                }
                className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-right font-mono text-ink disabled:bg-background disabled:text-muted"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={!canEditSetup}
                onClick={generateWeekdays}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-ink shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Generate
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Date grid</h2>
            <p className="text-sm text-muted">
              Original and current doctor counts are both retained.
            </p>
          </div>
          {canEditSetup ? (
            <button
              type="button"
              onClick={addScheduleDay}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-background"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add date
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead className="bg-background text-left text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Original
                </th>
                <th className="px-5 py-3 text-right font-semibold">Current</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Expected
                </th>
                <th className="px-5 py-3 font-semibold">Reason</th>
                <th className="px-5 py-3 font-semibold">Remove</th>
              </tr>
            </thead>
            <tbody>
              {sortedDays.map((day) => {
                const average =
                  day.dayType === "friday"
                    ? draft.avgFridayDoctorDay
                    : draft.avgMthDoctorDay;
                const changed = day.originalDoctors !== day.doctors;

                return (
                  <tr key={day.id} className="border-t border-line">
                    <td className="px-5 py-3">
                      <input
                        type="date"
                        value={day.date}
                        disabled={!canEditSetup}
                        onChange={(event) =>
                          updateDay(day.id, "date", event.target.value)
                        }
                        className="h-10 rounded-lg border border-line bg-white px-3 text-ink disabled:bg-background disabled:text-muted"
                      />
                      <p className="mt-1 text-xs text-muted">
                        {fullDate(day.date)}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={day.dayType}
                        disabled={!canEditSetup}
                        onChange={(event) =>
                          updateDay(day.id, "dayType", event.target.value)
                        }
                        className="h-10 rounded-lg border border-line bg-white px-3 text-ink disabled:bg-background disabled:text-muted"
                      >
                        <option value="mth">M-Th</option>
                        <option value="friday">Friday</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        value={day.originalDoctors}
                        disabled={!canEditSetup}
                        onChange={(event) =>
                          updateDay(
                            day.id,
                            "originalDoctors",
                            event.target.value,
                          )
                        }
                        className="h-10 w-24 rounded-lg border border-line bg-white px-3 text-right font-mono text-ink disabled:bg-background disabled:text-muted"
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        value={day.doctors}
                        disabled={!canEditSetup}
                        onChange={(event) =>
                          updateDay(day.id, "doctors", event.target.value)
                        }
                        className="h-10 w-24 rounded-lg border border-line bg-white px-3 text-right font-mono font-semibold text-ink disabled:bg-background disabled:text-muted"
                      />
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-ink">
                      {money(day.doctors * average)}
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={day.changeReason}
                        disabled={!canEditSetup}
                        placeholder={changed ? "Doctor out" : "On plan"}
                        onChange={(event) =>
                          updateDay(
                            day.id,
                            "changeReason",
                            event.target.value,
                          )
                        }
                        className="h-10 w-full rounded-lg border border-line bg-white px-3 text-ink disabled:bg-background disabled:text-muted"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        disabled={!canEditSetup}
                        onClick={() => removeScheduleDay(day.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-background hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Remove ${day.date}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!sortedDays.length ? (
                <tr className="border-t border-line">
                  <td className="px-5 py-8 text-muted" colSpan={7}>
                    No dates yet. Generate weekdays or add dates manually.
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
