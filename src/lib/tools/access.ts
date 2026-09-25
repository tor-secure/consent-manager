export type AssessmentTenantRow = {
  organizationId: string;
};

export type TenantSession = {
  organizationId: string | null;
};

/** Server sessions must pass the organization id resolved from auth, never a client-supplied id. */
export function canAccessAssessment(row: AssessmentTenantRow, session: TenantSession): boolean {
  if (!session.organizationId) return false;
  return row.organizationId === session.organizationId;
}
