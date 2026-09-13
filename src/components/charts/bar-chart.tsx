import { ChartEmpty } from "@/components/charts/chart-empty";
import type { CSSProperties } from "react";

export type BarSeries = {
  key: string;
  label: string;
  color: string;
};

export type GroupedBarPoint = {
  label: string;
  values: Record<string, number>;
};

export function GroupedBarChart({
  points,
  series,
  label,
  emptyTitle,
  emptyDescription,
}: {
  points: GroupedBarPoint[];
  series: BarSeries[];
  label: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const hasData = points.some((point) => series.some((item) => (point.values[item.key] ?? 0) > 0));
  if (points.length === 0 || !hasData) {
    return <ChartEmpty title={emptyTitle} description={emptyDescription} />;
  }

  const width = 640;
  const height = 280;
  const padL = 40;
  const padR = 12;
  const padT = 16;
  const padB = 36;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const maxVal = Math.max(
    1,
    ...points.flatMap((point) => series.map((item) => point.values[item.key] ?? 0)),
  );
  const yTicks = Array.from(new Set([0, Math.round(maxVal / 2), maxVal]));
  const groupW = chartW / points.length;
  const innerPad = Math.min(3, groupW * 0.06);
  const barGap = 1;
  const barW = Math.max(5, (groupW - innerPad * 2 - barGap * (series.length - 1)) / series.length);
  const labelIndexes =
    points.length <= 8
      ? points.map((_, index) => index)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const labelSet = new Set(labelIndexes);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={label}>
        {yTicks.map((tick) => {
          const y = padT + chartH - (tick / maxVal) * chartH;
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--border)" strokeDasharray="4 4" />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--muted-foreground)"
                fontFamily="inherit"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const groupX = padL + index * groupW + innerPad;
          return (
            <g key={`${point.label}-${index}`}>
              {series.map((item, seriesIndex) => {
                const value = point.values[item.key] ?? 0;
                const barH = (value / maxVal) * chartH;
                const x = groupX + seriesIndex * (barW + barGap);
                const y = padT + chartH - barH;
                return (
                  <rect
                    key={item.key}
                    className="dash-vbar"
                    style={{ "--dash-bar-delay": `${80 + index * 16 + seriesIndex * 40}ms` } as CSSProperties}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(barH, value > 0 ? 3 : 0)}
                    rx={Math.min(5, barW / 2)}
                    fill={item.color}
                  />
                );
              })}
              {labelSet.has(index) ? (
                <text
                  x={groupX + (series.length * barW + barGap * (series.length - 1)) / 2}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--muted-foreground)"
                  fontFamily="inherit"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-4 flex flex-wrap items-center gap-5">
        {series.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type HorizontalBarRow = {
  label: string;
  value: number;
  hint?: string;
};

export function HorizontalBarChart({
  rows,
  color = "var(--primary)",
  label,
  emptyTitle,
  emptyDescription,
}: {
  rows: HorizontalBarRow[];
  color?: string;
  label: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const visible = rows.filter((row) => row.value > 0).slice(0, 8);
  const maxVal = Math.max(1, ...visible.map((row) => row.value));

  if (visible.length === 0) {
    return <ChartEmpty title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3.5" role="img" aria-label={label}>
      {visible.map((row, index) => {
        const pct = Math.max(4, (row.value / maxVal) * 100);
        return (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{row.label}</p>
                {row.hint ? <p className="truncate text-xs text-[var(--muted-foreground)]">{row.hint}</p> : null}
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]">
                {row.value.toLocaleString()}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-[var(--secondary)]">
              <div
                className="dash-hbar-fill h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: color,
                  "--dash-bar-delay": `${120 + index * 70}ms`,
                } as CSSProperties}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
