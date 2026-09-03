import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { eq, inArray, sql, desc } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentPolicies } from "@/db/schema/consent-policies";
import { trackers } from "@/db/schema/trackers";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { loadConsentAnalytics } from "@/lib/analytics/queries";

// ---------------------------------------------------------------------------
// Icons for StatCards
// ---------------------------------------------------------------------------

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

function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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

type TrendRow = {
  day: string;
  interactions: number;
  acceptAll: number;
  rejectAll: number;
  granular: number;
  withdrawals: number;
};

function formatChartDay(day: string) {
  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return day;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ConsentTrendChart({ rows }: { rows: TrendRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-4 py-12 text-center">
        <p className="text-sm font-medium text-[var(--foreground)]">No consent events in the last 30 days</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          The chart appears after visitors submit a choice on a site with the SDK installed.
        </p>
      </div>
    );
  }

  const consented = rows.map((row) => row.acceptAll + row.granular);
  const withdrawn = rows.map((row) => row.withdrawals);
  const points = rows.length;
  const maxVal = Math.max(1, ...consented, ...withdrawn);
  const yTicks = Array.from(new Set([0, Math.round(maxVal / 2), maxVal]));

  const width = 520;
  const height = 180;
  const padX = 36;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const last = Math.max(points - 1, 1);

  function toX(i: number) {
    return padX + (i / last) * chartW;
  }
  function toY(v: number) {
    return padY + chartH - (v / maxVal) * chartH;
  }

  function areaPath(data: number[]) {
    if (data.length === 0) return "";
    const start = `M ${toX(0)} ${toY(data[0])}`;
    const line = data.slice(1).map((v, i) => `L ${toX(i + 1)} ${toY(v)}`).join(" ");
    const end = `L ${toX(points - 1)} ${padY + chartH} L ${toX(0)} ${padY + chartH} Z`;
    return `${start} ${line} ${end}`;
  }

  function linePath(data: number[]) {
    if (data.length === 0) return "";
    const start = `M ${toX(0)} ${toY(data[0])}`;
    const line = data.slice(1).map((v, i) => `L ${toX(i + 1)} ${toY(v)}`).join(" ");
    return `${start} ${line}`;
  }

  const labelIndexes =
    points <= 5
      ? rows.map((_, i) => i)
      : [0, Math.floor((points - 1) / 2), points - 1];

  return (
    <div className="w-full table-scroll scrollbar-thin">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[480px]" role="img" aria-label="Consent events over the last 30 days">
        <defs>
          <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padX}
              x2={width - padX}
              y1={toY(t)}
              y2={toY(t)}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />
            <text
              x={padX - 8}
              y={toY(t) + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--muted-foreground)"
              fontFamily="inherit"
            >
              {t}
            </text>
          </g>
        ))}

        <path d={areaPath(consented)} fill="url(#activeFill)" />
        <path d={linePath(consented)} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={toX(points - 1)} cy={toY(consented[points - 1])} r="4.5" fill="var(--card)" stroke="var(--primary)" strokeWidth="2.5" />
        <path d={linePath(withdrawn)} fill="none" stroke="var(--danger)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" opacity="0.75" />

        {labelIndexes.map((i) => (
          <text
            key={`${rows[i].day}-${i}`}
            x={toX(i)}
            y={height - 6}
            textAnchor="middle"
            fontSize="10"
            fill="var(--muted-foreground)"
            fontFamily="inherit"
          >
            {formatChartDay(rows[i].day)}
          </text>
        ))}
      </svg>

      <div className="mt-4 flex flex-wrap items-center gap-5 pl-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
          <span className="text-sm text-[var(--muted-foreground)]">Accept all + granular</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />
          <span className="text-sm text-[var(--muted-foreground)]">Withdrawals</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Consent by Purpose — Donut chart
// ---------------------------------------------------------------------------

type PurposeSlice = {
  name: string;
  color: string;
  value: number;
};

