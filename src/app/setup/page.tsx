import { CalendarPlus, ClipboardCheck, UserMinus } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import {
  compactDate,
  fullDate,
  getMonthGoalFromData,
  getMonthPlanFromData,
  money,
} from "@/lib/bonus-calculations";
import { getActiveMonth, getPracticeData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const data = await getPracticeData();
  const activeMonth = getActiveMonth(data.monthlyGoals);
  const goal = getMonthGoalFromData(data.monthlyGoals, activeMonth);
  const plan = getMonthPlanFromData(data.monthPlans, activeMonth);

  if (!plan) {
    return null;
  }

  const mthDoctorDays = plan.scheduledDays
    .filter((day) => day.dayType === "mth")
    .reduce((sum, day) => sum + day.doctors, 0);
  const fridayDoctorDays = plan.scheduledDays
    .filter((day) => day.dayType === "friday")
    .reduce((sum, day) => sum + day.doctors, 0);
  const changedDays = plan.scheduledDays.filter(
    (day) => day.originalDoctors && day.originalDoctors !== day.doctors,
  );

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex gap-2">
            <StatusBadge tone="neutral">{goal.label} setup</StatusBadge>
            <StatusBadge tone="good">
              {plan.plannedProductionDates.length} dates
            </StatusBadge>
          </div>
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">
            Monthly schedule plan
          </h1>
          <p className="mt-2 text-sm text-muted">
            {compactDate(plan.plannedProductionDates[0])} -{" "}
            {compactDate(plan.plannedProductionDates.at(-1) ?? "")}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="S1P goal"
          value={money(goal.s1pGoal)}
          detail="Revenue budget used as adjusted production target"
          icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          title="M-Th doctor-days"
          value={mthDoctorDays.toFixed(0)}
          detail={`${money(plan.avgMthDoctorDay)} average per doctor-day`}
          icon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          title="Friday doctor-days"
          value={fridayDoctorDays.toFixed(0)}
          detail={`${money(plan.avgFridayDoctorDay)} average per doctor-day`}
          icon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}
        />
        <MetricCard
          title="Schedule changes"
          value={changedDays.length.toString()}
          detail={
            changedDays[0]
              ? `${fullDate(changedDays[0].date)} reduced by ${
                  (changedDays[0].originalDoctors ?? 0) - changedDays[0].doctors
                } doctor`
              : "No doctor-count changes"
          }
          icon={<UserMinus className="h-4 w-4" aria-hidden="true" />}
          tone={changedDays.length ? "warning" : "good"}
        />
      </section>

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-lg font-semibold text-ink">Date grid</h2>
          <p className="text-sm text-muted">
            Original and current doctor counts are both retained.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-background text-left text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Original
                </th>
                <th className="px-5 py-3 text-right font-semibold">Current</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Expected
                </th>
                <th className="px-5 py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {plan.scheduledDays.map((day) => {
                const average =
                  day.dayType === "friday"
                    ? plan.avgFridayDoctorDay
                    : plan.avgMthDoctorDay;
                const changed =
                  day.originalDoctors !== undefined &&
                  day.originalDoctors !== day.doctors;

                return (
                  <tr key={day.date} className="border-t border-line">
                    <td className="px-5 py-3 font-medium text-ink">
                      {fullDate(day.date)}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {day.dayType === "friday" ? "Friday" : "M-Th"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-muted">
                      {day.originalDoctors ?? day.doctors}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-ink">
                      {day.doctors}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-ink">
                      {money(day.doctors * average)}
                    </td>
                    <td className="px-5 py-3">
                      {changed ? (
                        <StatusBadge tone="warning">
                          {day.changeReason ?? "Changed"}
                        </StatusBadge>
                      ) : (
                        <span className="text-muted">On plan</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
