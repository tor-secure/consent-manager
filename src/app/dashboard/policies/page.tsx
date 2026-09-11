import Link from "next/link";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader, PageHeaderLink } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IconText } from "@/components/ui/icon-text";

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
  const { organization: localOrg } = await requireDashboardContext();

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
          .select({
            id: consentPolicies.id,
            websiteId: consentPolicies.websiteId,
            name: consentPolicies.name,
            description: consentPolicies.description,
            status: consentPolicies.status,
            isDefault: consentPolicies.isDefault,
            createdAt: consentPolicies.createdAt,
          })
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
    <div className="page-wrap space-y-6 sm:space-y-8">

      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/consent-management">Consent Management</SectionEyebrow>}
        title="Consent Policies"
        description="All consent policies across your websites."
        action={
          orgWebsites.length > 0 ? (
            <PageHeaderLink href="/dashboard/policies/new">
              <IconPlus />
              Create policy
            </PageHeaderLink>
          ) : undefined
        }
      />

      {/* ── Summary pills ───────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total",     value: total,     dot: "bg-[var(--muted-foreground)]"   },
            { label: "Active",    value: active,    dot: "bg-[var(--success)]" },
            { label: "Draft",     value: draft,     dot: "bg-[var(--warning)]"   },
            { label: "Published", value: published, dot: "bg-[var(--primary)]"  },
          ].map((s) => (
            <div key={s.label}
              className="flex items-center gap-2 rounded-2xl bg-[var(--card)] px-4 py-2 text-sm soft-shadow">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className="font-semibold text-[var(--foreground)]">{s.value}</span>
              <span className="text-[var(--muted-foreground)]">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {orgWebsites.length === 0 && (
        <EmptyState
          title="No websites yet"
          description="Add a website before creating consent policies."
          actionLabel="Add a website"
          actionHref="/dashboard/websites/new"
        />
      )}

      {orgWebsites.length > 0 && policies.length === 0 && (
        <EmptyState
          title="No policies yet"
          description="Create your first consent policy to start collecting visitor consent."
          actionLabel="Create policy"
          actionHref="/dashboard/policies/new"
        />
      )}

      {/* ── Policy table ────────────────────────────────────────────────── */}
      {policies.length > 0 && (
        <Card>
          <div className="table-scroll scrollbar-thin">
            <table className="data-table min-w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                  {["Policy", "Website", "Status", "Version", "Default", "Created"].map((h) => (
                    <th key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {policies.map((policy) => {
                  const site = websiteMap.get(policy.websiteId);
                  const ver  = versionMap.get(policy.id);
                  return (
                    <tr key={policy.id} className="group transition-colors hover:bg-[var(--muted)]/80">
                      {/* Policy name */}
                      <td className="px-5 py-4">
                        <IconText
                          size="sm"
                          icon={<IconPolicy />}
                          iconClassName="bg-[var(--info-soft)] text-[var(--primary)]"
                          title={
                            <Link
                              href={`/dashboard/policies/${policy.id}`}
                              className="font-medium leading-snug text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]"
                            >
                              {policy.name}
                            </Link>
                          }
                          description={
                            policy.description ? (
                              <p className="mt-0.5 max-w-xs truncate text-xs text-[var(--muted-foreground)]">
                                {policy.description}
                              </p>
                            ) : undefined
                          }
                        />
                      </td>
                      {/* Website */}
                      <td className="px-5 py-4">
                        {site ? (
                          <Link href={`/dashboard/websites/${site.id}`}
                            className="text-[var(--secondary-foreground)] transition-colors hover:text-[var(--primary)]">
                            <p className="font-medium">{site.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{site.domain}</p>
                          </Link>
                        ) : <span className="text-[var(--muted-foreground)]">—</span>}
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
                          : <span className="text-[var(--muted-foreground)]">—</span>}
                      </td>
                      {/* Created */}
                      <td className="px-5 py-4 text-[var(--muted-foreground)]">
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
