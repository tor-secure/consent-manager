import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { organizationSettingsSelect } from "@/lib/schema-selects";
import {
  OrganizationSettingsForm,
  type OrgSettingsData,
} from "@/components/settings/organization-settings-form";
import { OrganizationBillingCard } from "@/components/settings/organization-billing-card";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

// Roles that may edit settings.
const EDIT_ROLES = ["Owner", "Admin"];

// Auth + bootstrap guaranteed by the dashboard layout.
export default async function OrganizationSettingsPage() {
  const { orgId, userId: clerkUserId } = await auth();
  if (!orgId || !clerkUserId) return null;

  const [organization] = await db
    .select(organizationSettingsSelect)
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
    dpoName: organization.dpoName ?? null,
    dpoEmail: organization.dpoEmail ?? null,
    grievanceOfficerName: organization.grievanceOfficerName ?? null,
    grievanceOfficerEmail: organization.grievanceOfficerEmail ?? null,
    grievancePortalUrl: organization.grievancePortalUrl ?? null,
  };

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/administration">Administration</SectionEyebrow>}
        title="Organization settings"
        description={
          <>
            Manage the configuration for{" "}
            <span className="font-medium text-[var(--foreground)]">{organization.name}</span>.
          </>
        }
      />

      {/* Read-only identity block */}
      <Card className="max-w-2xl">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Identity</h2>
        </div>
        <dl className="divide-y divide-[var(--border)] px-6 text-sm">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[var(--muted-foreground)]">Organization ID</dt>
            <dd>
              <code className="rounded-lg bg-[var(--secondary)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                {organization.id}
              </code>
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[var(--muted-foreground)]">Slug</dt>
            <dd>
              <code className="rounded-lg bg-[var(--secondary)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                {organization.slug}
              </code>
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[var(--muted-foreground)]">Status</dt>
            <dd className="capitalize text-[var(--foreground)]">{organization.status}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[var(--muted-foreground)]">Created</dt>
            <dd className="text-[var(--foreground)]">
              {organization.createdAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Settings form */}
      <div className="max-w-2xl space-y-6">
        <OrganizationBillingCard />
        <OrganizationSettingsForm
          initial={settingsData}
          readOnly={!canEdit}
        />
      </div>
    </div>
  );
}
