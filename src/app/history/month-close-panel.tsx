"use client";

import { Lock, LockOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closeMonth, reopenMonth } from "@/app/history/actions";
import { StatusBadge } from "@/components/status-badge";
import { fullDate, money } from "@/lib/format";

export type CloseMonthOption = {
  month: string;
  label: string;
  closed: boolean;
  s1pGoal: number;
  suggestedActual: number;
  officialS1PActual?: number;
  closeNote?: string;
  closedAt?: string;
};

type MonthClosePanelProps = {
  canReopen: boolean;
  months: CloseMonthOption[];
};

function optionLabel(option: CloseMonthOption) {
  return `${option.label} ${option.month.slice(0, 4)}`;
}

function defaultActualInput(option: CloseMonthOption) {
  const value = option.officialS1PActual ?? option.suggestedActual;
  return value > 0 ? String(Math.round(value * 100) / 100) : "";
}

export function MonthClosePanel({ canReopen, months }: MonthClosePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const firstOpen = months.find((option) => !option.closed) ?? months[0];
  const [selectedMonth, setSelectedMonth] = useState(firstOpen?.month ?? "");
  const selected = months.find((option) => option.month === selectedMonth);
  const [officialActual, setOfficialActual] = useState(
    selected ? defaultActualInput(selected) : "",
  );
  const [note, setNote] = useState(selected?.closeNote ?? "");
  const [reopenReason, setReopenReason] = useState("");
  const [status, setStatus] = useState<{
    tone: "good" | "danger";
    message: string;
  } | null>(null);

  function selectMonth(month: string) {
    const option = months.find((item) => item.month === month);
    setSelectedMonth(month);
    setOfficialActual(option ? defaultActualInput(option) : "");
    setNote(option?.closeNote ?? "");
    setReopenReason("");
    setStatus(null);
  }

  function submitClose() {
    if (!selected) {
      return;
    }

    const actual = Number(officialActual);

    if (!officialActual.trim() || !Number.isFinite(actual) || actual < 0) {
      setStatus({
        tone: "danger",
        message: "Enter the official S1P adjusted production before closing.",
      });
      return;
    }

    if (
      !window.confirm(
        `Close ${optionLabel(selected)} with an official S1P actual of ${money(
          actual,
        )}? Closed months lock production entry and setup.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await closeMonth({
        month: selected.month,
        officialS1PActual: actual,
        note,
      });

      setStatus({
        tone: result.ok ? "good" : "danger",
        message: result.message,
      });

      if (result.ok) {
        router.refresh();
      }
    });
  }

  function submitReopen() {
    if (!selected) {
      return;
    }

    if (!reopenReason.trim()) {
      setStatus({
        tone: "danger",
        message: "A change note is required to reopen a closed month.",
      });
      return;
    }

    startTransition(async () => {
      const result = await reopenMonth({
        month: selected.month,
        reason: reopenReason,
      });

      setStatus({
        tone: result.ok ? "good" : "danger",
        message: result.message,
      });

      if (result.ok) {
        setReopenReason("");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Month close-out</h2>
          <p className="mt-1 text-sm text-muted">
            Record the official S1P adjusted production and lock the month. The
            bonus pays on the official number.
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <div>
          <label
            className="text-xs font-medium uppercase tracking-[0.08em] text-muted"
            htmlFor="close-month-select"
          >
            Month
          </label>
          <select
            id="close-month-select"
            value={selectedMonth}
            disabled={isPending}
            onChange={(event) => selectMonth(event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink disabled:bg-background disabled:text-muted"
          >
            {months.map((option) => (
              <option key={option.month} value={option.month}>
                {optionLabel(option)}
                {option.closed ? " - closed" : " - open"}
              </option>
            ))}
          </select>
        </div>

        {selected && !selected.closed ? (
          <>
            <div>
              <label
                className="text-xs font-medium uppercase tracking-[0.08em] text-muted"
                htmlFor="close-official-actual"
              >
                Official S1P adjusted production
              </label>
              <input
                id="close-official-actual"
                type="number"
                min="0"
                step="0.01"
                value={officialActual}
                disabled={isPending}
                onChange={(event) => setOfficialActual(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-right font-mono text-ink disabled:bg-background disabled:text-muted"
              />
              <p className="mt-1 text-xs text-muted">
                Internal entries total {money(selected.suggestedActual)} against
                a {money(selected.s1pGoal)} goal.
              </p>
            </div>
            <div>
              <label
                className="text-xs font-medium uppercase tracking-[0.08em] text-muted"
                htmlFor="close-note"
              >
                Close note (optional)
              </label>
              <input
                id="close-note"
                type="text"
                value={note}
                disabled={isPending}
                onChange={(event) => setNote(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink disabled:bg-background disabled:text-muted"
              />
            </div>
            <button
              type="button"
              onClick={submitClose}
              disabled={isPending}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a332b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              {isPending ? "Saving" : `Close ${optionLabel(selected)}`}
            </button>
          </>
        ) : null}

        {selected?.closed ? (
          <div className="rounded-lg border border-line bg-background p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="neutral">
                <Lock className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Closed
                {selected.closedAt
                  ? ` ${fullDate(selected.closedAt.slice(0, 10))}`
                  : ""}
              </StatusBadge>
              <span className="text-sm text-muted">
                Official S1P actual:{" "}
                {typeof selected.officialS1PActual === "number"
                  ? money(selected.officialS1PActual)
                  : "not recorded"}
              </span>
            </div>
            {selected.closeNote ? (
              <p className="mt-2 text-sm text-muted">
                Note: {selected.closeNote}
              </p>
            ) : null}
            {canReopen ? (
              <div className="mt-3 flex flex-col gap-2">
                <label
                  className="text-xs font-medium uppercase tracking-[0.08em] text-muted"
                  htmlFor="reopen-reason"
                >
                  Change note (required to reopen)
                </label>
                <input
                  id="reopen-reason"
                  type="text"
                  value={reopenReason}
                  disabled={isPending}
                  onChange={(event) => setReopenReason(event.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-ink disabled:bg-background disabled:text-muted"
                />
                <button
                  type="button"
                  onClick={submitReopen}
                  disabled={isPending}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LockOpen className="h-4 w-4" aria-hidden="true" />
                  {isPending ? "Saving" : `Reopen ${optionLabel(selected)}`}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Only an admin can reopen a closed month.
              </p>
            )}
          </div>
        ) : null}
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
