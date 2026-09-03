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
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
      <span>
        Page {page} of {totalPages}{" "}
        <span className="text-slate-400">({totalCount.toLocaleString()} events)</span>
      </span>
      <div className="flex items-center gap-2">
        {page > 1 && (
          <Link
            href={pageUrl(page - 1)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={pageUrl(page + 1)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
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

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-description">
          A read-only record of all actions performed in your organisation.
        </p>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <Suspense fallback={<div className="h-10" />}>
        <AuditLogFilters currentQ={q} currentDays={days} totalCount={Number(totalCount)} />
      </Suspense>

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {rows.length === 0 && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-slate-300">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700">No audit events found</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {trimmedQ || days !== "all"
                  ? "Try adjusting your search or date range."
                  : "Audit events will appear here as actions are performed."}
              </p>
            </div>
            {(trimmedQ || days !== "all") && (
              <Link
                href="/dashboard/audit-logs"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Clear filters
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* ── Log table ────────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <Card>
          <div className="table-scroll scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Timestamp", "Actor", "Action", "Resource", "Description", "IP"].map((h) => (
                    <th key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const actor = row.userId ? userMap.get(row.userId) : null;

                  return (
                    <tr key={row.id} className="group transition-colors hover:bg-slate-50/80">

                      {/* Timestamp */}
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <time dateTime={row.createdAt.toISOString()} className="text-xs text-slate-500">
                          {row.createdAt.toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                          <span className="ml-1.5 text-slate-400">
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
                            <p className="font-medium text-slate-800">{actor.name}</p>
                            <p className="text-xs text-slate-400">{actor.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">System</span>
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
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="max-w-xs px-5 py-3.5 text-xs text-slate-500">
                        <p className="line-clamp-2">{row.description ?? "—"}</p>
                      </td>

                      {/* IP */}
                      <td className="px-5 py-3.5">
                        {row.ipAddress ? (
                          <code className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
                            {String(row.ipAddress)}
                          </code>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
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
