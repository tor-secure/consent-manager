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
    .select(organizationCoreSelect)
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
    dpoName: null,
    dpoEmail: null,
    grievanceOfficerName: null,
    grievanceOfficerEmail: null,
    grievancePortalUrl: null,
  };

  return (
    <div className="page-wrap space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Organization settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage the configuration for{" "}
          <span className="font-medium text-slate-700">{organization.name}</span>.
        </p>
      </div>

      {/* Read-only identity block */}
      <div className="max-w-2xl rounded-2xl bg-white card-shadow">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Identity</h2>
        </div>
        <dl className="divide-y divide-slate-100 px-6 text-sm">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-slate-500">Organization ID</dt>
            <dd>
              <code className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                {organization.id}
              </code>
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-slate-500">Slug</dt>
            <dd>
              <code className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                {organization.slug}
              </code>
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-slate-500">Status</dt>
            <dd className="capitalize text-slate-700">{organization.status}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-slate-500">Created</dt>
            <dd className="text-slate-700">
              {organization.createdAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Settings form */}
      <div className="max-w-2xl">
        <OrganizationSettingsForm
          initial={settingsData}
          readOnly={!canEdit}
        />
      </div>
    </div>
  );
}
