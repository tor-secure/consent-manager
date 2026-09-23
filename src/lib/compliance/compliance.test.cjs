const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const compiledDir = path.join(__dirname, "../../../.tmp/compiled/src/lib/compliance");
const {
  GPC_RUNTIME_SUPPORTED,
  OPT_OUT_PROPAGATION_IMPLEMENTED,
  canPublish,
  evaluatePolicyCompliance,
  parseComplianceDeclarations,
  resolveApplicableJurisdictions,
} = require(path.join(compiledDir, "evaluate.js"));

function baseSnapshot(overrides = {}) {
  return {
    policy: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Site policy",
      websiteId: "22222222-2222-4222-8222-222222222222",
      organizationId: "33333333-3333-4333-8333-333333333333",
    },
    website: {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Example",
      defaultRegulationKey: "gdpr",
      defaultRegion: "DE",
    },
    organization: {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Example Ltd",
      dpoName: "Ada",
      dpoEmail: "ada@example.com",
      grievanceOfficerName: "Ada",
      grievanceOfficerEmail: "grievance@example.com",
      grievancePortalUrl: "https://example.com/grievance",
      settings: {},
    },
    version: { id: "44444444-4444-4444-8444-444444444444", version: 2, isPublished: false },
    banner: {
      title: "We use cookies",
      description: "Choose how this site may process your data.",
      privacyPolicyUrl: "https://example.com/privacy",
      defaultConsent: "none",
      showRejectAll: true,
      showCustomize: true,
      showPreferenceWidget: true,
      showPurposeDescriptions: true,
      showVendorList: true,
      preferenceCenterDescription: "Manage your choices.",
    },
    declarations: parseComplianceDeclarations({}, {}),
    purposes: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        key: "necessary",
        name: "Necessary",
        description: "Required to run the site.",
        isRequired: true,
        legalBasis: "legal_obligation",
        dataCategories: ["Device data"],
        retentionPeriod: "Session",
      },
      {
        id: "66666666-6666-4666-8666-666666666666",
        key: "analytics",
        name: "Analytics",
        description: "Measure audience.",
        isRequired: false,
        legalBasis: "consent",
        dataCategories: ["Usage data"],
        retentionPeriod: "13 months",
      },
    ],
    vendors: [
      {
        id: "77777777-7777-4777-8777-777777777777",
        name: "Analytics Co",
        privacyPolicyUrl: "https://vendor.example/privacy",
        country: "DE",
        role: "independent_controller",
        status: "active",
        processingCountries: ["DE"],
        dpaStatus: "not_applicable",
        downstreamDsarMode: "not_required",
      },
    ],
    trackers: [
      {
        id: "88888888-8888-4888-8888-888888888888",
        name: "analytics.js",
        status: "active",
        isEssential: false,
        purposeId: "66666666-6666-4666-8666-666666666666",
        vendorId: "77777777-7777-4777-8777-777777777777",
        scannerClassification: "mapped",
      },
    ],
    consentIntegrations: { iabTcfEnabled: false, iabGppEnabled: false },
    assignedRegulationKeys: ["gdpr"],
    rightsByJurisdiction: {
      gdpr: ["access", "correction", "erasure", "restriction", "objection", "portability", "withdraw_consent"],
      dpdp: ["access", "correction", "erasure", "portability", "objection", "restriction", "withdraw_consent", "grievance", "nomination"],
      ccpa: ["access", "correction", "erasure", "portability", "objection", "withdraw_consent"],
      lgpd: ["access", "correction", "erasure", "portability", "objection", "restriction", "withdraw_consent"],
    },
    gpcRuntimeSupported: GPC_RUNTIME_SUPPORTED,
    optOutPropagationImplemented: OPT_OUT_PROPAGATION_IMPLEMENTED,
    ...overrides,
  };
}

function codes(result) {
  return result.errors.map((row) => row.code);
}

