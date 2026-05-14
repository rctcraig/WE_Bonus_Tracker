"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { practiceSlug } from "@/lib/data";
import type { ProductionEntry } from "@/lib/types";

export async function saveProductionEntries(entries: ProductionEntry[]) {
  const supabase = getSupabaseAdminClient();
  const { data: practice, error: practiceError } = await supabase
    .from("practices")
    .select("id")
    .eq("slug", practiceSlug)
    .single();

  if (practiceError) {
    return { ok: false, message: practiceError.message };
  }

  const practiceId = (practice as { id: string }).id;
  const rows = entries
    .filter((entry) => entry.date && entry.totalProduction >= 0)
    .map((entry) => ({
      practice_id: practiceId,
      work_date: entry.date,
      total_production: entry.totalProduction,
      credit_adjustments: entry.creditAdjustments,
      note: entry.note?.trim() || null,
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
