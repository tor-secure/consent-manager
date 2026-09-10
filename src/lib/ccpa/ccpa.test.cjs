const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const compiled = path.join(__dirname, "../../../.tmp/compiled/src/lib/ccpa");
const {
  parseSecGpcHeader,
  parseClientGpc,
  gpcSignalIsActive,
  parseGpcFromRequest,
} = require(path.join(compiled, "gpc.js"));
const {
  resolveCaliforniaOptOut,
  evidenceCaliforniaOptOut,
  publicCaliforniaState,
  californiaEnforcementFromRecord,
} = require(path.join(compiled, "state.js"));
const {
  californiaBlocksTracker,
  resolveTrackerCcpaClassification,
} = require(path.join(compiled, "enforcement.js"));
const { collectCaliforniaMappingIssues } = require(path.join(compiled, "validate.js"));
const { californiaRuntimeApplies } = require(path.join(compiled, "types.js"));
const { shouldBlock } = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/sdk/enforcement.js"));

const root = path.join(__dirname, "../../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function headers(value) {
  return {
    get(name) {
      const key = String(name).toLowerCase();
      if (key === "sec-gpc") return value;
      return null;
    },
  };
}

function testGpcDetection() {
  assert.equal(parseSecGpcHeader("1"), "valid_1");
  assert.equal(parseSecGpcHeader("0"), "invalid");
  assert.equal(parseSecGpcHeader(null), "absent");
  assert.equal(parseSecGpcHeader(""), "absent");
  assert.equal(parseSecGpcHeader("true"), "invalid");
  assert.equal(parseSecGpcHeader("yes"), "invalid");
  assert.equal(parseClientGpc(true), "true");
  assert.equal(parseClientGpc(false), "false");
  assert.equal(parseClientGpc(undefined), "unknown");
  assert.equal(parseClientGpc("yes"), "invalid");

  assert.equal(gpcSignalIsActive("valid_1", "false"), true);
  assert.equal(gpcSignalIsActive("valid_1", "unknown"), true);
  assert.equal(gpcSignalIsActive("invalid", "true"), false);
  assert.equal(gpcSignalIsActive("absent", "true"), true);
  assert.equal(gpcSignalIsActive("absent", "false"), false);
  assert.equal(gpcSignalIsActive("absent", "unknown"), false);

  const fromHeader = parseGpcFromRequest(headers("1"), false);
  assert.equal(fromHeader.header, "valid_1");
  assert.equal(fromHeader.client, "false");
  assert.equal(fromHeader.active, true);

  const missing = parseGpcFromRequest(headers(null), undefined);
  assert.equal(missing.header, "absent");
  assert.equal(missing.active, false);

  const jsOnly = parseGpcFromRequest(headers(null), true);
  assert.equal(jsOnly.active, true);
}

function testStateModel() {
  const off = resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "absent",
    client: "unknown",
  });
  assert.equal(off.state, "not_opted_out");
  assert.equal(off.saleOptOut, false);

  const gpc = resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "valid_1",
    client: "false",
  });
  assert.equal(gpc.state, "gpc_opted_out");
  assert.equal(gpc.source, "gpc");
  assert.equal(gpc.saleOptOut, true);
  assert.equal(gpc.shareOptOut, true);

  const cleared = resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "valid_1",
    client: "false",
    clearManual: true,
    persisted: gpc,
  });
  assert.equal(cleared.saleOptOut, true);
  assert.equal(cleared.state, "gpc_opted_out");

  const afterGpcRemoved = resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "absent",
    client: "unknown",
    persisted: gpc,
  });
  assert.equal(afterGpcRemoved.state, "not_opted_out");
  assert.equal(afterGpcRemoved.saleOptOut, false);

  const manual = resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "absent",
    client: "unknown",
    manualDoNotSell: true,
    manualDoNotShare: true,
  });
  assert.equal(manual.state, "manual_opt_out");
  const stillManual = resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "absent",
    client: "unknown",
    persisted: manual,
  });
  assert.equal(stillManual.saleOptOut, true);

  const withdrawn = resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "absent",
    client: "unknown",
    consentWithdrawn: true,
  });
  assert.equal(withdrawn.state, "withdrawn");
  assert.equal(withdrawn.saleOptOut, true);

  const gdpr = resolveCaliforniaOptOut({
    regulationKey: "gdpr",
    region: "DE",
    header: "valid_1",
    client: "true",
  });
  assert.equal(gdpr.state, "not_applicable");
  assert.equal(gdpr.saleOptOut, false);

  const ui = publicCaliforniaState(gpc);
  assert.equal(ui.ui.gpcDetected, true);
  assert.equal(ui.ui.managedByBrowserSignal, true);
  assert.equal(ui.ui.optOutActive, true);
  assert.match(ui.ui.label, /browser privacy signal/i);
}

