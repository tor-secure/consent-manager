"use client";

import { useState } from "react";

import type { AreaPoint } from "@/components/charts/area-line-chart";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { GroupedBarChart } from "@/components/charts/bar-chart";
import { ChartEmpty } from "@/components/charts/chart-empty";
import { PieChart } from "@/components/charts/pie-chart";
import { RadarChart } from "@/components/charts/radar-chart";
import { Select } from "@/components/ui/select";

const CHARTS = [
  { value: "bar", label: "Bar graph" },
  { value: "pie", label: "Pie chart" },
  { value: "donut", label: "Donut chart" },
  { value: "line", label: "Line chart" },
  { value: "radar", label: "Radar chart" },
] as const;

type ChartKind = (typeof CHARTS)[number]["value"];

const NOTES: Record<ChartKind, string> = {
  bar: "Accepted, granular, and rejected side by side for each day.",
  pie: "The whole period split into accepted, granular, and rejected.",
  donut: "The same split, with the total in the center.",
  line: "Each line is one choice. Higher means more people chose it that day.",
  radar: "The same three series compared around the period.",
};

const CHOICE_SERIES = [
  { key: "accepted", label: "Accepted", color: "#60a5fa" },
  { key: "granular", label: "Granular", color: "#a78bfa" },
  { key: "rejected", label: "Rejected", color: "#f87171" },
] as const;

const EMPTY_TITLE = "No consent events in this period";
const EMPTY_DESCRIPTION = "This chart appears after visitors submit a choice on a site with the SDK installed.";

function sumKey(points: AreaPoint[], key: string) {
  return points.reduce((sum, point) => sum + (point.values[key] ?? 0), 0);
}

function choiceSlices(points: AreaPoint[]) {
  return CHOICE_SERIES.map((item) => ({
    label: item.label,
    value: sumKey(points, item.key),
    color: item.color,
  }));
}

export function ChoiceChart({ points, replayKey }: { points: AreaPoint[]; replayKey: string }) {
  const [chart, setChart] = useState<ChartKind>("bar");
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
          {chart === "pie" || chart === "donut" ? (
            <div className="flex min-h-64 items-center justify-center">
              <PieChart
                variant={chart}
                slices={choiceSlices(points)}
                legend="row"
                centerLabel="choices"
                label="Choice mix for the selected period"
                emptyTitle={EMPTY_TITLE}
                emptyDescription={EMPTY_DESCRIPTION}
              />
            </div>
          ) : null}
          {chart === "line" ? (
            <SimpleLineChart
              points={points}
              series={CHOICE_SERIES.map((item) => ({ ...item }))}
              label="Daily choices as a line chart"
              emptyTitle={EMPTY_TITLE}
              emptyDescription={EMPTY_DESCRIPTION}
            />
          ) : null}
          {chart === "radar" ? (
            <RadarChart
              points={points}
              series={CHOICE_SERIES.map((item) => ({ ...item }))}
              label="Daily choices as a radar chart"
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
