import clsx from "clsx";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warning" | "danger";
};

const classes = {
  neutral: "border-line bg-background text-muted",
  good: "border-[#b6d8c4] bg-[#edf7f0] text-success",
  warning: "border-[#eed4a9] bg-[#fff6e8] text-warning",
  danger: "border-[#f3bbb5] bg-[#fff0ee] text-danger",
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold",
        classes[tone],
      )}
    >
      {children}
    </span>
  );
}
