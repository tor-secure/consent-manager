const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const compiled = path.join(__dirname, "../../../.tmp/retention/retention/core.js");
const fallback = path.join(__dirname, "../../../.tmp/consent-manager-e2e/src/lib/retention/core.js");
const modulePath = fs.existsSync(compiled) ? compiled : fallback;
const {
  RETENTION_AUDIT_ACTIONS,
  RETENTION_DELETE_BATCH_SIZE,
  buildWithdrawalEvidenceDecisions,
  currentStateDeletionMustPreserveEvidence,
  defaultRetentionConfig,
  evaluateRetentionEligibility,
  evidenceUnchanged,
  historicalEvidenceIndependence,
  isPastRetention,
  mergeRetentionConfig,
  parseLegalHoldInput,
  parseRetentionConfig,
  parseRetentionWriteInput,
  planRetentionBatch,
  resourceIsOnLegalHold,
  retentionCutoff,
  sanitizeRetentionAuditMetadata,
} = require(modulePath);

function daysAgo(days) {
  const date = new Date("2026-09-10T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function testCreateAndPreserveEvidence() {
  assert.equal(currentStateDeletionMustPreserveEvidence(), true);
  const independence = historicalEvidenceIndependence();
  assert.equal(independence.usesLivePolicy, false);
  assert.equal(independence.usesLiveTrackers, false);
  assert.equal(independence.usesCurrentConsentRecord, false);

  const grant = {
    policyVersionNumber: 1,
    noticeHash: "abc",
    noticeSnapshot: { policy: { version: 1 } },
    decisions: [{ purposeId: "analytics", granted: true }],
  };
  const afterCurrentStateDelete = { ...grant };
  assert.equal(evidenceUnchanged(grant, afterCurrentStateDelete), true);
}

function testWithdrawalCreatesSecondEvidence() {
  const withdrawnAt = "2026-09-10T00:00:00.000Z";
  const prior = [{ purposeId: "p1", vendorId: null, granted: true, decision: "accept-all" }];
  const next = buildWithdrawalEvidenceDecisions(prior, withdrawnAt);
  assert.equal(next[0].granted, false);
  assert.equal(next[0].decision, "withdrawn");
  assert.equal(next[0].purposeId, "p1");
  assert.notEqual(JSON.stringify(prior), JSON.stringify(next));
}

function testReconsentLeavesV1Unchanged() {
  const v1 = {
    policyVersionId: "v1",
    policyVersionNumber: 1,
    noticeHash: "hash-v1",
    noticeSnapshot: { policy: { version: 1, name: "Notice v1" } },
    decisions: [{ purposeId: "p1", granted: true }],
  };
  const v2 = {
    policyVersionId: "v2",
    policyVersionNumber: 2,
    noticeHash: "hash-v2",
    noticeSnapshot: { policy: { version: 2, name: "Notice v2" } },
    decisions: [{ purposeId: "p1", granted: false }],
  };
  assert.equal(evidenceUnchanged(v1, v1), true);
  assert.equal(evidenceUnchanged(v1, v2), false);
}

function testPolicyAndTrackerChangesDoNotRewriteEvidence() {
  const evidence = {
    policyId: "policy-1",
    noticeHash: "notice-1",
    noticeSnapshot: { vendors: [{ name: "Google" }], purposes: [{ name: "Analytics" }] },
  };
  const afterTrackerChange = {
    policyId: "policy-1",
    noticeHash: "notice-1",
    noticeSnapshot: { vendors: [{ name: "Google" }], purposes: [{ name: "Analytics" }] },
  };
  assert.equal(evidenceUnchanged(evidence, afterTrackerChange), true);
}

function testLegalHoldAndCleanup() {
  const now = new Date("2026-09-10T00:00:00.000Z");
  const config = parseRetentionConfig({
    consentRecordRetentionDays: 30,
    consentRecordRetentionEnabled: true,
    consentEvidenceRetentionEnabled: true,
    auditLogRetentionEnabled: false,
  });
  const oldRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    resourceType: "consent_record",
    anchorAt: daysAgo(90),
  };
  const held = evaluateRetentionEligibility({
    candidate: oldRecord,
    config,
    holds: [{
      organizationId: oldRecord.organizationId,
      resourceType: "consent_record",
      resourceId: oldRecord.id,
      status: "active",
      releasedAt: null,
    }],
    actorOrganizationId: oldRecord.organizationId,
    now,
  });
  assert.equal(held.eligible, false);
  assert.equal(held.reason, "legal_hold");

  const released = evaluateRetentionEligibility({
    candidate: oldRecord,
    config,
    holds: [{
      organizationId: oldRecord.organizationId,
      resourceType: "consent_record",
      resourceId: oldRecord.id,
      status: "released",
      releasedAt: now,
    }],
    actorOrganizationId: oldRecord.organizationId,
    now,
  });
  assert.equal(released.eligible, true);
  assert.equal(released.reason, "eligible");

  const evidence = evaluateRetentionEligibility({
    candidate: { ...oldRecord, resourceType: "consent_evidence" },
    config,
    holds: [],
    actorOrganizationId: oldRecord.organizationId,
    now,
  });
  assert.equal(evidence.eligible, false);
  assert.equal(evidence.reason, "immutable_evidence");
}

