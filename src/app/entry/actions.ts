"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { canEditProduction } from "@/lib/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProductionEntry } from "@/lib/types";
import { isValidIsoDate } from "@/lib/validation";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

async function findClosedOrMissingMonth(
  supabase: SupabaseAdminClient,
  practiceId: string,
  months: string[],
) {
  const { data, error } = await supabase
    .from("monthly_goals")
    .select("month,closed")
    .eq("practice_id", practiceId)
    .in(
      "month",
      months.map((month) => `${month}-01`),
    );

  if (error) {
    return { ok: false as const, message: error.message };
  }

  const goalsByMonth = new Map(
    (data ?? []).map((goal) => [String(goal.month).slice(0, 7), goal]),
  );

  for (const month of months) {
    const goal = goalsByMonth.get(month);

    if (!goal) {
      return {
        ok: false as const,
        message: `${month} is not set up for production entry.`,
      };
    }

    if (goal.closed) {
      return {
        ok: false as const,
        message: `${month} is closed and can no longer be edited.`,
      };
    }
  }

  return { ok: true as const };
}

export async function saveProductionEntries(entries: ProductionEntry[]) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canEditProduction(currentProfile.role)) {
    return {
      ok: false,
      message: "You do not have permission to save production entries.",
    };
  }

  if (entries.length === 0) {
    return { ok: false, message: "No production rows to save." };
  }

  for (const entry of entries) {
    if (!isValidIsoDate(entry.date)) {
      return { ok: false, message: "Each row needs a valid date." };
    }

    if (
      !Number.isFinite(entry.totalProduction) ||
      entry.totalProduction < 0 ||
      !Number.isFinite(entry.creditAdjustments) ||
      entry.creditAdjustments < 0
    ) {
      return {
        ok: false,
        message: `Production and credit amounts for ${entry.date} must be zero or more.`,
      };
    }
  }

  const dates = entries.map((entry) => entry.date);

  if (new Set(dates).size !== dates.length) {
    return {
      ok: false,
      message: "Each date can only appear once. Combine duplicate rows first.",
    };
  }

  const supabase = getSupabaseAdminClient();
  const months = [...new Set(dates.map((date) => date.slice(0, 7)))];
  const monthCheck = await findClosedOrMissingMonth(
    supabase,
    currentProfile.practiceId,
    months,
  );

  if (!monthCheck.ok) {
    return monthCheck;
  }

  const rows = entries.map((entry) => ({
    practice_id: currentProfile.practiceId,
    work_date: entry.date,
    total_production: entry.totalProduction,
    credit_adjustments: entry.creditAdjustments,
    note: entry.note?.trim() || null,
    entered_by: currentProfile.userId,
  }));

  const { error } = await supabase
    .from("production_entries")
    .upsert(rows, { onConflict: "practice_id,work_date" });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/entry");
  revalidatePath("/history");

  return { ok: true, message: `${rows.length} production rows saved.` };
}

export async function deleteProductionEntry(date: string) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canEditProduction(currentProfile.role)) {
    return {
      ok: false,
      message: "You do not have permission to delete production entries.",
    };
  }

  if (!isValidIsoDate(date)) {
    return { ok: false, message: "Choose a valid date to delete." };
  }

  const supabase = getSupabaseAdminClient();
  const monthCheck = await findClosedOrMissingMonth(
    supabase,
    currentProfile.practiceId,
    [date.slice(0, 7)],
  );

  if (!monthCheck.ok) {
    return monthCheck;
  }

  const { error } = await supabase
    .from("production_entries")
    .delete()
    .eq("practice_id", currentProfile.practiceId)
    .eq("work_date", date);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/entry");
  revalidatePath("/history");

  return { ok: true, message: `Removed the ${date} entry.` };
}
