import { EntryClient } from "@/app/entry/entry-client";
import { requireCurrentProfile } from "@/lib/auth";
import { getActiveMonth, getPracticeData } from "@/lib/data";
import { canEditProduction } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const currentProfile = await requireCurrentProfile();
  const data = await getPracticeData();
  const params = await searchParams;
  const activeMonth = getActiveMonth(data.monthlyGoals);
  const availableMonths = data.monthlyGoals.filter(
    (goal) =>
      goal.month <= activeMonth ||
      data.productionEntries.some((entry) => entry.date.startsWith(goal.month)),
  );
  const requestedMonth =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : activeMonth;
  const selectedMonth = availableMonths.some(
    (goal) => goal.month === requestedMonth,
  )
    ? requestedMonth
    : activeMonth;
  const selectedGoal =
    data.monthlyGoals.find((goal) => goal.month === selectedMonth) ??
    data.monthlyGoals.find((goal) => goal.month === activeMonth);
  const plan = data.monthPlans.find((item) => item.month === selectedMonth);
  const entries = data.productionEntries.filter((entry) =>
    entry.date.startsWith(selectedMonth),
  );
  const enteredDates = new Set(entries.map((entry) => entry.date));
  const draftDate =
    plan?.scheduledDays.find((day) => !enteredDates.has(day.date))?.date ??
    `${selectedMonth}-01`;

  return (
    <EntryClient
      key={selectedMonth}
      canEditProduction={canEditProduction(currentProfile.role)}
      activeMonth={activeMonth}
      initialEntries={entries}
      monthOptions={availableMonths.map((goal) => ({
        closed: goal.closed,
        hasEntries: data.productionEntries.some((entry) =>
          entry.date.startsWith(goal.month),
        ),
        historicalAdjustedActual: goal.historicalAdjustedActual,
        label: goal.label,
        month: goal.month,
      }))}
      selectedMonth={selectedMonth}
      selectedMonthClosed={selectedGoal?.closed ?? false}
      selectedMonthHistoricalAdjustedActual={
        selectedGoal?.historicalAdjustedActual
      }
      selectedMonthLabel={selectedGoal?.label ?? selectedMonth}
      draftDate={draftDate}
    />
  );
}
