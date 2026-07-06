"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentProfile } from "@/lib/auth";
import {
  canCloseMonth,
  canEditProduction,
  canReopenMonth,
} from "@/lib/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DriveForNineResult, ProfitabilityStatus } from "@/lib/types";

const profitabilityStatuses: ProfitabilityStatus[] = [
  "unknown",
  "favorable",
  "unfavorable",
];

const driveForNineResults: DriveForNineResult[] = [
  "not_active",
  "not_qualified",
  "qualified_pending",
  "won",
  "not_selected",
];

function isValidMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month);
}

function revalidateTrackerPages() {
  revalidatePath("/");
  revalidatePath("/entry");
  revalidatePath("/history");
  revalidatePath("/insights");
  revalidatePath("/setup");
}

export async function setQuarterProfitability(input: {
  months: string[];
  status: ProfitabilityStatus;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canEditProduction(currentProfile.role)) {
    return {
      ok: false,
      message: "You do not have permission to update profitability status.",
    };
  }

  if (!profitabilityStatuses.includes(input.status)) {
    return { ok: false, message: "Choose a valid profitability status." };
  }

  const months = [...new Set(input.months)];

  if (months.length === 0 || months.some((month) => !isValidMonth(month))) {
    return { ok: false, message: "Choose valid months to update." };
  }

  const supabase = getSupabaseAdminClient();
  const monthDates = months.map((month) => `${month}-01`);
  const { data: beforeRows, error: beforeError } = await supabase
    .from("monthly_goals")
    .select("month,profitability_status")
    .eq("practice_id", currentProfile.practiceId)
    .in("month", monthDates);

  if (beforeError) {
    return { ok: false, message: beforeError.message };
  }

  if ((beforeRows ?? []).length !== months.length) {
    return {
      ok: false,
      message: "Some of those months are not set up yet, so nothing was saved.",
    };
  }

  const { error } = await supabase
    .from("monthly_goals")
    .update({ profitability_status: input.status })
    .eq("practice_id", currentProfile.practiceId)
    .in("month", monthDates);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logAuditEvent({
    practiceId: currentProfile.practiceId,
    actorUserId: currentProfile.userId,
    eventType: "profitability_status_set",
    tableName: "monthly_goals",
    beforeData: Object.fromEntries(
      (beforeRows ?? []).map((row) => [
        String(row.month).slice(0, 7),
        row.profitability_status,
      ]),
    ),
    afterData: Object.fromEntries(
      months.map((month) => [month, input.status]),
    ),
  });

  revalidatePath("/");
  revalidatePath("/history");

  return {
    ok: true,
    message:
      input.status === "unknown"
        ? "Profitability status reset to pending."
        : `Quarter marked ${input.status} to budget.`,
  };
}

