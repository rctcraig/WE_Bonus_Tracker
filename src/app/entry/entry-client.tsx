"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { StatusBadge } from "@/components/status-badge";
import { adjustedProduction, fullDate, money } from "@/lib/format";
import type { ProductionEntry } from "@/lib/types";
import {
  deleteProductionEntry,
  saveProductionEntries,
} from "@/app/entry/actions";

type DraftEntry = ProductionEntry & {
  id: string;
  isNew?: boolean;
};

type EntryMonthOption = {
  closed: boolean;
  hasEntries: boolean;
  historicalAdjustedActual?: number;
  label: string;
  month: string;
};

type EntryClientProps = {
  activeMonth: string;
  canEditProduction: boolean;
  initialEntries: ProductionEntry[];
  monthOptions: EntryMonthOption[];
  selectedMonth: string;
  selectedMonthClosed: boolean;
  selectedMonthHistoricalAdjustedActual?: number;
  selectedMonthLabel: string;
  draftDate: string;
};

function rowsForMonth({
  canSeedDraftRow,
  initialEntries,
  draftDate,
}: {
  canSeedDraftRow: boolean;
  initialEntries: ProductionEntry[];
  draftDate: string;
}) {
  return [
    ...initialEntries.map((entry) => ({ ...entry, id: entry.date })),
    ...(canSeedDraftRow
      ? [
          {
            id: `draft-${draftDate}`,
            date: draftDate,
            totalProduction: 0,
            creditAdjustments: 0,
            isNew: true,
          },
        ]
      : []),
  ] satisfies DraftEntry[];
}

function isBlankNewRow(row: DraftEntry) {
  return (
    row.isNew &&
    row.totalProduction === 0 &&
    row.creditAdjustments === 0 &&
    !row.note?.trim()
  );
}

