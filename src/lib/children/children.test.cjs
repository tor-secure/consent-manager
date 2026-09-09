const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const originalLoad = Module._load;
Module._load = function loadWithServerOnlyStub(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

const compiledDir = path.join(__dirname, "../../../.tmp/compiled/src/lib/children");
const {
  parseChildProtectionConfig,
  childProtectionIsComplete,
  defaultChildProtectionConfig,
} = require(path.join(compiledDir, "config.js"));
const {
  nextStateFromAssertion,
  restrictedProcessingAllowed,
  applyGuardianContactVerified,
  applyGuardianStaffVerified,
  applyGuardianFailure,
  expireState,
  publicAgeView,
} = require(path.join(compiledDir, "state.js"));
const {
  denyRestrictedDecisions,
  applyChildRestrictionsToGrants,
} = require(path.join(compiledDir, "evaluate.js"));
const { issueAgeContext, verifyAgeContext } = require(path.join(compiledDir, "context.js"));
const {
  evaluateConsentSnapshot,
} = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/consent-evaluation-core.js"));
const { shouldBlock } = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/sdk/enforcement.js"));
const { tokenReusable } = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/privacy-rights/tokens.js"));
const { evaluatePolicyCompliance } = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/compliance/evaluate.js"));

const completeConfig = {
  ...defaultChildProtectionConfig(),
  enabled: true,
  childDirected: true,
  ageAssuranceRequired: true,
  minimumAge: 16,
  guardianConsentRequired: true,
  restrictedPurposeKeys: ["advertising", "ads", "marketing", "profiling"],
  minimumAssurance: "assured",
};

function future() {
  return new Date(Date.now() + 60 * 60 * 1000);
}

function testUnknownBlocksRestricted() {
  assert.equal(restrictedProcessingAllowed(completeConfig, null), false);
  const denied = denyRestrictedDecisions(
    [{ purposeId: "ads", granted: true }, { purposeId: "essential", granted: true }],
    [
      { id: "ads", key: "advertising", isRequired: false },
      { id: "essential", key: "necessary", isRequired: true },
    ],
    completeConfig,
    null,
  );
  assert.equal(denied[0].granted, false);
  assert.equal(denied[1].granted, true);
}

function testSelfDeclarationIsNotAssured() {
  const asserted = nextStateFromAssertion({
    config: completeConfig,
    assertedOverThreshold: true,
    method: "self_declaration",
  });
  assert.equal(asserted.ageStatus, "asserted");
  assert.equal(restrictedProcessingAllowed(completeConfig, asserted), false);
  const selfOnly = { ...completeConfig, minimumAssurance: "self_declaration" };
  assert.equal(restrictedProcessingAllowed(selfOnly, asserted), true);
}

function testStaffAssuranceUnlocks() {
  const assured = nextStateFromAssertion({
    config: completeConfig,
    assertedOverThreshold: true,
    method: "staff_verification",
  });
  assert.equal(assured.ageStatus, "assured");
  assert.equal(restrictedProcessingAllowed(completeConfig, assured), true);
}

function testMinorAndGuardianStates() {
  const minor = nextStateFromAssertion({
    config: completeConfig,
    assertedOverThreshold: false,
    method: "self_declaration",
  });
  assert.equal(minor.ageStatus, "guardian_required");
  assert.equal(restrictedProcessingAllowed(completeConfig, minor), false);
  const contact = applyGuardianContactVerified(minor);
  assert.equal(contact.guardianStatus, "authority_unverified");
  assert.equal(restrictedProcessingAllowed(completeConfig, contact), false);
  const verified = applyGuardianStaffVerified(contact);
  assert.equal(verified.ageStatus, "guardian_verified");
  assert.equal(restrictedProcessingAllowed(completeConfig, verified), true);
  const failed = applyGuardianFailure(minor);
  assert.equal(restrictedProcessingAllowed(completeConfig, failed), false);
}

function testExpiredBlocks() {
  const expired = expireState({
    ageStatus: "assured",
    ageBand: "adult",
    assuranceMethod: "staff_verification",
    assertedOverThreshold: true,
    guardianRequired: false,
    guardianStatus: "none",
    expiresAt: new Date(Date.now() - 1000),
  });
  assert.equal(expired.ageStatus, "expired");
  assert.equal(restrictedProcessingAllowed(completeConfig, expired), false);
}

function testClientCannotForgeContext() {
  const issued = issueAgeContext({
    organizationId: "org-a",
    websiteId: "site-a",
    sessionId: "sess-1",
    ageStatus: "unknown",
    guardianStatus: "none",
    restrictedProcessingAllowed: false,
  });
  const ok = verifyAgeContext(issued.token, { organizationId: "org-a", websiteId: "site-a" });
  assert.equal(ok.ok, true);
  const forged = verifyAgeContext(issued.token, { organizationId: "org-b", websiteId: "site-a" });
  assert.equal(forged.ok, false);
  assert.equal(forged.reason, "tenant_mismatch");
  const view = publicAgeView({ config: completeConfig, state: null });
  assert.equal(view.restrictedProcessingAllowed, false);
  assert.equal(view.selfDeclarationIsNotVerified, true);
}

function testTokenReuseExpiryLock() {
  const now = new Date();
  assert.equal(tokenReusable({ usedAt: now, expiresAt: future(), failedAttempts: 0 }).reason, "reused");
  assert.equal(tokenReusable({ usedAt: null, expiresAt: new Date(now.getTime() - 1), failedAttempts: 0 }).reason, "expired");
  assert.equal(tokenReusable({ usedAt: null, expiresAt: future(), failedAttempts: 5 }).reason, "locked");
  assert.equal(tokenReusable({ usedAt: null, expiresAt: future(), failedAttempts: 0 }).ok, true);
}

function testTrackerEnforcement() {
  const grants = applyChildRestrictionsToGrants(
    { purposes: { ads: true, necessary: true }, vendors: {} },
    [
      { id: "ads", key: "advertising", isRequired: false },
      { id: "necessary", key: "necessary", isRequired: true },
    ],
    completeConfig,
    null,
  );
  assert.equal(grants.purposes.ads, false);
  assert.equal(grants.purposes.necessary, true);
  assert.equal(shouldBlock({
    id: "t1",
    name: "ads",
    type: "script",
    domain: "ads.example",
    identifier: "ads.js",
    purposeKey: "advertising",
    purposeId: "ads",
    vendorId: null,
    isEssential: false,
    status: "active",
  }, grants), true);
  assert.equal(shouldBlock({
    id: "t2",
    name: "essential",
    type: "script",
    domain: null,
    identifier: null,
    purposeKey: "necessary",
    purposeId: "necessary",
    vendorId: null,
    isEssential: true,
    status: "active",
  }, grants), false);
}

function testConsentEngineChildRestricted() {
  const result = evaluateConsentSnapshot(
    { purposeKeys: ["advertising", "necessary"], vendorDomains: [], trackerIds: ["tracker-ads"], dataCategories: [] },
    {
      record: { status: "accepted", expiresAt: future(), withdrawnAt: null },
      decisions: [{ purposeId: "ads", vendorId: null, granted: true }],
      purposes: [
        { id: "ads", key: "advertising", isRequired: false, status: "active", dataCategories: [] },
        { id: "necessary", key: "necessary", isRequired: true, status: "active", dataCategories: [] },
      ],
      vendors: [],
      trackers: [{ id: "tracker-ads", purposeId: "ads", vendorId: null, isEssential: false, status: "active" }],
      childProtection: { restrictedPurposeKeys: ["advertising"], allowRestricted: false },
    },
  );
  assert.equal(result.results.purposes[0].reasonCode, "CHILD_RESTRICTED");
  assert.equal(result.results.purposes[1].reasonCode, "ESSENTIAL_PURPOSE");
  assert.equal(result.results.trackers[0].reasonCode, "CHILD_RESTRICTED");
}

function childSnapshot(overrides) {
  return {
    policy: { id: "p", name: "Policy", websiteId: "w", organizationId: "o" },
    website: { id: "w", name: "Site", defaultRegulationKey: "gdpr", defaultRegion: "DE" },
    organization: {
      id: "o", name: "Org", dpoName: "Ada", dpoEmail: "ada@example.com",
      grievanceOfficerName: "Ada", grievanceOfficerEmail: "g@example.com", grievancePortalUrl: null, settings: {},
    },
    version: { id: "v", version: 1, isPublished: false },
    banner: {
      title: "Notice", description: "Choose", privacyPolicyUrl: "https://example.com/p",
      defaultConsent: "none", showRejectAll: true, showCustomize: true, showPreferenceWidget: true,
      showPurposeDescriptions: true, showVendorList: true, preferenceCenterDescription: "Manage",
    },
    declarations: { childDirected: true, childAgeThreshold: null, guardianConsentRequired: false },
    childProtection: { enabled: true, childDirected: true, ageAssuranceRequired: false, minimumAge: null, guardianConsentRequired: false, restrictedPurposeKeys: [] },
    purposes: [
      { id: "n", key: "necessary", name: "Necessary", description: "Required", isRequired: true, legalBasis: "legal_obligation", dataCategories: ["Device"], retentionPeriod: "Session" },
      { id: "a", key: "advertising", name: "Ads", description: "Ads", isRequired: false, legalBasis: "consent", dataCategories: ["Usage"], retentionPeriod: "13 months" },
    ],
    vendors: [{ id: "v1", name: "Ads Co", privacyPolicyUrl: "https://vendor.example/p", country: "DE" }],
    trackers: [{ id: "t", name: "ads.js", status: "active", isEssential: false, purposeId: "a", vendorId: "v1", scannerClassification: "mapped" }],
    consentIntegrations: { iabTcfEnabled: false, iabGppEnabled: false },
    assignedRegulationKeys: ["gdpr"],
    rightsByJurisdiction: { gdpr: ["access", "correction", "erasure", "restriction", "objection", "portability", "withdraw_consent"] },
    gpcRuntimeSupported: false,
    optOutPropagationImplemented: false,
    ...overrides,
  };
}

function testPublicationRules() {
  const missing = evaluatePolicyCompliance(childSnapshot());
  const codes = missing.errors.map((row) => row.code);
  assert.equal(missing.valid, false);
  assert.ok(codes.includes("CHILD_PROTECTION_CONFIG_MISSING"));
  assert.ok(codes.includes("AGE_ASSURANCE_REQUIRED"));
  assert.ok(codes.includes("GUARDIAN_WORKFLOW_MISSING"));
  assert.ok(codes.includes("CHILD_ADVERTISING_CONTROL_MISSING"));

  const ready = evaluatePolicyCompliance(childSnapshot({
    declarations: { childDirected: true, childAgeThreshold: 16, guardianConsentRequired: true },
    childProtection: completeConfig,
  }));
  const readyCodes = ready.errors.map((row) => row.code);
  assert.equal(readyCodes.includes("CHILD_PROTECTION_CONFIG_MISSING"), false);
  assert.equal(readyCodes.includes("AGE_ASSURANCE_REQUIRED"), false);
  assert.equal(readyCodes.includes("GUARDIAN_WORKFLOW_MISSING"), false);
  assert.equal(ready.valid, true);
}

function testSourceSecurity() {
  const ageRoute = fs.readFileSync(path.join(__dirname, "../../app/api/age-assurance/route.ts"), "utf8");
  assert.match(ageRoute, /Client age or guardian claims are ignored/);
  assert.match(ageRoute, /eq\(websites\.siteKey, siteKey\)/);
  assert.doesNotMatch(ageRoute, /body\.organizationId/);
  const verify = fs.readFileSync(path.join(__dirname, "../../app/api/guardian-consent/verify/route.ts"), "utf8");
  assert.match(verify, /verifyGuardianToken/);
  assert.match(verify, /authorityVerified/);
  const service = fs.readFileSync(path.join(__dirname, "./service.ts"), "utf8");
  assert.match(service, /hashRightsToken/);
  assert.match(service, /usedAt: new Date\(\)/);
  assert.match(service, /authority_unverified|applyGuardianContactVerified/);
  assert.doesNotMatch(service, /tokenHash: guardianToken/);
  const childRoute = fs.readFileSync(path.join(__dirname, "../../app/api/websites/[id]/child-protection/route.ts"), "utf8");
  assert.match(childRoute, /eq\(websites\.organizationId, organization\.id\)/);
  const attest = fs.readFileSync(path.join(__dirname, "../../app/api/websites/[id]/child-protection/attest/route.ts"), "utf8");
  assert.match(attest, /eq\(websites\.organizationId, organization\.id\)/);
  assert.match(attest, /Owner|Admin/);
}

function testConfigParse() {
  const parsed = parseChildProtectionConfig({ enabled: true, childDirected: true, minimumAge: 13, guardianConsentRequired: true });
  assert.equal(parsed.ageAssuranceRequired, true);
  assert.equal(childProtectionIsComplete(parsed), true);
  assert.equal(childProtectionIsComplete(defaultChildProtectionConfig()), true);
}

testUnknownBlocksRestricted();
testSelfDeclarationIsNotAssured();
testStaffAssuranceUnlocks();
testMinorAndGuardianStates();
testExpiredBlocks();
testClientCannotForgeContext();
testTokenReuseExpiryLock();
testTrackerEnforcement();
testConsentEngineChildRestricted();
testPublicationRules();
testSourceSecurity();
testConfigParse();
console.log("children age guardian tests passed");
