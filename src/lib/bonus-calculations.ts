import {
  adjustedProduction,
  compactDate,
  fullDate,
  money,
  percent,
} from "@/lib/format";
import type {
  BonusTier,
  DriveForNineCampaign,
  MonthPlan,
  MonthlyGoal,
  ProductionEntry,
  Quarter,
  ScheduleDay,
} from "@/lib/types";

// Re-exported so existing callers can keep importing formatters from here.
// The implementations live in @/lib/format (which is seed-data-free, so client
// bundles that only need formatting never pull in the seed dataset).
export { adjustedProduction, compactDate, fullDate, money, percent };

export function getMonthGoalFromData(goals: MonthlyGoal[], month: string) {
  const goal = goals.find((item) => item.month === month);

  if (!goal) {
    throw new Error(`Missing goal for ${month}`);
  }

  return goal;
}

export function getMonthPlanFromData(plans: MonthPlan[], month: string) {
  return plans.find((item) => item.month === month);
}

export function getQuarterForMonthFromData(quarterList: Quarter[], month: string) {
  const quarter = quarterList.find((item) => item.months.includes(month));

  if (!quarter) {
    throw new Error(`Missing quarter for ${month}`);
  }

  return quarter;
}

export function getDriveForNineCampaignFromData(
  campaigns: DriveForNineCampaign[],
  month: string,
) {
  return (
    campaigns.find((item) => item.month === month) ?? {
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
  // The official S1P actual is the scoreboard the bonus pays on, so prefer it
  // for closed months. Open months fall back to the internal historical total
  // or the sum of entered daily production.
  const actual = goal.closed
    ? goal.officialS1PActual ??
      goal.historicalAdjustedActual ??
      entryTotal
    : goal.historicalAdjustedActual ?? entryTotal;
  const pctOfGoal = goal.s1pGoal > 0 ? (actual / goal.s1pGoal) * 100 : 0;
  const enteredDates = new Set(entries.map((entry) => entry.date));
  // A month with a historical monthly total (or a closed month) is already
  // fully realized: `actual` is the final number. Counting its scheduled days
  // as "remaining" would add a whole month of capacity on top of that total
  // and roughly double the forecast, so there is nothing left to expect.
  const fullyRealized =
    goal.closed || typeof goal.historicalAdjustedActual === "number";
  const expectedThroughEntries =
    plan?.scheduledDays
      .filter((day) => enteredDates.has(day.date))
      .reduce((sum, day) => sum + expectedForScheduleDay(day, plan), 0) ?? 0;
  const remainingSchedule = fullyRealized
    ? []
    : (plan?.scheduledDays.filter((day) => !enteredDates.has(day.date)) ?? []);
  const remainingExpected = remainingSchedule.reduce(
    (sum, day) => sum + (plan ? expectedForScheduleDay(day, plan) : 0),
    0,
  );
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
  const forecast = fullyRealized ? actual : actual + remainingExpected;

  return {
    actual,
    currentExpected,
    entryTotal,
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

export function summarizeQuarterFromData(
  quarter: Quarter,
  goals: MonthlyGoal[],
  plans: MonthPlan[],
  entries: ProductionEntry[],
  tiers: BonusTier[],
) {
  const quarterGoals = quarter.months.map((month) =>
    getMonthGoalFromData(goals, month),
  );
  const goal = quarterGoals.reduce((sum, item) => sum + item.s1pGoal, 0);
  const actual = quarterGoals.reduce((sum, item) => {
    const monthEntries = entries.filter((entry) =>
      entry.date.startsWith(item.month),
    );

    return (
      sum +
      summarizeMonth(
        item,
        getMonthPlanFromData(plans, item.month),
        monthEntries,
      ).actual
    );
  }, 0);
  const pct = goal > 0 ? (actual / goal) * 100 : 0;
  const tier = tierForPercent(tiers, pct);
  const nextTier = nextTierForPercent(tiers, pct);

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

export function summarizeQuarterProjectionFromData(
  quarter: Quarter,
  goals: MonthlyGoal[],
  plans: MonthPlan[],
  entries: ProductionEntry[],
  tiers: BonusTier[],
) {
  const base = summarizeQuarterFromData(quarter, goals, plans, entries, tiers);
  const projected = quarter.months.reduce((sum, month) => {
    const goal = getMonthGoalFromData(goals, month);
    const plan = getMonthPlanFromData(plans, month);
    const monthEntries = entries.filter((entry) => entry.date.startsWith(month));
    const summary = summarizeMonth(goal, plan, monthEntries);

    if (goal.closed) {
      return sum + summary.actual;
    }

    if (monthEntries.length > 0 || plan) {
      return sum + summary.forecast;
    }

    return sum + goal.s1pGoal;
  }, 0);
  const projectedPct = base.goal > 0 ? (projected / base.goal) * 100 : 0;
  const projectedTier = tierForPercent(tiers, projectedPct);
  const nextProjectedTier = nextTierForPercent(tiers, projectedPct);

  return {
    ...base,
    projected,
    projectedPct,
    projectedTier,
    nextProjectedTier,
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
