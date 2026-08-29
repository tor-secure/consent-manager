import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { consentPolicies } from "@/db/schema/consent-policies";
import { scans } from "@/db/schema/scans";
import { TrackerList, type TrackerRow } from "@/components/trackers/tracker-list";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconPolicy() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
function IconTracker() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconScanner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Detail row inside info cards
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!localOrg) return null;

  const [website] = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.organizationId, localOrg.id)))
    .limit(1);
  if (!website) notFound();

  // Parallel data fetches
  const [trackerRawRows, policyRows, scanRows] = await Promise.all([
    db
      .select({
        id: trackers.id,
        vendorId: trackers.vendorId,
        purposeId: trackers.purposeId,
        name: trackers.name,
        type: trackers.type,
        domain: trackers.domain,
        identifier: trackers.identifier,
        status: trackers.status,
        isEssential: trackers.isEssential,
        detectionMethod: trackers.detectionMethod,
        lastSeenAt: trackers.lastSeenAt,
        firstSeenAt: trackers.firstSeenAt,
      })
      .from(trackers)
      .where(eq(trackers.websiteId, website.id))
      .orderBy(trackers.name),

    db
      .select({ id: consentPolicies.id, name: consentPolicies.name, status: consentPolicies.status })
      .from(consentPolicies)
      .where(eq(consentPolicies.websiteId, website.id)),

    db
      .select({ id: scans.id, status: scans.status, createdAt: scans.createdAt })
      .from(scans)
      .where(eq(scans.websiteId, website.id))
      .orderBy(scans.createdAt),
  ]);

  // Resolve vendor + purpose names
  const vendorIds  = [...new Set(trackerRawRows.map((t) => t.vendorId).filter(Boolean)  as string[])];
  const purposeIds = [...new Set(trackerRawRows.map((t) => t.purposeId).filter(Boolean) as string[])];

  const [vendorRows, purposeRows] = await Promise.all([
    vendorIds.length > 0
      ? db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(inArray(vendors.id, vendorIds))
      : Promise.resolve([]),
    purposeIds.length > 0
      ? db.select({ id: purposes.id, name: purposes.name }).from(purposes).where(inArray(purposes.id, purposeIds))
      : Promise.resolve([]),
  ]);

  const vendorMap  = new Map(vendorRows.map((v) => [v.id, v.name]));
  const purposeMap = new Map(purposeRows.map((p) => [p.id, p.name]));

  const trackerRows: TrackerRow[] = trackerRawRows.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    domain: t.domain,
    identifier: t.identifier,
    status: t.status,
    isEssential: t.isEssential,
    detectionMethod: t.detectionMethod,
    lastSeenAt: t.lastSeenAt,
    firstSeenAt: t.firstSeenAt,
    vendorName:  t.vendorId  ? (vendorMap.get(t.vendorId)   ?? null) : null,
    purposeName: t.purposeId ? (purposeMap.get(t.purposeId) ?? null) : null,
  }));

  const policyCount    = policyRows.length;
  const trackerCount   = trackerRows.length;
  const scanCount      = scanRows.length;
  const lastScan       = scanRows[scanRows.length - 1] ?? null;
  const completedScans = scanRows.filter((s) => s.status === "completed").length;

  // Status badge variant
  const statusVariant: Record<string, "success" | "danger" | "neutral"> = {
    active:    "success",
    inactive:  "neutral",
    suspended: "danger",
  };

  return (
    <div className="px-5 py-8 md:px-8 md:py-10 space-y-8">

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/websites" className="transition hover:text-slate-900">
          Websites
        </Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span className="text-slate-900">{website.name}</span>
      </nav>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Globe icon tile */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl stat-icon-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {website.name}
              </h1>
              <Badge variant={statusVariant[website.status] ?? "neutral"} size="sm" className="capitalize">
                {website.status}
              </Badge>
              {website.verified && (
                <Badge variant="success" size="sm">Verified</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">{website.domain}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/websites/${website.id}/enforcement`}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Enforcement
          </Link>
          <Link
            href={`/dashboard/websites/${website.id}/settings`}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </Link>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Consent Policies"
          value={policyCount}
          icon={<IconPolicy />}
          iconColor="blue"
          description={policyCount === 0 ? "No policies yet" : undefined}
        />
        <StatCard
          label="Trackers Detected"
          value={trackerCount}
          icon={<IconTracker />}
          iconColor="purple"
          description={trackerCount === 0 ? "Run a scan to detect" : undefined}
        />
        <StatCard
          label="Scanner Runs"
          value={scanCount}
          icon={<IconScanner />}
          iconColor="green"
          description={
            lastScan
              ? `Last: ${lastScan.status}`
              : completedScans > 0
                ? `${completedScans} completed`
                : "No scans yet"
          }
        />
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Website details ─────────────────────────────────────────────── */}
        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Website details</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Configuration and identity information for this website.
            </p>
          </div>
          <div className="px-6">
            <dl className="divide-y divide-slate-100">
              <InfoRow label="Domain" value={
                <span className="font-mono text-xs text-slate-700">{website.domain}</span>
              } />
              <InfoRow label="Environment" value={
                <Badge variant="neutral" size="sm" className="capitalize">
                  {website.environment}
                </Badge>
              } />
              <InfoRow label="Default language" value={
                <Badge variant="neutral" size="sm">{website.defaultLanguage.toUpperCase()}</Badge>
              } />
              <InfoRow label="Default region" value={
                website.defaultRegion
                  ? <Badge variant="neutral" size="sm">{website.defaultRegion}</Badge>
                  : <span className="text-slate-400">—</span>
              } />
              <InfoRow label="Verification" value={
                website.verified
                  ? <Badge variant="success" size="sm">Verified</Badge>
                  : <Badge variant="neutral" size="sm">Not verified</Badge>
              } />
              <InfoRow label="Site key" value={
                <code className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                  {website.siteKey}
                </code>
              } />
              <InfoRow label="Added" value={
                <span className="text-slate-500">
                  {website.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              } />
            </dl>
          </div>
        </Card>

        {/* ── SDK Installation ─────────────────────────────────────────────── */}
        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">SDK Installation</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Embed the CMP banner on your website using the JavaScript SDK.
            </p>
          </div>
          <CardContent className="space-y-4">
            {/* Site key display */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Site key
                </p>
                <code className="mt-0.5 block truncate font-mono text-sm text-slate-700">
                  {website.siteKey}
                </code>
              </div>
              <div className="ml-3 shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-slate-500">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </div>
            </div>

            {/* Install hint */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-xs font-medium text-indigo-700">Quick install</p>
              <code className="mt-1 block text-xs text-indigo-600 leading-relaxed break-all">
                {`<script src="/api/sdk/script?siteKey=${website.siteKey}" async></script>`}
              </code>
            </div>

            <Link
              href={`/dashboard/websites/${website.id}/installation`}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              View installation guide
            </Link>
          </CardContent>
        </Card>

        {/* ── Consent Policies ─────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Consent Policies</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Policies define what visitors are asked to accept.
              </p>
            </div>
            {policyRows.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                {policyRows.length}
              </span>
            )}
          </div>
          <CardContent className="pt-2">
            {policyRows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    className="text-slate-300">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">No policies yet</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Create a consent policy to start collecting visitor consent.
                  </p>
                </div>
                <Link
                  href={`/dashboard/policies/new?websiteId=${website.id}`}
                  className="inline-flex items-center gap-1 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Create first policy
                </Link>
              </div>
            ) : (
              <div>
                <ul role="list" className="divide-y divide-slate-100">
                  {policyRows.map((p) => (
                    <li key={p.id}
                      className="flex items-center justify-between py-3 text-sm group">
                      <Link
                        href={`/dashboard/policies/${p.id}`}
                        className="font-medium text-slate-800 transition-colors group-hover:text-indigo-600"
                      >
                        {p.name}
                      </Link>
                      <Badge
                        variant={p.status === "active" ? "success" : "neutral"}
                        size="sm"
                        className="capitalize"
                      >
                        {p.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 border-t border-slate-100 pt-3">
                  <Link
                    href={`/dashboard/policies/new?websiteId=${website.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
                  >
                    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M7.5 2v11M2 7.5h11" />
                    </svg>
                    Add policy
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Trackers ─────────────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Trackers</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Cookies and tracking technologies detected on this website.
              </p>
            </div>
            {trackerCount > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                {trackerCount}
              </span>
            )}
          </div>
          <CardContent className="pt-2">
            <TrackerList trackers={trackerRows} showWebsite={false} />
          </CardContent>
        </Card>

        {/* ── Scanner ──────────────────────────────────────────────────────── */}
        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Scanner</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Automatically scan your website for cookies and trackers.
            </p>
          </div>
          <CardContent>
            {scanCount === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    className="text-slate-300">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">No scans yet</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Run a scan to detect cookies and tracking technologies.
                  </p>
                </div>
                <Link
                  href="/dashboard/scanner"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Go to scanner
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Total runs",  value: scanCount      },
                    { label: "Completed",   value: completedScans },
                    { label: "Failed",      value: scanRows.filter((s) => s.status === "failed").length },
                  ].map((s) => (
                    <div key={s.label}
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <span className="font-semibold text-slate-800">{s.value}</span>
                      <span className="text-slate-500">{s.label}</span>
                    </div>
                  ))}
                </div>
                {lastScan && (
                  <p className="text-xs text-slate-400">
                    Last scan status:{" "}
                    <Badge
                      variant={
                        lastScan.status === "completed" ? "success"
                          : lastScan.status === "failed" ? "danger" : "primary"
                      }
                      size="sm"
                      className="capitalize"
                    >
                      {lastScan.status}
                    </Badge>
                  </p>
                )}
                <Link
                  href="/dashboard/scanner"
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  View all scans →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Integrations ─────────────────────────────────────────────────── */}
        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Integrations</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Connect third-party tools and tag managers.
            </p>
          </div>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="text-slate-300">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Manage integrations</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Connect analytics, CRMs, and marketing tools.
                </p>
              </div>
              <Link
                href="/dashboard/integrations"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                View integrations →
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
