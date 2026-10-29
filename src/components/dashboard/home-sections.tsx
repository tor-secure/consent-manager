import Link from "next/link";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { ReactNode } from "react";

import { db } from "@/db";
import { consentRecords } from "@/db/schema/consent-records";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadHomeChartAnalytics, loadHomeDashboardCounts } from "@/lib/dashboard/home-queries";
import type { DashboardFilters } from "@/lib/dashboard/home-filters";
import { parseAnalyticsPeriod } from "@/lib/analytics/consent-metrics";
import { DashboardSort } from "@/components/dashboard/dashboard-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupGuide } from "@/components/dashboard/setup-guide";
import { buildGetLiveSteps } from "@/lib/dashboard/get-live-path";
import { EmptyState } from "@/components/ui/empty-state";
import { IconText } from "@/components/ui/icon-text";
import { CountryFlag } from "@/components/dashboard/country-flag";
import { CountryMap } from "@/components/dashboard/country-map";
import { HorizontalBarChart } from "@/components/charts/bar-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { ChoiceChart } from "@/components/charts/choice-chart";

type IconTone = "primary" | "success" | "purple" | "warning" | "info" | "danger";

const TONE_CLASS: Record<IconTone, string> = {
  primary: "bg-[var(--info-soft)] text-[var(--primary)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  purple: "bg-[color-mix(in_srgb,var(--purple)_16%,var(--card))] text-[var(--purple)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

function Mark({
  tone,
  size = "md",
  children,
}: {
  tone: IconTone;
  size?: "md" | "sm";
  children: ReactNode;
}) {
  const box = size === "sm" ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl";
  const svg = size === "sm" ? 18 : 20;
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${TONE_CLASS[tone]}`} aria-hidden="true">
      <svg width={svg} height={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

function RecordsIcon() {
  return (
    <>
      <ellipse cx="12" cy="6.5" rx="7" ry="2.5" />
      <path d="M5 6.5v5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5" />
      <path d="M5 11.5v5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5" />
    </>
  );
}

function AcceptedIcon() {
  return (
    <>
      <path d="M12 3.2l1.8 1.3 2.2-.2 1 2 2 .9-.2 2.2L20.8 12l-1.2 1.9.2 2.2-2 .9-1 2-2.2-.2L12 20.8l-1.8-1.3-2.2.2-1-2-2-.9.2-2.2L3.2 12l1.2-1.9-.2-2.2 2-.9 1-2 2.2.2z" />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
    </>
  );
}

function GranularIcon() {
  return (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8" cy="7" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="17" r="2.1" fill="currentColor" stroke="none" />
    </>
  );
}

function WithdrawnIcon() {
  return (
    <>
      <path d="M4 12a8 8 0 108-8" />
      <path d="M4 4.5V9h4.5" />
    </>
  );
}

function BarsIcon() {
  return (
    <>
      <path d="M4 19h16" />
      <path d="M7 19V11" />
      <path d="M12 19V6" />
      <path d="M17 19v-5" />
    </>
  );
}

function DonutIcon() {
  return (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4v5" />
    </>
  );
}

function MedalIcon() {
  return (
    <>
      <circle cx="12" cy="9" r="4.5" />
      <path d="M9.2 13.1L8 20.5 12 18.2l4 2.3-1.2-7.4" />
    </>
  );
}

function BrowserIcon() {
  return (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9h17" />
      <circle cx="6.5" cy="6.75" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="9" cy="6.75" r="0.7" fill="currentColor" stroke="none" />
    </>
  );
}

function PinIcon() {
  return (
    <>
      <path d="M12 21s6.5-5.6 6.5-10.2a6.5 6.5 0 10-13 0C5.5 15.4 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2" />
    </>
  );
}

function DeviceIcon() {
  return (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  );
}

function PolicyIcon() {
  return (
    <>
      <path d="M7 3.5h7l4 4V20a1.5 1.5 0 01-1.5 1.5h-9.5A1.5 1.5 0 015.5 20V5A1.5 1.5 0 017 3.5z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M8.5 13h7M8.5 16.5h4.5" />
    </>
  );
}

function StoreIcon() {
  return (
    <>
      <path d="M5 10l1.2-5h11.6L19 10" />
      <path d="M4 10h16" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </>
  );
}

function RadarIcon() {
  return (
    <>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M7.8 7.8a6 6 0 018.4 8.4" />
      <path d="M5.1 5.1a9.5 9.5 0 0113.8 13.8" />
    </>
  );
}

function ListIcon() {
  return (
    <>
      <path d="M8 7h11M8 12h11M8 17h11" />
      <circle cx="4.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17" r="1" fill="currentColor" stroke="none" />
    </>
  );
}

function GridIcon() {
  return (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  );
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#60a5fa",
  mobile: "#a78bfa",
  tablet: "#93c5fd",
};

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatChartDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  return `${date} ${SHORT_MONTHS[month - 1]}`;
}

function localIsoDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lastNLocalDays(count: number) {
  const days: string[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - offset);
    days.push(localIsoDay(day));
  }
  return days;
}

function halfDelta(values: number[]) {
  if (values.length < 2) return null;
  const mid = Math.floor(values.length / 2);
  const prior = values.slice(0, mid).reduce((sum, value) => sum + value, 0);
  const recent = values.slice(mid).reduce((sum, value) => sum + value, 0);
  if (prior === 0 && recent === 0) return null;
  if (prior === 0) return { up: recent >= 0, text: "New" };
  const change = ((recent - prior) / prior) * 100;
  const amount = Math.abs(change);
  const rounded = amount >= 10 ? Math.round(amount) : Math.round(amount * 10) / 10;
  return { up: change >= 0, text: `${rounded}%` };
}

function TrendMark({ delta }: { delta: { up: boolean; text: string } | null }) {
  if (!delta) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${delta.up ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
      <span className="sr-only">{delta.up ? "Up" : "Down"} compared with the previous 15 days.</span>
      {delta.text}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        {delta.up ? (
          <path d="M6 9.5V2.5m0 0L3 5.5m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M6 2.5v7m0 0l3-3m-3 3l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  );
}

function AnalyticsPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        {action}
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}

const COUNTRY_SORTS = [
  { value: "records", label: "Most records" },
  { value: "records-asc", label: "Fewest records" },
  { value: "name", label: "Name A–Z" },
  { value: "accepted", label: "Most accepted" },
  { value: "rejected", label: "Most rejected" },
  { value: "withdrawn", label: "Most withdrawn" },
] as const;

const WEBSITE_SORTS = [
  { value: "records", label: "Most records" },
  { value: "records-asc", label: "Fewest records" },
  { value: "name", label: "Name A–Z" },
  { value: "accepted", label: "Most accepted" },
  { value: "rate", label: "Highest accept rate" },
] as const;

const PURPOSE_SORTS = [
  { value: "granted", label: "Most granted" },
  { value: "granted-asc", label: "Fewest granted" },
  { value: "name", label: "Name A–Z" },
  { value: "rate", label: "Highest grant rate" },
] as const;

function allowedSort<T extends { value: string }>(value: string | undefined, options: readonly T[], fallback: string) {
  return options.some((option) => option.value === value) ? value! : fallback;
}

function chartDays(filters: DashboardFilters, trendDays: string[]) {
  if (filters.from || filters.to) {
    const start = filters.from ? new Date(`${filters.from}T00:00:00`) : new Date();
    const end = filters.to ? new Date(`${filters.to}T00:00:00`) : new Date();
    if (!filters.from && trendDays.length > 0) {
      start.setTime(new Date(`${[...trendDays].sort()[0]}T00:00:00`).getTime());
    }
    const days: string[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (cursor <= last && days.length < 120) {
      days.push(localIsoDay(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days.length > 0 ? days : lastNLocalDays(30);
  }
  if (!filters.days || filters.days === "all") {
    const sorted = [...trendDays].sort();
    return sorted.slice(-90);
  }
  const count = Math.min(Number(filters.days) || 30, 120);
  return lastNLocalDays(count);
}

function sortCountries<T extends { name: string; total: number; accepted: number; rejected: number; withdrawn: number }>(
  rows: T[],
  order: string,
) {
  return [...rows].sort((a, b) => {
    if (order === "name") return a.name.localeCompare(b.name);
    if (order === "records-asc") return a.total - b.total;
    if (order === "accepted") return b.accepted - a.accepted || b.total - a.total;
    if (order === "rejected") return b.rejected - a.rejected || b.total - a.total;
    if (order === "withdrawn") return b.withdrawn - a.withdrawn || b.total - a.total;
    return b.total - a.total;
  });
}

function sortWebsites<T extends { websiteName: string; total: number; accepted: number; consentRate: number }>(
  rows: T[],
  order: string,
) {
  return [...rows].sort((a, b) => {
    if (order === "name") return a.websiteName.localeCompare(b.websiteName);
    if (order === "records-asc") return a.total - b.total;
    if (order === "accepted") return b.accepted - a.accepted || b.total - a.total;
    if (order === "rate") return b.consentRate - a.consentRate || b.total - a.total;
    return b.total - a.total;
  });
}

function sortPurposes<T extends { purposeName: string; granted: number; total: number }>(rows: T[], order: string) {
  return [...rows].sort((a, b) => {
    const rateA = a.total > 0 ? a.granted / a.total : 0;
    const rateB = b.total > 0 ? b.granted / b.total : 0;
    if (order === "name") return a.purposeName.localeCompare(b.purposeName);
    if (order === "granted-asc") return a.granted - b.granted;
    if (order === "rate") return rateB - rateA || b.granted - a.granted;
    return b.granted - a.granted;
  });
}

function ChartCardTitle({
  icon,
  title,
  hint,
  trailing,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex min-h-11 flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-start gap-3">
        {icon}
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {hint ? <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{hint}</p> : null}
        </div>
      </div>
      {trailing ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{trailing}</div> : null}
    </div>
  );
}

type RecentRequest = {
  name: string;
  email: string;
  status: "Approved" | "Pending" | "Withdrawn";
  time: string;
};

function RequestStatusBadge({ status }: { status: RecentRequest["status"] }) {
  if (status === "Approved") return <Badge variant="success">{status}</Badge>;
  if (status === "Pending") return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="danger">{status}</Badge>;
}

function AvatarFallback({ name, idx }: { name: string; idx: number }) {
  const colors = [
    "from-[var(--primary)] to-[var(--primary-hover)]",
    "from-[var(--success)] to-[var(--accent)]",
    "from-[var(--warning)] to-[var(--warning)]",
    "from-[var(--danger)] to-[var(--pink)]",
    "from-[var(--purple)] to-[var(--primary)]",
  ];
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={`flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${colors[idx % colors.length]}`}>
      {initials || "U"}
    </span>
  );
}

function ComplianceCheckItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-[var(--success-soft)]" : "bg-[var(--secondary)]"
        }`}
      >
        {done ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[var(--success)]" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)]" />
        )}
      </div>
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

function InventoryRow({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-1 py-2 text-[var(--foreground)] transition hover:bg-[var(--muted)]/70"
    >
      {icon}
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value.toLocaleString()}</span>
    </Link>
  );
}

