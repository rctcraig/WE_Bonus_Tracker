"use client";

import { Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { adjustedProduction, fullDate, money } from "@/lib/bonus-calculations";
import { mayProductionEntries } from "@/lib/seed-data";
import type { ProductionEntry } from "@/lib/types";

type DraftEntry = ProductionEntry & {
  id: string;
};

const starterRows: DraftEntry[] = [
  ...mayProductionEntries.map((entry) => ({ ...entry, id: entry.date })),
  {
    id: "draft-2026-05-14",
    date: "2026-05-14",
    totalProduction: 0,
    creditAdjustments: 0,
  },
];

export default function EntryPage() {
  const [rows, setRows] = useState<DraftEntry[]>(starterRows);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const totalAdjusted = useMemo(
    () => rows.reduce((sum, row) => sum + adjustedProduction(row), 0),
    [rows],
  );

  function updateRow(id: string, field: keyof ProductionEntry, value: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === "date" || field === "note" ? value : Number(value),
            }
          : row,
      ),
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        date: "2026-05-14",
        totalProduction: 0,
        creditAdjustments: 0,
      },
    ]);
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex gap-2">
            <StatusBadge tone="good">May entries</StatusBadge>
            <StatusBadge tone="neutral">Whole practice</StatusBadge>
          </div>
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">
            Daily production entry
          </h1>
          <p className="mt-2 text-sm text-muted">
            Current adjusted total: {money(totalAdjusted)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addRow}
            className="flex h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-background"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Row
          </button>
          <button
            type="button"
            onClick={() => setSavedAt(new Date().toLocaleTimeString())}
            className="flex h-10 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b]"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save
          </button>
        </div>
      </section>

      {savedAt ? (
        <div className="rounded-lg border border-[#b6d8c4] bg-[#edf7f0] px-4 py-3 text-sm font-medium text-success">
          Saved in this session at {savedAt}
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-background text-left text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Total production
                </th>
                <th className="px-5 py-3 text-right font-semibold">
                  Credit adjustments
                </th>
                <th className="px-5 py-3 text-right font-semibold">
                  Adjusted production
                </th>
                <th className="px-5 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-5 py-3">
                    <label className="sr-only" htmlFor={`${row.id}-date`}>
                      Date
                    </label>
                    <input
                      id={`${row.id}-date`}
                      type="date"
                      value={row.date}
                      onChange={(event) =>
                        updateRow(row.id, "date", event.target.value)
                      }
                      className="h-10 rounded-lg border border-line bg-white px-3 text-ink"
                    />
                    <p className="mt-1 text-xs text-muted">
                      {fullDate(row.date)}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <label className="sr-only" htmlFor={`${row.id}-total`}>
                      Total production
                    </label>
                    <input
                      id={`${row.id}-total`}
                      type="number"
                      min="0"
                      value={row.totalProduction}
                      onChange={(event) =>
                        updateRow(row.id, "totalProduction", event.target.value)
                      }
                      className="h-10 w-36 rounded-lg border border-line bg-white px-3 text-right font-mono text-ink"
                    />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <label className="sr-only" htmlFor={`${row.id}-credit`}>
                      Credit adjustments
                    </label>
                    <input
                      id={`${row.id}-credit`}
                      type="number"
                      min="0"
                      value={row.creditAdjustments}
                      onChange={(event) =>
                        updateRow(
                          row.id,
                          "creditAdjustments",
                          event.target.value,
                        )
                      }
                      className="h-10 w-36 rounded-lg border border-line bg-white px-3 text-right font-mono text-ink"
                    />
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-ink">
                    {money(adjustedProduction(row))}
                  </td>
                  <td className="px-5 py-3">
                    <label className="sr-only" htmlFor={`${row.id}-note`}>
                      Note
                    </label>
                    <input
                      id={`${row.id}-note`}
                      type="text"
                      value={row.note ?? ""}
                      onChange={(event) =>
                        updateRow(row.id, "note", event.target.value)
                      }
                      className="h-10 w-full rounded-lg border border-line bg-white px-3 text-ink"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
