import { EntryClient } from "@/app/entry/entry-client";
import { getActiveMonth, getPracticeData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const data = await getPracticeData();
  const activeMonth = getActiveMonth(data.monthlyGoals);
  const plan = data.monthPlans.find((item) => item.month === activeMonth);
  const entries = data.productionEntries.filter((entry) =>
    entry.date.startsWith(activeMonth),
  );
  const enteredDates = new Set(entries.map((entry) => entry.date));
  const draftDate =
    plan?.scheduledDays.find((day) => !enteredDates.has(day.date))?.date ??
    `${activeMonth}-01`;

  return <EntryClient initialEntries={entries} draftDate={draftDate} />;
}
