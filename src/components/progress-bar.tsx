type ProgressBarProps = {
  value: number;
  marker?: number;
  label?: string;
};

export function ProgressBar({ value, marker, label }: ProgressBarProps) {
  const boundedValue = Math.max(0, Math.min(value, 130));
  const width = `${Math.min(boundedValue, 100)}%`;
  const markerLeft =
    marker === undefined ? undefined : `${Math.max(0, Math.min(marker, 130))}%`;

  return (
    <div>
      {label ? <p className="mb-2 text-sm font-medium text-ink">{label}</p> : null}
      <div className="relative h-4 overflow-hidden rounded-lg bg-[#e7e3d8]">
        <div
          className="h-full rounded-lg bg-accent"
          style={{ width }}
          aria-hidden="true"
        />
        {markerLeft ? (
          <div
            className="absolute top-0 h-full w-0.5 bg-ink"
            style={{ left: markerLeft }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