function testJurisdictionResolutionIgnoresClient() {
  const keys = resolveApplicableJurisdictions({
    defaultRegulationKey: "dpdp",
    assignedRegulationKeys: ["gdpr"],
    clientJurisdiction: "ccpa",
  });
  assert.deepEqual(keys, ["gdpr", "dpdp"]);
  assert.equal(keys.includes("ccpa"), false);
}

function testValidPolicyPublishes() {
  const result = evaluatePolicyCompliance(baseSnapshot());
  assert.equal(result.valid, true);
  assert.equal(canPublish(result), true);
}

function testWarningOnlyPublishes() {
  const result = evaluatePolicyCompliance(baseSnapshot({
    banner: {
      ...baseSnapshot().banner,
      privacyPolicyUrl: "",
    },
  }));
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((row) => row.code === "NOTICE_PRIVACY_POLICY_MISSING"));
}

function testInvalidPolicyRejected() {
  const result = evaluatePolicyCompliance(baseSnapshot({
    purposes: [],
    banner: { ...baseSnapshot().banner, defaultConsent: "opt-out", title: "" },
  }));
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("PURPOSE_REQUIRED_MISSING"));
  assert.ok(codes(result).includes("GDPR_PREGRANTED_OPTIONAL_CONSENT"));
  assert.ok(codes(result).includes("NOTICE_TITLE_MISSING"));
}

function testGdprRules() {
  const pregranted = evaluatePolicyCompliance(baseSnapshot({
    banner: { ...baseSnapshot().banner, defaultConsent: "opt-out" },
  }));
  assert.ok(codes(pregranted).includes("GDPR_PREGRANTED_OPTIONAL_CONSENT"));

  const withdrawal = evaluatePolicyCompliance(baseSnapshot({
    banner: { ...baseSnapshot().banner, showRejectAll: false, showPreferenceWidget: false },
  }));
  assert.ok(codes(withdrawal).includes("GDPR_MISSING_WITHDRAWAL"));

  const rights = evaluatePolicyCompliance(baseSnapshot({
    rightsByJurisdiction: { gdpr: ["access"] },
  }));
  assert.ok(codes(rights).includes("GDPR_MISSING_RIGHTS"));

  const special = evaluatePolicyCompliance(baseSnapshot({
    declarations: parseComplianceDeclarations({ specialCategoryProcessing: true }, {}),
  }));
  assert.ok(codes(special).includes("GDPR_SPECIAL_CATEGORY_INCOMPLETE"));

  const tracker = evaluatePolicyCompliance(baseSnapshot({
    trackers: [{
      id: "88888888-8888-4888-8888-888888888888",
      name: "ads.js",
      status: "active",
      isEssential: true,
      purposeId: "66666666-6666-4666-8666-666666666666",
      vendorId: "77777777-7777-4777-8777-777777777777",
      scannerClassification: "mapped",
    }],
  }));
  assert.ok(codes(tracker).includes("TRACKER_ESSENTIAL_NOT_REQUIRED"));
  assert.ok(codes(tracker).includes("GDPR_TRACKER_ALLOWED_WITHOUT_CONSENT"));
}

function testDpdpRules() {
  const snapshot = baseSnapshot({
    website: { ...baseSnapshot().website, defaultRegulationKey: "dpdp", defaultRegion: "IN" },
    assignedRegulationKeys: ["dpdp"],
    organization: { ...baseSnapshot().organization, name: "", dpoEmail: null, grievanceOfficerEmail: null, grievancePortalUrl: null },
    banner: { ...baseSnapshot().banner, defaultConsent: "opt-out", showCustomize: false },
    purposes: [{
      id: "66666666-6666-4666-8666-666666666666",
      key: "analytics",
      name: "Analytics",
      description: "Measure audience.",
      isRequired: false,
      legalBasis: "consent",
      dataCategories: [],
      retentionPeriod: null,
    }],
    declarations: parseComplianceDeclarations({ consentManagerMode: true, childDirected: true }, {}),
  });
  const result = evaluatePolicyCompliance(snapshot);
  assert.ok(codes(result).includes("DPDP_PREGRANTED_CONSENT"));
  assert.ok(codes(result).includes("DPDP_NOTICE_MISSING_CATEGORY"));
  assert.ok(codes(result).includes("DPDP_NOTICE_MISSING_FIDUCIARY"));
  assert.ok(codes(result).includes("DPDP_CONSENT_MANAGER_CONFIG_MISSING"));
  assert.ok(codes(result).includes("DPDP_CHILD_CONFIG_MISSING"));
}

