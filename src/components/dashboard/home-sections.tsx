import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import type { ReactNode } from "react";

import { db } from "@/db";
import { consentRecords } from "@/db/schema/consent-records";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadHomeChartAnalytics, loadHomeDashboardCounts } from "@/lib/dashboard/home-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupGuide } from "@/components/dashboard/setup-guide";
import { buildGetLiveSteps } from "@/lib/dashboard/get-live-path";
import { EmptyState } from "@/components/ui/empty-state";
import { IconText } from "@/components/ui/icon-text";
import { PieChart } from "@/components/charts/pie-chart";
import { GroupedBarChart, HorizontalBarChart } from "@/components/charts/bar-chart";

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

const PURPOSE_COLORS = [
  "var(--info)",
  "var(--purple)",
  "var(--warning)",
  "var(--danger)",
  "var(--pink)",
  "var(--success)",
];

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

function SeriesChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
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

export async function HomeStatsSection() {
  const { organization } = await requireDashboardContext();
  const counts = await loadHomeDashboardCounts(organization.id);
  const total = counts.totalConsents;
  const metrics = [
    {
      label: "Total records",
      value: counts.totalConsents,
      hint: "All recorded consents",
      color: "var(--primary)",
      icon: <Mark tone="primary"><RecordsIcon /></Mark>,
    },
    {
      label: "Accepted",
      value: counts.acceptedConsents,
      hint: `${pct(counts.acceptedConsents, total)}% of records`,
      color: "var(--success)",
      icon: <Mark tone="success"><AcceptedIcon /></Mark>,
    },
    {
      label: "Granular",
      value: counts.partialConsents,
      hint: `${pct(counts.partialConsents, total)}% of records`,
      color: "var(--purple)",
      icon: <Mark tone="purple"><GranularIcon /></Mark>,
    },
    {
      label: "Withdrawn",
      value: counts.withdrawnConsents,
      hint: `${pct(counts.withdrawnConsents, total)}% of records`,
      color: "var(--warning)",
      icon: <Mark tone="warning"><WithdrawnIcon /></Mark>,
    },
  ];
  const share = metrics.slice(1).filter((metric) => metric.value > 0);

  return (
    <section className="dash-card-in overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={[
              "relative px-5 py-5 sm:px-6 sm:py-6",
              index > 0 ? "border-t border-[var(--border)]" : "",
              index % 2 === 1 ? "sm:border-l" : "",
              index === 1 ? "sm:border-t-0" : "",
              index > 0 ? "xl:border-l xl:border-t-0" : "",
            ].join(" ")}
          >
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: metric.color }} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--muted-foreground)]">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] tabular-nums">
                  {metric.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{metric.hint}</p>
              </div>
              {metric.icon}
            </div>
          </div>
        ))}
      </div>
      {total > 0 ? (
        <div className="border-t border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="flex h-2 overflow-hidden rounded-full bg-[var(--secondary)]" aria-hidden="true">
            {share.map((metric) => (
              <div
                key={metric.label}
                style={{ width: `${(metric.value / total) * 100}%`, background: metric.color }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export async function HomeLiveAndChartsSection() {
  const { organization } = await requireDashboardContext();
  const [counts, analytics] = await Promise.all([
    loadHomeDashboardCounts(organization.id),
    loadHomeChartAnalytics(organization.id),
  ]);

  const trendByDay = new Map(analytics.trends.map((row) => [row.day, row]));
  const barPoints = lastNLocalDays(30).map((day) => {
    const row = trendByDay.get(day);
    return {
      label: formatChartDay(day),
      values: {
        acceptAll: row?.acceptAll ?? 0,
        rejectAll: row?.rejectAll ?? 0,
        granular: row?.granular ?? 0,
      },
    };
  });

  const choiceSeries: { key: "acceptAll" | "rejectAll" | "granular"; label: string; color: string }[] = [
    { key: "acceptAll", label: "Accept all", color: "var(--success)" },
    { key: "rejectAll", label: "Reject all", color: "var(--danger)" },
    { key: "granular", label: "Granular", color: "var(--purple)" },
  ];
  const choiceTotals = choiceSeries.map((item) => ({
    ...item,
    value: barPoints.reduce((sum, point) => sum + (point.values[item.key] ?? 0), 0),
  }));

  const outcomeSlices = [
    { label: "Accepted", value: analytics.overview.accepted, color: "var(--success)" },
    { label: "Rejected", value: analytics.overview.rejected, color: "var(--danger)" },
    { label: "Granular", value: analytics.overview.partial, color: "var(--purple)" },
    { label: "Withdrawn", value: analytics.overview.withdrawn, color: "var(--warning)" },
  ];

  const purposeTop = analytics.purposes.filter((row) => row.granted > 0);
  const purposeHead = purposeTop.slice(0, 5);
  const purposeRest = purposeTop.slice(5).reduce((sum, row) => sum + row.granted, 0);
  const purposeSlices = [
    ...purposeHead.map((row, index) => ({
      label: row.purposeName,
      value: row.granted,
      color: PURPOSE_COLORS[index % PURPOSE_COLORS.length]!,
    })),
    ...(purposeRest > 0 ? [{ label: "Other", value: purposeRest, color: "var(--muted-foreground)" }] : []),
  ];

  const knownCountries = analytics.countries.filter((row) => row.key.toLowerCase() !== "unknown" && row.total > 0);
  const geoRows = (knownCountries.length > 0 ? knownCountries : analytics.devices)
    .slice(0, 8)
    .map((row) => ({ label: row.name, value: row.total }));
  const geoIsCountry = knownCountries.length > 0;

  return (
    <div className="space-y-6">
      <SetupGuide steps={buildGetLiveSteps(counts)} complete={counts.publishedCount > 0 && counts.totalConsents > 0} />

      <div className="dash-card-grid grid items-stretch gap-5 lg:grid-cols-12">
        <Card className="dash-card-in flex h-full min-w-0 flex-col lg:col-span-8">
          <CardHeader>
            <ChartCardTitle
              icon={<Mark tone="primary" size="sm"><BarsIcon /></Mark>}
              title="Daily choices"
              hint="Accept, reject, and granular over the last 30 days"
              trailing={choiceSeries.map((item) => (
                <SeriesChip key={item.key} color={item.color} label={item.label} />
              ))}
            />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <GroupedBarChart
              points={barPoints}
              series={choiceSeries}
              hideLegend
              label="Daily consent choices over the last 30 days"
              emptyTitle="No consent events in the last 30 days"
              emptyDescription="The bar chart appears after visitors submit a choice on a site with the SDK installed."
            />
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4">
              {choiceTotals.map((item) => (
                <div key={item.key} className="min-w-0">
                  <p className="truncate text-xs font-medium text-[var(--muted-foreground)]">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">
                    {item.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="dash-card-in flex h-full min-w-0 flex-col lg:col-span-4">
          <CardHeader>
            <ChartCardTitle
              icon={<Mark tone="success" size="sm"><DonutIcon /></Mark>}
              title="Consent mix"
              hint="How current records are split"
            />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            <PieChart
              slices={outcomeSlices}
              label="Consent mix by record status"
              emptyTitle="No consent records yet"
              emptyDescription="Accepted, rejected, granular, and withdrawn records show here after visitors choose."
            />
          </CardContent>
        </Card>
      </div>

      <div className="dash-card-grid grid items-stretch gap-5 lg:grid-cols-3">
        <Card className="dash-card-in flex h-full min-w-0 flex-col">
          <CardHeader>
            <ChartCardTitle
              icon={<Mark tone="purple" size="sm"><MedalIcon /></Mark>}
              title="Purpose grants"
              hint="Top purposes over the last 30 days"
            />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            <PieChart
              slices={purposeSlices}
              centerLabel="grants"
              label="Granted consent decisions by purpose"
              emptyTitle="No purpose decisions yet"
              emptyDescription="Granted choices per purpose show here after visitors save preferences."
            />
          </CardContent>
        </Card>

        <Card className="dash-card-in flex h-full min-w-0 flex-col">
          <CardHeader>
            <ChartCardTitle
              icon={<Mark tone="info" size="sm"><BrowserIcon /></Mark>}
              title="By website"
              hint="Consent records on each site"
            />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            <HorizontalBarChart
              rows={analytics.websiteSummary.map((row) => ({
                label: row.websiteName,
                value: row.total,
                hint: row.websiteDomain,
              }))}
              color="var(--primary)"
              label="Consent records by website"
              emptyTitle="No website records yet"
              emptyDescription="Volume by site appears after the banner is live on a registered website."
            />
          </CardContent>
        </Card>

        <Card className="dash-card-in flex h-full min-w-0 flex-col">
          <CardHeader>
            <ChartCardTitle
              icon={geoIsCountry
                ? <Mark tone="warning" size="sm"><PinIcon /></Mark>
                : <Mark tone="info" size="sm"><DeviceIcon /></Mark>}
              title={geoIsCountry ? "By country" : "By device"}
              hint={geoIsCountry ? "Where visitors chose" : "Device class when country is unknown"}
            />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            <HorizontalBarChart
              rows={geoRows}
              color="var(--info)"
              label={geoIsCountry ? "Consent records by country" : "Consent records by device"}
              emptyTitle="No location or device data yet"
              emptyDescription="Country and device breakdowns appear after the SDK records a visitor choice."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export async function HomeRecentSection() {
  const { organization } = await requireDashboardContext();
  const counts = await loadHomeDashboardCounts(organization.id);

  const recentRecords = await db
    .select({
      visitorId: consentRecords.visitorId,
      email: sql<string>`coalesce(${consentRecords.metadata}->>'email', '')`,
      name: sql<string>`coalesce(${consentRecords.metadata}->>'name', '')`,
      status: consentRecords.status,
      createdAt: consentRecords.createdAt,
    })
    .from(consentRecords)
    .where(eq(consentRecords.organizationId, organization.id))
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
