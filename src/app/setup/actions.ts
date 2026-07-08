"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentProfile } from "@/lib/auth";
import { canEditProduction } from "@/lib/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DayType } from "@/lib/types";
import { isValidIsoDate } from "@/lib/validation";

type SetupScheduleDayInput = {
  date: string;
  dayType: DayType;
  doctors: number;
  originalDoctors: number;
  changeReason?: string;
};

type SaveMonthSetupInput = {
  month: string;
  s1pGoal: number;
  avgMthDoctorDay: number;
  avgFridayDoctorDay: number;
  plannedWorkdayCount: number;
  scheduleDays: SetupScheduleDayInput[];
};

function toMonthDate(month: string) {
  return `${month}-01`;
}

// Round to cents rather than whole dollars; the columns are numeric(12,2) and
// goals carry cents. Invalid values are rejected with a message instead of
// being coerced to 0, which could silently wipe out a goal on a typo.
function toCents(value: number) {
  return Math.round(value * 100) / 100;
}

function isNonNegativeNumber(value: number) {
  return Number.isFinite(value) && value >= 0;
}

export async function saveMonthSetup(input: SaveMonthSetupInput) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canEditProduction(currentProfile.role)) {
    return {
      ok: false,
      message: "You do not have permission to update month setup.",
    };
  }

  if (!/^\d{4}-\d{2}$/.test(input.month)) {
    return { ok: false, message: "Choose a valid month." };
  }

  if (!isNonNegativeNumber(input.s1pGoal)) {
    return { ok: false, message: "The S1P goal must be zero or more." };
  }

  if (
    !isNonNegativeNumber(input.avgMthDoctorDay) ||
    !isNonNegativeNumber(input.avgFridayDoctorDay)
  ) {
    return {
      ok: false,
      message: "Average doctor-day amounts must be zero or more.",
    };
  }

  if (!isNonNegativeNumber(input.plannedWorkdayCount)) {
    return { ok: false, message: "Planned workdays must be zero or more." };
  }

  const scheduleDays = input.scheduleDays
    .filter((day) => isValidIsoDate(day.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (
    scheduleDays.some(
      (day) =>
        !isNonNegativeNumber(day.doctors) ||
        !isNonNegativeNumber(day.originalDoctors),
    )
  ) {
    return {
      ok: false,
      message: "Doctor counts for each scheduled day must be zero or more.",
    };
  }

  if (scheduleDays.some((day) => !day.date.startsWith(input.month))) {
    return {
      ok: false,
      message: "Every scheduled day must fall within the selected month.",
    };
  }

  const uniqueDates = new Set(scheduleDays.map((day) => day.date));

  if (uniqueDates.size !== scheduleDays.length) {
    return { ok: false, message: "Each scheduled date can only appear once." };
  }

  const supabase = getSupabaseAdminClient();
  const monthDate = toMonthDate(input.month);

  const { data: existingGoal, error: existingGoalError } = await supabase
    .from("monthly_goals")
    .select("s1p_goal,closed")
    .eq("practice_id", currentProfile.practiceId)
    .eq("month", monthDate)
    .maybeSingle();

  if (existingGoalError) {
    return { ok: false, message: existingGoalError.message };
  }

  if (existingGoal?.closed) {
    return {
      ok: false,
      message: `${input.month} is closed and can no longer be edited.`,
    };
  }

  // Capture the pre-save plan so the audit event can show what changed; the
  // S1P goal drives the bonus, so its history matters.
  const { data: existingPlan } = await supabase
    .from("month_plans")
    .select("id,avg_mth_doctor_day,avg_friday_doctor_day,planned_workday_count")
    .eq("practice_id", currentProfile.practiceId)
    .eq("month", monthDate)
    .maybeSingle();
  let beforeScheduleDayCount = 0;

  if (existingPlan) {
    const { count } = await supabase
      .from("schedule_days")
      .select("id", { count: "exact", head: true })
      .eq("month_plan_id", existingPlan.id);

    beforeScheduleDayCount = count ?? 0;
  }

  const { error: goalError } = await supabase.from("monthly_goals").upsert(
    {
      practice_id: currentProfile.practiceId,
      month: monthDate,
      s1p_goal: toCents(input.s1pGoal),
    },
    { onConflict: "practice_id,month" },
  );

  if (goalError) {
    return { ok: false, message: goalError.message };
  }

  const { data: plan, error: planError } = await supabase
    .from("month_plans")
    .upsert(
      {
        practice_id: currentProfile.practiceId,
        month: monthDate,
        avg_mth_doctor_day: toCents(input.avgMthDoctorDay),
        avg_friday_doctor_day: toCents(input.avgFridayDoctorDay),
        planned_workday_count: Math.max(
          Math.round(input.plannedWorkdayCount),
          0,
        ),
      },
      { onConflict: "practice_id,month" },
    )
    .select("id")
    .single();

  if (planError || !plan) {
    return { ok: false, message: planError?.message ?? "Plan save failed." };
  }

  // Upsert first and prune afterwards so a failure partway through never
  // leaves the month without its schedule (the old delete-then-insert could
  // wipe every day if the insert failed).
  if (scheduleDays.length > 0) {
    const { error: upsertError } = await supabase.from("schedule_days").upsert(
      scheduleDays.map((day) => ({
        month_plan_id: plan.id,
        work_date: day.date,
        day_type: day.dayType,
        doctors: day.doctors,
        original_doctors: day.originalDoctors,
        change_reason: day.changeReason?.trim() || null,
      })),
      { onConflict: "month_plan_id,work_date" },
    );

    if (upsertError) {
      return { ok: false, message: upsertError.message };
    }
  }

  let pruneQuery = supabase
    .from("schedule_days")
    .delete()
    .eq("month_plan_id", plan.id);

  if (scheduleDays.length > 0) {
    pruneQuery = pruneQuery.not(
      "work_date",
      "in",
      `(${scheduleDays.map((day) => day.date).join(",")})`,
    );
  }

  const { error: pruneError } = await pruneQuery;

  if (pruneError) {
    return { ok: false, message: pruneError.message };
  }

  await logAuditEvent({
    practiceId: currentProfile.practiceId,
    actorUserId: currentProfile.userId,
    eventType: existingGoal ? "month_setup_saved" : "month_setup_created",
    tableName: "monthly_goals",
    beforeData: existingGoal
      ? {
          month: input.month,
          s1p_goal: Number(existingGoal.s1p_goal),
          avg_mth_doctor_day: existingPlan
            ? Number(existingPlan.avg_mth_doctor_day)
            : null,
          avg_friday_doctor_day: existingPlan
            ? Number(existingPlan.avg_friday_doctor_day)
            : null,
          planned_workday_count: existingPlan?.planned_workday_count ?? null,
          schedule_day_count: beforeScheduleDayCount,
        }
      : undefined,
    afterData: {
      month: input.month,
      s1p_goal: toCents(input.s1pGoal),
      avg_mth_doctor_day: toCents(input.avgMthDoctorDay),
      avg_friday_doctor_day: toCents(input.avgFridayDoctorDay),
      planned_workday_count: Math.max(Math.round(input.plannedWorkdayCount), 0),
      schedule_day_count: scheduleDays.length,
    },
  });

  revalidatePath("/");
  revalidatePath("/setup");
  revalidatePath("/history");

  return { ok: true, message: `${input.month} setup saved.` };
}
