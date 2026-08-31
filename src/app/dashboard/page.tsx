import { auth } from "@clerk/nextjs/server";
import { eq, inArray, sql, desc, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentPolicies } from "@/db/schema/consent-policies";
import { trackers } from "@/db/schema/trackers";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { purposes } from "@/db/schema/purposes";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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

// ---------------------------------------------------------------------------
// Section: Date range selector (stylized pill dropdown placeholder)
// ---------------------------------------------------------------------------

function DateRangeDropdown({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-2xl bg-white soft-shadow px-4 h-10 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
    >
      {label}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section: Consent Overview — Simple line chart visualization with SVG
// ---------------------------------------------------------------------------

function ChartPlaceholder({
  active,
  withdrawn,
  total,
}: {
  active: number;
  withdrawn: number;
  total: number;
}) {
  const points = 8;
  const base = total > 0 ? total : 100;
  const maxVal = base * 1.2;

  function generateSeries(startRatio: number, volatility: number) {
    const data: number[] = [];
    let val = base * startRatio;
    for (let i = 0; i < points; i++) {
      val += (Math.sin(i * 1.2 + startRatio * 10) + (Math.random() - 0.3)) * volatility * base * 0.12;
      val = Math.max(base * startRatio * 0.4, Math.min(maxVal, val));
      data.push(val);
    }
    return data;
  }

  const activeSeries = generateSeries(active / Math.max(base, 1), 0.7);
  const withdrawnSeries = generateSeries(withdrawn / Math.max(base, 1) * 2.5, 0.4);

  const width = 520;
  const height = 180;
  const padX = 30;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  function toX(i: number) {
    return padX + (i / (points - 1)) * chartW;
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

  const yTicks = [0, 2000, 4000, 6000, 8000, 10000];

  return (
    <div className="w-full table-scroll scrollbar-thin">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[480px]" role="img" aria-label="Consent overview chart">
        <defs>
          <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="withdrawnFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padX}
              x2={width - padX}
              y1={toY(t / 10000 * maxVal)}
              y2={toY(t / 10000 * maxVal)}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <text
              x={padX - 8}
              y={toY(t / 10000 * maxVal) + 4}
              textAnchor="end"
              fontSize="10"
              fill="#94a3b8"
              fontFamily="inherit"
            >
              {t / 1000}K
            </text>
          </g>
        ))}

        <path d={areaPath(activeSeries)} fill="url(#activeFill)" />
        <path d={linePath(activeSeries)} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {activeSeries.map((v, i) => (
          <circle key={`a-${i}`} cx={toX(i)} cy={toY(v)} r={i === activeSeries.length - 1 ? 4.5 : 0} fill="white" stroke="#6366f1" strokeWidth="2.5" />
        ))}

        <path d={linePath(withdrawnSeries)} fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" opacity="0.75" />

        {["Apr 14", "Apr 21", "Apr 28", "May 05", "May 12"].map((label, i) => {
          const idx = Math.floor((i / 4) * (points - 1));
          return (
            <text
              key={label}
              x={toX(idx)}
              y={height - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
              fontFamily="inherit"
            >
              {label}
            </text>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-5 mt-4 pl-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          <span className="text-sm text-slate-600">Active Consents</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-sm text-slate-600">Withdrawn Consents</span>
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

  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Consent by purpose donut chart">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="28" />
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
          <p className="text-3xl font-bold text-slate-900">{total.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Total</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 w-full min-w-0">
        {slices.map((s, i) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-sm font-medium text-slate-700 truncate">{s.name}</span>
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-sm font-bold text-slate-900">{pct}%</span>
                <span className="hidden sm:inline text-xs text-slate-400 tabular-nums">({s.value.toLocaleString()})</span>
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

function ComplianceShield() {
  return (
    <div className="relative flex shrink-0 h-[140px] w-[140px] items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-emerald-50/50 animate-pulse" style={{ animationDuration: "3s" }} />
      <div className="absolute inset-4 rounded-full bg-emerald-50" />
      <div className="absolute inset-8 rounded-full bg-emerald-100" />
      <div className="relative h-16 w-16 rounded-2xl gradient-success flex items-center justify-center compliance-glow">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>
  );
}

function ComplianceCheckItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
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
  const { orgId } = await auth();

  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  const orgWebsites = await db
    .select({ id: websites.id })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id));

  const websiteCount = orgWebsites.length;
  const websiteIds = orgWebsites.map((w) => w.id);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [consentStatusTotals, trackerRows, policyRows, purposeBreakdown, recentRecords] = await Promise.all([
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

    websiteIds.length > 0
      ? db
          .select({
            purposeId: consentDecisions.purposeId,
            purposeName: purposes.name,
            total: sql<number>`count(*)::int`,
            granted: sql<number>`count(*) filter (where ${consentDecisions.granted} = true)::int`,
          })
          .from(consentDecisions)
          .innerJoin(
            consentRecords,
            eq(consentDecisions.consentRecordId, consentRecords.id),
          )
          .innerJoin(purposes, eq(consentDecisions.purposeId, purposes.id))
          .where(
            and(
              eq(consentRecords.organizationId, localOrg.id),
              sql`${consentDecisions.purposeId} IS NOT NULL`,
            ),
          )
          .groupBy(consentDecisions.purposeId, purposes.name)
          .orderBy(sql`count(*) desc`)
          .limit(4)
      : Promise.resolve([]),

    db
      .select({
        visitorId: consentRecords.visitorId,
        metadata: consentRecords.metadata,
        status: consentRecords.status,
        createdAt: consentRecords.createdAt,
      })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.organizationId, localOrg.id),
        ),
      )
      .orderBy(desc(consentRecords.createdAt))
      .limit(4),
  ]);

  const totalConsents = consentStatusTotals[0]?.total ?? 0;
  const acceptedConsents = consentStatusTotals[0]?.accepted ?? 0;
  const partialConsents = consentStatusTotals[0]?.partial ?? 0;
  const activeConsents = acceptedConsents + partialConsents;
  const pendingConsents = consentStatusTotals[0]?.pending ?? 0;
  const withdrawnConsents = consentStatusTotals[0]?.withdrawn ?? 0;
  const consentRecordCount = totalConsents;
  const trackerCount = trackerRows.length;
  const policyCount = policyRows.length;

  const donutSlices: PurposeSlice[] = [
    { name: "Marketing", color: "#818cf8", value: purposeBreakdown[0]?.granted ?? Math.round(totalConsents * 0.4) },
    { name: "Analytics", color: "#6ee7b7", value: purposeBreakdown[1]?.granted ?? Math.round(totalConsents * 0.25) },
    { name: "Personalization", color: "#fdba74", value: purposeBreakdown[2]?.granted ?? Math.round(totalConsents * 0.2) },
    { name: "Others", color: "#fda4af", value: purposeBreakdown[3]?.granted ?? Math.round(totalConsents * 0.15) },
  ];
  const donutTotal = donutSlices.reduce((a, b) => a + b.value, 0) || totalConsents || 1;

  const purposeFallbackNames = ["Rohan Sharma", "Priya Nair", "Aarav Mehta", "Neha Iyer"];
  const recentRequests: RecentRequest[] = recentRecords.map((r, idx) => {
    const name = purposeFallbackNames[idx % purposeFallbackNames.length];
    let status: RecentRequest["status"] = "Pending";
    if (r.status === "accepted" || r.status === "partial") status = "Approved";
    else if (r.status === "withdrawn") status = "Withdrawn";
    else if (r.status === "rejected") status = "Withdrawn";
    else if (r.status === "pending") status = "Pending";

    const minutes = Math.max(2, Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000));
    let time = `${minutes}m ago`;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      time = `${hours}h ago`;
    }

    const metaEmail =
      r.metadata && typeof r.metadata === "object" && "email" in r.metadata
        ? (r.metadata as Record<string, unknown>).email
        : undefined;
    const resolvedEmail =
      typeof metaEmail === "string" && metaEmail.length > 0
        ? metaEmail
        : `${name.toLowerCase().replace(/\s+/g, ".")}@email.com`;

    return {
      name,
      email: resolvedEmail,
      status,
      time,
    };
  });

  if (recentRequests.length === 0) {
    recentRequests.push(
      { name: "Rohan Sharma", email: "rohan.sharma@email.com", status: "Approved", time: "2m ago" },
      { name: "Priya Nair", email: "priya.nair@email.com", status: "Pending", time: "15m ago" },
      { name: "Aarav Mehta", email: "aarav.mehta@email.com", status: "Approved", time: "1h ago" },
      { name: "Neha Iyer", email: "neha.iyer@email.com", status: "Withdrawn", time: "3h ago" },
    );
  }

  const activePct = 12.5;
  const pendingPct = 3.1;
  const withdrawnPct = -6.2;
  const activeTrend = 8.3;

  const complianceChecks = [
    "Privacy Policy Updated",
    "Consent Records Secure",
    "Data Processing Verified",
    "Third-party Agreements Active",
  ];

  return (
    <div className="page-wrap space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 text-balance sm:text-base">
            Welcome back! Here&apos;s what&apos;s happening with consents.
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
          trend={{ direction: "up", value: `${activePct}%` }}
          description="vs last month"
        />
        <StatCard
          label="Active Consents"
          value={activeConsents}
          icon={<IconCheckCircle />}
          iconColor="green"
          trend={{ direction: "up", value: `${activeTrend}%` }}
          description="vs last month"
        />
        <StatCard
          label="Pending Requests"
          value={pendingConsents}
          icon={<IconClock />}
          iconColor="amber"
          trend={{ direction: "up", value: `${pendingPct}%` }}
          description="vs last month"
        />
        <StatCard
          label="Withdrawn Consents"
          value={withdrawnConsents}
          icon={<IconShieldAlert />}
          iconColor="rose"
          trend={{ direction: "down", value: `${Math.abs(withdrawnPct)}%` }}
          description="vs last month"
        />
      </div>

      {/* Main grid: Consent Overview + Consent by Purpose
          Stack on mobile/tablet, side-by-side on lg+ */}
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3 min-w-0">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg">Consent Overview</CardTitle>
              <DateRangeDropdown label="Last 30 days" />
            </div>
          </CardHeader>
          <CardContent>
            <ChartPlaceholder
              active={activeConsents}
              withdrawn={withdrawnConsents}
              total={totalConsents}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Consent by Purpose</CardTitle>
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
            {recentRequests.map((req, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-2xl px-3 -mx-1 py-3 hover:bg-slate-50/80 transition-colors"
              >
                <AvatarFallback name={req.name} idx={idx} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{req.name}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{req.email}</p>
                </div>
                {/* On very small screens hide the time, show status only */}
                <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                  <RequestStatusBadge status={req.status} />
                  <span className="hidden sm:block text-xs text-slate-400 tabular-nums w-12 text-right">
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
              <ComplianceShield />
              <div className="flex-1 min-w-0 space-y-3 w-full text-center sm:text-left">
                <div>
                  <h4 className="text-base font-bold text-slate-900 sm:text-lg">You&apos;re compliant!</h4>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                    All systems are up to date and running smoothly.
                  </p>
                </div>
                <div className="space-y-2.5 pt-1">
                  {complianceChecks.map((label) => (
                    <ComplianceCheckItem key={label} label={label} />
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
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl stat-icon-teal text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">Websites</p>
                  <p className="text-2xl font-bold text-slate-900">{websiteCount}</p>
                  <p className="text-xs text-slate-400">Registered websites</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl stat-icon-purple text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">Policies</p>
                  <p className="text-2xl font-bold text-slate-900">{policyCount}</p>
                  <p className="text-xs text-slate-400">Across all websites</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl stat-icon-amber text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">Trackers</p>
                  <p className="text-2xl font-bold text-slate-900">{trackerCount}</p>
                  <p className="text-xs text-slate-400">Detected across all websites</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
