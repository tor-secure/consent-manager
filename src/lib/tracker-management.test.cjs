const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const compiled = path.join(__dirname, "../../.tmp/tracker-management/trackers/management.js");
const fallback = path.join(__dirname, "../../.tmp/consent-manager-e2e/src/lib/trackers/management.js");
const modulePath = fs.existsSync(compiled) ? compiled : fallback;
const {
  TRACKER_AUDIT_ACTIONS,
  auditActionsForChange,
  deriveTrackerIdentifier,
  detectionMatchStatus,
  essentialChangeRequiresConfirmation,
  findMatchingTracker,
  isUnmappedForReview,
  nextTrackerStatus,
  parseTrackerWriteInput,
  publishedPolicyImpact,
  resolveScannerClassification,
  sanitizeTrackerAuditConfig,
  toSdkTrackerRule,
  validateDetectionPattern,
} = require(modulePath);

function testCreateAndEdit() {
  const created = parseTrackerWriteInput({
    websiteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Google Analytics",
    vendorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    purposeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    scriptUrlPatterns: "google-analytics.com\ngoogletagmanager.com/gtag/js",
    cookieNames: "_ga,_gid",
  }, { requireWebsite: true });
  assert.equal(created.ok, true);
  assert.equal(created.value.name, "Google Analytics");
  assert.equal(created.value.vendorId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  assert.equal(created.value.scriptUrlPatterns.length, 2);

  const edited = parseTrackerWriteInput({
    purposeId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    enabled: false,
  });
  assert.equal(edited.ok, true);
  assert.equal(edited.value.purposeId, "dddddddd-dddd-4ddd-8ddd-dddddddddddd");
  assert.equal(edited.value.status, "disabled");
}

function testDisableArchiveAndMapping() {
  assert.equal(nextTrackerStatus("active", "disable"), "disabled");
  assert.equal(nextTrackerStatus("disabled", "archive"), "archived");
  assert.equal(resolveScannerClassification({
    purposeId: "p1",
    vendorId: "v1",
    scannerClassification: "unmapped",
  }), "mapped");
  assert.equal(resolveScannerClassification({
    purposeId: null,
    vendorId: null,
    scannerClassification: "ignored",
  }), "ignored");

  const purposeChange = auditActionsForChange(
    { purposeId: "p1", vendorId: "v1", isEssential: false, status: "active", scannerClassification: "mapped" },
    { purposeId: "p2", vendorId: "v1", isEssential: false, status: "active", scannerClassification: "mapped" },
  );
  assert.ok(purposeChange.includes(TRACKER_AUDIT_ACTIONS.purposeChanged));

  const vendorChange = auditActionsForChange(
    { purposeId: "p1", vendorId: "v1", isEssential: false, status: "active", scannerClassification: "mapped" },
    { purposeId: "p1", vendorId: "v2", isEssential: false, status: "active", scannerClassification: "mapped" },
  );
  assert.ok(vendorChange.includes(TRACKER_AUDIT_ACTIONS.vendorChanged));
}

function testEssentialAndInvalidPattern() {
  assert.equal(essentialChangeRequiresConfirmation(true, false), true);
  assert.equal(essentialChangeRequiresConfirmation(true, true), false);
  assert.equal(essentialChangeRequiresConfirmation(false, false), false);
  assert.match(validateDetectionPattern("*") ?? "", /too broad/);
  assert.match(validateDetectionPattern("/(/") ?? "", /Invalid regular expression/);
  assert.equal(validateDetectionPattern("google-analytics.com"), null);
  const invalid = parseTrackerWriteInput({ name: "Bad", scriptUrlPatterns: "*" });
  assert.equal(invalid.ok, false);
}

function testUnknownAndScannerMatch() {
  const rules = [{
    name: "Google Analytics",
    domain: "google-analytics.com",
    identifier: "google-analytics.com",
    scriptUrlPatterns: ["googletagmanager.com/gtag/js"],
    iframeUrlPatterns: [],
    pixelUrlPatterns: ["google-analytics.com/g/collect"],
    purposeId: "analytics",
    vendorId: "google",
  }];
  const matched = findMatchingTracker(rules, {
    url: "https://www.google-analytics.com/analytics.js",
    domain: "www.google-analytics.com",
    identifier: "https://www.google-analytics.com/analytics.js",
  });
  assert.equal(matched?.name, "Google Analytics");
  assert.equal(detectionMatchStatus({
    matchedTracker: { name: "Google Analytics", purposeId: "analytics", vendorId: "google", purposeName: "Analytics", vendorName: "Google" },
  }).status, "configured");

  const unknown = detectionMatchStatus({
    matchedTracker: { name: "unknown.example.com", purposeId: null, vendorId: null },
  });
  assert.equal(unknown.status, "unmapped");
  assert.match(unknown.recommendedAction ?? "", /Assign vendor/);
  assert.equal(isUnmappedForReview({
    purposeId: null,
    vendorId: null,
    isEssential: false,
    status: "active",
    scannerClassification: "unmapped",
  }), true);
  assert.equal(isUnmappedForReview({
    purposeId: null,
    vendorId: null,
    isEssential: false,
    status: "active",
    scannerClassification: "ignored",
  }), false);
}

function testPolicyImpactRuntimeAndAudit() {
  const impact = publishedPolicyImpact({
    hasPublishedPolicy: true,
    purposeAttachedToPublishedPolicy: true,
    mappingChanged: true,
  });
  assert.equal(impact.affectsPublishedPolicy, true);
  assert.equal(impact.requiresNewDraft, true);
  assert.match(impact.message ?? "", /not rewritten/);

  const rule = toSdkTrackerRule({
    id: "t1",
    name: "Google Analytics",
    type: "script",
    domain: "google-analytics.com",
    identifier: "analytics.js",
    purposeId: "analytics",
    purposeKey: "analytics",
    vendorId: "google",
    isEssential: false,
    status: "active",
  });
  assert.equal(rule.purposeId, "analytics");
  assert.equal(rule.purposeKey, "analytics");

  const remapped = toSdkTrackerRule({ ...rule, purposeId: "marketing", purposeKey: "marketing" });
  assert.equal(remapped.purposeKey, "marketing");

  const audit = sanitizeTrackerAuditConfig({
    name: "Google Analytics",
    purposeId: "analytics",
    vendorId: "google",
    isEssential: false,
    status: "active",
    scannerClassification: "mapped",
    description: "should not need extra personal data",
  });
  assert.equal(audit.purposeId, "analytics");
  assert.equal(Object.prototype.hasOwnProperty.call(audit, "email"), false);
  assert.ok(auditActionsForChange(null, {
    purposeId: "analytics",
    vendorId: "google",
    isEssential: false,
    status: "active",
    scannerClassification: "mapped",
  }, true).includes(TRACKER_AUDIT_ACTIONS.created));
  assert.equal(deriveTrackerIdentifier({ name: "Meta Pixel", domain: "facebook.com" }), "facebook.com");
}

testCreateAndEdit();
testDisableArchiveAndMapping();
testEssentialAndInvalidPattern();
testUnknownAndScannerMatch();
testPolicyImpactRuntimeAndAudit();
console.log("tracker management tests passed");
