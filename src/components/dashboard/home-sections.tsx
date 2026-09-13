import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import type { ReactNode } from "react";

import { db } from "@/db";
import { consentRecords } from "@/db/schema/consent-records";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadHomeChartAnalytics, loadHomeDashboardCounts } from "@/lib/dashboard/home-queries";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupGuide } from "@/components/dashboard/setup-guide";
import { buildGetLiveSteps } from "@/lib/dashboard/get-live-path";
import { EmptyState } from "@/components/ui/empty-state";
import { IconText } from "@/components/ui/icon-text";
import { PieChart } from "@/components/charts/pie-chart";
import { GroupedBarChart, HorizontalBarChart } from "@/components/charts/bar-chart";

function IconUsersGroup() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconPartial() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconShieldAlert() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconPolicy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconVendor() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function IconTracker() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 010 8.48M7.76 7.76a6 6 0 000 8.48" />
      <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
    </svg>
  );
}

function IconBars() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function IconPie() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 118 2.83" />
      <path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21" />
      <line x1="8" y1="3" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="21" />
    </svg>
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
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--primary)]">
          {icon}
        </span>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {hint ? <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{hint}</p> : null}
        </div>
      </div>
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--primary)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value.toLocaleString()}</span>
    </Link>
  );
}

export async function HomeStatsSection() {
  const { organization } = await requireDashboardContext();
  const counts = await loadHomeDashboardCounts(organization.id);
  const total = counts.totalConsents;

  return (
    <div className="dash-card-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total records"
        value={counts.totalConsents}
        icon={<IconUsersGroup />}
        iconColor="blue"
        description="All recorded consents"
      />
      <StatCard
        label="Accepted"
        value={counts.acceptedConsents}
        icon={<IconCheckCircle />}
        iconColor="green"
        description={`${pct(counts.acceptedConsents, total)}% of records`}
      />
      <StatCard
        label="Granular"
        value={counts.partialConsents}
        icon={<IconPartial />}
        iconColor="purple"
        description={`${pct(counts.partialConsents, total)}% of records`}
      />
      <StatCard
        label="Withdrawn"
        value={counts.withdrawnConsents}
        icon={<IconShieldAlert />}
        iconColor="rose"
        description={`${pct(counts.withdrawnConsents, total)}% of records`}
      />
    </div>
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

      <div className="dash-card-grid grid gap-5 lg:grid-cols-12">
        <Card className="dash-card-in min-w-0 lg:col-span-8">
          <CardHeader>
            <ChartCardTitle icon={<IconBars />} title="Daily choices" hint="Accept, reject, and granular · last 30 days" />
          </CardHeader>
          <CardContent>
            <GroupedBarChart
              points={barPoints}
              series={[
                { key: "acceptAll", label: "Accept all", color: "var(--success)" },
                { key: "rejectAll", label: "Reject all", color: "var(--danger)" },
                { key: "granular", label: "Granular", color: "var(--purple)" },
              ]}
              label="Daily consent choices over the last 30 days"
              emptyTitle="No consent events in the last 30 days"
              emptyDescription="The bar chart appears after visitors submit a choice on a site with the SDK installed."
            />
          </CardContent>
        </Card>

        <Card className="dash-card-in min-w-0 lg:col-span-4">
          <CardHeader>
            <ChartCardTitle icon={<IconPie />} title="Consent mix" hint="Current records" />
          </CardHeader>
          <CardContent>
            <PieChart
              slices={outcomeSlices}
              label="Consent mix by record status"
              emptyTitle="No consent records yet"
              emptyDescription="Accepted, rejected, granular, and withdrawn records show here after visitors choose."
            />
          </CardContent>
        </Card>
      </div>

      <div className="dash-card-grid grid gap-5 lg:grid-cols-3">
        <Card className="dash-card-in min-w-0">
          <CardHeader>
            <ChartCardTitle icon={<IconTarget />} title="Purpose grants" hint="Top purposes · last 30 days" />
          </CardHeader>
          <CardContent>
            <PieChart
              slices={purposeSlices}
              label="Granted consent decisions by purpose"
              emptyTitle="No purpose decisions yet"
              emptyDescription="Granted choices per purpose show here after visitors save preferences."
            />
          </CardContent>
        </Card>

        <Card className="dash-card-in min-w-0">
          <CardHeader>
            <ChartCardTitle icon={<IconGlobe />} title="By website" hint="Consent records" />
          </CardHeader>
          <CardContent>
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

        <Card className="dash-card-in min-w-0">
          <CardHeader>
            <ChartCardTitle
              icon={<IconMap />}
              title={geoIsCountry ? "By country" : "By device"}
              hint={geoIsCountry ? "Visitor country" : "Device class when country is unknown"}
            />
          </CardHeader>
          <CardContent>
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
  const renderedAt = Date.now();

  const recentRecords = await db
    .select({
      visitorId: consentRecords.visitorId,
      metadata: consentRecords.metadata,
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

    const minutes = Math.max(1, Math.floor((renderedAt - new Date(r.createdAt).getTime()) / 60000));
    let time = `${minutes}m ago`;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      time = `${hours}h ago`;
    }

    const meta = r.metadata && typeof r.metadata === "object" ? (r.metadata as Record<string, unknown>) : {};
    const metaEmail = typeof meta.email === "string" ? meta.email : "";
    const metaName = typeof meta.name === "string" ? meta.name : "";
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
      <div className="dash-card-grid grid gap-5 lg:grid-cols-12">
        <Card className="dash-card-in min-w-0 lg:col-span-8">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CardTitle>Recent consent records</CardTitle>
              <Link href="/dashboard/consent" className="btn btn-outline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-4 py-10 text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">No consent records yet</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Records appear here after visitors interact with your consent banner.
                </p>
              </div>
            ) : (
              recentRequests.map((req, idx) => (
                <div key={`${req.name}-${idx}`} className="rounded-2xl px-3 -mx-1 py-3 transition-colors hover:bg-[var(--muted)]/60">
                  <IconText
                    size="md"
                    icon={<AvatarFallback name={req.name} idx={idx} />}
                    iconClassName="overflow-hidden p-0"
                    title={req.name}
                    description={req.email}
                    trailing={
                      <span className="ml-auto flex shrink-0 items-start gap-2 sm:gap-4">
                        <RequestStatusBadge status={req.status} />
                        <span className="hidden w-12 text-right text-xs tabular-nums text-[var(--muted-foreground)] sm:block">
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

        <Card className="dash-card-in min-w-0 lg:col-span-4">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">What this organisation has configured</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="divide-y divide-[var(--border)]">
              <InventoryRow href="/dashboard/websites" icon={<IconGlobe />} label="Websites" value={counts.websiteCount} />
              <InventoryRow href="/dashboard/policies" icon={<IconPolicy />} label="Policies" value={counts.policyCount} />
              <InventoryRow href="/dashboard/vendors" icon={<IconVendor />} label="Vendors" value={counts.vendorCount} />
              <InventoryRow href="/dashboard/trackers" icon={<IconTracker />} label="Trackers" value={counts.trackerCount} />
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
