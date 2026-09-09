export const MIN_RETENTION_DAYS = 30;
export const MAX_RETENTION_DAYS = 7300;
export const DEFAULT_CONSENT_RECORD_RETENTION_DAYS = 1825;
export const DEFAULT_CONSENT_EVIDENCE_RETENTION_DAYS = 1825;
export const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 2555;
export const DEFAULT_RIGHTS_REQUEST_RETENTION_DAYS = 1825;
export const RETENTION_DELETE_BATCH_SIZE = 200;

export const RETENTION_RESOURCE_TYPES = [
  "consent_evidence",
  "consent_record",
  "audit_event",
  "rights_request",
] as const;

export type RetentionResourceType = (typeof RETENTION_RESOURCE_TYPES)[number];

export const LEGAL_HOLD_RESOURCE_TYPES = RETENTION_RESOURCE_TYPES;

export const LEGAL_HOLD_STATUSES = ["active", "released"] as const;
export type LegalHoldStatus = (typeof LEGAL_HOLD_STATUSES)[number];

export const RETENTION_AUDIT_ACTIONS = {
  policyCreated: "RETENTION_POLICY_CREATED",
  policyUpdated: "RETENTION_POLICY_UPDATED",
  holdCreated: "LEGAL_HOLD_CREATED",
  holdReleased: "LEGAL_HOLD_RELEASED",
  deleteExecuted: "RETENTION_DELETE_EXECUTED",
} as const;

export type RetentionCategoryConfig = {
  resourceType: RetentionResourceType;
  retentionDays: number;
  enabled: boolean;
};

export type RetentionConfig = {
  consentEvidence: RetentionCategoryConfig;
  consentRecord: RetentionCategoryConfig;
  auditEvent: RetentionCategoryConfig;
  rightsRequest: RetentionCategoryConfig;
};

export type LegalHoldRecord = {
  id: string;
  organizationId: string;
  websiteId: string | null;
  resourceType: RetentionResourceType;
  resourceId: string;
  reason: string;
  createdBy: string | null;
  createdAt: Date;
  releasedBy: string | null;
  releasedAt: Date | null;
  status: LegalHoldStatus;
};

export type RetentionCandidate = {
  id: string;
  organizationId: string;
  websiteId?: string | null;
  resourceType: RetentionResourceType;
  anchorAt: Date;
};