function testEnforcementOverlay() {
  const ads = {
    id: "ads",
    name: "ads.js",
    type: "script",
    domain: "ads.example",
    identifier: "ads.js",
    purposeKey: "advertising",
    purposeId: "purpose-ads",
    vendorId: "vendor-ads",
    isEssential: false,
    status: "active",
    ccpaSale: "not_applicable",
    ccpaShare: "applicable",
    ccpaSensitivePi: "not_applicable",
  };
  const essential = {
    ...ads,
    id: "ess",
    isEssential: true,
    purposeId: "purpose-ess",
    vendorId: null,
    ccpaSale: "not_applicable",
    ccpaShare: "not_applicable",
  };
  const unknown = { ...ads, id: "unk", ccpaSale: "unknown", ccpaShare: "unknown" };
  const grants = {
    purposes: { "purpose-ads": true, "purpose-ess": true },
    vendors: { "vendor-ads": true },
    california: {
      applicable: true,
      saleOptOut: false,
      shareOptOut: false,
      sensitivePiLimit: false,
    },
  };

  assert.equal(shouldBlock(ads, grants), false);
  assert.equal(shouldBlock(essential, grants), false);

  const gpcOn = {
    ...grants,
    california: {
      applicable: true,
      saleOptOut: true,
      shareOptOut: true,
      sensitivePiLimit: false,
      gpcActive: true,
      state: "gpc_opted_out",
      source: "gpc",
    },
  };
  assert.equal(shouldBlock(ads, gpcOn), true);
  assert.equal(shouldBlock(essential, gpcOn), false);
  assert.equal(shouldBlock(unknown, gpcOn), false);

  const essentialSale = { ...essential, ccpaSale: "applicable" };
  assert.equal(shouldBlock(essentialSale, gpcOn), true);

  const allowAll = {
    ...gpcOn,
    purposes: { "purpose-ads": true, "purpose-ess": true },
    vendors: { "vendor-ads": true },
  };
  assert.equal(shouldBlock(ads, allowAll), true);

  const child = {
    ...grants,
    childRestrictedPurposeIds: ["purpose-ads"],
  };
  assert.equal(shouldBlock(ads, child), true);

  const childAndGpc = {
    ...gpcOn,
    childRestrictedPurposeIds: ["purpose-ads"],
  };
  assert.equal(shouldBlock(ads, childAndGpc), true);

  const inherited = resolveTrackerCcpaClassification({
    trackerSale: "unknown",
    trackerShare: "unknown",
    vendorSale: "applicable",
    vendorShare: "not_applicable",
  });
  assert.equal(inherited.ccpaSale, "applicable");
  assert.equal(inherited.ccpaShare, "not_applicable");
  assert.equal(californiaBlocksTracker({ ...ads, ccpaSale: inherited.ccpaSale, ccpaShare: inherited.ccpaShare }, californiaEnforcementFromRecord({
    state: "gpc_opted_out",
    source: "gpc",
    saleOptOut: true,
    shareOptOut: true,
    sensitivePiLimit: false,
    gpcHeader: "valid_1",
    gpcClient: "unknown",
    gpcActive: true,
    jurisdiction: "ccpa",
    policyVersionId: null,
  })), true);

  const spi = resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "CA",
    header: "valid_1",
    client: "unknown",
    limitSensitiveConfigured: true,
  });
  assert.equal(spi.sensitivePiLimit, true);
  const spiTracker = { ...ads, ccpaShare: "not_applicable", ccpaSensitivePi: "applicable" };
  assert.equal(shouldBlock(spiTracker, {
    ...grants,
    california: californiaEnforcementFromRecord(spi),
  }), true);
}

function testHistoricalIntegrity() {
  const first = evidenceCaliforniaOptOut(resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "absent",
    client: "unknown",
    policyVersionId: "policy-1",
  }));
  const frozen = { ...first };
  const later = evidenceCaliforniaOptOut(resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "valid_1",
    client: "unknown",
    policyVersionId: "policy-1",
  }));
  assert.deepEqual(first, frozen);
  assert.equal(first.gpcActive, false);
  assert.equal(later.gpcActive, true);
  assert.notDeepEqual(first, later);
}

