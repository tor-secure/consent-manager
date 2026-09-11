import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { eq, and, gte, or, ilike, desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { auditLogs } from "@/db/schema/audit-logs";
import { users } from "@/db/schema/users";
import { AuditLogFilters } from "@/components/audit-logs/audit-log-filters";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function actionVariant(action: string): "success" | "primary" | "danger" | "purple" | "warning" | "neutral" {
  const verb = action.split(".")[0]?.toLowerCase() ?? "";
  const map: Record<string, "success" | "primary" | "danger" | "purple" | "warning" | "neutral"> = {
    create:  "success",
    update:  "primary",
    delete:  "danger",
    login:   "purple",
    logout:  "neutral",
    publish: "warning",
    archive: "warning",
    revoke:  "danger",
    invite:  "primary",
    connect: "success",
  };
  return map[verb] ?? "neutral";
}

function PaginationBar({
  page, totalCount, q, days,
}: {
  page: number; totalCount: number; q: string; days: string;
}) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (totalPages <= 1) return null;

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (days !== "all") params.set("days", days);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/dashboard/audit-logs${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-sm text-[var(--muted-foreground)]">
      <span>
        Page {page} of {totalPages}{" "}
        <span className="text-[var(--muted-foreground)]">({totalCount.toLocaleString()} events)</span>
      </span>
      <div className="flex items-center gap-2">
        {page > 1 && (
          <Link
            href={pageUrl(page - 1)}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--muted)]"
          >
            ← Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={pageUrl(page + 1)}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--muted)]"
          >
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; days?: string; page?: string }>;
}) {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!localOrg) return null;

  const { q = "", days = "30", page: pageStr = "1" } = await searchParams;
  const page   = Math.max(1, parseInt(pageStr, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Build WHERE
  const conditions = [eq(auditLogs.organizationId, localOrg.id)];
  if (days !== "all") {
    const n = parseInt(days, 10);
    if (!isNaN(n) && n > 0) {
      const since = new Date();
      since.setDate(since.getDate() - n);
      conditions.push(gte(auditLogs.createdAt, since));
    }
  }
  const trimmedQ = q.trim();
  if (trimmedQ) {
    const pat = `%${trimmedQ}%`;
    conditions.push(
      or(ilike(auditLogs.action, pat), ilike(auditLogs.resourceType, pat), ilike(auditLogs.description, pat))!,
    );
  }
  const whereClause = and(...conditions);

  const [totalCount, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(auditLogs).where(whereClause)
      .then((r) => r[0]?.count ?? 0),
    db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      description: auditLogs.description,
      metadata: auditLogs.metadata,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    })
      .from(auditLogs).where(whereClause).orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE).offset(offset),
  ]);

  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean) as string[])];
  const userRows = userIds.length > 0
    ? await db.select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(userIds.length === 1
          ? eq(users.id, userIds[0])
          : sql`${users.id} = ANY(${sql.raw(`ARRAY[${userIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`)
    : [];
  const userMap = new Map(userRows.map((u) => [u.id, u]));

  return (
    <div className="page-wrap space-y-6">

      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/governance">Security & Governance</SectionEyebrow>}
        title="Audit Logs"
        description="A read-only record of all actions performed in your organisation."
      />

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <Suspense fallback={<div className="h-10" />}>
        <AuditLogFilters currentQ={q} currentDays={days} totalCount={Number(totalCount)} />
      </Suspense>

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {rows.length === 0 && (
        <EmptyState
          title="No audit events found"
          description={
            trimmedQ || days !== "all"
              ? "Try adjusting your search or date range."
              : "Audit events will appear here as actions are performed."
          }
          actionLabel={trimmedQ || days !== "all" ? "Clear filters" : undefined}
          actionHref={trimmedQ || days !== "all" ? "/dashboard/audit-logs" : undefined}
        />
      )}

      {/* ── Log table ────────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <Card>
          <div className="table-scroll scrollbar-thin">
            <table className="data-table min-w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                  {["Timestamp", "Actor", "Action", "Resource", "Description", "IP"].map((h) => (
                    <th key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((row) => {
                  const actor = row.userId ? userMap.get(row.userId) : null;

                  return (
                    <tr key={row.id} className="group transition-colors hover:bg-[var(--muted)]/80">

                      {/* Timestamp */}
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <time dateTime={row.createdAt.toISOString()} className="text-xs text-[var(--muted-foreground)]">
                          {row.createdAt.toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                          <span className="ml-1.5 text-[var(--muted-foreground)]">
                            {row.createdAt.toLocaleTimeString("en-GB", {
                              hour: "2-digit", minute: "2-digit", second: "2-digit",
                            })}
                          </span>
                        </time>
                      </td>

                      {/* Actor */}
                      <td className="px-5 py-3.5">
                        {actor ? (
                          <div>
                            <p className="font-medium text-[var(--foreground)]">{actor.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{actor.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">System</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5">
                        <Badge variant={actionVariant(row.action)} size="sm"
                          className="font-mono">
                          {row.action}
                        </Badge>
                      </td>

                      {/* Resource */}
                      <td className="px-5 py-3.5">
                        {row.resourceType ? (
                          <Badge variant="neutral" size="sm" className="font-mono">
                            {row.resourceType}
                          </Badge>
                        ) : (
                          <span className="text-[var(--border)] text-xs">—</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="max-w-xs px-5 py-3.5 text-xs text-[var(--muted-foreground)]">
                        <p className="line-clamp-2">{row.description ?? "—"}</p>
                      </td>

                      {/* IP */}
                      <td className="px-5 py-3.5">
                        {row.ipAddress ? (
                          <code className="rounded-lg bg-[var(--secondary)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                            {String(row.ipAddress)}
                          </code>
                        ) : (
                          <span className="text-[var(--border)] text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PaginationBar page={page} totalCount={Number(totalCount)} q={q} days={days} />
        </Card>
      )}
    </div>
  );
}
