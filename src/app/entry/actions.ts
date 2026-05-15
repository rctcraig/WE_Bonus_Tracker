"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { canEditProduction } from "@/lib/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProductionEntry } from "@/lib/types";

export async function saveProductionEntries(entries: ProductionEntry[]) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canEditProduction(currentProfile.role)) {
    return {
      ok: false,
      message: "You do not have permission to save production entries.",
    };
  }

  const supabase = getSupabaseAdminClient();
  const rows = entries
    .filter((entry) => entry.date && entry.totalProduction >= 0)
    .map((entry) => ({
      practice_id: currentProfile.practiceId,
      work_date: entry.date,
      total_production: entry.totalProduction,
      credit_adjustments: entry.creditAdjustments,
      note: entry.note?.trim() || null,
      entered_by: currentProfile.userId,
    }));

  if (rows.length === 0) {
    return { ok: false, message: "No production rows to save." };
  }

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