function testApplicability() {
  assert.equal(californiaRuntimeApplies({ regulationKey: "ccpa" }), true);
  assert.equal(californiaRuntimeApplies({ regulationKey: "cpra" }), true);
  assert.equal(californiaRuntimeApplies({ region: "US-CA" }), true);
  assert.equal(californiaRuntimeApplies({ region: "CA" }), true);
  assert.equal(californiaRuntimeApplies({ regulationKey: "gdpr", region: "DE" }), false);
  assert.equal(californiaRuntimeApplies({ regulationKey: "gdpr", region: "US" }), false);
}

function testMappingValidation() {
  const missing = collectCaliforniaMappingIssues({
    doNotSellEnabled: false,
    doNotShareEnabled: false,
    limitSensitivePiEnabled: false,
    specialCategoryProcessing: false,
    hasSaleSharePurpose: false,
    vendors: [{ id: "v1", status: "active" }],
    trackers: [{ id: "t1", status: "active", isEssential: false }],
  });
  assert.ok(missing.some((row) => row.code === "CCPA_SALE_OPT_OUT_UNCONFIGURED"));
  assert.ok(missing.some((row) => row.code === "CCPA_SHARE_OPT_OUT_UNCONFIGURED"));

  const unmapped = collectCaliforniaMappingIssues({
    doNotSellEnabled: true,
    doNotShareEnabled: true,
    limitSensitivePiEnabled: false,
    specialCategoryProcessing: false,
    hasSaleSharePurpose: false,
    vendors: [{ id: "v1", status: "active", ccpaSale: "unknown", ccpaShare: "unknown" }],
    trackers: [{ id: "t1", status: "active", isEssential: false, ccpaSale: "unknown", ccpaShare: "unknown" }],
  });
  assert.ok(unmapped.some((row) => row.code === "CCPA_OPT_OUT_VENDOR_MAPPING_MISSING"));
  assert.ok(unmapped.some((row) => row.code === "CCPA_OPT_OUT_TRACKER_MAPPING_MISSING"));

  const ready = collectCaliforniaMappingIssues({
    doNotSellEnabled: true,
    doNotShareEnabled: true,
    limitSensitivePiEnabled: true,
    specialCategoryProcessing: true,
    hasSaleSharePurpose: false,
    vendors: [{ id: "v1", status: "active", ccpaSale: "applicable", ccpaShare: "not_applicable", ccpaSensitivePi: "applicable" }],
    trackers: [{ id: "t1", status: "active", isEssential: false, ccpaSale: "applicable", ccpaShare: "not_applicable" }],
  });
  assert.equal(ready.length, 0);
}

function testTenantIsolationInSource() {
  const optOut = read("src/app/api/sdk/[siteKey]/opt-out/route.ts");
  const record = read("src/app/api/consent/record/route.ts");
  const vendorPatch = read("src/app/api/vendors/[id]/route.ts");
  const trackerPatch = read("src/app/api/trackers/[id]/route.ts");
  const rights = read("src/lib/privacy-rights/service.ts");
  const evaluate = read("src/lib/compliance/evaluate.ts");
  const gpc = read("src/lib/ccpa/gpc.ts");

  assert.match(optOut, /loadWebsiteBySiteKey/);
  assert.doesNotMatch(optOut, /body\.organizationId/);
  assert.doesNotMatch(optOut, /body\.jurisdiction/);
  assert.match(optOut, /parseGpcFromRequest/);
  assert.match(record, /parseGpcFromRequest\(request\.headers, body\.gpc\)/);
  assert.doesNotMatch(record, /body\.optOut/);
  assert.doesNotMatch(record, /body\.organizationId/);
  assert.match(vendorPatch, /organizationId/);
  assert.match(trackerPatch, /organizationId/);
  assert.match(rights, /californiaOptOutStates\.organizationId/);
  assert.match(evaluate, /GPC_RUNTIME_SUPPORTED = true/);
  assert.match(gpc, /next === "1"/);
}

function testSdkSafety() {
  const sdk = read("src/lib/sdk/cmp-sdk-script.ts");
  assert.match(sdk, /syncCaliforniaOptOut/);
  assert.match(sdk, /navigator\.globalPrivacyControl === true/);
  assert.match(sdk, /CA_OPT_OUT_KEY/);
  assert.match(sdk, /gpc: navigatorGpc\(\) \? true : undefined/);
  assert.match(sdk, /Do Not Sell or Share My Personal Information/);
  assert.match(sdk, /Limit Use of Sensitive Personal Information/);
}

testGpcDetection();
testStateModel();
testEnforcementOverlay();
testHistoricalIntegrity();
testApplicability();
testMappingValidation();
testTenantIsolationInSource();
testSdkSafety();
console.log("ccpa gpc runtime tests passed");