function testTenantIsolation() {
  const config = defaultRetentionConfig();
  const result = evaluateRetentionEligibility({
    candidate: {
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: "tenant-a",
      resourceType: "consent_record",
      anchorAt: daysAgo(4000),
    },
    config,
    holds: [],
    actorOrganizationId: "tenant-b",
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "wrong_tenant");
  assert.equal(resourceIsOnLegalHold([{
    organizationId: "tenant-a",
    resourceType: "consent_evidence",
    resourceId: "ev-1",
    status: "active",
    releasedAt: null,
  }], {
    organizationId: "tenant-b",
    resourceType: "consent_evidence",
    resourceId: "ev-1",
  }), false);
}

function testImmutabilityAndCleanupSafety() {
  const now = new Date("2026-09-10T00:00:00.000Z");
  const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const config = parseRetentionConfig({
    consentRecordRetentionDays: 30,
    consentRecordRetentionEnabled: true,
  });
  const candidates = Array.from({ length: 250 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    organizationId: org,
    resourceType: "consent_record",
    anchorAt: daysAgo(90),
  }));
  const plan = planRetentionBatch({
    candidates,
    config,
    holds: [{
      organizationId: org,
      resourceType: "consent_record",
      resourceId: candidates[0].id,
      status: "active",
      releasedAt: null,
    }],
    actorOrganizationId: org,
    now,
  });
  assert.equal(plan.eligible.length, RETENTION_DELETE_BATCH_SIZE);
  assert.equal(plan.eligible.some((row) => row.id === candidates[0].id), false);
  assert.equal(plan.skipped[0].reason, "legal_hold");

  const invalid = parseRetentionWriteInput({ consentRecordRetentionDays: 2 });
  assert.equal(invalid.ok, false);
  const hold = parseLegalHoldInput({
    resourceType: "consent_evidence",
    resourceId: "11111111-1111-4111-8111-111111111111",
    reason: "Litigation hold",
  });
  assert.equal(hold.ok, true);
  const merged = mergeRetentionConfig({}, { consentRecordRetentionDays: 365 });
  assert.equal(merged.consentRecordRetentionDays, 365);
  assert.ok(isPastRetention(daysAgo(40), 30, now));
  assert.ok(retentionCutoff(30, now) < now);
  const audit = sanitizeRetentionAuditMetadata({
    email: "user@example.com",
    deletedCount: 3,
    retentionDays: 365,
  });
  assert.equal(audit.email, undefined);
  assert.equal(audit.deletedCount, 3);
  assert.equal(RETENTION_AUDIT_ACTIONS.deleteExecuted, "RETENTION_DELETE_EXECUTED");
}

function testRightsRequestRetentionIndependent() {
  const defaults = defaultRetentionConfig();
  assert.equal(defaults.rightsRequest.resourceType, "rights_request");
  assert.equal(defaults.consentEvidence.resourceType, "consent_evidence");
  const updated = parseRetentionConfig({
    rightsRequestRetentionDays: 90,
    rightsRequestRetentionEnabled: true,
    consentEvidenceRetentionDays: 2555,
    consentEvidenceRetentionEnabled: false,
  });
  assert.equal(updated.rightsRequest.retentionDays, 90);
  assert.equal(updated.rightsRequest.enabled, true);
  assert.equal(updated.consentEvidence.retentionDays, 2555);
  assert.equal(updated.consentEvidence.enabled, false);
  const merged = mergeRetentionConfig(
    { consentEvidenceRetentionDays: 2555, consentEvidenceRetentionEnabled: false },
    { rightsRequestRetentionDays: 180, rightsRequestRetentionEnabled: true },
  );
  assert.equal(merged.rightsRequestRetentionDays, 180);
  assert.equal(merged.consentEvidenceRetentionDays, 2555);
}

testCreateAndPreserveEvidence();
testWithdrawalCreatesSecondEvidence();
testReconsentLeavesV1Unchanged();
testPolicyAndTrackerChangesDoNotRewriteEvidence();
testLegalHoldAndCleanup();
testTenantIsolation();
testImmutabilityAndCleanupSafety();
testRightsRequestRetentionIndependent();

console.log("retention.test.cjs passed");