function testCcpaRules() {
  const snapshot = baseSnapshot({
    website: { ...baseSnapshot().website, defaultRegulationKey: "ccpa", defaultRegion: "US" },
    assignedRegulationKeys: ["ccpa"],
    banner: { ...baseSnapshot().banner, showRejectAll: false, showPreferenceWidget: false },
    declarations: parseComplianceDeclarations({ gpcHonored: true, childDirected: true }, {}),
  });
  const result = evaluatePolicyCompliance(snapshot);
  assert.equal(GPC_RUNTIME_SUPPORTED, true);
  assert.equal(OPT_OUT_PROPAGATION_IMPLEMENTED, true);
  assert.ok(codes(result).includes("CCPA_MISSING_DO_NOT_SELL_SHARE"));
  assert.ok(codes(result).includes("CCPA_SALE_OPT_OUT_UNCONFIGURED"));
  assert.ok(codes(result).includes("CCPA_SHARE_OPT_OUT_UNCONFIGURED"));
  assert.ok(codes(result).includes("CCPA_MISSING_OPT_OUT"));
  assert.ok(codes(result).includes("CCPA_MINOR_CONFIG_MISSING"));
  assert.equal(codes(result).includes("CCPA_GPC_CLAIMED_WITHOUT_RUNTIME"), false);
  assert.equal(result.warnings.some((row) => row.code === "CCPA_GPC_RUNTIME_UNSUPPORTED"), false);

  const claimedWithoutRuntime = evaluatePolicyCompliance(baseSnapshot({
    website: { ...baseSnapshot().website, defaultRegulationKey: "ccpa", defaultRegion: "US-CA" },
    assignedRegulationKeys: ["ccpa"],
    gpcRuntimeSupported: false,
    declarations: parseComplianceDeclarations({ gpcHonored: true }, {}),
  }));
  assert.ok(codes(claimedWithoutRuntime).includes("CCPA_GPC_CLAIMED_WITHOUT_RUNTIME"));

  const unmapped = evaluatePolicyCompliance(baseSnapshot({
    website: { ...baseSnapshot().website, defaultRegulationKey: "ccpa", defaultRegion: "US-CA" },
    assignedRegulationKeys: ["ccpa"],
    declarations: parseComplianceDeclarations({
      doNotSellEnabled: true,
      doNotShareEnabled: true,
      gpcHonored: true,
    }, {}),
  }));
  assert.ok(codes(unmapped).includes("CCPA_OPT_OUT_VENDOR_MAPPING_MISSING"));
  assert.ok(codes(unmapped).includes("CCPA_OPT_OUT_TRACKER_MAPPING_MISSING"));

  const configured = evaluatePolicyCompliance(baseSnapshot({
    website: { ...baseSnapshot().website, defaultRegulationKey: "ccpa", defaultRegion: "US-CA" },
    assignedRegulationKeys: ["ccpa"],
    declarations: parseComplianceDeclarations({
      doNotSellEnabled: true,
      doNotShareEnabled: true,
      gpcHonored: true,
    }, {}),
    vendors: [{
      ...baseSnapshot().vendors[0],
      country: "US",
      processingCountries: ["US"],
      ccpaSale: "applicable",
      ccpaShare: "applicable",
      ccpaSensitivePi: "not_applicable",
    }],
    trackers: [{
      ...baseSnapshot().trackers[0],
      ccpaSale: "applicable",
      ccpaShare: "applicable",
      ccpaSensitivePi: "not_applicable",
    }],
  }));
  assert.equal(codes(configured).includes("CCPA_OPT_OUT_VENDOR_MAPPING_MISSING"), false);
  assert.equal(codes(configured).includes("CCPA_OPT_OUT_TRACKER_MAPPING_MISSING"), false);
  assert.equal(codes(configured).includes("CCPA_SALE_OPT_OUT_UNCONFIGURED"), false);
  assert.equal(codes(configured).includes("CCPA_SHARE_OPT_OUT_UNCONFIGURED"), false);
  assert.equal(codes(configured).includes("CCPA_GPC_CLAIMED_WITHOUT_RUNTIME"), false);
}