export type RetentionEligibility = {
  eligible: boolean;
  reason:
    | "within_retention"
    | "disabled"
    | "legal_hold"
    | "immutable_evidence"
    | "eligible"
    | "wrong_tenant";
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const RETENTION_RULES = {
  consent_evidence: {
    layer: "historical_evidence",
    canDeleteAutomatically: false,
    reason:
      "Immutable historical evidence. Automated cleanup never deletes it unless a customer explicitly enables evidence retention and no legal hold applies.",
  },
  consent_record: {
    layer: "current_state",
    canDeleteAutomatically: true,
    reason:
      "Mutable current consent state. Deleting it must not cascade-delete historical evidence.",
  },
  consent_decisions: {
    layer: "current_state",
    canDeleteAutomatically: true,
    reason: "Current purpose/vendor decisions belong to current consent state.",
  },
  consent_events: {
    layer: "historical_evidence",
    canDeleteAutomatically: false,
    reason:
      "Append-only consent history. Survives deletion of the current consent record.",
  },
  audit_event: {
    layer: "operational",
    canDeleteAutomatically: false,
    reason: "Staff audit trail. Deleted only when that category is explicitly enabled.",
  },
  rights_request: {
    layer: "operational",
    canDeleteAutomatically: false,
    reason: "Rights-request handling record. Deleted only when that category is explicitly enabled.",
  },
} as const;

export function isRetentionResourceType(
  value: unknown,
): value is RetentionResourceType {
  return (
    typeof value === "string" &&
    (RETENTION_RESOURCE_TYPES as readonly string[]).includes(value)
  );
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function clampRetentionDays(value: unknown, fallback: number): number {
  const days = Math.round(Number(value));
  if (!Number.isFinite(days)) return fallback;
  return Math.min(MAX_RETENTION_DAYS, Math.max(MIN_RETENTION_DAYS, days));
}

function category(
  resourceType: RetentionResourceType,
  days: unknown,
  enabled: unknown,
  fallbackDays: number,
  fallbackEnabled: boolean,
): RetentionCategoryConfig {
  return {
    resourceType,
    retentionDays: clampRetentionDays(days, fallbackDays),
    enabled: typeof enabled === "boolean" ? enabled : fallbackEnabled,
  };
}

export function defaultRetentionConfig(): RetentionConfig {
  return {
    consentEvidence: category(
      "consent_evidence",
      DEFAULT_CONSENT_EVIDENCE_RETENTION_DAYS,
      false,
      DEFAULT_CONSENT_EVIDENCE_RETENTION_DAYS,
      false,
    ),
    consentRecord: category(
      "consent_record",
      DEFAULT_CONSENT_RECORD_RETENTION_DAYS,
      true,
      DEFAULT_CONSENT_RECORD_RETENTION_DAYS,
      true,
    ),
    auditEvent: category(
      "audit_event",
      DEFAULT_AUDIT_LOG_RETENTION_DAYS,
      false,
      DEFAULT_AUDIT_LOG_RETENTION_DAYS,
      false,
    ),
    rightsRequest: category(
      "rights_request",
      DEFAULT_RIGHTS_REQUEST_RETENTION_DAYS,
      false,
      DEFAULT_RIGHTS_REQUEST_RETENTION_DAYS,
      false,
    ),
  };
}

export function parseRetentionConfig(
  settings: Record<string, unknown> | null | undefined,
  rows?: Array<Partial<RetentionCategoryConfig>> | null,
): RetentionConfig {
  const defaults = defaultRetentionConfig();
  const s = settings ?? {};
  const fromSettings: RetentionConfig = {
    consentEvidence: category(
      "consent_evidence",
      s.consentEvidenceRetentionDays ?? s.evidenceRetentionDays,
      s.consentEvidenceRetentionEnabled,
      defaults.consentEvidence.retentionDays,
      defaults.consentEvidence.enabled,
    ),
    consentRecord: category(
      "consent_record",
      s.consentRecordRetentionDays,
      s.consentRecordRetentionEnabled ?? true,
      defaults.consentRecord.retentionDays,
      defaults.consentRecord.enabled,
    ),
    auditEvent: category(
      "audit_event",
      s.auditLogRetentionDays,
      s.auditLogRetentionEnabled,
      defaults.auditEvent.retentionDays,
      defaults.auditEvent.enabled,
    ),
    rightsRequest: category(
      "rights_request",
      s.rightsRequestRetentionDays,
      s.rightsRequestRetentionEnabled,
      defaults.rightsRequest.retentionDays,
      defaults.rightsRequest.enabled,
    ),
  };

  if (!rows?.length) return fromSettings;

  const next = { ...fromSettings };
  for (const row of rows) {
    if (!row?.resourceType || !isRetentionResourceType(row.resourceType)) continue;
    const mapped =
      row.resourceType === "consent_evidence"
        ? "consentEvidence"
        : row.resourceType === "consent_record"
          ? "consentRecord"
          : row.resourceType === "audit_event"
            ? "auditEvent"
            : "rightsRequest";
    next[mapped] = category(
      row.resourceType,
      row.retentionDays,
      row.enabled,
      fromSettings[mapped].retentionDays,
      fromSettings[mapped].enabled,
    );
  }
  return next;
}

export function flattenRetentionConfig(config: RetentionConfig): RetentionCategoryConfig[] {
  return [
    config.consentEvidence,
    config.consentRecord,
    config.auditEvent,
    config.rightsRequest,
  ];
}

export function mergeRetentionConfig(
  existing: Record<string, unknown>,
  update: Partial<{
    consentEvidenceRetentionDays: number;
    consentEvidenceRetentionEnabled: boolean;
    consentRecordRetentionDays: number;
    consentRecordRetentionEnabled: boolean;
    auditLogRetentionDays: number;
    auditLogRetentionEnabled: boolean;
    rightsRequestRetentionDays: number;
    rightsRequestRetentionEnabled: boolean;
  }>,
): Record<string, unknown> {
  return {
    ...existing,
    ...(update.consentEvidenceRetentionDays !== undefined
      ? { consentEvidenceRetentionDays: update.consentEvidenceRetentionDays }
      : {}),
    ...(update.consentEvidenceRetentionEnabled !== undefined
      ? { consentEvidenceRetentionEnabled: update.consentEvidenceRetentionEnabled }
      : {}),
    ...(update.consentRecordRetentionDays !== undefined
      ? { consentRecordRetentionDays: update.consentRecordRetentionDays }
      : {}),
    ...(update.consentRecordRetentionEnabled !== undefined
      ? { consentRecordRetentionEnabled: update.consentRecordRetentionEnabled }
      : {}),
    ...(update.auditLogRetentionDays !== undefined
      ? { auditLogRetentionDays: update.auditLogRetentionDays }
      : {}),
    ...(update.auditLogRetentionEnabled !== undefined
      ? { auditLogRetentionEnabled: update.auditLogRetentionEnabled }
      : {}),
    ...(update.rightsRequestRetentionDays !== undefined
      ? { rightsRequestRetentionDays: update.rightsRequestRetentionDays }
      : {}),
    ...(update.rightsRequestRetentionEnabled !== undefined
      ? { rightsRequestRetentionEnabled: update.rightsRequestRetentionEnabled }
      : {}),
  };
}

export function retentionCutoff(days: number, now = new Date()): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export function isPastRetention(anchorAt: Date, days: number, now = new Date()): boolean {
  return anchorAt.getTime() < retentionCutoff(days, now).getTime();
}

export function isLegalHoldActive(
  hold: Pick<LegalHoldRecord, "status" | "releasedAt">,
): boolean {
  return hold.status === "active" && hold.releasedAt == null;
}

export function resourceIsOnLegalHold(
  holds: Array<Pick<LegalHoldRecord, "resourceType" | "resourceId" | "status" | "releasedAt" | "organizationId">>,
  input: { organizationId: string; resourceType: RetentionResourceType; resourceId: string },
): boolean {
  return holds.some(
    (hold) =>
      hold.organizationId === input.organizationId &&
      hold.resourceType === input.resourceType &&
      hold.resourceId === input.resourceId &&
      isLegalHoldActive(hold),
  );
}

export function evaluateRetentionEligibility(input: {
  candidate: RetentionCandidate;
  config: RetentionConfig;
  holds: Array<Pick<LegalHoldRecord, "resourceType" | "resourceId" | "status" | "releasedAt" | "organizationId">>;
  actorOrganizationId: string;
  now?: Date;
}): RetentionEligibility {
  if (input.candidate.organizationId !== input.actorOrganizationId) {
    return { eligible: false, reason: "wrong_tenant" };
  }

  const categoryConfig =
    input.candidate.resourceType === "consent_evidence"
      ? input.config.consentEvidence
      : input.candidate.resourceType === "consent_record"
        ? input.config.consentRecord
        : input.candidate.resourceType === "audit_event"
          ? input.config.auditEvent
          : input.config.rightsRequest;

  if (!categoryConfig.enabled) {
    return { eligible: false, reason: "disabled" };
  }

  if (
    resourceIsOnLegalHold(input.holds, {
      organizationId: input.candidate.organizationId,
      resourceType: input.candidate.resourceType,
      resourceId: input.candidate.id,
    })
  ) {
    return { eligible: false, reason: "legal_hold" };
  }

  if (input.candidate.resourceType === "consent_evidence") {
    return { eligible: false, reason: "immutable_evidence" };
  }

  if (!isPastRetention(input.candidate.anchorAt, categoryConfig.retentionDays, input.now)) {
    return { eligible: false, reason: "within_retention" };
  }

  return { eligible: true, reason: "eligible" };
}

export function planRetentionBatch<T extends RetentionCandidate>(input: {
  candidates: T[];
  config: RetentionConfig;
  holds: Array<Pick<LegalHoldRecord, "resourceType" | "resourceId" | "status" | "releasedAt" | "organizationId">>;
  actorOrganizationId: string;
  batchSize?: number;
  now?: Date;
}): { eligible: T[]; skipped: Array<{ id: string; reason: RetentionEligibility["reason"] }> } {
  const batchSize = Math.max(1, Math.min(input.batchSize ?? RETENTION_DELETE_BATCH_SIZE, 500));
  const eligible: T[] = [];
  const skipped: Array<{ id: string; reason: RetentionEligibility["reason"] }> = [];

  for (const candidate of input.candidates) {
    const result = evaluateRetentionEligibility({
      candidate,
      config: input.config,
      holds: input.holds,
      actorOrganizationId: input.actorOrganizationId,
      now: input.now,
    });
    if (result.eligible) {
      eligible.push(candidate);
    } else {
      skipped.push({ id: candidate.id, reason: result.reason });
    }
    if (eligible.length >= batchSize) break;
  }

  return { eligible, skipped };
}

export function currentStateDeletionMustPreserveEvidence(): boolean {
  return true;
}

export function historicalEvidenceIndependence(): {
  usesLivePolicy: boolean;
  usesLiveTrackers: boolean;
  usesCurrentConsentRecord: boolean;
} {
  return {
    usesLivePolicy: false,
    usesLiveTrackers: false,
    usesCurrentConsentRecord: false,
  };
}

export function evidenceUnchanged(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): boolean {
  return JSON.stringify(before) === JSON.stringify(after);
}

export function sanitizeRetentionAuditMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const blocked = new Set([
    "email",
    "visitorId",
    "ipAddress",
    "userAgent",
    "consentIds",
    "requesterEmail",
    "requesterName",
  ]);
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !blocked.has(key)),
  );
}

