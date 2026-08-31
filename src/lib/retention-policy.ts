import "server-only";

// ---------------------------------------------------------------------------
// retention-policy.ts
//
// Server-side retention rules for consent-related data.
//
// LEGAL BASIS (DPDP Act 2023):
//  §8(3)  — Data must not be retained longer than necessary for the purpose.
//  §8(6)  — On withdrawal/erasure, personal data must be deleted.
//  §8(7)  — Audit records of consent must be retained for compliance evidence.
//
// RULES (codified here, enforced in API routes):
//
//  CAN be deleted:
//    • consent_records + cascading consent_decisions
//      when consentedAt + retentionDays < now
//      OR when an erasure request (data_principal_requests.requestType = 'erasure')
//      is marked completed.
//
//  MUST be retained (never hard-deleted):
//    • audit_logs — regulatory evidence of staff actions
//    • consent_events — immutable audit trail of consent lifecycle
//      (can be anonymised: eventData overwritten with redacted marker)
//    • data_principal_requests — evidence of how rights requests were handled
//    • consent_policy_versions — required for consent_records FK integrity
//
//  DEFAULTS (stored in organizations.settings JSONB):
//    consentRecordRetentionDays  = 1825  (5 years)
//    auditLogRetentionDays       = 2555  (7 years)  — informational only,
//                                                      audit_logs are never
//                                                      purged by this system
// ---------------------------------------------------------------------------

export const DEFAULT_CONSENT_RECORD_RETENTION_DAYS = 1825; // 5 years
export const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 2555;      // 7 years (informational)

export const MIN_RETENTION_DAYS = 30;
export const MAX_RETENTION_DAYS = 7300; // 20 years

export type RetentionConfig = {
  consentRecordRetentionDays: number;
  auditLogRetentionDays: number;
};

/**
 * Extract RetentionConfig from the organizations.settings JSONB blob,
 * applying defaults for any missing or invalid values.
 */
export function parseRetentionConfig(
  settings: Record<string, unknown> | null | undefined,
): RetentionConfig {
  const s = settings ?? {};
  const crDays = Number(s.consentRecordRetentionDays);
  const alDays = Number(s.auditLogRetentionDays);
  return {
    consentRecordRetentionDays: Number.isFinite(crDays) && crDays >= MIN_RETENTION_DAYS
      ? Math.min(crDays, MAX_RETENTION_DAYS)
      : DEFAULT_CONSENT_RECORD_RETENTION_DAYS,
    auditLogRetentionDays: Number.isFinite(alDays) && alDays >= MIN_RETENTION_DAYS
      ? Math.min(alDays, MAX_RETENTION_DAYS)
      : DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  };
}

/**
 * Merge a RetentionConfig update into the existing settings object.
 * Returns the full updated settings blob ready to write to the DB.
 */
export function mergeRetentionConfig(
  existing: Record<string, unknown>,
  update: Partial<RetentionConfig>,
): Record<string, unknown> {
  return {
    ...existing,
    ...(update.consentRecordRetentionDays !== undefined
      ? { consentRecordRetentionDays: update.consentRecordRetentionDays }
      : {}),
    ...(update.auditLogRetentionDays !== undefined
      ? { auditLogRetentionDays: update.auditLogRetentionDays }
      : {}),
  };
}

/**
 * Compute the retention cutoff date given a number of days.
 * Records with consentedAt before this date are past retention.
 */
export function retentionCutoff(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Data retention rule descriptions — used in API responses and audit logs.
 */
export const RETENTION_RULES = {
  consent_records: {
    canDelete: true,
    reason: "Personal data must not be retained longer than necessary (DPDP §8(3)).",
  },
  consent_decisions: {
    canDelete: true,
    reason: "Cascade-deleted with consent_records.",
  },
  consent_events: {
    canDelete: false,
    canAnonymise: true,
    reason: "Immutable audit trail — structure retained, eventData anonymised on erasure.",
  },
  audit_logs: {
    canDelete: false,
    canAnonymise: false,
    reason: "Regulatory evidence of staff actions — must be retained permanently.",
  },
  data_principal_requests: {
    canDelete: false,
    canAnonymise: false,
    reason: "Evidence of rights request handling — must be retained permanently.",
  },
  consent_policy_versions: {
    canDelete: false,
    canAnonymise: false,
    reason: "Required for consent_records FK integrity — must be retained permanently.",
  },
} as const;
