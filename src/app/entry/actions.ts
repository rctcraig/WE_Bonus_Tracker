"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit";
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

  // Snapshot the rows being replaced so the audit trail records what the
  // numbers were before this save, not just what they became.
  const { data: beforeRows } = await supabase
    .from("production_entries")
    .select("work_date,total_production,credit_adjustments,note")
    .eq("practice_id", currentProfile.practiceId)
    .in("work_date", dates);

  const { error } = await supabase
    .from("production_entries")
    .upsert(rows, { onConflict: "practice_id,work_date" });

  if (error) {
    return { ok: false, message: error.message };
  }

  const beforeByDate = new Map(
    (beforeRows ?? []).map((row) => [
      String(row.work_date),
      {
        total_production: Number(row.total_production),
        credit_adjustments: Number(row.credit_adjustments),
        note: row.note,
      },
    ]),
  );
  // Only audit rows that actually changed; the client resends every visible
  // row on save, and logging untouched days would drown the trail in noise.
  const changedRows = rows.filter((row) => {
    const before = beforeByDate.get(row.work_date);

    return (
      !before ||
      before.total_production !== row.total_production ||
      before.credit_adjustments !== row.credit_adjustments ||
      (before.note ?? null) !== row.note
    );
  });

  if (changedRows.length > 0) {
    await logAuditEvent({
      practiceId: currentProfile.practiceId,
      actorUserId: currentProfile.userId,
      eventType: "production_entries_saved",
      tableName: "production_entries",
      beforeData: Object.fromEntries(
        changedRows.map((row) => [
          row.work_date,
          beforeByDate.get(row.work_date) ?? null,
        ]),
      ),
      afterData: Object.fromEntries(
        changedRows.map((row) => [
          row.work_date,
          {
            total_production: row.total_production,
            credit_adjustments: row.credit_adjustments,
            note: row.note,
          },
        ]),
      ),
    });
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

  const { data: existing, error: existingError } = await supabase
    .from("production_entries")
    .select("id,total_production,credit_adjustments,note")
    .eq("practice_id", currentProfile.practiceId)
    .eq("work_date", date)
    .maybeSingle();

  if (existingError) {
    return { ok: false, message: existingError.message };
  }

  if (!existing) {
    return { ok: false, message: `No saved entry exists for ${date}.` };
  }

  const { error } = await supabase
    .from("production_entries")
    .delete()
    .eq("practice_id", currentProfile.practiceId)
    .eq("work_date", date);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logAuditEvent({
    practiceId: currentProfile.practiceId,
    actorUserId: currentProfile.userId,
    eventType: "production_entry_deleted",
    tableName: "production_entries",
    recordId: existing.id,
    beforeData: {
      work_date: date,
      total_production: Number(existing.total_production),
      credit_adjustments: Number(existing.credit_adjustments),
      note: existing.note,
    },
  });

  revalidatePath("/");
  revalidatePath("/entry");
  revalidatePath("/history");

  return { ok: true, message: `Removed the ${date} entry.` };
}
