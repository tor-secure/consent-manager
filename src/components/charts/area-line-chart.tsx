"use client";

import { useEffect, useMemo, useState } from "react";

import { ChartEmpty } from "@/components/charts/chart-empty";

export type AreaPoint = {
  label: string;
  values: Record<string, number>;
};

export type AreaSeries = {
  key: string;
  label: string;
  hint?: string;
  color: string;
};

function stepLine(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    path += ` H ${next.x} V ${next.y}`;
  }
  return path;
}

function smoothLine(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index]!;
    const current = points[index]!;
    const next = points[index + 1]!;
    const after = points[index + 2] ?? next;
    const tension = 0.18;
    const cp1x = current.x + (next.x - previous.x) * tension;
    const cp1y = current.y + (next.y - previous.y) * tension;
    const cp2x = next.x - (after.x - current.x) * tension;
    const cp2y = next.y - (after.y - current.y) * tension;
    path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next.x} ${next.y}`;
  }
  return path;
}

function niceCeil(value: number) {
  if (value <= 1) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const scaled = value / exp;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : scaled <= 8 ? 8 : 10;
  return nice * exp;
}

function buildYLevels(peak: number) {
  const start = niceCeil(Math.max(1, peak));
  const exp = 10 ** Math.floor(Math.log10(Math.max(start, 1)));
  const target = start / 4;
  const step = [exp / 2, exp, exp * 2, exp * 5]
    .filter((item) => item >= 1)
    .reduce((best, item) => (Math.abs(item - target) < Math.abs(best - target) ? item : best));
  return Array.from({ length: 9 }, (_, index) => start + step * index);
}

function buildXLevels(length: number) {
  if (length <= 1) return [Math.max(1, length)];
  const options = [2, 3, 4, 6, 8, 12, 16, 24, 30, length].filter((count) => count <= length);
  return Array.from(new Set(options)).sort((a, b) => a - b);
}

function defaultXIndex(levels: number[]) {
  let index = 0;
  levels.forEach((count, levelIndex) => {
    if (count <= 6) index = levelIndex;
  });
  return index;
}

function yTicks(max: number) {
  return Array.from(new Set(Array.from({ length: 5 }, (_, index) => Math.round((max * index) / 4))));
}

function labelIndexes(length: number, count: number) {
  if (length <= count) return Array.from({ length }, (_, index) => index);
  return Array.from(new Set(Array.from({ length: count }, (_, index) => Math.round((index * (length - 1)) / (count - 1)))));
}

function AxisStepper({
  axis,
  value,
  canDown,
  canUp,
  onDown,
  onUp,
}: {
  axis: "X" | "Y";
  value: string;
  canDown: boolean;
  canUp: boolean;
  onDown: () => void;
  onUp: () => void;
}) {
  const buttonClass = "h-8 w-8 text-sm leading-none text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-30";
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-[var(--muted-foreground)]">{axis} axis</span>
      <span className="inline-flex overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <button type="button" className={buttonClass} onClick={onDown} disabled={!canDown} aria-label={axis === "Y" ? "Lower the Y axis" : "Show fewer dates on the X axis"}>
          ↓
        </button>
        <span className="flex h-8 min-w-14 items-center justify-center border-x border-[var(--border)] px-2 text-xs font-semibold tabular-nums text-[var(--foreground)]">
          {value}
        </span>
        <button type="button" className={buttonClass} onClick={onUp} disabled={!canUp} aria-label={axis === "Y" ? "Raise the Y axis" : "Show more dates on the X axis"}>
          ↑
        </button>
      </span>
    </div>
  );
}

export function AreaLineChart({
  points,
  series,
  label,
  emptyTitle,
  emptyDescription,
  replayKey,
  curve = "smooth",
  filled = true,
}: {
  points: AreaPoint[];
  series: AreaSeries[];
  label: string;
  emptyTitle: string;
  emptyDescription: string;
  replayKey?: string;
  curve?: "smooth" | "step";
  filled?: boolean;
}) {
  const peak = useMemo(
    () => Math.max(0, ...points.flatMap((point) => series.map((item) => point.values[item.key] ?? 0))),
    [points, series],
  );
  const yLevels = useMemo(() => buildYLevels(peak), [peak]);
  const xLevels = useMemo(() => buildXLevels(points.length), [points.length]);
  const [yIndex, setYIndex] = useState(0);
  const [xIndex, setXIndex] = useState(() => defaultXIndex(xLevels));

  useEffect(() => {
    setYIndex(0);
    setXIndex(defaultXIndex(xLevels));
  }, [replayKey, xLevels]);

  const hasData = points.length > 0 && peak > 0;
  if (!hasData) {
    return <ChartEmpty title={emptyTitle} description={emptyDescription} />;
  }

  const safeY = Math.min(yIndex, yLevels.length - 1);
  const safeX = Math.min(xIndex, xLevels.length - 1);
  const yMax = yLevels[safeY] ?? 1;
  const xCount = xLevels[safeX] ?? points.length;
  const width = 640;
  const height = 280;
  const padL = Math.max(40, String(Math.round(yMax)).length * 7 + 18);
  const padR = 12;
  const padT = 16;
  const padB = 32;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const ticks = yTicks(yMax);
  const step = points.length === 1 ? 0 : chartW / (points.length - 1);
  const shownLabels = new Set(labelIndexes(points.length, xCount));

  return (
    <div key={replayKey}>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <AxisStepper
          axis="Y"
          value={yMax.toLocaleString()}
          canDown={safeY > 0}
          canUp={safeY < yLevels.length - 1}
          onDown={() => setYIndex(safeY - 1)}
          onUp={() => setYIndex(safeY + 1)}
        />
        <AxisStepper
          axis="X"
          value={String(xCount)}
          canDown={safeX > 0}
          canUp={safeX < xLevels.length - 1}
          onDown={() => setXIndex(safeX - 1)}
          onUp={() => setXIndex(safeX + 1)}
        />
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={label}>
        <defs>
          {series.map((item) => (
            <linearGradient key={item.key} id={`dash-area-${item.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={item.color} stopOpacity="0.55" />
              <stop offset="70%" stopColor={item.color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={item.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((tick) => {
          const y = padT + chartH - (tick / yMax) * chartH;
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 6" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted-foreground)" fontFamily="inherit">
                {tick.toLocaleString()}
              </text>
            </g>
          );
        })}
        {series.map((item, seriesIndex) => {
          const coords = points.map((point, index) => ({
            x: padL + index * step,
            y: padT + chartH - ((point.values[item.key] ?? 0) / yMax) * chartH,
          }));
          const line = curve === "step" ? stepLine(coords) : smoothLine(coords);
          const first = coords[0]!;
          const last = coords[coords.length - 1]!;
          const baseline = padT + chartH;
          const area = `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
          return (
            <g key={item.key}>
              {filled ? (
                <path className="dash-area" d={area} fill={`url(#dash-area-${item.key})`} style={{ animationDelay: `${700 + seriesIndex * 500}ms` }} />
              ) : null}
              <path
                className="dash-line"
                d={line}
                fill="none"
                stroke={item.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                style={{ animationDelay: `${seriesIndex * 500}ms` }}
              />
            </g>
          );
        })}
        {points.map((point, index) =>
          shownLabels.has(index) ? (
            <text
              key={`${point.label}-${index}`}
              x={padL + index * step}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted-foreground)"
              fontFamily="inherit"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
      <div className="mt-3 flex flex-wrap items-start justify-center gap-x-6 gap-y-2">
        {series.map((item) => (
          <span key={item.key} className="inline-flex max-w-xs items-start gap-2 text-xs text-[var(--muted-foreground)]">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
            <span>
              <span className="font-semibold text-[var(--foreground)]">{item.label}</span>
              {item.hint ? <span> — {item.hint}</span> : null}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