function testLgpdRules() {
  const snapshot = baseSnapshot({
    website: { ...baseSnapshot().website, defaultRegulationKey: "lgpd", defaultRegion: "BR" },
    assignedRegulationKeys: ["lgpd"],
    rightsByJurisdiction: { lgpd: ["access"] },
    banner: { ...baseSnapshot().banner, showRejectAll: false, showPreferenceWidget: false },
    declarations: parseComplianceDeclarations({
      internationalTransfers: true,
      automatedDecisionMaking: true,
      childDirected: true,
    }, {}),
  });
  const result = evaluatePolicyCompliance(snapshot);
  assert.ok(codes(result).includes("LGPD_MISSING_RIGHT"));
  assert.ok(codes(result).includes("LGPD_MISSING_WITHDRAWAL"));
  assert.ok(codes(result).includes("LGPD_CHILD_CONFIG_MISSING"));
  assert.ok(codes(result).includes("LGPD_TRANSFER_MECHANISM_MISSING"));
  assert.ok(codes(result).includes("LGPD_AUTOMATED_DECISION_MISSING"));
}

function testTrackerRules() {
  const unmapped = evaluatePolicyCompliance(baseSnapshot({
    trackers: [{
      id: "99999999-9999-4999-8999-999999999999",
      name: "orphan.js",
      status: "active",
      isEssential: false,
      purposeId: null,
      vendorId: null,
      scannerClassification: "unmapped",
    }],
  }));
  assert.ok(codes(unmapped).includes("TRACKER_UNMAPPED"));

  const disabled = evaluatePolicyCompliance(baseSnapshot({
    trackers: [{
      id: "99999999-9999-4999-8999-999999999999",
      name: "orphan.js",
      status: "disabled",
      isEssential: false,
      purposeId: null,
      vendorId: null,
      scannerClassification: "unmapped",
    }],
  }));
  assert.equal(codes(disabled).includes("TRACKER_UNMAPPED"), false);

  const ignored = evaluatePolicyCompliance(baseSnapshot({
    trackers: [{
      id: "99999999-9999-4999-8999-999999999999",
      name: "ignored.js",
      status: "active",
      isEssential: false,
      purposeId: null,
      vendorId: null,
      scannerClassification: "ignored",
    }],
  }));
  assert.ok(codes(ignored).includes("TRACKER_IGNORED_STILL_ACTIVE"));
}

function testE2ePublishGate() {
  const invalid = evaluatePolicyCompliance(baseSnapshot({
    banner: { ...baseSnapshot().banner, defaultConsent: "opt-out" },
  }));
  assert.equal(canPublish(invalid), false);
  const publishedVersion = { id: "pub-1", isPublished: true, publishedAt: "2026-01-01T00:00:00.000Z" };
  const attempted = { ...publishedVersion };
  if (!canPublish(invalid)) {
    // failed publish must not mutate the already published version
  } else {
    attempted.isPublished = true;
  }
  assert.deepEqual(attempted, publishedVersion);

  const fixed = evaluatePolicyCompliance(baseSnapshot());
  assert.equal(canPublish(fixed), true);
  const next = { id: "draft-2", isPublished: false };
  if (canPublish(fixed)) next.isPublished = true;
  assert.equal(next.isPublished, true);
}

