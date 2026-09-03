import Link from "next/link";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { requireTenantWebsite } from "@/lib/tenant-website";
import { trackers } from "@/db/schema/trackers";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { categoriseTrackers, type TrackerRule } from "@/lib/sdk/enforcement";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: string }) {
  const variantMap: Record<string, "warning" | "primary" | "purple" | "danger" | "neutral"> = {
    cookie:      "warning",
    pixel:       "primary",
    script:      "purple",
    beacon:      "neutral",
    fingerprint: "danger",
    storage:     "neutral",
    other:       "neutral",
  };
  return (
    <Badge variant={variantMap[type] ?? "neutral"} size="sm" className="capitalize">
      {type}
    </Badge>
  );
}

function TrackerTable({
  rules,
  purposeMap,
  vendorMap,
}: {
  rules: TrackerRule[];
  purposeMap: Map<string, string>;
  vendorMap: Map<string, string>;
}) {
  if (rules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-6 text-center">
        <p className="text-sm text-slate-400">None.</p>
      </div>
    );
  }

  return (
    <Card>
      <div className="table-scroll scrollbar-thin">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {["Tracker", "Type", "Domain / Identifier", "Required purpose", "Vendor", "Enforcement"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map((rule) => (
              <tr key={rule.id} className="group transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{rule.name}</td>
                <td className="px-4 py-3"><TypeBadge type={rule.type} /></td>
                <td className="px-4 py-3 text-slate-500">
                  {rule.domain && (
                    <code className="block font-mono text-xs text-slate-600 group-hover:text-indigo-600 transition-colors">
                      {rule.domain}
                    </code>
                  )}
                  {rule.identifier && (
                    <code className="mt-0.5 block max-w-[200px] truncate font-mono text-xs text-slate-400">
                      {rule.identifier}
                    </code>
                  )}
                  {!rule.domain && !rule.identifier && <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {rule.purposeKey ? (
                    <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {rule.purposeKey}
                    </code>
                  ) : rule.purposeId ? (
                    <span className="text-xs text-slate-400">
                      {purposeMap.get(rule.purposeId) ?? rule.purposeId.slice(0, 8)}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {rule.vendorId ? (
                    vendorMap.get(rule.vendorId) ?? (
                      <span className="text-xs text-slate-400">{rule.vendorId.slice(0, 8)}</span>
                    )
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {rule.isEssential ? (
                    <Badge variant="success" size="sm">Always allowed</Badge>
                  ) : rule.purposeId || rule.vendorId ? (
                    <Badge variant="warning" size="sm">Blocked until consent</Badge>
                  ) : (
                    <Badge variant="danger" size="sm">Always blocked</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stat icons
// ---------------------------------------------------------------------------

function IconAllow() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconBlock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
function IconConsent() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function EnforcementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const website = await requireTenantWebsite(id);

  const trackerRows = await db
    .select({
      id: trackers.id, name: trackers.name, type: trackers.type,
      domain: trackers.domain, identifier: trackers.identifier,
      purposeId: trackers.purposeId, vendorId: trackers.vendorId,
      isEssential: trackers.isEssential, status: trackers.status,
    })
    .from(trackers)
    .where(and(eq(trackers.websiteId, website.id), eq(trackers.status, "active")))
    .orderBy(trackers.name);

  const purposeIds = [...new Set(trackerRows.map((t) => t.purposeId).filter(Boolean) as string[])];
  const vendorIds  = [...new Set(trackerRows.map((t) => t.vendorId).filter(Boolean)  as string[])];

  const [purposeRows, vendorRows] = await Promise.all([
    purposeIds.length > 0
      ? db.select({ id: purposes.id, key: purposes.key, name: purposes.name }).from(purposes).where(inArray(purposes.id, purposeIds))
      : Promise.resolve([]),
    vendorIds.length > 0
      ? db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(inArray(vendors.id, vendorIds))
      : Promise.resolve([]),
  ]);

  const purposeKeyMap  = new Map(purposeRows.map((p) => [p.id, p.key]));
  const purposeNameMap = new Map(purposeRows.map((p) => [p.id, p.name]));
  const vendorMap      = new Map(vendorRows.map((v) => [v.id, v.name]));

  const rules: TrackerRule[] = trackerRows.map((t) => ({
    id: t.id, name: t.name, type: t.type as TrackerRule["type"],
    domain: t.domain, identifier: t.identifier,
    purposeKey: t.purposeId ? (purposeKeyMap.get(t.purposeId) ?? null) : null,
    purposeId: t.purposeId, vendorId: t.vendorId,
    isEssential: t.isEssential, status: t.status,
  }));

  const { essential, consentRequired, unclassified } = categoriseTrackers(rules);

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/websites" className="transition hover:text-slate-900">Websites</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <Link href={`/dashboard/websites/${website.id}`} className="transition hover:text-slate-900">{website.name}</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="text-slate-900">Enforcement</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Tracker Enforcement</h1>
          <p className="page-description">
            How the CMP SDK enforces consent for trackers on{" "}
            <span className="font-medium text-slate-700">{website.domain}</span>.
          </p>
        </div>
        <Link
          href={`/dashboard/websites/${website.id}/installation`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Installation guide
        </Link>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Always allowed"        value={essential.length}       icon={<IconAllow />}   iconColor="green"  description="Essential trackers" />
        <StatCard label="Blocked until consent" value={consentRequired.length} icon={<IconConsent />} iconColor="amber"  description="Require purpose or vendor grant" />
        <StatCard label="Always blocked"        value={unclassified.length}    icon={<IconBlock />}   iconColor="rose"   description="No purpose or vendor assigned" />
      </div>

      {/* Empty state */}
      {rules.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-slate-300">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700">No trackers configured yet</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Add trackers manually or run a scan to detect them.
              </p>
            </div>
            <Link
              href="/dashboard/trackers"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              Go to Trackers
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Tracker sections */}
      {rules.length > 0 && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-1.5 text-base font-semibold text-slate-900">
              Blocked until consent ({consentRequired.length})
            </h2>
            <p className="mb-3 text-sm text-slate-500">
              Blocked by the SDK until the visitor grants the required purpose or vendor consent.
            </p>
            <TrackerTable rules={consentRequired} purposeMap={purposeNameMap} vendorMap={vendorMap} />
          </section>

          <section>
            <h2 className="mb-1.5 text-base font-semibold text-slate-900">
              Always blocked — unclassified ({unclassified.length})
            </h2>
            <p className="mb-3 text-sm text-slate-500">
              No purpose or vendor assigned. Assign a purpose to make them consent-controlled.
            </p>
            <TrackerTable rules={unclassified} purposeMap={purposeNameMap} vendorMap={vendorMap} />
          </section>

          <section>
            <h2 className="mb-1.5 text-base font-semibold text-slate-900">
              Always allowed — essential ({essential.length})
            </h2>
            <p className="mb-3 text-sm text-slate-500">
              Essential trackers are never blocked regardless of consent state.
            </p>
            <TrackerTable rules={essential} purposeMap={purposeNameMap} vendorMap={vendorMap} />
          </section>
        </div>
      )}
    </div>
  );
}