function DonutChart({ slices, total }: { slices: PurposeSlice[]; total: number }) {
  const size = 200;
  const radius = 80;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  if (slices.length === 0 || total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-4 py-12 text-center">
        <p className="text-sm font-medium text-[var(--foreground)]">No purpose decisions yet</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Granted choices per purpose show here after visitors save preferences.
        </p>
      </div>
    );
  }

  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Consent by purpose donut chart">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--muted)" strokeWidth="28" />
          {slices.map((s, i) => {
            const pct = total > 0 ? s.value / total : 0;
            const dash = pct * circumference;
            const gap = circumference - dash;
            const offset = -cumulative * circumference;
            cumulative += pct;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="28"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-3xl font-bold text-[var(--foreground)]">{total.toLocaleString()}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Total</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 w-full min-w-0">
        {slices.map((s, i) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-sm font-medium text-[var(--secondary-foreground)] truncate">{s.name}</span>
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-sm font-bold text-[var(--foreground)]">{pct}%</span>
                <span className="hidden sm:inline text-xs text-[var(--muted-foreground)] tabular-nums">({s.value.toLocaleString()})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Recent Requests Row
// ---------------------------------------------------------------------------

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
    "from-indigo-400 to-indigo-600",
    "from-emerald-400 to-emerald-600",
    "from-amber-400 to-amber-600",
    "from-rose-400 to-rose-600",
    "from-violet-400 to-violet-600",
  ];
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${colors[idx % colors.length]} flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0`}>
      {initials || "U"}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Compliance Status
// ---------------------------------------------------------------------------

function ComplianceShield({ complete }: { complete: boolean }) {
  return (
    <div className="relative flex h-[140px] w-[140px] shrink-0 items-center justify-center">
      <div className={`absolute inset-4 rounded-full ${complete ? "bg-emerald-50" : "bg-slate-100"}`} />
      <div className={`absolute inset-8 rounded-full ${complete ? "bg-emerald-100" : "bg-slate-200"}`} />
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${
          complete ? "gradient-success compliance-glow" : "bg-slate-400"
        }`}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {complete ? <polyline points="20 6 9 17 4 12" /> : <line x1="12" y1="8" x2="12" y2="16" />}
        </svg>
      </div>
    </div>
  );
}

function ComplianceCheckItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-emerald-100" : "bg-slate-100"
        }`}
      >
        {done ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        )}
      </div>
      <span className="text-sm text-slate-600">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — server component
// Auth + bootstrap guaranteed by dashboard layout.
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const { organization: localOrg } = await requireDashboardContext();

  const orgWebsites = await db
    .select({ id: websites.id })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id));

  const websiteCount = orgWebsites.length;
  const websiteIds = orgWebsites.map((w) => w.id);

  const [consentStatusTotals, trackerRows, policyRows, recentRecords, analytics] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        accepted: sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
        rejected: sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
        partial: sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
        withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
        pending: sql<number>`count(*) filter (where ${consentRecords.status} = 'pending')::int`,
      })
      .from(consentRecords)
      .where(eq(consentRecords.organizationId, localOrg.id)),

    websiteIds.length > 0
      ? db
          .select({ id: trackers.id })
          .from(trackers)
          .where(inArray(trackers.websiteId, websiteIds))
      : Promise.resolve([]),

    websiteIds.length > 0
      ? db
          .select({ id: consentPolicies.id })
          .from(consentPolicies)
          .where(inArray(consentPolicies.websiteId, websiteIds))
      : Promise.resolve([]),

    db
      .select({
        visitorId: consentRecords.visitorId,
        metadata: consentRecords.metadata,
        status: consentRecords.status,
        createdAt: consentRecords.createdAt,
      })
      .from(consentRecords)
      .where(eq(consentRecords.organizationId, localOrg.id))
      .orderBy(desc(consentRecords.createdAt))
      .limit(4),

    loadConsentAnalytics(localOrg.id, { days: "30" }),
  ]);

  const totalConsents = consentStatusTotals[0]?.total ?? 0;
  const acceptedConsents = consentStatusTotals[0]?.accepted ?? 0;
  const partialConsents = consentStatusTotals[0]?.partial ?? 0;
  const activeConsents = acceptedConsents + partialConsents;
  const pendingConsents = consentStatusTotals[0]?.pending ?? 0;
  const withdrawnConsents = consentStatusTotals[0]?.withdrawn ?? 0;
  const trackerCount = trackerRows.length;
  const policyCount = policyRows.length;

  const PURPOSE_COLORS = [
    "var(--primary)",
    "var(--accent)",
    "var(--warning)",
    "var(--danger)",
    "var(--success)",
  ];
  const donutSlices: PurposeSlice[] = analytics.purposes
    .filter((row) => row.granted > 0)
    .slice(0, 5)
    .map((row, index) => ({
      name: row.purposeName,
      color: PURPOSE_COLORS[index % PURPOSE_COLORS.length],
      value: row.granted,
    }));
  const donutTotal = donutSlices.reduce((sum, slice) => sum + slice.value, 0);

  const recentRequests: RecentRequest[] = recentRecords.map((r) => {
    let status: RecentRequest["status"] = "Pending";
    if (r.status === "accepted" || r.status === "partial") status = "Approved";
    else if (r.status === "withdrawn" || r.status === "rejected") status = "Withdrawn";

    const minutes = Math.max(1, Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000));
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
    { label: "Website registered", done: websiteCount > 0 },
    { label: "Consent policy created", done: policyCount > 0 },
    { label: "Consent records collected", done: totalConsents > 0 },
    { label: "Trackers detected", done: trackerCount > 0 },
  ];
  const setupComplete = websiteCount > 0 && policyCount > 0 && totalConsents > 0;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">
            Dashboard
          </h1>
          <p className="page-description">
            {websiteCount === 0
              ? "Your workspace is ready. Add a website to start collecting consent."
              : `Overview for ${localOrg.name}.`}
          </p>
        </div>
      </div>

      {/* Metric cards — 1 col on mobile, 2 on sm, 4 on xl */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Consents"
          value={totalConsents}
          icon={<IconUsersGroup />}
          iconColor="blue"
          description="All recorded consents"
        />
        <StatCard
          label="Active Consents"
          value={activeConsents}
          icon={<IconCheckCircle />}
          iconColor="green"
          description="Accepted or granular"
        />
        <StatCard
          label="Pending Requests"
          value={pendingConsents}
          icon={<IconClock />}
          iconColor="amber"
          description="Awaiting a choice"
        />
        <StatCard
          label="Withdrawn Consents"
          value={withdrawnConsents}
          icon={<IconShieldAlert />}
          iconColor="rose"
          description="Visitor withdrew consent"
        />
      </div>

      {/* Main grid: Consent Overview + Consent by Purpose
          Stack on mobile/tablet, side-by-side on lg+ */}
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3 min-w-0">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg">Consent Overview</CardTitle>
              <span className="text-sm text-slate-500">Last 30 days</span>
            </div>
          </CardHeader>
          <CardContent>
            <ConsentTrendChart rows={analytics.trends} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Consent by Purpose</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Granted decisions · last 30 days</p>
          </CardHeader>
          <CardContent>
            <DonutChart slices={donutSlices} total={donutTotal} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid: Recent Requests + Compliance Status
          Stack on mobile/tablet, side-by-side on lg+ */}
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3 min-w-0">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg">Recent Consent Requests</CardTitle>
              <Link
                href="/dashboard/consent"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors rounded-xl px-3.5 h-9 inline-flex items-center bg-indigo-50 hover:bg-indigo-100/80"
              >
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
            ) : recentRequests.map((req, idx) => (
              <div
                key={idx}
                className="dashboard-list-row rounded-2xl px-3 -mx-1 py-3 hover:bg-[var(--muted)]/60 transition-colors"
              >
                <div data-icon-tile>
                  <AvatarFallback name={req.name} idx={idx} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate leading-snug">{req.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">{req.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-center sm:gap-4">
                  <RequestStatusBadge status={req.status} />
                  <span className="hidden sm:block text-xs text-[var(--muted-foreground)] tabular-nums w-12 text-right">
                    {req.time}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Side-by-side on sm+, stacked on mobile */}
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
              <ComplianceShield complete={setupComplete} />
              <div className="flex-1 min-w-0 space-y-3 w-full text-center sm:text-left">
                <div>
                  <h4 className="text-base font-bold text-slate-900 sm:text-lg">
                    {setupComplete ? "Collecting consent" : "Setup in progress"}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                    {setupComplete
                      ? "Policies and live records are in place. Keep the SDK installed on each site."
                      : "Complete the items below so analytics can show real visitor choices."}
                  </p>
                </div>
                <div className="space-y-2.5 pt-1">
                  {complianceChecks.map((item) => (
                    <ComplianceCheckItem key={item.label} label={item.label} done={item.done} />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state — no websites */}
      {websiteCount === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-3xl border-2 border-dashed border-slate-200 p-8 md:p-10 text-center bg-gradient-to-br from-slate-50 to-indigo-50/30">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl gradient-primary shadow-lg shadow-indigo-500/25 md:h-16 md:w-16">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <p className="text-base font-semibold text-slate-800">No websites yet</p>
              <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                Add your first website to start collecting consent data and unlock all dashboard analytics.
              </p>
              <Link
                href="/dashboard/websites/new"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-primary text-white px-5 h-10 text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:brightness-105 transition-all duration-200 md:px-6 md:h-11"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add a website
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer stat cards: Websites / Policies / Trackers */}
      {websiteCount > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-5">
              <div className="icon-text-row">
                <div data-icon-tile className="flex h-11 w-11 items-center justify-center rounded-2xl stat-icon-teal text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <div className="icon-text-body">
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">Websites</p>
                  <p className="mt-0.5 text-2xl font-bold leading-none text-[var(--foreground)] tabular-nums">{websiteCount}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Registered websites</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <div className="icon-text-row">
                <div data-icon-tile className="flex h-11 w-11 items-center justify-center rounded-2xl stat-icon-purple text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="icon-text-body">
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">Policies</p>
                  <p className="mt-0.5 text-2xl font-bold leading-none text-[var(--foreground)] tabular-nums">{policyCount}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Across all websites</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <div className="icon-text-row">
                <div data-icon-tile className="flex h-11 w-11 items-center justify-center rounded-2xl stat-icon-amber text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="icon-text-body">
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">Trackers</p>
                  <p className="mt-0.5 text-2xl font-bold leading-none text-[var(--foreground)] tabular-nums">{trackerCount}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Detected across all websites</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
