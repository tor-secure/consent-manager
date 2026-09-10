const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const compiledDir = path.join(__dirname, "../../../.tmp/compiled/src/lib/processing");
const { buildProcessingSnapshot, evidenceProcessingInventory, isFrozenProcessingSnapshot } = require(path.join(compiledDir, "snapshot.js"));
const { collectProcessingIssues } = require(path.join(compiledDir, "validate.js"));
const { locationsSuggestTransfer } = require(path.join(compiledDir, "regions.js"));
const { evaluatePolicyCompliance, canPublish } = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/compliance/evaluate.js"));

const root = path.join(__dirname, "../../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function vendor(overrides = {}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    key: "vendor_a",
    name: "Vendor A",
    legalName: "Vendor A Ltd",
    role: "processor",
    country: "US",
    processingCountries: ["US"],
    privacyPolicyUrl: "https://vendor-a.example/privacy",
    dpaStatus: "recorded",
    dpaReference: "DPA-1",
    dpaEffectiveAt: "2026-01-01T00:00:00.000Z",
    downstreamDsarMode: "required",
    status: "active",
    purposes: [{ purposeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", purposeKey: "analytics", processingRole: "processor" }],
    ...overrides,
  };
}

function frozenFromLive(liveVendor, extras = {}) {
  return buildProcessingSnapshot({
    frozenAt: "2026-09-10T07:00:00.000Z",
    policyVersionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    policyVersion: 3,
    inventory: {
      vendors: [liveVendor],
      activities: extras.activities ?? [{
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        vendorId: liveVendor.id,
        websiteId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        purposeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        purposeKey: "analytics",
        description: "Analytics processing",
        dataCategories: ["Usage data"],
        sensitive: false,
        processingRole: "processor",
        processingLocation: "US",
        transferRequired: true,
        legalBasis: "consent",
        status: "active",
      }],
      relationships: extras.relationships ?? [],
      transfers: extras.transfers ?? [{
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        vendorId: liveVendor.id,
        websiteId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        processingActivityId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        sourceCountry: "DE",
        destinationCountry: "US",
        destinationRegion: "us",
        destinationType: "vendor",
        transferPurpose: "analytics",
        dataCategories: ["Usage data"],
        processingLocation: "US",
        mechanism: "scc",
        safeguards: "EU SCCs module 2",
        documentationRef: "TIA-1",
        effectiveAt: "2026-01-01T00:00:00.000Z",
        reviewAt: "2027-01-01T00:00:00.000Z",
        status: "active",
      }],
    },
  });
}

function testSnapshotIsDeterministicAndMinimized() {
  const first = frozenFromLive(vendor());
  const second = frozenFromLive(vendor());
  assert.deepEqual(first, second);
  assert.equal(isFrozenProcessingSnapshot(first), true);
  assert.equal("notes" in first.transfers[0], false);
  assert.equal("dpaReference" in first.vendors[0], true);
}

function testPublishThenChangeVendorLeavesSnapshot() {
  const live = vendor({ role: "processor", country: "US" });
  const published = frozenFromLive(live);
  live.role = "controller";
  live.country = "IN";
  live.dpaStatus = "expired";
  assert.equal(published.vendors[0].role, "processor");
  assert.equal(published.vendors[0].country, "US");
  assert.equal(published.vendors[0].dpaStatus, "recorded");
  const later = frozenFromLive(live);
  assert.notEqual(later.vendors[0].role, published.vendors[0].role);
}

function testConsentEvidenceCopiesFrozenSnapshot() {
  const published = frozenFromLive(vendor());
  const evidence = evidenceProcessingInventory(published);
  const liveChanged = frozenFromLive(vendor(), {
    transfers: [{
      ...published.transfers[0],
      mechanism: "adequacy",
    }],
  });
  const laterEvidence = evidenceProcessingInventory(liveChanged);
  assert.equal(evidence.transfers[0].mechanism, "scc");
  assert.equal(laterEvidence.transfers[0].mechanism, "adequacy");
  assert.notEqual(laterEvidence.transfers[0].mechanism, evidence.transfers[0].mechanism);
}

function testArchiveDoesNotRequireLiveVendorForHistory() {
  const published = frozenFromLive(vendor({ status: "active" }));
  const archivedLive = vendor({ status: "archived" });
  assert.equal(published.vendors[0].status, "active");
  assert.equal(archivedLive.status, "archived");
  assert.equal(isFrozenProcessingSnapshot(published), true);
}

function testValidationBlocksIncompleteInventory() {
  const issues = collectProcessingIssues({
    websiteRegion: "DE",
    jurisdictions: ["gdpr"],
    internationalTransfersDeclared: false,
    declarationTransferMechanism: null,
    dpaRequired: true,
    nowIso: "2026-09-10T00:00:00.000Z",
    vendors: [
      vendor({ role: "unknown", dpaStatus: "not_configured", status: "archived" }),
      vendor({
        id: "99999999-9999-4999-8999-999999999999",
        key: "vendor_b",
        name: "Vendor B",
        role: "processor",
        dpaStatus: "not_configured",
        status: "active",
        country: "US",
        processingCountries: ["US"],
        purposes: [],
      }),
    ],
    activities: [{
      id: "act-1",
      vendorId: vendor().id,
      websiteId: null,
      purposeId: null,
      purposeKey: null,
      description: null,
      dataCategories: [],
      sensitive: false,
      processingRole: "subprocessor",
      processingLocation: "US",
      transferRequired: true,
      legalBasis: null,
      status: "active",
    }],
    relationships: [],
    transfers: [{
      id: "tr-1",
      vendorId: vendor().id,
      websiteId: null,
      processingActivityId: null,
      sourceCountry: "DE",
      destinationCountry: null,
      destinationRegion: null,
      destinationType: "vendor",
      transferPurpose: null,
      dataCategories: [],
      processingLocation: null,
      mechanism: "not_configured",
      safeguards: null,
      documentationRef: null,
      effectiveAt: null,
      reviewAt: "2020-01-01T00:00:00.000Z",
      status: "active",
    }],
  });
  const codes = issues.map((row) => row.code);
  assert.ok(codes.includes("VENDOR_ROLE_MISSING"));
  assert.ok(codes.includes("INACTIVE_VENDOR_REFERENCED"));
  assert.ok(codes.includes("VENDOR_DPA_CONFIGURATION_MISSING"));
  assert.ok(codes.includes("PROCESSING_ACTIVITY_PURPOSE_MISSING"));
  assert.ok(codes.includes("PROCESSING_ACTIVITY_DATA_CATEGORY_MISSING"));
  assert.ok(codes.includes("TRANSFER_DESTINATION_MISSING"));
  assert.ok(codes.includes("TRANSFER_MECHANISM_MISSING"));
  assert.ok(codes.includes("SUBPROCESSOR_RELATIONSHIP_MISSING"));
  assert.ok(codes.includes("TRANSFER_REVIEW_EXPIRED"));
}

function testPublicationUsesInventoryErrors() {
  const result = evaluatePolicyCompliance({
    policy: { id: "11111111-1111-4111-8111-111111111111", name: "Site policy", websiteId: "22222222-2222-4222-8222-222222222222", organizationId: "33333333-3333-4333-8333-333333333333" },
    website: { id: "22222222-2222-4222-8222-222222222222", name: "Example", defaultRegulationKey: "gdpr", defaultRegion: "DE" },
    organization: {
      id: "33333333-3333-4333-8333-333333333333", name: "Example Ltd", dpoName: "Ada", dpoEmail: "ada@example.com",
      grievanceOfficerName: "Ada", grievanceOfficerEmail: "grievance@example.com", grievancePortalUrl: "https://example.com/grievance", settings: {},
    },
    version: { id: "44444444-4444-4444-8444-444444444444", version: 2, isPublished: false },
    banner: {
      title: "We use cookies", description: "Choose how this site may process your data.", privacyPolicyUrl: "https://example.com/privacy",
      defaultConsent: "none", showRejectAll: true, showCustomize: true, showPreferenceWidget: true,
      showPurposeDescriptions: true, showVendorList: true, preferenceCenterDescription: "Manage your choices.",
    },
    declarations: {
      childDirected: false, childAgeThreshold: null, guardianConsentRequired: false, automatedDecisionMaking: false,
      profilingDisclosed: false, specialCategoryProcessing: false, specialCategoryCondition: null, doNotSellEnabled: false,
      doNotShareEnabled: false, gpcHonored: false, financialIncentive: false, financialIncentiveDisclosed: false,
      internationalTransfers: false, transferMechanism: null, consentManagerMode: false, consentManagerRegistrationId: null,
      serviceProviderDisclosed: false,
    },
    purposes: [{
      id: "55555555-5555-4555-8555-555555555555", key: "necessary", name: "Necessary", description: "Required to run the site.",
      isRequired: true, legalBasis: "legal_obligation", dataCategories: ["Device data"], retentionPeriod: "Session",
    }],
    vendors: [{
      id: vendor().id, name: "Vendor A", privacyPolicyUrl: "https://vendor-a.example/privacy", country: "US",
      role: "unknown", status: "active", dpaStatus: "not_configured",
    }],
    trackers: [],
    consentIntegrations: { iabTcfEnabled: false, iabGppEnabled: false },
    assignedRegulationKeys: ["gdpr"],
    rightsByJurisdiction: { gdpr: ["access", "correction", "erasure", "restriction", "objection", "portability", "withdraw_consent"] },
    gpcRuntimeSupported: false,
    optOutPropagationImplemented: false,
  });
  assert.equal(canPublish(result), false);
  assert.ok(result.errors.some((row) => row.code === "VENDOR_ROLE_MISSING"));
  assert.ok(result.errors.some((row) => row.code === "TRANSFER_MECHANISM_MISSING"));
}

function testLocationHeuristic() {
  assert.equal(locationsSuggestTransfer("DE", ["US"]), true);
  assert.equal(locationsSuggestTransfer("DE", ["FR"]), false);
  assert.equal(locationsSuggestTransfer("GB", ["US"]), true);
}

function testTenantIsolationAndSoftDeleteInSource() {
  const vendorRoute = read("src/app/api/vendors/[id]/route.ts");
  const activityRoute = read("src/app/api/processing-activities/[id]/route.ts");
  const transferRoute = read("src/app/api/transfers/[id]/route.ts");
  const publishRoute = read("src/app/api/policies/[id]/publish/route.ts");
  const recordRoute = read("src/app/api/consent/record/route.ts");
  const draft = read("src/lib/policy-draft-version.ts");
  const trackerHttp = read("src/lib/trackers/http.ts");
  const downstream = read("src/app/api/settings/rights-requests/[id]/downstream/route.ts");

  for (const source of [vendorRoute, activityRoute, transferRoute, downstream]) {
    assert.match(source, /organizationId/);
    assert.match(source, /404/);
  }
  assert.match(vendorRoute, /status: "archived"/);
  assert.doesNotMatch(vendorRoute, /\.delete\(/);
  assert.match(transferRoute, /status: "archived"/);
  assert.match(publishRoute, /buildLivePolicyProcessingSnapshot/);
  assert.match(publishRoute, /ignoreClientComplianceClaims/);
  assert.doesNotMatch(publishRoute, /body\.validated/);
  assert.doesNotMatch(publishRoute, /body\.organizationId/);
  assert.match(draft, /processingSnapshot: \{\}/);
  assert.match(recordRoute, /isFrozenProcessingSnapshot\(contextVersion\.processingSnapshot\)/);
  assert.doesNotMatch(recordRoute, /loadLiveProcessingInventory/);
  assert.match(trackerHttp, /Archived or inactive vendors cannot be mapped/);
  assert.match(downstream, /DOWNSTREAM_ACTION_DISCLAIMER/);
  assert.match(read("src/lib/privacy-rights/types.ts"), /does not claim that it performed/);
}

function testSdkOmitsPrivateVendorFields() {
  const source = read("src/app/api/sdk/[siteKey]/config/route.ts");
  assert.match(source, /role: vendors.role/);
  assert.doesNotMatch(source, /dpaStatus: vendors.dpaStatus/);
  assert.doesNotMatch(source, /dpaReference: vendors.dpaReference/);
}

testSnapshotIsDeterministicAndMinimized();
testPublishThenChangeVendorLeavesSnapshot();
testConsentEvidenceCopiesFrozenSnapshot();
testArchiveDoesNotRequireLiveVendorForHistory();
testValidationBlocksIncompleteInventory();
testPublicationUsesInventoryErrors();
testLocationHeuristic();
testTenantIsolationAndSoftDeleteInSource();
testSdkOmitsPrivateVendorFields();
console.log("processing inventory tests passed");
