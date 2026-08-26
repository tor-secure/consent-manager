import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import {
  OrganizationSettingsForm,
  type OrgSettingsData,
} from "@/components/settings/organization-settings-form";

// Roles that may edit settings.
const EDIT_ROLES = ["Owner", "Admin"];

// Auth + bootstrap guaranteed by the dashboard layout.
export default async function OrganizationSettingsPage() {
  const { orgId, userId: clerkUserId } = await auth();
  if (!orgId || !clerkUserId) return null;

  const [organization] = await db
    .select()
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

  // Resolve membership + role to determine edit permission.
  const [membership] = await db
    .select({ roleName: roles.name })
    .from(memberships)
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(
      and(
        eq(memberships.organizationId, organization.id),
        eq(memberships.userId, localUser.id),
        eq(memberships.status, "active"),
      ),
    )
    .limit(1);

  const canEdit = EDIT_ROLES.includes(membership?.roleName ?? "");

  const settingsData: OrgSettingsData = {
    name: organization.name,
    description: organization.description,
    logoUrl: organization.logoUrl,
    timezone: organization.timezone,
    defaultLanguage: organization.defaultLanguage,
    defaultRegion: organization.defaultRegion,
    onboardingCompleted: organization.onboardingCompleted,
  };

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Organization settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage the configuration for{" "}
          <span className="font-medium text-neutral-700">{organization.name}</span>.
        </p>
      </div>

      {/* Read-only identity block */}
      <div className="mb-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">
          Identity
        </h2>
        <dl className="divide-y text-sm">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-neutral-500">Organization ID</dt>
            <dd>
              <code className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700">
                {organization.id}
              </code>
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-neutral-500">Slug</dt>
            <dd>
              <code className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700">
                {organization.slug}
              </code>
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-neutral-500">Status</dt>
            <dd className="capitalize text-neutral-700">{organization.status}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-neutral-500">Created</dt>
            <dd className="text-neutral-700">
              {organization.createdAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Settings form — max-w-2xl keeps the form readable */}
      <div className="max-w-2xl">
        <OrganizationSettingsForm
          initial={settingsData}
          readOnly={!canEdit}
        />
      </div>
    </div>
  );
}
