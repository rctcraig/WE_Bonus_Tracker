"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setQuarterProfitability } from "@/app/history/actions";
import type { ProfitabilityStatus } from "@/lib/types";

type ProfitabilityControlProps = {
  label: string;
  months: string[];
  status: ProfitabilityStatus;
};

export function ProfitabilityControl({
  label,
  months,
  status,
}: ProfitabilityControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateStatus(nextStatus: ProfitabilityStatus) {
    startTransition(async () => {
      const result = await setQuarterProfitability({
        months,
        status: nextStatus,
      });

      setErrorMessage(result.ok ? null : result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <label
        className="text-xs font-medium uppercase tracking-[0.08em] text-muted"
        htmlFor={`profitability-${months[0]}`}
      >
        Profitability to budget
      </label>
      <select
        id={`profitability-${months[0]}`}
        value={status}
        disabled={isPending}
        onChange={(event) =>
          updateStatus(event.target.value as ProfitabilityStatus)
        }
        aria-label={`${label} profitability to budget`}
        className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink disabled:bg-background disabled:text-muted"
      >
        <option value="unknown">Pending review</option>
        <option value="favorable">Favorable to budget</option>
        <option value="unfavorable">Unfavorable to budget</option>
      </select>
      {errorMessage ? (
        <p className="mt-2 text-sm font-medium text-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
