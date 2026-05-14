import { bonusTiers } from "@/lib/seed-data";
import { money } from "@/lib/bonus-calculations";

type TierLadderProps = {
  percentValue: number;
};

export function TierLadder({ percentValue }: TierLadderProps) {
  return (
    <div className="space-y-2">
      {bonusTiers.map((tier) => {
        const reached = percentValue >= tier.thresholdPct;

        return (
          <div
            key={tier.thresholdPct}
            className="grid grid-cols-[72px_1fr_72px] items-center gap-3 text-sm"
          >
            <span className="font-mono text-muted">
              {tier.thresholdPct.toFixed(0)}%
            </span>
            <div className="h-2 rounded-lg bg-[#e7e3d8]">
              <div
                className="h-2 rounded-lg bg-accent"
                style={{ width: reached ? "100%" : "0%" }}
              />
            </div>
            <span className={reached ? "font-semibold text-success" : "text-muted"}>
              {money(tier.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
