import { ChartEmpty } from "@/components/charts/chart-empty";

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function wedgePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, radius, endAngle);
  const end = polar(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function PieChart({
  slices,
  label,
  emptyTitle,
  emptyDescription,
}: {
  slices: PieSlice[];
  label: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const visible = slices.filter((slice) => slice.value > 0);
  const total = visible.reduce((sum, slice) => sum + slice.value, 0);

  if (visible.length === 0 || total === 0) {
    return <ChartEmpty title={emptyTitle} description={emptyDescription} />;
  }

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 96;
  let cursor = 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="dash-pie h-auto w-full max-w-[220px] shrink-0"
        role="img"
        aria-label={label}
      >
        {visible.length === 1 ? (
          <circle cx={cx} cy={cy} r={radius} fill={visible[0]!.color} />
        ) : (
          visible.map((slice) => {
            const start = (cursor / total) * 360;
            cursor += slice.value;
            const end = (cursor / total) * 360;
            return <path key={slice.label} d={wedgePath(cx, cy, radius, start, end)} fill={slice.color} stroke="var(--card)" strokeWidth="2" />;
          })
        )}
      </svg>

      <ul className="w-full min-w-0 flex-1 space-y-3">
        {visible.map((slice) => {
          const pct = Math.round((slice.value / total) * 100);
          return (
            <li key={slice.label} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className="truncate text-sm font-medium text-[var(--secondary-foreground)]">{slice.label}</span>
              </span>
              <span className="shrink-0 text-right text-sm">
                <span className="font-semibold tabular-nums text-[var(--foreground)]">{pct}%</span>
                <span className="ml-1.5 tabular-nums text-xs text-[var(--muted-foreground)]">
                  ({slice.value.toLocaleString()})
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
