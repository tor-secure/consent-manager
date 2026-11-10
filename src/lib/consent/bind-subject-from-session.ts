import "server-only";

import { logger } from "@/lib/logger";

/**
 * @deprecated Guest consentId rows are no longer owned by email.
 * Signed-in ownership uses (websiteId, subjectKey) via consent_subjects +
 * subject sessions (`POST /api/consent/subject/session` or
 * `POST /api/v1/consent/subject`). This helper intentionally does not rewrite
 * guest `consent_records.metadata.subject`.
 */
export async function bindSubjectFromClerkSession(input: {
  organizationId: string;
  websiteId: string;
  consentId: string;
}): Promise<{ bound: boolean; reason?: string }> {
  logger.info("Consent subject email bind skipped; account ownership uses subject sessions", {
    operation: "consent.subject.clerk_session",
    reason: "ownership_moved_to_subject_session",
    websiteId: input.websiteId,
    consentId: input.consentId,
  });
  return { bound: false, reason: "ownership_moved_to_subject_session" };
}
