"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { canEditProduction } from "@/lib/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DayType } from "@/lib/types";

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

function cleanMoney(value: number) {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}

function cleanDoctorCount(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
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

  const scheduleDays = input.scheduleDays
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const uniqueDates = new Set(scheduleDays.map((day) => day.date));

  if (uniqueDates.size !== scheduleDays.length) {
    return { ok: false, message: "Each scheduled date can only appear once." };
  }

  const supabase = getSupabaseAdminClient();
  const monthDate = toMonthDate(input.month);
  const { error: goalError } = await supabase.from("monthly_goals").upsert(
    {
      practice_id: currentProfile.practiceId,
      month: monthDate,
      s1p_goal: cleanMoney(input.s1pGoal),
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
        avg_mth_doctor_day: cleanMoney(input.avgMthDoctorDay),
        avg_friday_doctor_day: cleanMoney(input.avgFridayDoctorDay),
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

  const { error: deleteError } = await supabase
    .from("schedule_days")
    .delete()
    .eq("month_plan_id", plan.id);

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  if (scheduleDays.length > 0) {
    const { error: insertError } = await supabase.from("schedule_days").insert(
      scheduleDays.map((day) => ({
        month_plan_id: plan.id,
        work_date: day.date,
        day_type: day.dayType,
        doctors: cleanDoctorCount(day.doctors),
        original_doctors: cleanDoctorCount(day.originalDoctors),
        change_reason: day.changeReason?.trim() || null,
      })),
    );

    if (insertError) {
      return { ok: false, message: insertError.message };
    }
  }

  revalidatePath("/");
  revalidatePath("/setup");
  revalidatePath("/history");

  return { ok: true, message: `${input.month} setup saved.` };
}