export async function HomeStatsSection({ filters }: { filters: DashboardFilters }) {
  const { organization } = await requireDashboardContext();
  const analytics = await loadHomeChartAnalytics(organization.id, filters);
  const days = [...analytics.trends].sort((a, b) => a.day.localeCompare(b.day));
  const metrics = [
    { label: "Total records", value: analytics.overview.total, delta: halfDelta(days.map((day) => day.interactions)) },
    { label: "Accepted", value: analytics.overview.accepted, delta: halfDelta(days.map((day) => day.acceptAll)) },
    { label: "Granular", value: analytics.overview.partial, delta: halfDelta(days.map((day) => day.granular)) },
    { label: "Withdrawn", value: analytics.overview.withdrawn, delta: halfDelta(days.map((day) => day.withdrawals)) },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={[
              "px-5 py-4",
              index > 0 ? "border-t border-[var(--border)]" : "",
              index % 2 === 1 ? "sm:border-l" : "",
              index === 1 ? "sm:border-t-0" : "",
              index >= 2 ? "sm:border-t" : "",
              index > 0 ? "xl:border-l xl:border-t-0" : "",
            ].join(" ")}
          >
            <p className="text-sm text-[var(--muted-foreground)]">{metric.label}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)] tabular-nums">
                {metric.value.toLocaleString()}
              </p>
              <TrendMark delta={metric.delta} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function HomeLiveAndChartsSection({
  filters,
  countrySort,
  websiteSort,
  purposeSort,
}: {
  filters: DashboardFilters;
  countrySort?: string;
  websiteSort?: string;
  purposeSort?: string;
}) {
  const { organization } = await requireDashboardContext();
  const [counts, analytics] = await Promise.all([
    loadHomeDashboardCounts(organization.id),
    loadHomeChartAnalytics(organization.id, filters),
  ]);

  const trendByDay = new Map(analytics.trends.map((row) => [row.day, row]));
  const barPoints = chartDays(filters, analytics.trends.map((row) => row.day)).map((day) => {
    const row = trendByDay.get(day);
    return {
      label: formatChartDay(day),
      values: {
        total: (row?.acceptAll ?? 0) + (row?.rejectAll ?? 0) + (row?.granular ?? 0),
        accepted: row?.acceptAll ?? 0,
        rejected: row?.rejectAll ?? 0,
        granular: row?.granular ?? 0,
      },
    };
  });

  const deviceSlices = analytics.devices
    .filter((row) => row.total > 0 && row.key.toLowerCase() !== "unknown")
    .slice(0, 4)
    .map((row) => ({
      label: row.name,
      value: row.total,
      color: DEVICE_COLORS[row.key.toLowerCase()] ?? "var(--accent)",
    }));

  const countryOrder = allowedSort(countrySort, COUNTRY_SORTS, "records");
  const websiteOrder = allowedSort(websiteSort, WEBSITE_SORTS, "records");
  const purposeOrder = allowedSort(purposeSort, PURPOSE_SORTS, "granted");
  const knownCountries = sortCountries(
    analytics.countries.filter((row) => row.key.toLowerCase() !== "unknown" && row.total > 0),
    countryOrder,
  );
  const countryTotal = knownCountries.reduce((sum, row) => sum + row.total, 0);
  const topCountries = knownCountries.slice(0, 8);
  const topWebsites = sortWebsites(
    analytics.websiteSummary.filter((row) => row.total > 0),
    websiteOrder,
  ).slice(0, 8);
  const topPurposes = sortPurposes(
    analytics.purposes.filter((row) => row.granted > 0),
    purposeOrder,
  ).slice(0, 8);

  return (
    <div className="space-y-6">
      <SetupGuide steps={buildGetLiveSteps(counts)} complete={counts.publishedCount > 0 && counts.totalConsents > 0} />

      <div className="grid items-stretch gap-4 lg:grid-cols-12">
        <div className="h-full min-w-0 lg:col-span-8">
          <AnalyticsPanel title="Daily choices">
            <ChoiceChart
              replayKey={`${filters.days ?? ""}|${filters.from ?? ""}|${filters.to ?? ""}|${filters.websiteId ?? ""}`}
              points={barPoints}
            />
          </AnalyticsPanel>
        </div>
        <div className="h-full min-w-0 lg:col-span-4">
          <AnalyticsPanel title="Devices">
            <div className="flex min-h-64 flex-1 items-center justify-center">
              <PieChart
                variant="donut"
                slices={deviceSlices}
                legend="row"
                centerLabel="records"
                label="Consent records by device"
                emptyTitle="No device data yet"
                emptyDescription="Desktop, mobile, and tablet appear after the SDK records a visitor choice."
              />
            </div>
          </AnalyticsPanel>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <AnalyticsPanel
            title="By country"
            action={<DashboardSort param="countrySort" value={countryOrder} options={[...COUNTRY_SORTS]} />}
          >
            {topCountries.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">
                Country breakdowns appear after the SDK records a visitor choice.
              </p>
            ) : (
              <>
                <CountryMap
                  countries={knownCountries.map((row) => ({
                    code: row.key,
                    name: row.name,
                    total: row.total,
                    accepted: row.accepted,
                    rejected: row.rejected,
                    partial: row.partial,
                    withdrawn: row.withdrawn,
                  }))}
                />
                <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {topCountries.map((row) => {
                    const share = pct(row.total, countryTotal);
                    return (
                      <li key={row.key}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                            <CountryFlag code={row.key} />
                            <span className="truncate">{row.name}</span>
                          </span>
                          <span className="shrink-0 text-sm tabular-nums text-[var(--muted-foreground)]">{share}%</span>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--secondary)]">
                          <div className="h-full rounded-full bg-[var(--purple)]" style={{ width: `${Math.max(share, share > 0 ? 4 : 0)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </AnalyticsPanel>
        </div>
        <div className="grid min-w-0 gap-4 lg:col-span-5">
          <AnalyticsPanel
            title="By website"
            action={<DashboardSort param="websiteSort" value={websiteOrder} options={[...WEBSITE_SORTS]} />}
          >
            {topWebsites.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">No website records yet.</p>
            ) : (
              <HorizontalBarChart
                rows={topWebsites.map((row) => ({
                  label: row.websiteDomain || row.websiteName,
                  value: row.total,
                  hint: `${row.accepted.toLocaleString()} accepted`,
                }))}
                label="Consent records by website"
                emptyTitle="No website records yet"
                emptyDescription="Website totals appear after the SDK records a visitor choice."
              />
            )}
          </AnalyticsPanel>
          <AnalyticsPanel
            title="Top purposes"
            action={<DashboardSort param="purposeSort" value={purposeOrder} options={[...PURPOSE_SORTS]} />}
          >
            {topPurposes.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">No purpose grants yet.</p>
            ) : (
              <HorizontalBarChart
                rows={topPurposes.map((row) => ({
                  label: row.purposeName,
                  value: row.granted,
                  hint: `${pct(row.granted, row.total)}% granted`,
                }))}
                color="var(--primary)"
                label="Granted consent by purpose"
                emptyTitle="No purpose grants yet"
                emptyDescription="Purpose totals appear after visitors grant a purpose."
              />
            )}
          </AnalyticsPanel>
        </div>
      </div>
    </div>
  );
}

export async function HomeRecentSection({ filters }: { filters: DashboardFilters }) {
  const { organization } = await requireDashboardContext();
  const counts = await loadHomeDashboardCounts(organization.id);
  const period = parseAnalyticsPeriod(filters);

  const recentRecords = await db
    .select({
      visitorId: consentRecords.visitorId,
      email: sql<string>`coalesce(${consentRecords.metadata}->>'email', '')`,
      name: sql<string>`coalesce(${consentRecords.metadata}->>'name', '')`,
      status: consentRecords.status,
      createdAt: consentRecords.createdAt,
    })
    .from(consentRecords)
    .where(and(
      eq(consentRecords.organizationId, organization.id),
      ...(filters.websiteId ? [eq(consentRecords.websiteId, filters.websiteId)] : []),
      ...(period.since ? [gte(consentRecords.updatedAt, period.since)] : []),
      ...(period.until ? [lte(consentRecords.updatedAt, period.until)] : []),
    ))
    .orderBy(desc(consentRecords.createdAt))
    .limit(4);

  const recentRequests: RecentRequest[] = recentRecords.map((r) => {
    let status: RecentRequest["status"] = "Pending";
    if (r.status === "accepted" || r.status === "partial") status = "Approved";
    else if (r.status === "withdrawn" || r.status === "rejected") status = "Withdrawn";

    const time = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(r.createdAt));

    const metaEmail = r.email;
    const metaName = r.name;
    const name = metaName || (r.visitorId ? `Visitor ${r.visitorId.slice(0, 8)}` : "Visitor");
    const resolvedEmail = metaEmail || "No email on record";

    return { name, email: resolvedEmail, status, time };
  });

  const complianceChecks = [
    { label: "Website registered", done: counts.websiteCount > 0 },
    { label: "Consent policy created", done: counts.policyCount > 0 },
    { label: "Consent records collected", done: counts.totalConsents > 0 },
    { label: "Trackers detected", done: counts.trackerCount > 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="dash-card-grid grid items-stretch gap-5 lg:grid-cols-12">
        <Card className="dash-card-in flex h-full min-w-0 flex-col lg:col-span-8">
          <CardHeader>
            <ChartCardTitle
              icon={<Mark tone="primary" size="sm"><ListIcon /></Mark>}
              title="Recent consent records"
              hint="Latest choices recorded for this organisation"
              trailing={
                <Link href="/dashboard/consent" className="btn btn-outline btn-sm">
                  View all
                </Link>
              }
            />
          </CardHeader>
          <CardContent className="flex-1">
            {recentRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-4 py-10 text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">No consent records yet</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Records appear here after visitors interact with your consent banner.
                </p>
              </div>
            ) : (
              recentRequests.map((req, idx) => (
                <div key={`${req.name}-${idx}`} className="border-t border-[var(--border)] px-1 py-3.5 first:border-t-0 first:pt-0">
                  <IconText
                    size="md"
                    icon={<AvatarFallback name={req.name} idx={idx} />}
                    iconClassName="overflow-hidden p-0"
                    title={req.name}
                    description={req.email}
                    trailing={
                      <span className="ml-auto flex shrink-0 items-start gap-2 sm:gap-4">
                        <RequestStatusBadge status={req.status} />
                        <span className="hidden min-w-16 text-right text-xs tabular-nums text-[var(--muted-foreground)] sm:block">
                          {req.time}
                        </span>
                      </span>
                    }
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="dash-card-in flex h-full min-w-0 flex-col lg:col-span-4">
          <CardHeader>
            <ChartCardTitle
              icon={<Mark tone="info" size="sm"><GridIcon /></Mark>}
              title="Inventory"
              hint="What this organisation has configured"
            />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="divide-y divide-[var(--border)]">
              <InventoryRow href="/dashboard/websites" icon={<Mark tone="primary" size="sm"><BrowserIcon /></Mark>} label="Websites" value={counts.websiteCount} />
              <InventoryRow href="/dashboard/policies" icon={<Mark tone="success" size="sm"><PolicyIcon /></Mark>} label="Policies" value={counts.policyCount} />
              <InventoryRow href="/dashboard/vendors" icon={<Mark tone="warning" size="sm"><StoreIcon /></Mark>} label="Vendors" value={counts.vendorCount} />
              <InventoryRow href="/dashboard/trackers" icon={<Mark tone="purple" size="sm"><RadarIcon /></Mark>} label="Trackers" value={counts.trackerCount} />
            </div>
            <div className="space-y-2.5 border-t border-[var(--border)] pt-4">
              {complianceChecks.map((item) => (
                <ComplianceCheckItem key={item.label} label={item.label} done={item.done} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {counts.websiteCount === 0 ? (
        <EmptyState
          title="No websites yet"
          description="Add your first website to start collecting consent data and unlock all dashboard analytics."
          actionLabel="Add a website"
          actionHref="/dashboard/websites/new"
        />
      ) : null}
    </div>
  );
}
