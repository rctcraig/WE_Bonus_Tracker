import { compactDate, money } from "@/lib/format";

export type MonthPacePoint = {
  date: string;
  expected: number;
  actual?: number;
};

type MonthPaceChartProps = {
  goal: number;
  points: MonthPacePoint[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function MonthPaceChart({ goal, points }: MonthPaceChartProps) {
  if (points.length === 0) {
    return null;
  }

  const maxValue =
    Math.max(
      goal,
      points.at(-1)?.expected ?? 0,
      ...points.map((point) => point.actual ?? 0),
      1,
    ) * 1.08;
  const xFor = (index: number) =>
    points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
  const yFor = (value: number) => clamp(52 - (value / maxValue) * 46, 4, 52);
  const expectedPath = points
    .map((point, index) => `${xFor(index).toFixed(2)},${yFor(point.expected).toFixed(2)}`)
    .join(" ");
  const actualCoords = points
    .map((point, index) =>
      point.actual === undefined
        ? null
        : { x: xFor(index), y: yFor(point.actual), date: point.date, value: point.actual },
    )
    .filter((coord): coord is NonNullable<typeof coord> => coord !== null);
  const actualPath = actualCoords
    .map((coord) => `${coord.x.toFixed(2)},${coord.y.toFixed(2)}`)
    .join(" ");
  const goalY = yFor(goal);
  // Roughly five evenly spread date labels; flexbox spacing below approximates
  // their true x positions closely enough at this density.
  const labelCount = Math.min(5, points.length);
  const labelIndexes = [
    ...new Set(
      Array.from({ length: labelCount }, (_, i) =>
        Math.round((i / Math.max(labelCount - 1, 1)) * (points.length - 1)),
      ),
    ),
  ];

  return (
    <div className="rounded-lg border border-line bg-background p-4">
      <svg
        viewBox="0 0 100 56"
        className="h-64 w-full overflow-visible"
        role="img"
        aria-label="Cumulative month production compared with scheduled pace and goal"
      >
        <line x1="0" y1="52" x2="100" y2="52" stroke="#dfddd5" />
        <line x1="0" y1="28" x2="100" y2="28" stroke="#ebe8df" />
        <line x1="0" y1="4" x2="100" y2="4" stroke="#ebe8df" />
        <line
          x1="0"
          y1={goalY}
          x2="100"
          y2={goalY}
          stroke="#26221d"
          strokeDasharray="1.5 2"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={expectedPath}
          fill="none"
          stroke="#a8a196"
          strokeDasharray="3 3"
          strokeLinecap="round"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
        />
        {actualCoords.length > 0 ? (
          <polyline
            points={actualPath}
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {actualCoords.map((coord) => (
          <circle
            key={coord.date}
            cx={coord.x}
            cy={coord.y}
            r="1.2"
            fill="#ffffff"
            stroke="#0f766e"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${compactDate(coord.date)}: ${money(coord.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-3 flex justify-between text-xs font-semibold text-muted">
        {labelIndexes.map((index) => (
          <span key={points[index].date}>{compactDate(points[index].date)}</span>
        ))}
      </div>
    </div>
  );
}
