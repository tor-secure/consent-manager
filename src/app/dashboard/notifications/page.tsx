import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { notifications } from "@/db/schema/notifications";
import { NotificationActions } from "@/components/notifications/notification-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function priorityVariant(priority: string): "danger" | "warning" | "neutral" | undefined {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  return undefined; // don't render low/normal
}

function typeVariant(type: string): "primary" | "purple" | "success" | "warning" | "danger" | "neutral" {
  const label = type.split(".")[0];
  const map: Record<string, "primary" | "purple" | "success" | "warning" | "danger" | "neutral"> = {
    policy:   "primary",
    scan:     "purple",
    website:  "primary",
    consent:  "success",
    billing:  "warning",
    system:   "neutral",
    security: "danger",
  };
  return map[label] ?? "neutral";
}

function resourceLink(resourceType: string | null, resourceId: string | null): string | null {
  if (!resourceType || !resourceId) return null;
  const paths: Record<string, string> = {
    policy: `/dashboard/policies/${resourceId}`,
    consent_policy: `/dashboard/policies/${resourceId}`,
    website: `/dashboard/websites/${resourceId}`,
    scan: `/dashboard/scanner`,
    privacy_finding: `/dashboard/monitoring/${resourceId}`,
    vendor: `/dashboard/vendors`,
    purpose: `/dashboard/purposes`,
  };
  return paths[resourceType.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function NotificationsPage() {
  const { orgId, userId: clerkUserId } = await auth();
  if (!orgId || !clerkUserId) return null;

  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!organization) return null;

  const [localUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!localUser) return null;

  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, organization.id),
        sql`(${notifications.userId} = ${localUser.id} OR ${notifications.userId} IS NULL)`,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(200);

  const unreadCount = rows.filter((r) => !r.isRead).length;

  return (
    <div className="page-wrap space-y-6">

      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="danger" size="sm">
                {unreadCount} unread
              </Badge>
            )}
          </span>
        }
        description="Updates and alerts for your organisation."
        action={unreadCount > 0 ? <NotificationActions hasUnread={true} /> : undefined}
      />

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {rows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--muted)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-[var(--border)]">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--foreground)]">No notifications yet</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Updates will appear here as actions are performed in your organisation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Notification list ────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((n) => {
            const link = resourceLink(n.resourceType, n.resourceId);
            const pv = priorityVariant(n.priority);
            const typeLabel = n.type.split(".")[0];

            return (
              <div
                key={n.id}
                className={`rounded-2xl border bg-[var(--card)] transition ${
                  !n.isRead
                    ? "border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[var(--info-soft)]/30"
                    : "border-[var(--border)]"
                }`}
              >
                <div className="flex items-start gap-4 px-5 py-4">
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0 w-2">
                    {!n.isRead && (
                      <span className="block h-2 w-2 rounded-full bg-[var(--primary)]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold ${n.isRead ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]"}`}>
                        {n.title}
                      </p>
                      <Badge variant={typeVariant(n.type)} size="sm" className="capitalize">
                        {typeLabel}
                      </Badge>
                      {pv && (
                        <Badge variant={pv} size="sm" className="capitalize">
                          {n.priority}
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{n.message}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <time dateTime={n.createdAt.toISOString()} className="text-xs text-[var(--muted-foreground)]">
                        {n.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}{" "}
                        {n.createdAt.toLocaleTimeString("en-GB", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </time>

                      {link && (
                        <Link
                          href={link}
                          className="text-xs font-medium text-[var(--primary)] transition hover:text-[var(--primary)]"
                        >
                          View {n.resourceType?.replace(/_/g, " ")} →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Per-item mark as read */}
                  {!n.isRead && (
                    <div className="shrink-0">
                      <NotificationActions notificationId={n.id} hasUnread={false} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
