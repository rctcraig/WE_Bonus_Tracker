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

function buildQuarters(goals: MonthlyGoal[]) {
  const quarterMonths = [
    ["2026-01", "2026-02", "2026-03"],
    ["2026-04", "2026-05", "2026-06"],
    ["2026-07", "2026-08", "2026-09"],
    ["2026-10", "2026-11", "2026-12"],
  ];

  return quarterMonths.map((months, index) => {
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
      label: `Q${index + 1}`,
      months,
      profitabilityStatus,
    };
  });
}

export function getActiveMonth(goals: MonthlyGoal[]) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const matchingOpenGoal = goals.find(
    (goal) => !goal.closed && goal.month === currentMonth,
  );

  if (matchingOpenGoal) {
    return matchingOpenGoal.month;
  }

  return goals.find((goal) => !goal.closed)?.month ?? goals.at(-1)?.month ?? "2026-05";
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

  const [
    monthlyGoalsResult,
    monthPlansResult,
    productionEntriesResult,
    bonusTiersResult,
    driveForNineResult,
  ] = await Promise.all([
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
      .from("production_entries")
      .select("work_date,total_production,credit_adjustments,note")
      .eq("practice_id", practice.id)
      .order("work_date", { ascending: true }),
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
    productionEntriesResult,
    bonusTiersResult,
    driveForNineResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const planRows = (monthPlansResult.data ?? []) as MonthPlanRow[];
  const scheduleDays =
    planRows.length > 0
      ? await supabase
          .from("schedule_days")
          .select("month_plan_id,work_date,day_type,doctors,original_doctors,change_reason")
          .in(
            "month_plan_id",
            planRows.map((plan) => plan.id),
          )
          .order("work_date", { ascending: true })
      : { data: [], error: null };

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
