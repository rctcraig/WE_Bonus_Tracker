import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  BonusTier,
  DriveForNineCampaign,
  DriveForNineResult,
  MonthPlan,
  MonthlyGoal,
  ProductionEntry,
  ProfitabilityStatus,
  Quarter,
  ScheduleDay,
} from "@/lib/types";

type PracticeRow = {
  id: string;
  slug: string;
  name: string;
};

type MonthlyGoalRow = {
  month: string;
  s1p_goal: string | number;
  historical_adjusted_actual: string | number | null;
  official_s1p_actual: string | number | null;
  closed: boolean;
  profitability_status: ProfitabilityStatus;
};

type MonthPlanRow = {
  id: string;
  month: string;
  avg_mth_doctor_day: string | number;
  avg_friday_doctor_day: string | number;
  planned_workday_count: number;
};

type ScheduleDayRow = {
  month_plan_id: string;
  work_date: string;
  day_type: "mth" | "friday";
  doctors: string | number;
  original_doctors: string | number;
  change_reason: string | null;
};

type ProductionEntryRow = {
  work_date: string;
  total_production: string | number;
  credit_adjustments: string | number;
  note: string | null;
};

type BonusTierRow = {
  threshold_pct: string | number;
  amount: string | number;
};

type DriveForNineRow = {
  month: string;
  active: boolean;
  qualification_pct: string | number;
  result: DriveForNineResult;
};

export type PracticeData = {
  practice: PracticeRow;
  monthlyGoals: MonthlyGoal[];
  monthPlans: MonthPlan[];
  productionEntries: ProductionEntry[];
  bonusTiers: BonusTier[];
  driveForNineCampaigns: DriveForNineCampaign[];
  quarters: Quarter[];
};

export const practiceSlug = "wichita-endodontics";

function toNumber(value: string | number | null | undefined) {
  return value === null || value === undefined ? undefined : Number(value);
}

function monthId(date: string) {
  return date.slice(0, 7);
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(`${month}-01T12:00:00`),
  );
}

function buildQuarters(goals: MonthlyGoal[]): Quarter[] {
  // Derive quarter buckets from whatever goal months exist instead of hardcoding
  // a single year, so the app keeps working as new years are added.
  const buckets = new Map<
    string,
    { year: number; quarter: number; months: string[] }
  >();

  for (const goal of goals) {
    const [year, monthNumber] = goal.month.split("-").map(Number);

    if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) {
      continue;
    }

    const quarter = Math.floor((monthNumber - 1) / 3) + 1;
    const key = `${year}-${quarter}`;
    const bucket = buckets.get(key) ?? { year, quarter, months: [] };
    bucket.months.push(goal.month);
    buckets.set(key, bucket);
  }

  const multipleYears = new Set([...buckets.values()].map((b) => b.year)).size > 1;

  return [...buckets.values()]
    .sort((a, b) => a.year - b.year || a.quarter - b.quarter)
    .map((bucket) => {
      const months = [...bucket.months].sort();
      const statuses = months.map(
        (month) =>
          goals.find((goal) => goal.month === month)?.profitabilityStatus ??
          "unknown",
      );
      const profitabilityStatus: ProfitabilityStatus = statuses.includes(
        "unfavorable",
      )
        ? "unfavorable"
        : statuses.every((status) => status === "favorable")
          ? "favorable"
          : "unknown";

      return {
        label: multipleYears
          ? `Q${bucket.quarter} ${bucket.year}`
          : `Q${bucket.quarter}`,
        months,
        profitabilityStatus,
      };
    });
}

function currentPracticeMonth() {
  // The practice is in Wichita (US Central). Resolve the month in that timezone
  // so the active month doesn't flip hours early under UTC.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";

  return `${year}-${month}`;
}

export function getActiveMonth(goals: MonthlyGoal[]) {
  const currentMonth = currentPracticeMonth();
  const matchingOpenGoal = goals.find(
    (goal) => !goal.closed && goal.month === currentMonth,
  );

  if (matchingOpenGoal) {
    return matchingOpenGoal.month;
  }

  return (
    goals.find((goal) => !goal.closed)?.month ??
    goals.at(-1)?.month ??
    currentMonth
  );
}

