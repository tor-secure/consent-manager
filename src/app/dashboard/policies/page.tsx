import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconPolicy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7.5 2v11M2 7.5h11" />
    </svg>
  );
}

function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      className="text-slate-300">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status badge using the shared Badge primitive
// ---------------------------------------------------------------------------

function PolicyStatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "success" | "warning" | "neutral"> = {
    active:   "success",
    draft:    "neutral",
    archived: "warning",
  };
  const label: Record<string, string> = {
    active: "Active", draft: "Draft", archived: "Archived",
  };
  return (
    <Badge variant={variantMap[status] ?? "neutral"} size="sm">
      {label[status] ?? status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PoliciesPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!localOrg) return null;

  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id))
    .orderBy(websites.name);

  const websiteIds = orgWebsites.map((w) => w.id);
  const websiteMap = new Map(orgWebsites.map((w) => [w.id, w]));

  const policies =
    websiteIds.length > 0
      ? await db
          .select()
          .from(consentPolicies)
          .where(inArray(consentPolicies.websiteId, websiteIds))
          .orderBy(consentPolicies.createdAt)
      : [];

  const policyIds = policies.map((p) => p.id);
  const versions =
    policyIds.length > 0
      ? await db
          .select({
            policyId: consentPolicyVersions.policyId,
            version: consentPolicyVersions.version,
            isPublished: consentPolicyVersions.isPublished,
          })
          .from(consentPolicyVersions)
          .where(inArray(consentPolicyVersions.policyId, policyIds))
      : [];

  const versionMap = new Map<string, { latestVersion: number; hasPublished: boolean }>();
  for (const v of versions) {
    const existing = versionMap.get(v.policyId);
    versionMap.set(v.policyId, {
      latestVersion: Math.max(v.version, existing?.latestVersion ?? 0),
      hasPublished: (existing?.hasPublished ?? false) || v.isPublished,
    });
  }

  const total      = policies.length;
  const active     = policies.filter((p) => p.status === "active").length;
  const draft      = policies.filter((p) => p.status === "draft").length;
  const published  = policies.filter((p) => versionMap.get(p.id)?.hasPublished).length;

  return (
    <div className="px-5 py-8 md:px-8 md:py-10 space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Consent Policies
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All consent policies across your websites.
          </p>
        </div>
        {orgWebsites.length > 0 && (
          <Link
            href="/dashboard/policies/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            <IconPlus />
            Create policy
          </Link>
        )}
      </div>

      {/* ── Summary pills ───────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total",     value: total,     dot: "bg-slate-400"   },
            { label: "Active",    value: active,    dot: "bg-emerald-500" },
            { label: "Draft",     value: draft,     dot: "bg-amber-400"   },
            { label: "Published", value: published, dot: "bg-indigo-500"  },
          ].map((s) => (
            <div key={s.label}
              className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm soft-shadow">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className="font-semibold text-slate-800">{s.value}</span>
              <span className="text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── No websites ─────────────────────────────────────────────────── */}
      {orgWebsites.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
              <IconEmpty />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700">No websites yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Add a website before creating consent policies.
              </p>
            </div>
            <Link href="/dashboard/websites/new"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
              Add a website
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── No policies ─────────────────────────────────────────────────── */}
      {orgWebsites.length > 0 && policies.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
              <IconEmpty />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700">No policies yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Create your first consent policy to start collecting visitor consent.
              </p>
            </div>
            <Link href="/dashboard/policies/new"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
              <IconPlus />
              Create policy
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── Policy table ────────────────────────────────────────────────── */}
      {policies.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Policy", "Website", "Status", "Version", "Default", "Created"].map((h) => (
                    <th key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((policy) => {
                  const site = websiteMap.get(policy.websiteId);
                  const ver  = versionMap.get(policy.id);
                  return (
                    <tr key={policy.id} className="group transition-colors hover:bg-slate-50/80">
                      {/* Policy name */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <IconPolicy />
                          </div>
                          <div>
                            <Link
                              href={`/dashboard/policies/${policy.id}`}
                              className="font-medium text-slate-900 transition-colors group-hover:text-indigo-600">
                              {policy.name}
                            </Link>
                            {policy.description && (
                              <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                                {policy.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Website */}
                      <td className="px-5 py-4">
                        {site ? (
                          <Link href={`/dashboard/websites/${site.id}`}
                            className="text-slate-700 transition-colors hover:text-indigo-600">
                            <p className="font-medium">{site.name}</p>
                            <p className="text-xs text-slate-400">{site.domain}</p>
                          </Link>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      {/* Status */}
                      <td className="px-5 py-4">
                        <PolicyStatusBadge status={policy.status} />
                      </td>
                      {/* Version */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral" size="sm">
                            v{ver?.latestVersion ?? 1}
                          </Badge>
                          {ver?.hasPublished && (
                            <Badge variant="success" size="sm">Published</Badge>
                          )}
                        </div>
                      </td>
                      {/* Default */}
                      <td className="px-5 py-4">
                        {policy.isDefault
                          ? <Badge variant="primary" size="sm">Default</Badge>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      {/* Created */}
                      <td className="px-5 py-4 text-slate-500">
                        {policy.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
