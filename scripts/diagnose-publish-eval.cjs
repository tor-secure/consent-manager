const path = require("node:path");
const compiled = path.join(__dirname, "../.tmp/compiled/src/lib/compliance/evaluate.js");
const { evaluatePolicyCompliance, canPublish, parseComplianceDeclarations } = require(compiled);

function codes(result) {
  return result.errors.map((row) => `${row.code} [${row.field ?? ""}] ${row.message}`);
}

function base(overrides) {
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
    purposes: [{
      id: "55555555-5555-4555-8555-555555555555",
      key: "necessary",
      name: "Necessary",
      description: "Required to run the site.",
      isRequired: true,
      legalBasis: "legal_obligation",
      dataCategories: ["Device data"],
      retentionPeriod: "Session",
    }, {
      id: "66666666-6666-4666-8666-666666666666",
      key: "analytics",
      name: "Analytics",
      description: "Measure audience.",
      isRequired: false,
      legalBasis: "consent",
      dataCategories: ["Usage data"],
      retentionPeriod: "13 months",
    }],
    vendors: [{
      id: "77777777-7777-4777-8777-777777777777",
      name: "Analytics Co",
      privacyPolicyUrl: "https://vendor.example/privacy",
      country: "US",
      role: "unknown",
      status: "active",
      processingCountries: [],
      dpaStatus: "not_configured",
      downstreamDsarMode: "not_required",
    }],
    trackers: [{
      id: "88888888-8888-4888-8888-888888888888",
      name: "analytics.js",
      status: "active",
      isEssential: false,
      purposeId: "66666666-6666-4666-8666-666666666666",
      vendorId: "77777777-7777-4777-8777-777777777777",
      scannerClassification: "mapped",
    }],
    consentIntegrations: { iabTcfEnabled: false, iabGppEnabled: false },
    assignedRegulationKeys: ["gdpr"],
    rightsByJurisdiction: {
      gdpr: ["access", "correction", "erasure", "restriction", "objection", "portability", "withdraw_consent"],
    },
    gpcRuntimeSupported: true,
    optOutPropagationImplemented: true,
    ...overrides,
  };
}

function run(label, snapshot) {
  const result = evaluatePolicyCompliance(snapshot);
  console.log("\n===", label, "===");
  console.log("valid", result.valid, "canPublish", canPublish(result));
  console.log("jurisdictions", result.jurisdictions);
  console.log("errors:");
  for (const line of codes(result)) console.log(" -", line);
  console.log("warnings:", result.warnings.map((row) => row.code).join(", ") || "(none)");
}

run("legacy GDPR vendor role=unknown, vendor country=US, website DE", base());

run("same but vendor role=independent_controller, country=DE (minimal fix)", base({
  vendors: [{
    id: "77777777-7777-4777-8777-777777777777",
    name: "Analytics Co",
    privacyPolicyUrl: "https://vendor.example/privacy",
    country: "DE",
    role: "independent_controller",
    status: "active",
    processingCountries: ["DE"],
    dpaStatus: "not_applicable",
    downstreamDsarMode: "not_required",
  }],
}));

run("no vendors, GDPR DE, mapped tracker still present", base({
  vendors: [],
}));

run("US region, no regulation key, legacy vendor", base({
  website: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Example",
    defaultRegulationKey: null,
    defaultRegion: "US",
  },
  assignedRegulationKeys: [],
}));

run("Canada region CA, GDPR", base({
  website: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Example",
    defaultRegulationKey: "gdpr",
    defaultRegion: "CA",
  },
}));

run("CCPA website, gpcHonored from banner default after studio save", base({
  website: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Example",
    defaultRegulationKey: "ccpa",
    defaultRegion: "US",
  },
  assignedRegulationKeys: ["ccpa"],
  declarations: parseComplianceDeclarations({ gpcHonored: true }, {}),
}));

run("CCPA configured DNS + classified vendor/tracker", base({
  website: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Example",
    defaultRegulationKey: "ccpa",
    defaultRegion: "US-CA",
  },
  assignedRegulationKeys: ["ccpa"],
  declarations: parseComplianceDeclarations({
    doNotSellEnabled: true,
    doNotShareEnabled: true,
    gpcHonored: true,
  }, {}),
  vendors: [{
    id: "77777777-7777-4777-8777-777777777777",
    name: "Analytics Co",
    privacyPolicyUrl: "https://vendor.example/privacy",
    country: "US",
    role: "service_provider",
    status: "active",
    processingCountries: ["US"],
    dpaStatus: "not_applicable",
    downstreamDsarMode: "not_required",
    ccpaSale: "not_applicable",
    ccpaShare: "applicable",
    ccpaSensitivePi: "not_applicable",
  }],
  trackers: [{
    id: "88888888-8888-4888-8888-888888888888",
    name: "analytics.js",
    status: "active",
    isEssential: false,
    purposeId: "66666666-6666-4666-8666-666666666666",
    vendorId: "77777777-7777-4777-8777-777777777777",
    scannerClassification: "mapped",
    ccpaSale: "not_applicable",
    ccpaShare: "applicable",
    ccpaSensitivePi: "not_applicable",
  }],
}));