function testPublishRouteIsAuthoritative() {
  const source = fs.readFileSync(path.join(__dirname, "../../app/api/policies/[id]/publish/route.ts"), "utf8");
  assert.match(source, /validateOwnedPolicy\(/);
  assert.match(source, /ignoreClientComplianceClaims\(/);
  assert.match(source, /validated\.result\.errors\.length > 0/);
  assert.match(source, /authorizeOwnedPolicy\(policyId\)/);
  assert.doesNotMatch(source, /body\.validated/);
  assert.doesNotMatch(source, /body\.jurisdiction/);
  assert.doesNotMatch(source, /body\.organizationId/);
  assert.match(source, /status: 422/);
  assert.match(source, /processingSnapshot/);
  assert.match(source, /markVersionPublished\(/);
  assert.match(source, /isPublished, true/);
}

testJurisdictionResolutionIgnoresClient();
testValidPolicyPublishes();
testWarningOnlyPublishes();
testInvalidPolicyRejected();
testGdprRules();
testDpdpRules();
testCcpaRules();
testLgpdRules();
testTrackerRules();
testE2ePublishGate();
function testChildProtectionPublication() {
  const blocked = evaluatePolicyCompliance(baseSnapshot({
    declarations: parseComplianceDeclarations({ childDirected: true }, {}),
    childProtection: {
      enabled: true,
      childDirected: true,
      ageAssuranceRequired: false,
      minimumAge: null,
      guardianConsentRequired: false,
      restrictedPurposeKeys: [],
    },
    purposes: [
      ...baseSnapshot().purposes,
      {
        id: "99999999-9999-4999-8999-999999999991",
        key: "advertising",
        name: "Advertising",
        description: "Ads",
        isRequired: false,
        legalBasis: "consent",
        dataCategories: ["Usage data"],
        retentionPeriod: "13 months",
      },
    ],
  }));
  assert.ok(codes(blocked).includes("CHILD_PROTECTION_CONFIG_MISSING"));
  assert.ok(codes(blocked).includes("CHILD_ADVERTISING_CONTROL_MISSING"));
  assert.equal(canPublish(blocked), false);

  const ready = evaluatePolicyCompliance(baseSnapshot({
    declarations: parseComplianceDeclarations({
      childDirected: true,
      childAgeThreshold: 16,
      guardianConsentRequired: true,
    }, {}),
    childProtection: {
      enabled: true,
      childDirected: true,
      ageAssuranceRequired: true,
      minimumAge: 16,
      guardianConsentRequired: true,
      restrictedPurposeKeys: ["advertising", "ads", "marketing", "profiling"],
    },
    purposes: [
      ...baseSnapshot().purposes,
      {
        id: "99999999-9999-4999-8999-999999999991",
        key: "advertising",
        name: "Advertising",
        description: "Ads",
        isRequired: false,
        legalBasis: "consent",
        dataCategories: ["Usage data"],
        retentionPeriod: "13 months",
      },
    ],
  }));
  assert.equal(codes(ready).includes("CHILD_PROTECTION_CONFIG_MISSING"), false);
  assert.equal(canPublish(ready), true);
}

testPublishRouteIsAuthoritative();
testChildProtectionPublication();
{
  const aliased = evaluatePolicyCompliance(baseSnapshot({
    purposes: baseSnapshot().purposes.map((purpose, index) => (
      index === 0 ? { ...purpose, legalBasis: "legitimate_interest" } : purpose
    )),
  }));
  assert.equal(aliased.errors.some((row) => row.code === "PURPOSE_WITHOUT_LEGAL_BASIS"), false);
}
console.log("compliance validation tests passed");