export async function getPracticeData(): Promise<PracticeData> {
  const supabase = getSupabaseAdminClient();
  const { data: practice, error: practiceError } = await supabase
    .from("practices")
    .select("id,slug,name")
    .eq("slug", practiceSlug)
    .single<PracticeRow>();

  if (practiceError) {
    throw new Error(practiceError.message);
  }

  // These reference tables are small (a handful of rows per year), so they are
  // safe to read in full. They also tell us which year is active, which then
  // bounds the larger per-day tables below.
  const [monthlyGoalsResult, monthPlansResult, bonusTiersResult, driveForNineResult] =
    await Promise.all([
      supabase
        .from("monthly_goals")
        .select(
          "month,s1p_goal,historical_adjusted_actual,official_s1p_actual,closed,profitability_status",
        )
        .eq("practice_id", practice.id)
        .order("month", { ascending: true }),
      supabase
        .from("month_plans")
        .select("id,month,avg_mth_doctor_day,avg_friday_doctor_day,planned_workday_count")
        .eq("practice_id", practice.id)
        .order("month", { ascending: true }),
      supabase
        .from("bonus_tiers")
        .select("threshold_pct,amount")
        .eq("practice_id", practice.id)
        .order("threshold_pct", { ascending: true }),
      supabase
        .from("drive_for_nine_campaigns")
        .select("month,active,qualification_pct,result")
        .eq("practice_id", practice.id)
        .order("month", { ascending: true }),
    ]);

  for (const result of [
    monthlyGoalsResult,
    monthPlansResult,
    bonusTiersResult,
    driveForNineResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const planRows = (monthPlansResult.data ?? []) as MonthPlanRow[];

  // Bound the high-volume daily tables to the active year so the default
  // 1,000-row PostgREST cap can never silently drop the current month's data.
  // Closed prior-year months read their actuals from monthly_goals, so they do
  // not depend on these rows.
  const activeYear = getActiveMonth(
    ((monthlyGoalsResult.data ?? []) as MonthlyGoalRow[]).map((goal) => ({
      month: monthId(goal.month),
      label: "",
      s1pGoal: 0,
      closed: goal.closed,
    })),
  ).slice(0, 4);
  const activeYearPlanIds = planRows
    .filter((plan) => monthId(plan.month).startsWith(activeYear))
    .map((plan) => plan.id);

  const [productionEntriesResult, scheduleDays] = await Promise.all([
    supabase
      .from("production_entries")
      .select("work_date,total_production,credit_adjustments,note")
      .eq("practice_id", practice.id)
      .gte("work_date", `${activeYear}-01-01`)
      .lte("work_date", `${activeYear}-12-31`)
      .order("work_date", { ascending: true }),
    activeYearPlanIds.length > 0
      ? supabase
          .from("schedule_days")
          .select("month_plan_id,work_date,day_type,doctors,original_doctors,change_reason")
          .in("month_plan_id", activeYearPlanIds)
          .order("work_date", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productionEntriesResult.error) {
    throw new Error(productionEntriesResult.error.message);
  }

  if (scheduleDays.error) {
    throw new Error(scheduleDays.error.message);
  }

  const scheduleRows = (scheduleDays.data ?? []) as ScheduleDayRow[];
  const monthlyGoals = ((monthlyGoalsResult.data ?? []) as MonthlyGoalRow[]).map(
    (goal) => ({
      month: monthId(goal.month),
      label: monthLabel(monthId(goal.month)),
      s1pGoal: Number(goal.s1p_goal),
      closed: goal.closed,
      officialS1PActual: toNumber(goal.official_s1p_actual),
      historicalAdjustedActual: toNumber(goal.historical_adjusted_actual),
      profitabilityStatus: goal.profitability_status,
    }),
  );
  const monthPlans = planRows.map((plan): MonthPlan => {
    const scheduledDays = scheduleRows
      .filter((day) => day.month_plan_id === plan.id)
      .map(
        (day): ScheduleDay => ({
          date: day.work_date,
          dayType: day.day_type,
          doctors: Number(day.doctors),
          originalDoctors: Number(day.original_doctors),
          changeReason: day.change_reason ?? undefined,
        }),
      );

    return {
      month: monthId(plan.month),
      plannedWorkdayCount: plan.planned_workday_count,
      plannedProductionDates: scheduledDays.map((day) => day.date),
      avgMthDoctorDay: Number(plan.avg_mth_doctor_day),
      avgFridayDoctorDay: Number(plan.avg_friday_doctor_day),
      scheduledDays,
    };
  });
  const productionEntries = (
    (productionEntriesResult.data ?? []) as ProductionEntryRow[]
  ).map(
    (entry): ProductionEntry => ({
      date: entry.work_date,
      totalProduction: Number(entry.total_production),
      creditAdjustments: Number(entry.credit_adjustments),
      note: entry.note ?? undefined,
    }),
  );
  const bonusTiers = ((bonusTiersResult.data ?? []) as BonusTierRow[]).map(
    (tier) => ({
      thresholdPct: Number(tier.threshold_pct),
      amount: Number(tier.amount),
    }),
  );
  const driveForNineCampaigns = (
    (driveForNineResult.data ?? []) as DriveForNineRow[]
  ).map((campaign) => ({
    month: monthId(campaign.month),
    active: campaign.active,
    qualificationPct: Number(campaign.qualification_pct),
    result: campaign.result,
  }));

  return {
    practice,
    monthlyGoals,
    monthPlans,
    productionEntries,
    bonusTiers,
    driveForNineCampaigns,
    quarters: buildQuarters(monthlyGoals),
  };
}
