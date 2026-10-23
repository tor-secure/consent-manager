"use client";

import { useState, type CSSProperties } from "react";

import { AreaLineChart, type AreaPoint } from "@/components/charts/area-line-chart";
import { GroupedBarChart, HorizontalBarChart } from "@/components/charts/bar-chart";
import { ChartEmpty } from "@/components/charts/chart-empty";
import { PieChart } from "@/components/charts/pie-chart";
import { Select } from "@/components/ui/select";

const CHARTS = [
  { value: "area", label: "Area" },
  { value: "line", label: "Line" },
  { value: "step", label: "Step" },
  { value: "bar", label: "Bar" },
  { value: "stacked", label: "Stacked bar" },
  { value: "histogram", label: "Histogram" },
  { value: "donut", label: "Donut" },
  { value: "top", label: "Top days" },
] as const;

type ChartKind = (typeof CHARTS)[number]["value"];

const NOTES: Record<ChartKind, string> = {
  area: "Choices and accepted, with a shadow under each line.",
  line: "The same two lines, without the shadow.",
  step: "Each day holds its value, then steps to the next.",
  bar: "Accepted, granular, and rejected side by side.",
  stacked: "Each day stacked into accepted, granular, and rejected.",
  histogram: "How many days fell into each choice range.",
  donut: "The whole period split into accepted, granular, and rejected.",
  top: "The busiest days in this period.",
};

const CHOICE_SERIES = [
  { key: "accepted", label: "Accepted", color: "#60a5fa" },
  { key: "granular", label: "Granular", color: "#a78bfa" },
  { key: "rejected", label: "Rejected", color: "#f87171" },
] as const;

const TREND_SERIES = [
  { key: "total", label: "Choices", hint: "accept, reject, and granular", color: "#a78bfa" },
  { key: "accepted", label: "Accepted", hint: "visitors who accepted all", color: "#60a5fa" },
];

const EMPTY_TITLE = "No consent events in this period";
const EMPTY_DESCRIPTION = "This chart appears after visitors submit a choice on a site with the SDK installed.";

function sumKey(points: AreaPoint[], key: string) {
  return points.reduce((sum, point) => sum + (point.values[key] ?? 0), 0);
}

function histogramBins(values: number[]) {
  const peak = Math.max(1, ...values);
  const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(values.length))));
  const width = Math.max(1, Math.ceil(peak / binCount));
  const bins = Array.from({ length: Math.ceil((peak + 1) / width) }, (_, index) => ({
    from: index * width,
    to: (index + 1) * width - 1,
    count: 0,
  }));
  for (const value of values) {
    const index = Math.min(bins.length - 1, Math.floor(value / width));
    bins[index]!.count += 1;
  }
  return bins;
}

