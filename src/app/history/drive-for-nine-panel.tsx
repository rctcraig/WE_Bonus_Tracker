"use client";

import { Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setDriveForNineResult } from "@/app/history/actions";
import type { DriveForNineResult } from "@/lib/types";

export type DriveForNineOption = {
  month: string;
  label: string;
  active: boolean;
  result: DriveForNineResult;
};

const resultLabels: Record<DriveForNineResult, string> = {
  not_active: "Not active",
  not_qualified: "Not qualified",
  qualified_pending: "Qualified, pending S1P",
  won: "Won",
  not_selected: "Qualified, not selected",
};

type DriveForNinePanelProps = {
  options: DriveForNineOption[];
};

export function DriveForNinePanel({ options }: DriveForNinePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initial = options.find((option) => option.active) ?? options[0];
  const [selectedMonth, setSelectedMonth] = useState(initial?.month ?? "");
  const selected = options.find((option) => option.month === selectedMonth);
  const [active, setActive] = useState(selected?.active ?? false);
  const [result, setResult] = useState<DriveForNineResult>(
    selected?.result ?? "not_active",
  );
  const [status, setStatus] = useState<{
    tone: "good" | "danger";
    message: string;
  } | null>(null);

  function selectMonth(month: string) {
    const option = options.find((item) => item.month === month);
    setSelectedMonth(month);
    setActive(option?.active ?? false);
    setResult(option?.result ?? "not_active");
    setStatus(null);
  }

  function save() {
    if (!selected) {
      return;
    }

    startTransition(async () => {
      const actionResult = await setDriveForNineResult({
        month: selected.month,
        active,
        result,
      });

      setStatus({
        tone: actionResult.ok ? "good" : "danger",
        message: actionResult.message,
      });

      if (actionResult.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Drive for Nine campaign
          </h2>
          <p className="mt-1 text-sm text-muted">
            Activate a campaign month and record the official result once the
            S1P numbers are in.
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <div>
          <label
            className="text-xs font-medium uppercase tracking-[0.08em] text-muted"
            htmlFor="drive-month-select"
          >
            Campaign month
          </label>
          <select
            id="drive-month-select"
            value={selectedMonth}
            disabled={isPending}
            onChange={(event) => selectMonth(event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink disabled:bg-background disabled:text-muted"
          >
            {options.map((option) => (
              <option key={option.month} value={option.month}>
                {option.label} {option.month.slice(0, 4)}
                {option.active ? " - active" : ""}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={active}
            disabled={isPending}
            onChange={(event) => setActive(event.target.checked)}
            className="h-4 w-4 rounded border-line"
          />
          Campaign active this month
        </label>

        <div>
          <label
            className="text-xs font-medium uppercase tracking-[0.08em] text-muted"
            htmlFor="drive-result-select"
          >
            Result
          </label>
          <select
            id="drive-result-select"
            value={result}
            disabled={isPending}
            onChange={(event) =>
              setResult(event.target.value as DriveForNineResult)
            }
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink disabled:bg-background disabled:text-muted"
          >
            {Object.entries(resultLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trophy className="h-4 w-4" aria-hidden="true" />
          {isPending ? "Saving" : "Save campaign"}
        </button>
      </div>

      <div className="mt-3" role="status" aria-live="polite">
        {status ? (
          <p
            className={`text-sm font-medium ${
              status.tone === "good" ? "text-success" : "text-danger"
            }`}
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