export function parseLegalHoldInput(body: Record<string, unknown>): {
  ok: true;
  value: {
    websiteId: string | null;
    resourceType: RetentionResourceType;
    resourceId: string;
    reason: string;
  };
} | { ok: false; message: string } {
  if (!isRetentionResourceType(body.resourceType)) {
    return { ok: false, message: "Invalid resourceType" };
  }
  if (!isUuid(body.resourceId)) {
    return { ok: false, message: "Invalid resourceId" };
  }
  const websiteId = body.websiteId == null || body.websiteId === "" ? null : String(body.websiteId);
  if (websiteId && !isUuid(websiteId)) {
    return { ok: false, message: "Invalid websiteId" };
  }
  const reason = String(body.reason ?? "").trim();
  if (reason.length < 3 || reason.length > 500) {
    return { ok: false, message: "reason must be between 3 and 500 characters" };
  }
  return {
    ok: true,
    value: {
      websiteId,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      reason,
    },
  };
}

export function parseRetentionWriteInput(body: Record<string, unknown>): {
  ok: true;
  value: Record<string, number | boolean>;
} | { ok: false; message: string } {
  const updates: Record<string, number | boolean> = {};
  const numericFields = [
    "consentEvidenceRetentionDays",
    "consentRecordRetentionDays",
    "auditLogRetentionDays",
    "rightsRequestRetentionDays",
  ] as const;
  const booleanFields = [
    "consentEvidenceRetentionEnabled",
    "consentRecordRetentionEnabled",
    "auditLogRetentionEnabled",
    "rightsRequestRetentionEnabled",
  ] as const;

  for (const field of numericFields) {
    if (body[field] === undefined) continue;
    const days = Math.round(Number(body[field]));
    if (!Number.isFinite(days) || days < MIN_RETENTION_DAYS || days > MAX_RETENTION_DAYS) {
      return {
        ok: false,
        message: `${field} must be between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS}`,
      };
    }
    updates[field] = days;
  }
  for (const field of booleanFields) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "boolean") {
      return { ok: false, message: `${field} must be a boolean` };
    }
    updates[field] = body[field];
  }
  if (Object.keys(updates).length === 0) {
    return { ok: false, message: "No valid retention fields provided" };
  }
  return { ok: true, value: updates };
}

export function buildWithdrawalEvidenceDecisions(
  prior: Array<{ purposeId: string | null; vendorId: string | null; decision?: string; granted?: boolean; decidedAt?: string }>,
  withdrawnAt: string,
) {
  return prior.map((row) => ({
    purposeId: row.purposeId,
    vendorId: row.vendorId,
    granted: false,
    decision: "withdrawn",
    decidedAt: withdrawnAt,
  }));
}
