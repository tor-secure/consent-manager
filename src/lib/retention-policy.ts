import "server-only";

export {
  DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  DEFAULT_CONSENT_EVIDENCE_RETENTION_DAYS,
  DEFAULT_CONSENT_RECORD_RETENTION_DAYS,
  DEFAULT_RIGHTS_REQUEST_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  RETENTION_RULES,
  flattenRetentionConfig,
  mergeRetentionConfig,
  parseRetentionConfig,
  retentionCutoff,
  type RetentionConfig,
} from "./retention/core";