function StackedColumns({ points }: { points: AreaPoint[] }) {
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
    ...points.map((point) => CHOICE_SERIES.reduce((sum, item) => sum + (point.values[item.key] ?? 0), 0)),
  );
  const ticks = Array.from(new Set([0, Math.round(maxVal / 2), maxVal]));
  const groupW = chartW / points.length;
  const barW = Math.max(1.25, groupW * 0.72);
  const labelEvery = points.length <= 8 ? 1 : Math.ceil(points.length / 6);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Stacked daily choices">
        {ticks.map((tick) => {
          const y = padT + chartH - (tick / maxVal) * chartH;
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 6" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted-foreground)" fontFamily="inherit">
                {tick.toLocaleString()}
              </text>
            </g>
          );
        })}
        {points.map((point, index) => {
          let cursor = 0;
          const x = padL + index * groupW + (groupW - barW) / 2;
          return (
            <g key={`${point.label}-${index}`}>
              {CHOICE_SERIES.map((item) => {
                const value = point.values[item.key] ?? 0;
                const barH = (value / maxVal) * chartH;
                const y = padT + chartH - cursor - barH;
                cursor += barH;
                if (barH <= 0) return null;
                return (
                  <rect
                    key={item.key}
                    className="dash-vbar"
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    fill={item.color}
                    style={{ "--dash-bar-delay": `${80 + index * 18}ms` } as CSSProperties}
                  />
                );
              })}
              {index % labelEvery === 0 ? (
                <text x={x + barW / 2} y={height - 10} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)" fontFamily="inherit">
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <Legend items={CHOICE_SERIES.map((item) => ({ key: item.key, label: item.label, color: item.color }))} />
    </div>
  );
}

function Histogram({ points }: { points: AreaPoint[] }) {
  const bins = histogramBins(points.map((point) => point.values.total ?? 0));
  const width = 640;
  const height = 280;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const maxVal = Math.max(1, ...bins.map((bin) => bin.count));
  const ticks = Array.from(new Set([0, Math.round(maxVal / 2), maxVal]));
  const barW = chartW / bins.length;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Histogram of daily choice counts">
        {ticks.map((tick) => {
          const y = padT + chartH - (tick / maxVal) * chartH;
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 6" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted-foreground)" fontFamily="inherit">
                {tick.toLocaleString()}
              </text>
            </g>
          );
        })}
        {bins.map((bin, index) => {
          const barH = (bin.count / maxVal) * chartH;
          const x = padL + index * barW;
          return (
            <g key={bin.from}>
              <rect
                className="dash-vbar"
                x={x}
                y={padT + chartH - barH}
                width={Math.max(barW - 1, 1)}
                height={Math.max(barH, bin.count > 0 ? 2 : 0)}
                fill="#a78bfa"
                style={{ "--dash-bar-delay": `${80 + index * 70}ms` } as CSSProperties}
              />
              <text x={x + barW / 2} y={height - 10} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)" fontFamily="inherit">
                {bin.from === bin.to ? bin.from : `${bin.from}–${bin.to}`}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">Vertical axis is the number of days. Horizontal axis is choices that day.</p>
    </div>
  );
}

function Legend({ items }: { items: { key: string; label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          <span className="font-semibold text-[var(--foreground)]">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export function ChoiceChart({ points, replayKey }: { points: AreaPoint[]; replayKey: string }) {
  const [chart, setChart] = useState<ChartKind>("area");
  const hasData = points.some((point) => (point.values.total ?? 0) > 0);
  const labelStep = points.length > 12 ? Math.ceil(points.length / 6) : 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted-foreground)]">{NOTES[chart]}</p>
        <Select
          aria-label="Chart type"
          size="sm"
          searchable={false}
          className="w-44 shrink-0"
          value={chart}
          onChange={(event) => {
            const next = event.target.value;
            if (CHARTS.some((item) => item.value === next)) setChart(next as ChartKind);
          }}
        >
          {CHARTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      {hasData ? (
        <div key={`${replayKey}|${chart}`}>
          {chart === "area" || chart === "line" || chart === "step" ? (
            <AreaLineChart
              points={points}
              series={TREND_SERIES}
              curve={chart === "step" ? "step" : "smooth"}
              filled={chart !== "line"}
              replayKey={`${replayKey}|${chart}`}
              label="Daily consent choices over the selected period"
              emptyTitle={EMPTY_TITLE}
              emptyDescription={EMPTY_DESCRIPTION}
            />
          ) : null}
          {chart === "bar" ? (
            <GroupedBarChart
              points={points}
              series={CHOICE_SERIES.map((item) => ({ ...item }))}
              labelStep={labelStep}
              label="Daily choices as grouped bars"
              emptyTitle={EMPTY_TITLE}
              emptyDescription={EMPTY_DESCRIPTION}
            />
          ) : null}
          {chart === "stacked" ? <StackedColumns points={points} /> : null}
          {chart === "histogram" ? <Histogram points={points} /> : null}
          {chart === "donut" ? (
            <div className="flex min-h-64 items-center justify-center">
              <PieChart
                slices={CHOICE_SERIES.map((item) => ({
                  label: item.label,
                  value: sumKey(points, item.key),
                  color: item.color,
                }))}
                legend="row"
                centerLabel="choices"
                label="Choice mix for the selected period"
                emptyTitle={EMPTY_TITLE}
                emptyDescription={EMPTY_DESCRIPTION}
              />
            </div>
          ) : null}
          {chart === "top" ? (
            <HorizontalBarChart
              rows={[...points]
                .sort((a, b) => (b.values.total ?? 0) - (a.values.total ?? 0))
                .slice(0, 8)
                .map((point) => ({
                  label: point.label,
                  value: point.values.total ?? 0,
                  hint: `${(point.values.accepted ?? 0).toLocaleString()} accepted`,
                }))}
              color="#a78bfa"
              label="Busiest days by consent choices"
              emptyTitle={EMPTY_TITLE}
              emptyDescription={EMPTY_DESCRIPTION}
            />
          ) : null}
        </div>
      ) : (
        <ChartEmpty title={EMPTY_TITLE} description={EMPTY_DESCRIPTION} />
      )}
    </div>
  );
}
