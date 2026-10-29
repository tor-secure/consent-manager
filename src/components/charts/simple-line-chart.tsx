"use client";

import type { AreaPoint, AreaSeries } from "@/components/charts/area-line-chart";
import { ChartEmpty } from "@/components/charts/chart-empty";

function niceMax(peak: number) {
  if (peak <= 5) return 5;
  const step = peak <= 20 ? 5 : peak <= 100 ? 10 : peak <= 500 ? 50 : 100;
  return Math.ceil(peak / step) * step;
}

function labelIndexes(length: number) {
  if (length <= 1) return [0];
  const count = Math.min(5, length);
  const indexes = new Set<number>();
  for (let index = 0; index < count; index += 1) {
    indexes.add(Math.round((index * (length - 1)) / (count - 1)));
  }
  return [...indexes];
}

export function SimpleLineChart({
  points,
  series,
  label,
  emptyTitle,
  emptyDescription,
}: {
  points: AreaPoint[];
  series: AreaSeries[];
  label: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const peak = Math.max(0, ...points.flatMap((point) => series.map((item) => point.values[item.key] ?? 0)));
  if (points.length === 0 || peak <= 0) {
    return <ChartEmpty title={emptyTitle} description={emptyDescription} />;
  }

  const yMax = niceMax(peak);
  const width = 640;
  const height = 260;
  const padL = 40;
  const padR = 16;
  const padT = 12;
  const padB = 32;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const step = points.length === 1 ? 0 : chartW / (points.length - 1);
  const ticks = [0, yMax / 2, yMax];
  const labels = new Set(labelIndexes(points.length));

  function xAt(index: number) {
    return padL + index * step;
  }

  function yAt(value: number) {
    return padT + chartH - (value / yMax) * chartH;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={label}>
        {ticks.map((tick) => {
          const y = yAt(tick);
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--border)" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)" fontFamily="inherit">
                {tick.toLocaleString()}
              </text>
            </g>
          );
        })}
        {series.map((item) => {
          const path = points
            .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.values[item.key] ?? 0)}`)
            .join(" ");
          return (
            <path
              key={item.key}
              d={path}
              fill="none"
              stroke={item.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
        {points.map((point, index) =>
          labels.has(index) ? (
            <text
              key={`${point.label}-${index}`}
              x={xAt(index)}
              y={height - 8}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              fontSize="11"
              fill="var(--muted-foreground)"
              fontFamily="inherit"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {series.map((item) => {
          const total = points.reduce((sum, point) => sum + (point.values[item.key] ?? 0), 0);
          return (
            <span key={item.key} className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <span className="h-2.5 w-6 rounded-full" style={{ background: item.color }} />
              <span className="font-semibold text-[var(--foreground)]">{item.label}</span>
              <span className="tabular-nums">{total.toLocaleString()}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