export async function closeMonth(input: {
  month: string;
  officialS1PActual: number;
  note?: string;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canCloseMonth(currentProfile.role)) {
    return { ok: false, message: "You do not have permission to close months." };
  }

  if (!isValidMonth(input.month)) {
    return { ok: false, message: "Choose a valid month to close." };
  }

  if (
    !Number.isFinite(input.officialS1PActual) ||
    input.officialS1PActual < 0
  ) {
    return {
      ok: false,
      message:
        "Enter the official S1P adjusted production (zero or more) before closing.",
    };
  }

  const supabase = getSupabaseAdminClient();
  const monthDate = `${input.month}-01`;
  const { data: goal, error: goalError } = await supabase
    .from("monthly_goals")
    .select("id,closed,official_s1p_actual,close_note")
    .eq("practice_id", currentProfile.practiceId)
    .eq("month", monthDate)
    .maybeSingle();

  if (goalError) {
    return { ok: false, message: goalError.message };
  }

  if (!goal) {
    return { ok: false, message: `${input.month} is not set up yet.` };
  }

  if (goal.closed) {
    return { ok: false, message: `${input.month} is already closed.` };
  }

  const officialActual = Math.round(input.officialS1PActual * 100) / 100;
  const note = input.note?.trim() || null;
  const { error } = await supabase
    .from("monthly_goals")
    .update({
      closed: true,
      official_s1p_actual: officialActual,
      close_note: note,
      closed_at: new Date().toISOString(),
      closed_by: currentProfile.userId,
    })
    .eq("id", goal.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logAuditEvent({
    practiceId: currentProfile.practiceId,
    actorUserId: currentProfile.userId,
    eventType: "month_closed",
    tableName: "monthly_goals",
    recordId: goal.id,
    reason: note ?? undefined,
    beforeData: {
      month: input.month,
      closed: false,
      official_s1p_actual: goal.official_s1p_actual,
    },
    afterData: {
      month: input.month,
      closed: true,
      official_s1p_actual: officialActual,
    },
  });

  revalidateTrackerPages();

  return {
    ok: true,
    message: `${input.month} closed with an official S1P actual recorded.`,
  };
}

export async function reopenMonth(input: { month: string; reason: string }) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canReopenMonth(currentProfile.role)) {
    return {
      ok: false,
      message: "Only admins can reopen a closed month.",
    };
  }

  if (!isValidMonth(input.month)) {
    return { ok: false, message: "Choose a valid month to reopen." };
  }

  const reason = input.reason.trim();

  if (!reason) {
    return {
      ok: false,
      message: "A change note is required to reopen a closed month.",
    };
  }

  const supabase = getSupabaseAdminClient();
  const monthDate = `${input.month}-01`;
  const { data: goal, error: goalError } = await supabase
    .from("monthly_goals")
    .select("id,closed,official_s1p_actual")
    .eq("practice_id", currentProfile.practiceId)
    .eq("month", monthDate)
    .maybeSingle();

  if (goalError) {
    return { ok: false, message: goalError.message };
  }

  if (!goal || !goal.closed) {
    return { ok: false, message: `${input.month} is not a closed month.` };
  }

  const { error } = await supabase
    .from("monthly_goals")
    .update({
      closed: false,
      closed_at: null,
      closed_by: null,
    })
    .eq("id", goal.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logAuditEvent({
    practiceId: currentProfile.practiceId,
    actorUserId: currentProfile.userId,
    eventType: "month_reopened",
    tableName: "monthly_goals",
    recordId: goal.id,
    reason,
    beforeData: { month: input.month, closed: true },
    afterData: { month: input.month, closed: false },
  });

  revalidateTrackerPages();

  return { ok: true, message: `${input.month} reopened for edits.` };
}

export async function setDriveForNineResult(input: {
  month: string;
  active: boolean;
  result: DriveForNineResult;
}) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canEditProduction(currentProfile.role)) {
    return {
      ok: false,
      message: "You do not have permission to update Drive for Nine campaigns.",
    };
  }

  if (!isValidMonth(input.month)) {
    return { ok: false, message: "Choose a valid campaign month." };
  }

  if (!driveForNineResults.includes(input.result)) {
    return { ok: false, message: "Choose a valid campaign result." };
  }

  const supabase = getSupabaseAdminClient();
  const monthDate = `${input.month}-01`;
  const { data: existing, error: existingError } = await supabase
    .from("drive_for_nine_campaigns")
    .select("id,active,result")
    .eq("practice_id", currentProfile.practiceId)
    .eq("month", monthDate)
    .maybeSingle();

  if (existingError) {
    return { ok: false, message: existingError.message };
  }

  const { error } = await supabase.from("drive_for_nine_campaigns").upsert(
    {
      practice_id: currentProfile.practiceId,
      month: monthDate,
      active: input.active,
      result: input.result,
    },
    { onConflict: "practice_id,month" },
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  await logAuditEvent({
    practiceId: currentProfile.practiceId,
    actorUserId: currentProfile.userId,
    eventType: existing
      ? "drive_for_nine_updated"
      : "drive_for_nine_created",
    tableName: "drive_for_nine_campaigns",
    recordId: existing?.id,
    beforeData: existing
      ? { month: input.month, active: existing.active, result: existing.result }
      : undefined,
    afterData: {
      month: input.month,
      active: input.active,
      result: input.result,
    },
  });

  revalidatePath("/");
  revalidatePath("/history");

  return { ok: true, message: `${input.month} Drive for Nine updated.` };
}
