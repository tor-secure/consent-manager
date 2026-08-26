import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { notifications } from "@/db/schema/notifications";
import { NotificationActions } from "@/components/notifications/notification-actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    high: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20",
    normal: "bg-neutral-100 text-neutral-600",
    low: "bg-neutral-50 text-neutral-400",
  };
  if (priority === "normal" || priority === "low") return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[priority] ?? styles.normal}`}
    >
      {priority}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  // Shorten dot-namespaced types: "policy.published" → "policy"
  const label = type.split(".")[0];
  const styles: Record<string, string> = {
    policy: "bg-blue-50 text-blue-700",
    scan: "bg-purple-50 text-purple-700",
    website: "bg-teal-50 text-teal-700",
    consent: "bg-green-50 text-green-700",
    billing: "bg-amber-50 text-amber-700",
    system: "bg-neutral-100 text-neutral-600",
    security: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[label] ?? styles.system}`}
    >
      {type}
    </span>
  );
}

// Map resourceType to a dashboard path prefix.
function resourceLink(
  resourceType: string | null,
  resourceId: string | null,
): string | null {
  if (!resourceType || !resourceId) return null;
  const paths: Record<string, string> = {
    policy: `/dashboard/policies/${resourceId}`,
    consent_policy: `/dashboard/policies/${resourceId}`,
    website: `/dashboard/websites/${resourceId}`,
    scan: `/dashboard/trackers`,
    vendor: `/dashboard/vendors`,
    purpose: `/dashboard/purposes`,
  };
  return paths[resourceType.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Page — server component
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

  // Fetch all notifications for this user (or org-wide) ordered newest first.
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
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-neutral-900">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Updates and alerts for your organization.
          </p>
        </div>

        {unreadCount > 0 && (
          <NotificationActions hasUnread={true} />
        )}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">
            No notifications yet
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Notifications will appear here when there are updates for your
            organization.
          </p>
        </div>
      )}

      {/* Notification list */}
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((n) => {
            const link = resourceLink(n.resourceType, n.resourceId);

            return (
              <div
                key={n.id}
                className={`rounded-lg border bg-white p-4 transition ${
                  !n.isRead ? "border-blue-200 bg-blue-50/30" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {!n.isRead ? (
                      <span className="block h-2 w-2 rounded-full bg-blue-500" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-transparent" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          n.isRead ? "text-neutral-700" : "text-neutral-900"
                        }`}
                      >
                        {n.title}
                      </p>
                      <TypeBadge type={n.type} />
                      <PriorityBadge priority={n.priority} />
                    </div>

                    <p className="mt-1 text-sm text-neutral-500">{n.message}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <time
                        dateTime={n.createdAt.toISOString()}
                        className="text-xs text-neutral-400"
                      >
                        {n.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        {n.createdAt.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>

                      {link && (
                        <Link
                          href={link}
                          className="text-xs font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
                        >
                          View {n.resourceType?.replace(/_/g, " ")}
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Per-item mark as read */}
                  {!n.isRead && (
                    <NotificationActions notificationId={n.id} hasUnread={false} />
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
