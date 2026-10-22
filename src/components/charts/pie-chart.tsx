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
  centerLabel = "records",
}: {
  slices: PieSlice[];
  label: string;
  emptyTitle: string;
  emptyDescription: string;
  centerLabel?: string;
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
    <div className="flex flex-col items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="dash-pie h-auto w-full max-w-[200px] shrink-0"
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
            return <path key={slice.label} d={wedgePath(cx, cy, radius, start, end)} fill={slice.color} stroke="var(--card)" strokeWidth="3" />;
          })
        )}
        <circle cx={cx} cy={cy} r={58} fill="var(--card)" />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fontSize="22"
          fontWeight="600"
          fill="var(--foreground)"
          fontFamily="inherit"
        >
          {total.toLocaleString()}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontSize="11"
          fill="var(--muted-foreground)"
          fontFamily="inherit"
        >
          {centerLabel}
        </text>
      </svg>

      <ul className="w-full min-w-0 space-y-3.5">
        {visible.map((slice) => {
          const share = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <li key={slice.label}>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_2.75rem_2.75rem] items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                <span className="truncate text-sm font-medium text-[var(--foreground)]">{slice.label}</span>
                <span className="text-right text-sm font-semibold tabular-nums text-[var(--foreground)]">{share}%</span>
                <span className="text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                  {slice.value.toLocaleString()}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--secondary)]">
                <div className="h-full rounded-full" style={{ width: `${share}%`, background: slice.color }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
