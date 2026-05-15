import { SetupClient } from "@/app/setup/setup-client";
import { requireCurrentProfile } from "@/lib/auth";
import { getActiveMonth, getPracticeData } from "@/lib/data";
import { canEditProduction } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const currentProfile = await requireCurrentProfile();
  const data = await getPracticeData();
  const params = await searchParams;
  const activeMonth = getActiveMonth(data.monthlyGoals);
  const selectedMonth =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : activeMonth;

  return (
    <SetupClient
      canEditSetup={canEditProduction(currentProfile.role)}
      goals={data.monthlyGoals}
      initialMonth={selectedMonth}
      plans={data.monthPlans}
    />
  );
}