export function EntryClient({
  activeMonth,
  canEditProduction,
  initialEntries,
  monthOptions,
  selectedMonth,
  selectedMonthClosed,
  selectedMonthHistoricalAdjustedActual,
  selectedMonthLabel,
  draftDate,
}: EntryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const canEditSelectedMonth = canEditProduction && !selectedMonthClosed;
  const canSeedDraftRow = canEditSelectedMonth && selectedMonth === activeMonth;
  const [rows, setRows] = useState<DraftEntry[]>(
    rowsForMonth({ canSeedDraftRow, initialEntries, draftDate }),
  );
  const [status, setStatus] = useState<{
    tone: "good" | "danger";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const totalAdjusted = useMemo(
    () => rows.reduce((sum, row) => sum + adjustedProduction(row), 0),
    [rows],
  );
  const savedRows = rows.filter((row) => !isBlankNewRow(row));
  const hasHistoricalOnly =
    initialEntries.length === 0 &&
    typeof selectedMonthHistoricalAdjustedActual === "number";

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
    if (!canEditSelectedMonth) {
      return;
    }

    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        date: draftDate,
        totalProduction: 0,
        creditAdjustments: 0,
        isNew: true,
      },
    ]);
  }

  function selectMonth(month: string) {
    const suffix = month === activeMonth ? "" : `?month=${month}`;
    router.push(`${pathname}${suffix}`);
  }

  function saveRows() {
    if (!canEditSelectedMonth) {
      setStatus({
        tone: "danger",
        message: "Closed months are view only.",
      });
      return;
    }

    const rowsToSave = rows.filter((row) => !isBlankNewRow(row));

    if (rowsToSave.length === 0) {
      setStatus({
        tone: "danger",
        message: "No production rows to save.",
      });
      return;
    }

    const dates = rowsToSave.map((row) => row.date);

    if (new Set(dates).size !== dates.length) {
      setStatus({
        tone: "danger",
        message: "Two rows share the same date. Combine them before saving.",
      });
      return;
    }

    startTransition(async () => {
      const result = await saveProductionEntries(
        rowsToSave.map((row) => ({
          date: row.date,
          totalProduction: row.totalProduction,
          creditAdjustments: row.creditAdjustments,
          note: row.note,
        })),
      );

      setStatus({
        tone: result.ok ? "good" : "danger",
        message: result.message,
      });

      if (result.ok) {
        router.refresh();
      }
    });
  }

  function removeRow(row: DraftEntry) {
    if (!canEditSelectedMonth) {
      return;
    }

    if (row.isNew) {
      setRows((current) => current.filter((item) => item.id !== row.id));
      return;
    }

    if (
      !window.confirm(`Remove the saved entry for ${fullDate(row.date)}?`)
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteProductionEntry(row.date);

      setStatus({
        tone: result.ok ? "good" : "danger",
        message: result.message,
      });

      if (result.ok) {
        setRows((current) => current.filter((item) => item.id !== row.id));
        router.refresh();
      }
    });
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <StatusBadge tone="good">{selectedMonthLabel} entries</StatusBadge>
            <StatusBadge tone="neutral">Whole practice</StatusBadge>
            <StatusBadge tone={selectedMonthClosed ? "neutral" : "good"}>
              {selectedMonthClosed ? "Closed month" : "Open month"}
            </StatusBadge>
            <StatusBadge tone="neutral">
              {initialEntries.length} saved{" "}
              {initialEntries.length === 1 ? "entry" : "entries"}
            </StatusBadge>
          </div>
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">
            Daily production entry
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Use the month selector to review prior daily entries. The active
            month stays ready for new production entry.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="entry-month">
            Month
          </label>
          <select
            id="entry-month"
            value={selectedMonth}
            onChange={(event) => selectMonth(event.target.value)}
            className="h-11 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink"
          >
            {monthOptions.map((option) => (
              <option key={option.month} value={option.month}>
                {option.label}
                {option.hasEntries ? " - entries" : ""}
              </option>
            ))}
          </select>
          {canEditSelectedMonth ? (
            <>
              <button
                type="button"
                onClick={addRow}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-background"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Row
              </button>
              <button
                type="button"
                onClick={saveRows}
                disabled={isPending}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {isPending ? "Saving" : "Save"}
              </button>
            </>
          ) : (
            <StatusBadge tone="neutral">
              {selectedMonthClosed ? "Closed month view only" : "View only"}
            </StatusBadge>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Adjusted total shown
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {money(totalAdjusted)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Based on rows currently visible below.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Saved rows
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {savedRows.length}
          </p>
          <p className="mt-1 text-sm text-muted">
            Empty draft rows are ignored when saving.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Historical monthly total
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {typeof selectedMonthHistoricalAdjustedActual === "number"
              ? money(selectedMonthHistoricalAdjustedActual)
              : "-"}
          </p>
          <p className="mt-1 text-sm text-muted">
            Shown when only a monthly import exists.
          </p>
        </div>
      </section>

      {hasHistoricalOnly ? (
        <div className="rounded-lg border border-[#eed4a9] bg-[#fff6e8] px-4 py-3 text-sm font-medium text-warning">
          {selectedMonthLabel} has a historical adjusted production total, but
          no individual daily entry rows were imported for that month.
        </div>
      ) : null}

      <div role="status" aria-live="polite">
        {status ? (
          <div
            className={
              status.tone === "good"
                ? "rounded-lg border border-[#b6d8c4] bg-[#edf7f0] px-4 py-3 text-sm font-medium text-success"
                : "rounded-lg border border-[#f3bbb5] bg-[#fff0ee] px-4 py-3 text-sm font-medium text-danger"
            }
          >
            {status.message}
          </div>
        ) : null}
      </div>

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex flex-col gap-1 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {selectedMonthLabel} daily rows
            </h2>
            <p className="text-sm text-muted">
              Total production minus credit adjustments equals adjusted
              production.
            </p>
          </div>
          {canEditSelectedMonth ? (
            <button
              type="button"
              onClick={addRow}
              className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-background sm:mt-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add row
            </button>
          ) : null}
        </div>
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
                {canEditSelectedMonth ? (
                  <th className="px-5 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr className="border-t border-line">
                  <td
                    className="px-5 py-8 text-center text-sm text-muted"
                    colSpan={canEditSelectedMonth ? 6 : 5}
                  >
                    No daily rows recorded for {selectedMonthLabel}.
                  </td>
                </tr>
              ) : null}
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
                      disabled={!canEditSelectedMonth || !row.isNew}
                      onChange={(event) =>
                        updateRow(row.id, "date", event.target.value)
                      }
                      className="h-10 rounded-lg border border-line bg-white px-3 text-ink disabled:bg-background disabled:text-muted"
                    />
                    <p className="mt-1 text-xs text-muted">
                      {fullDate(row.date)}
                      {canEditSelectedMonth && !row.isNew
                        ? " · delete to re-date"
                        : ""}
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
                      disabled={!canEditSelectedMonth}
                      onChange={(event) =>
                        updateRow(row.id, "totalProduction", event.target.value)
                      }
                      className="h-10 w-36 rounded-lg border border-line bg-white px-3 text-right font-mono text-ink disabled:bg-background disabled:text-muted"
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
                      disabled={!canEditSelectedMonth}
                      onChange={(event) =>
                        updateRow(
                          row.id,
                          "creditAdjustments",
                          event.target.value,
                        )
                      }
                      className="h-10 w-36 rounded-lg border border-line bg-white px-3 text-right font-mono text-ink disabled:bg-background disabled:text-muted"
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
                      disabled={!canEditSelectedMonth}
                      onChange={(event) =>
                        updateRow(row.id, "note", event.target.value)
                      }
                      className="h-10 w-full rounded-lg border border-line bg-white px-3 text-ink disabled:bg-background disabled:text-muted"
                    />
                  </td>
                  {canEditSelectedMonth ? (
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row)}
                        disabled={isPending}
                        aria-label={`Remove ${fullDate(row.date)} row`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-background hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
