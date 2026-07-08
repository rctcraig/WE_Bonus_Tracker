import { getCurrentProfile } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { getPracticeData } from "@/lib/data";
import { adjustedProduction } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return new Response("Sign in to download exports.", { status: 401 });
  }

  const data = await getPracticeData();
  const csv = toCsv(
    [
      "date",
      "total_production",
      "credit_adjustments",
      "adjusted_production",
      "note",
    ],
    data.productionEntries.map((entry) => [
      entry.date,
      entry.totalProduction,
      entry.creditAdjustments,
      adjustedProduction(entry),
      entry.note,
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="we-daily-production.csv"',
    },
  });
}
