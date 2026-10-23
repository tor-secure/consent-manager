"use client";

import { useState } from "react";

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
  legend = "bars",
}: {
  slices: PieSlice[];
  label: string;
  emptyTitle: string;
  emptyDescription: string;
  centerLabel?: string;
  legend?: "bars" | "row";
}) {
  const [hover, setHover] = useState<string | null>(null);
  const visible = slices.filter((slice) => slice.value > 0);
  const total = visible.reduce((sum, slice) => sum + slice.value, 0);

  if (visible.length === 0 || total === 0) {
    return <ChartEmpty title={emptyTitle} description={emptyDescription} />;
  }

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 96;
  const arcs = visible.map((slice, index) => {
    const before = visible.slice(0, index).reduce((sum, prior) => sum + prior.value, 0);
    const start = (before / total) * 360;
    const end = ((before + slice.value) / total) * 360;
    return { ...slice, start, end, share: Math.round((slice.value / total) * 100) };
  });
  const active = arcs.find((slice) => slice.label === hover) ?? null;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-6">
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="dash-pie h-auto w-full max-w-[200px] shrink-0"
          role="img"
          aria-label={label}
          onMouseLeave={() => setHover(null)}
        >
        {arcs.length === 1 ? (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill={arcs[0]!.color}
            className="cursor-pointer"
            onMouseEnter={() => setHover(arcs[0]!.label)}
          />
        ) : (
          arcs.map((slice) => (
            <path
              key={slice.label}
              d={wedgePath(cx, cy, radius, slice.start, slice.end)}
              fill={slice.color}
              stroke="var(--card)"
              strokeWidth="3"
              opacity={hover && hover !== slice.label ? 0.45 : 1}
              className="cursor-pointer"
              onMouseEnter={() => setHover(slice.label)}
            />
          ))
        )}
        <circle cx={cx} cy={cy} r={58} fill="var(--card)" pointerEvents="none" />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fontSize="22"
          fontWeight="600"
          fill="var(--foreground)"
          fontFamily="inherit"
          pointerEvents="none"
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
          pointerEvents="none"
        >
          {centerLabel}
        </text>
        </svg>
        {active ? (
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 w-40 -translate-x-1/2 -translate-y-[110%] rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-md">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: active.color }} />
              <span className="truncate">{active.label}</span>
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              <span className="font-semibold tabular-nums text-[var(--foreground)]">{active.value.toLocaleString()}</span>
              {" "}records · {active.share}%
            </p>
          </div>
        ) : null}
      </div>

      {legend === "row" ? (
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {arcs.map((slice) => {
            const share = slice.share;
            return (
              <li
                key={slice.label}
                className={`inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--muted-foreground)] ${hover && hover !== slice.label ? "opacity-45" : ""}`}
                onMouseEnter={() => setHover(slice.label)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: slice.color }} />
                <span>
                  {slice.label} <span className="font-semibold text-[var(--foreground)]">{share}%</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="w-full min-w-0 space-y-3.5">
          {arcs.map((slice) => {
            const share = slice.share;
            return (
              <li
                key={slice.label}
                className={`cursor-pointer rounded-lg ${hover === slice.label ? "bg-[var(--muted)]/70" : ""}`}
                onMouseEnter={() => setHover(slice.label)}
                onMouseLeave={() => setHover(null)}
              >
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
      )}
    </div>
  );
}
