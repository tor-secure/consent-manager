import * as React from "react";

type StatTrend = "up" | "down" | "neutral";
type StatIconColor = "blue" | "green" | "amber" | "rose" | "purple" | "teal";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: StatIconColor;
  trend?: {
    direction: StatTrend;
    value: string;
    label?: string;
  };
  description?: string;
  className?: string;
}

const iconColorClasses: Record<StatIconColor, string> = {
  blue: "stat-icon-blue",
  green: "stat-icon-green",
  amber: "stat-icon-amber",
  rose: "stat-icon-rose",
  purple: "stat-icon-purple",
  teal: "stat-icon-teal",
};

const trendClasses: Record<StatTrend, string> = {
  up: "text-[var(--success)]",
  down: "text-[var(--danger)]",
  neutral: "text-[var(--muted-foreground)]",
};

function TrendArrow({ direction }: { direction: StatTrend }) {
  if (direction === "up") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 9V3m0 0L3 6m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (direction === "down") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 3v6m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  icon,
  iconColor = "blue",
  trend,
  description,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={[
        "rounded-2xl bg-[var(--card)] border border-[var(--border)] card-shadow p-5 sm:p-6 card-lift",
        className,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)] tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {(trend || description) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {trend && (
                <span className={["inline-flex items-center gap-1 font-medium", trendClasses[trend.direction]].join(" ")}>
                  <TrendArrow direction={trend.direction} />
                  {trend.value}
                </span>
              )}
              {description && (
                <span className="text-[var(--muted-foreground)]">{description}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={[
            "flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl text-white",
            iconColorClasses[iconColor],
          ].join(" ")}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
