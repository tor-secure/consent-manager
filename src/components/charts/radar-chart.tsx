"use client";

import type { AreaPoint, AreaSeries } from "@/components/charts/area-line-chart";
import { ChartEmpty } from "@/components/charts/chart-empty";

function sampleAxes(points: AreaPoint[], max: number) {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, index) => points[Math.round(index * step)]!);
}

function polar(cx: number, cy: number, radius: number, index: number, count: number) {
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export function RadarChart({
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
  const axes = sampleAxes(points, 8);
  const peak = Math.max(1, ...axes.flatMap((point) => series.map((item) => point.values[item.key] ?? 0)));
  const hasData = axes.some((point) => series.some((item) => (point.values[item.key] ?? 0) > 0));
  if (!hasData) {
    return <ChartEmpty title={emptyTitle} description={emptyDescription} />;
  }

  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 112;
  const rings = [0.25, 0.5, 0.75, 1];

  function at(index: number, ratio: number) {
    return polar(cx, cy, radius * ratio, index, axes.length);
  }

  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[340px]" role="img" aria-label={label}>
        {rings.map((ratio) => {
          const ring = axes.map((_, index) => at(index, ratio));
          const d = `${ring.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;
          return <path key={ratio} d={d} fill="none" stroke="var(--border)" strokeDasharray={ratio === 1 ? undefined : "3 4"} />;
        })}
        {axes.map((_, index) => {
          const end = at(index, 1);
          return <line key={index} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="var(--border)" />;
        })}
        {series.map((item) => {
          const shape = axes.map((point, index) => at(index, (point.values[item.key] ?? 0) / peak));
          const d = `${shape.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;
          return (
            <g key={item.key}>
              <path d={d} fill={item.color} fillOpacity="0.28" stroke={item.color} strokeWidth="2" />
              {shape.map((point, index) => (
                <circle key={index} cx={point.x} cy={point.y} r="3" fill="var(--card)" stroke={item.color} strokeWidth="2" />
              ))}
            </g>
          );
        })}
        {axes.map((point, index) => {
          const labelPoint = polar(cx, cy, radius + 18, index, axes.length);
          const anchor = labelPoint.x < cx - 8 ? "end" : labelPoint.x > cx + 8 ? "start" : "middle";
          return (
            <text
              key={`${point.label}-${index}`}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--muted-foreground)"
              fontFamily="inherit"
            >
              {point.label}
            </text>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            <span className="font-semibold text-[var(--foreground)]">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
