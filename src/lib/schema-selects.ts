import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";

/** Columns present on older production databases. Newer DPDP fields are omitted. */
export const organizationCoreSelect = {
  id: organizations.id,
  clerkOrganizationId: organizations.clerkOrganizationId,
  name: organizations.name,
  slug: organizations.slug,
  description: organizations.description,
  logoUrl: organizations.logoUrl,
  status: organizations.status,
  timezone: organizations.timezone,
  defaultLanguage: organizations.defaultLanguage,
  defaultRegion: organizations.defaultRegion,
  settings: organizations.settings,
  onboardingCompleted: organizations.onboardingCompleted,
  createdAt: organizations.createdAt,
  updatedAt: organizations.updatedAt,
  deletedAt: organizations.deletedAt,
};

export type OrganizationCoreRow = {
  [K in keyof typeof organizationCoreSelect]: (typeof organizations.$inferSelect)[K];
};

export function toOrganizationRow(
  row: OrganizationCoreRow,
): typeof organizations.$inferSelect {
  return {
    ...row,
    dpoName: null,
    dpoEmail: null,
    grievanceOfficerName: null,
    grievanceOfficerEmail: null,
    grievancePortalUrl: null,
  };
}

export const userCoreSelect = {
  id: users.id,
  clerkUserId: users.clerkUserId,
  email: users.email,
  name: users.name,
  avatarUrl: users.avatarUrl,
  status: users.status,
  emailVerifiedAt: users.emailVerifiedAt,
  lastLoginAt: users.lastLoginAt,
  timezone: users.timezone,
  locale: users.locale,
  metadata: users.metadata,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  deletedAt: users.deletedAt,
};
