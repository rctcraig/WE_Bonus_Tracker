import { bonusTiers } from "@/lib/seed-data";
import { money } from "@/lib/bonus-calculations";
import type { BonusTier } from "@/lib/types";

type TierLadderProps = {
  percentValue: number;
  tiers?: BonusTier[];
  activeThreshold?: number;
  nextThreshold?: number;
};

export function TierLadder({
  percentValue,
  tiers = bonusTiers,
  activeThreshold,
  nextThreshold,
}: TierLadderProps) {
  return (
    <div className="space-y-2">
      {tiers.map((tier) => {
        const reached = percentValue >= tier.thresholdPct;
        const active = activeThreshold === tier.thresholdPct;
        const next = nextThreshold === tier.thresholdPct;

        return (
          <div
            key={tier.thresholdPct}
            className={`grid grid-cols-[72px_1fr_72px] items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${
              active ? "bg-[#edf7f0]" : next ? "bg-[#fff6e8]" : ""
            }`}
          >
            <span
              className={`font-mono ${
                active ? "font-semibold text-success" : "text-muted"
              }`}
            >
              {tier.thresholdPct.toFixed(0)}%
            </span>
            <div className="h-2 rounded-lg bg-[#e7e3d8]">
              <div
                className={`h-2 rounded-lg ${
                  active ? "bg-success" : reached ? "bg-accent" : "bg-warning"
                }`}
                style={{ width: reached ? "100%" : "0%" }}
              />
            </div>
            <span
              className={
                active
                  ? "font-semibold text-success"
                  : reached
                    ? "font-semibold text-success"
                    : next
                      ? "font-semibold text-warning"
                      : "text-muted"
              }
            >
              {money(tier.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
