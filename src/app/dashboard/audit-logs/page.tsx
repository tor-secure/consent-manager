import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { eq, and, gte, or, ilike, desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { auditLogs } from "@/db/schema/audit-logs";
import { users } from "@/db/schema/users";
import { AuditLogFilters } from "@/components/audit-logs/audit-log-filters";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ActionBadge({ action }: { action: string }) {
  // Colour by verb prefix.
  const verb = action.split(".")[0]?.toLowerCase() ?? "";
  const styles: Record<string, string> = {
    create: "bg-green-50 text-green-700",
    update: "bg-blue-50 text-blue-700",
    delete: "bg-red-50 text-red-700",
    login: "bg-purple-50 text-purple-700",
    logout: "bg-neutral-100 text-neutral-600",
    publish: "bg-amber-50 text-amber-700",
    archive: "bg-yellow-50 text-yellow-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-xs ${styles[verb] ?? "bg-neutral-100 text-neutral-600"}`}
    >
      {action}
    </span>
  );
}

function ResourceTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-neutral-300 text-xs">—</span>;
  return (
    <span className="inline-flex items-center rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-600">
      {type}
    </span>
  );
}

function PaginationBar({
  page,
  totalCount,
  q,
  days,
}: {
  page: number;
  totalCount: number;
  q: string;
  days: string;
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
    <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
      <span>
        Page {page} of {totalPages} ({totalCount.toLocaleString()} events)
      </span>
      <div className="flex items-center gap-2">
        {page > 1 && (
          <Link
            href={pageUrl(page - 1)}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={pageUrl(page + 1)}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — server component
// Auth + bootstrap guaranteed by the dashboard layout.
// All filtering happens server-side; URL params drive the query.
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
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // ---------------------------------------------------------------------------
  // Build WHERE clause
  // ---------------------------------------------------------------------------

  const conditions = [eq(auditLogs.organizationId, localOrg.id)];

  // Date range filter.
  if (days !== "all") {
    const daysNum = parseInt(days, 10);
    if (!isNaN(daysNum) && daysNum > 0) {
      const since = new Date();
      since.setDate(since.getDate() - daysNum);
      conditions.push(gte(auditLogs.createdAt, since));
    }
  }

  // Search filter — matches action or resourceType.
  const trimmedQ = q.trim();
  if (trimmedQ) {
    const pattern = `%${trimmedQ}%`;
    conditions.push(
      or(
        ilike(auditLogs.action, pattern),
        ilike(auditLogs.resourceType, pattern),
        ilike(auditLogs.description, pattern),
      )!,
    );
  }

  const whereClause = and(...conditions);

  // ---------------------------------------------------------------------------
  // Fetch total count and page of rows in parallel.
  // ---------------------------------------------------------------------------

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause)
      .then((r) => r[0]?.count ?? 0),

    db
      .select({
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
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
  ]);

  const totalCount = Number(countResult);

  // Resolve user names for the rows on this page.
  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean) as string[])];

  const userRows =
    userIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(
            userIds.length === 1
              ? eq(users.id, userIds[0])
              : sql`${users.id} = ANY(${sql.raw(`ARRAY[${userIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`,
          )
      : [];

  const userMap = new Map(userRows.map((u) => [u.id, u]));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-neutral-500">
          A read-only record of all actions performed in your organization.
        </p>
      </div>

      {/* Filters — client island, wrapped in Suspense for useSearchParams */}
      <Suspense fallback={<div className="mb-6 h-10" />}>
        <AuditLogFilters
          currentQ={q}
          currentDays={days}
          totalCount={totalCount}
        />
      </Suspense>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No audit events found</p>
          <p className="mt-1 text-sm text-neutral-400">
            {trimmedQ || days !== "all"
              ? "Try adjusting your search or date range."
              : "Audit events will appear here as actions are performed."}
          </p>
          {(trimmedQ || days !== "all") && (
            <Link
              href="/dashboard/audit-logs"
              className="mt-4 inline-block text-sm text-neutral-900 underline underline-offset-2"
            >
              Clear filters
            </Link>
          )}
        </div>
      )}

      {/* Log table */}
      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full divide-y text-sm">
              <thead>
                <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const actor = row.userId ? userMap.get(row.userId) : null;

                  return (
                    <tr key={row.id} className="transition hover:bg-neutral-50">
                      {/* Timestamp */}
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">
                        <time dateTime={row.createdAt.toISOString()}>
                          {row.createdAt.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          <span className="ml-1.5 text-neutral-400">
                            {row.createdAt.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </time>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3">
                        {actor ? (
                          <div>
                            <p className="font-medium text-neutral-900">{actor.name}</p>
                            <p className="text-xs text-neutral-400">{actor.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">System</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <ActionBadge action={row.action} />
                      </td>

                      {/* Resource */}
                      <td className="px-4 py-3">
                        <ResourceTypeBadge type={row.resourceType} />
                        {row.resourceId && (
                          <p className="mt-0.5 font-mono text-xs text-neutral-400">
                            {row.resourceId.slice(0, 8)}…
                          </p>
                        )}
                      </td>

                      {/* Description */}
                      <td className="max-w-xs px-4 py-3 text-neutral-600">
                        <p className="truncate">{row.description ?? "—"}</p>
                        {/* Show non-empty metadata as a collapsed summary */}
                        {row.metadata && Object.keys(row.metadata).length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-neutral-400">
                            {Object.keys(row.metadata)
                              .slice(0, 3)
                              .map((k) => `${k}: ${String(row.metadata[k]).slice(0, 20)}`)
                              .join(" · ")}
                          </p>
                        )}
                      </td>

                      {/* IP */}
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-500">
                        {row.ipAddress ?? <span className="text-neutral-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PaginationBar page={page} totalCount={totalCount} q={q} days={days} />
        </>
      )}
    </div>
  );
}
