import type { ReactNode } from "react";

type MetricCardProps = {
  title: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
  tone?: "neutral" | "good" | "warning" | "danger";
};

const toneClass = {
  neutral: "text-ink",
  good: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function MetricCard({
  title,
  value,
  detail,
  icon,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            {title}
          </p>
          <p className={`mt-2 text-2xl font-semibold ${toneClass[tone]}`}>
            {value}
          </p>
        </div>
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
            {icon}
          </div>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-sm text-muted">{detail}</p> : null}
    </section>
  );
}
