import { getCurrentProfile } from "@/lib/auth";
import {
  getMonthPlanFromData,
  summarizeMonth,
} from "@/lib/bonus-calculations";
import { toCsv } from "@/lib/csv";
import { getPracticeData } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return new Response("Sign in to download exports.", { status: 401 });
  }

  const data = await getPracticeData();
  const csv = toCsv(
    [
      "month",
      "s1p_goal",
      "actual",
      "pct_of_goal",
      "variance",
      "entered_days_total",
      "historical_adjusted_actual",
      "official_s1p_actual",
      "closed",
      "profitability_status",
      "close_note",
    ],
    data.monthlyGoals.map((goal) => {
      const entries = data.productionEntries.filter((entry) =>
        entry.date.startsWith(goal.month),
      );
      const summary = summarizeMonth(
        goal,
        getMonthPlanFromData(data.monthPlans, goal.month),
        entries,
      );

      return [
        goal.month,
        goal.s1pGoal,
        summary.actual,
        Number(summary.pctOfGoal.toFixed(2)),
        summary.varianceToGoal,
        entries.length > 0 ? summary.entryTotal : null,
        goal.historicalAdjustedActual,
        goal.officialS1PActual,
        goal.closed,
        goal.profitabilityStatus,
        goal.closeNote,
      ];
    }),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="we-monthly-history.csv"',
    },
  });
}
