const assert = require("node:assert/strict");
const path = require("node:path");

const compiledDir = path.join(__dirname, "../../../.tmp/privacy-rights");
const {
  availableRightsForJurisdiction,
  isRightAvailable,
  normalizeRightsJurisdiction,
  snapshotJurisdiction,
} = require(path.join(compiledDir, "applicability.js"));
const { classifyDeadline, computeRightsDeadlines } = require(path.join(compiledDir, "deadlines.js"));
const { canAdminTransition, requesterCannotSetStatus, statusAfterVerification, verificationAllowedForRequest } = require(path.join(compiledDir, "lifecycle.js"));
const {
  generateRightsToken,
  hashRightsToken,
  tokenReusable,
  tokensMatch,
  verificationLocked,
} = require(path.join(compiledDir, "tokens.js"));
const { planDsarDeletion, dsarDeletionMustPreserveEvidence } = require(path.join(compiledDir, "deletion-policy.js"));
const { filterCorrectionPatch } = require(path.join(compiledDir, "correction-policy.js"));
const { buildExportMetadata, stripSensitiveKeys } = require(path.join(compiledDir, "export-sanitize.js"));
const { publicRightsStatus } = require(path.join(compiledDir, "public-status.js"));

function testApplicability() {
  assert.equal(normalizeRightsJurisdiction("CPRA"), "ccpa");
  assert.equal(isRightAvailable("dpdp", "access"), true);
  assert.equal(isRightAvailable("dpdp", "restriction"), false);
  assert.equal(isRightAvailable("gdpr", "restriction"), true);
  const snap = snapshotJurisdiction("lgpd");
  assert.equal(snap.legalMandateClaimed, false);
  assert.ok(availableRightsForJurisdiction("gdpr").availableTypes.includes("objection"));
}

function testDeadlines() {
  const submitted = new Date("2026-09-01T00:00:00.000Z");
  const dpdp = computeRightsDeadlines(submitted, "dpdp");
  const ccpa = computeRightsDeadlines(submitted, "ccpa");
  assert.equal(dpdp.deadlineKind, "configured_target");
  assert.ok(ccpa.dueAt.getTime() > dpdp.dueAt.getTime());
  assert.equal(classifyDeadline({
    dueAt: new Date("2026-08-01T00:00:00.000Z"),
    status: "in_progress",
    now: new Date("2026-09-01T00:00:00.000Z"),
  }), "overdue");
  assert.equal(classifyDeadline({
    dueAt: new Date("2026-10-01T00:00:00.000Z"),
    status: "completed",
  }), "completed");
}

function testLifecycle() {
  assert.equal(canAdminTransition("verified", "in_review").ok, true);
  assert.equal(canAdminTransition("in_review", "in_progress").ok, true);
  assert.equal(canAdminTransition("in_progress", "completed").ok, true);
  assert.equal(canAdminTransition("verification_pending", "completed").ok, false);
  assert.equal(canAdminTransition("verification_pending", "verified").ok, false);
  assert.equal(canAdminTransition("completed", "in_progress").ok, false);
  assert.equal(requesterCannotSetStatus("completed"), true);
  assert.equal(requesterCannotSetStatus("verified"), true);
  assert.equal(statusAfterVerification("verification_pending"), "verified");
  assert.equal(
    canAdminTransition("in_progress", "completed", {
      requesterKind: "authorized_agent",
      verificationStatus: "pending",
    }).ok,
    false,
  );
  assert.equal(verificationAllowedForRequest("verification_pending"), true);
  assert.equal(verificationAllowedForRequest("verified"), true);
  assert.equal(verificationAllowedForRequest("cancelled"), false);
  assert.equal(verificationAllowedForRequest("rejected"), false);
  assert.equal(verificationAllowedForRequest("expired"), false);
}

function testTokens() {
  const token = generateRightsToken();
  assert.equal(token.length, 64);
  const hash = hashRightsToken(token);
  assert.equal(tokensMatch(token, hash), true);
  assert.equal(tokensMatch("ffff", hash), false);
  assert.equal(verificationLocked(5), true);
  assert.equal(tokenReusable({
    usedAt: new Date(),
    expiresAt: new Date(Date.now() + 1000),
    failedAttempts: 0,
  }).reason, "reused");
  assert.equal(tokenReusable({
    usedAt: null,
    expiresAt: new Date(Date.now() - 1000),
    failedAttempts: 0,
  }).reason, "expired");
  assert.equal(tokenReusable({
    usedAt: null,
    expiresAt: new Date(Date.now() + 1000),
    failedAttempts: 5,
  }).reason, "locked");
}

function testDeletion() {
  assert.equal(dsarDeletionMustPreserveEvidence(), true);
  const blocked = planDsarDeletion({
    hasCurrentRecord: true,
    evidenceCount: 2,
    holdOnRecord: true,
    holdOnEvidence: false,
    holdOnRequest: false,
  });
  assert.equal(blocked.deleteCurrentState, false);
  assert.equal(blocked.preserveEvidence, true);
  const holdOnRequest = planDsarDeletion({
    hasCurrentRecord: true,
    evidenceCount: 1,
    holdOnRecord: false,
    holdOnEvidence: false,
    holdOnRequest: true,
  });
  assert.equal(holdOnRequest.canExecute, false);
  const allowed = planDsarDeletion({
    hasCurrentRecord: true,
    evidenceCount: 3,
    holdOnRecord: false,
    holdOnEvidence: false,
    holdOnRequest: false,
  });
  assert.equal(allowed.deleteCurrentState, true);
  assert.equal(allowed.preserveEvidence, true);
}

function testCorrectionAndExport() {
  const rejected = filterCorrectionPatch({ organizationId: "x", requesterName: "Ada" });
  assert.equal(rejected.ok, false);
  const ok = filterCorrectionPatch({ requesterName: "Ada Lovelace" });
  assert.equal(ok.ok, true);
  const sanitized = stripSensitiveKeys({
    name: "Ada",
    apiKey: "secret",
    nested: { token: "abc", locale: "en" },
  });
  assert.equal(sanitized.apiKey, undefined);
  assert.equal(sanitized.nested.token, undefined);
  assert.equal(sanitized.nested.locale, "en");
  const meta = buildExportMetadata({
    requestId: "r1",
    exportKind: "portability",
    organizationId: "o1",
    websiteId: null,
    jurisdiction: "gdpr",
    generatedAt: new Date("2026-09-10T00:00:00.000Z"),
    categories: ["current_consent_state"],
  });
  assert.equal(meta.layers.historicalConsentEvidence, false);
  assert.equal(publicRightsStatus("verification_pending"), "verification required");
}

function testWithdrawalReusesConsentEngine() {
  const fs = require("node:fs");
  const service = fs.readFileSync(path.join(__dirname, "service.ts"), "utf8");
  assert.match(service, /from "@\/lib\/consent-engine"/);
  assert.match(service, /from "@\/lib\/consent-evidence-write"/);
  assert.match(service, /appendConsentEvent\(/);
  assert.match(service, /buildWithdrawalEvidenceSnapshot\(/);
  assert.match(service, /eventType:\s*"consent\.withdrawn"/);
  assert.doesNotMatch(service, /delete\(consentEvidenceSnapshots\)/);
}

testApplicability();
testDeadlines();
testLifecycle();
testTokens();
testDeletion();
testCorrectionAndExport();
testWithdrawalReusesConsentEngine();
console.log("privacy-rights tests passed");
