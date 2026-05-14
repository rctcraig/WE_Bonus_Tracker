import {
  bonusTiers,
  driveForNineCampaigns,
  mayProductionEntries,
  monthPlans,
  monthlyGoals,
  quarters,
} from "@/lib/seed-data";
import type {
  BonusTier,
  DriveForNineCampaign,
  MonthPlan,
  MonthlyGoal,
  ProductionEntry,
  Quarter,
  ScheduleDay,
} from "@/lib/types";

export const activeMonth = "2026-05";

export function adjustedProduction(entry: ProductionEntry) {
  return entry.totalProduction - entry.creditAdjustments;
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function percent(value: number, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

export function compactDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function fullDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function getMonthGoal(month: string) {
  const goal = monthlyGoals.find((item) => item.month === month);

  if (!goal) {
    throw new Error(`Missing goal for ${month}`);
  }

  return goal;
}

export function getMonthPlan(month: string) {
  return monthPlans.find((item) => item.month === month);
}

export function getQuarterForMonth(month: string) {
  const quarter = quarters.find((item) => item.months.includes(month));

  if (!quarter) {
    throw new Error(`Missing quarter for ${month}`);
  }

  return quarter;
}

export function getDriveForNineCampaign(month: string) {
  return (
    driveForNineCampaigns.find((item) => item.month === month) ?? {
      month,
      active: false,
      qualificationPct: 115,
      result: "not_active",
    }
  );
}

export function expectedForScheduleDay(day: ScheduleDay, plan: MonthPlan) {
  const average =
    day.dayType === "friday"
      ? plan.avgFridayDoctorDay
      : plan.avgMthDoctorDay;

  return day.doctors * average;
}

export function originalExpectedForScheduleDay(
  day: ScheduleDay,
  plan: MonthPlan,
) {
  const average =
    day.dayType === "friday"
      ? plan.avgFridayDoctorDay
      : plan.avgMthDoctorDay;

  return (day.originalDoctors ?? day.doctors) * average;
}

export function summarizeMonth(
  goal: MonthlyGoal,
  plan?: MonthPlan,
  entries: ProductionEntry[] = [],
) {
  const entryTotal = entries.reduce(
    (sum, entry) => sum + adjustedProduction(entry),
    0,
  );
  const actual = goal.historicalAdjustedActual ?? entryTotal;
  const pctOfGoal = goal.s1pGoal > 0 ? (actual / goal.s1pGoal) * 100 : 0;
  const enteredDates = new Set(entries.map((entry) => entry.date));
  const expectedThroughEntries =
    plan?.scheduledDays
      .filter((day) => enteredDates.has(day.date))
      .reduce((sum, day) => sum + expectedForScheduleDay(day, plan), 0) ?? 0;
  const remainingSchedule =
    plan?.scheduledDays.filter((day) => !enteredDates.has(day.date)) ?? [];
  const remainingExpected =
    plan?.scheduledDays
      .filter((day) => !enteredDates.has(day.date))
      .reduce((sum, day) => sum + expectedForScheduleDay(day, plan), 0) ?? 0;
  const currentExpected =
    plan?.scheduledDays.reduce(
      (sum, day) => sum + expectedForScheduleDay(day, plan),
      0,
    ) ?? 0;
  const originalExpected =
    plan?.scheduledDays.reduce(
      (sum, day) => sum + originalExpectedForScheduleDay(day, plan),
      0,
    ) ?? currentExpected;
  const scheduleChangeImpact = currentExpected - originalExpected;
  const forecast = goal.closed ? actual : actual + remainingExpected;

  return {
    actual,
    currentExpected,
    expectedThroughEntries,
    forecast,
    goal,
    pctOfGoal,
    remainingExpected,
    remainingNeeded: Math.max(goal.s1pGoal - actual, 0),
    remainingSchedule,
    scheduleChangeImpact,
    varianceToGoal: actual - goal.s1pGoal,
  };
}

export function tierForPercent(tiers: BonusTier[], pct: number) {
  return tiers
    .filter((tier) => pct >= tier.thresholdPct)
    .sort((a, b) => b.thresholdPct - a.thresholdPct)[0];
}

export function nextTierForPercent(tiers: BonusTier[], pct: number) {
  return tiers
    .filter((tier) => pct < tier.thresholdPct)
    .sort((a, b) => a.thresholdPct - b.thresholdPct)[0];
}

export function summarizeQuarter(quarter: Quarter) {
  const goals = quarter.months.map(getMonthGoal);
  const goal = goals.reduce((sum, item) => sum + item.s1pGoal, 0);
  const actual = goals.reduce(
    (sum, item) =>
      sum +
      summarizeMonth(
        item,
        getMonthPlan(item.month),
        item.month === "2026-05" ? mayProductionEntries : [],
      ).actual,
    0,
  );
  const pct = goal > 0 ? (actual / goal) * 100 : 0;
  const tier = tierForPercent(bonusTiers, pct);
  const nextTier = nextTierForPercent(bonusTiers, pct);

  return {
    actual,
    goal,
    label: quarter.label,
    months: quarter.months,
    nextTier,
    pct,
    profitabilityStatus: quarter.profitabilityStatus,
    tier,
  };
}

export function summarizeDriveForNine(
  campaign: DriveForNineCampaign,
  monthSummary: ReturnType<typeof summarizeMonth>,
) {
  const threshold = monthSummary.goal.s1pGoal * (campaign.qualificationPct / 100);
  const qualified = monthSummary.actual >= threshold;

  if (!campaign.active) {
    return {
      ...campaign,
      qualified: false,
      shortLabel: "Not active",
      threshold,
      toQualify: threshold,
    };
  }

  if (campaign.result === "won") {
    return {
      ...campaign,
      qualified: true,
      shortLabel: "Won",
      threshold,
      toQualify: 0,
    };
  }

  return {
    ...campaign,
    qualified,
    shortLabel: qualified ? "Qualified, pending S1P" : "Not qualified yet",
    threshold,
    toQualify: Math.max(threshold - monthSummary.actual, 0),
  };
}

export const currentMonthSummary = summarizeMonth(
  getMonthGoal(activeMonth),
  getMonthPlan(activeMonth),
  mayProductionEntries,
);

export const currentQuarterSummary = summarizeQuarter(
  getQuarterForMonth(activeMonth),
);

export const currentDriveForNineSummary = summarizeDriveForNine(
  getDriveForNineCampaign(activeMonth),
  currentMonthSummary,
);
