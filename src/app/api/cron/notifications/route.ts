import type { NextRequest } from "next/server";
import {
  fullDate,
  getMonthGoalFromData,
  getMonthPlanFromData,
  money,
  percent,
  summarizeMonth,
} from "@/lib/bonus-calculations";
import { getActiveMonth, getPracticeData } from "@/lib/data";
import { isPushConfigured, sendPushToPractice } from "@/lib/push";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ChicagoNow = {
  date: string;
  hour: number;
  weekday: string;
};

function chicagoNow(): ChicagoNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    // hour12:false can yield "24" at midnight in some ICU versions.
    hour: Number(get("hour")) % 24,
    weekday: get("weekday"),
  };
}

function hourOf(time: string, fallback: number) {
  const hour = Number(time.slice(0, 2));

  return Number.isFinite(hour) ? hour : fallback;
}

// Runs hourly via a scheduled job (see vercel.json). Each firing compares the
// practice's configured reminder times against the current hour in Wichita,
// which keeps the schedule DST-proof without hardcoding UTC offsets.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return Response.json({ ok: true, skipped: "push not configured" });
  }

  const now = chicagoNow();
  const data = await getPracticeData();
  const supabase = getSupabaseAdminClient();
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("missing_entry_reminder_time,monday_summary_time,notify_staff")
    .eq("practice_id", data.practice.id)
    .maybeSingle();
  const reminderHour = hourOf(settings?.missing_entry_reminder_time ?? "", 12);
  const summaryHour = hourOf(settings?.monday_summary_time ?? "", 8);
  const includeStaff = settings?.notify_staff ?? false;
  const isWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(now.weekday);
  const jobs: Record<string, unknown> = {};

  const activeMonth = getActiveMonth(data.monthlyGoals);
  const goal = data.monthlyGoals.find((item) => item.month === activeMonth);
  const plan = getMonthPlanFromData(data.monthPlans, activeMonth);
  const monthEntries = data.productionEntries.filter((entry) =>
    entry.date.startsWith(activeMonth),
  );

  if (isWeekday && now.hour === reminderHour && goal && plan) {
    const scheduledToday = plan.scheduledDays.some(
      (day) => day.date === now.date,
    );
    const enteredToday = monthEntries.some((entry) => entry.date === now.date);

    if (scheduledToday && !enteredToday) {
      jobs.missingEntry = await sendPushToPractice(
        data.practice.id,
        {
          title: "Production entry reminder",
          body: `No production entered yet for ${fullDate(now.date)}.`,
          url: "/entry",
        },
        { includeStaff },
      );
    } else {
      jobs.missingEntry = scheduledToday ? "already entered" : "not a workday";
    }
  }

  if (now.weekday === "Mon" && now.hour === summaryHour && goal) {
    const summary = summarizeMonth(
      getMonthGoalFromData(data.monthlyGoals, activeMonth),
      plan,
      monthEntries,
    );
    const variance = summary.forecast - goal.s1pGoal;

    jobs.mondaySummary = await sendPushToPractice(
      data.practice.id,
      {
        title: `${goal.label} week kickoff`,
        body: `${money(summary.actual)} of ${money(goal.s1pGoal)} (${percent(
          summary.pctOfGoal,
        )}). Forecast ${money(summary.forecast)}, ${
          variance >= 0 ? "ahead" : "behind"
        } by ${money(Math.abs(variance))}.`,
        url: "/",
      },
      { includeStaff },
    );
  }

  return Response.json({ ok: true, now, jobs });
}
