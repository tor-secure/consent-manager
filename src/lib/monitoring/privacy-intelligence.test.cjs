const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = path.resolve(__dirname, "../../..");
const outDir = path.join(root, ".tmp/privacy-intelligence");

execSync(
  "npx tsc --outDir .tmp/privacy-intelligence --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/monitoring/drift-engine.ts src/lib/monitoring/shadow-trackers.ts src/lib/monitoring/consent-quality.ts src/lib/monitoring/page-intelligence.ts src/lib/monitoring/privacy-risk.ts",
  { cwd: root, stdio: "pipe" },
);

function compiled(name) {
  const candidates = [
    path.join(outDir, `${name}.js`),
    path.join(outDir, "src/lib/monitoring", `${name}.js`),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Missing compiled ${name}.js`);
  return found;
}

function compiled(name) {
  const candidates = [
    path.join(outDir, `${name}.js`),
    path.join(outDir, "src/lib/monitoring", `${name}.js`),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Missing compiled ${name}.js`);
  return found;
}

const {
  detectDrift,
  decideFindingUpsert,
  fingerprintFinding,
  shouldNotifyForDecision,
} = require(compiled("drift-engine"));
const { detectShadowTrackers, EVIDENCE_CONFIRMED_EXECUTION } = require(compiled("shadow-trackers"));
const { calculateConsentQualityScore } = require(compiled("consent-quality"));
const { buildPageIntelligence } = require(compiled("page-intelligence"));
const { aggregatePrivacyRisk, filterRiskFindings, overallRiskStatus } = require(compiled("privacy-risk"));

const orgA = "11111111-1111-1111-1111-111111111111";
const orgB = "22222222-2222-2222-2222-222222222222";
const siteA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const trackerId = "t1111111-1111-1111-1111-111111111111";
const vendorGa = "v1111111-1111-1111-1111-111111111111";
const purposeAnalytics = "p1111111-1111-1111-1111-111111111111";

function cmp(overrides = {}) {
  return {
    organizationId: orgA,
    websiteId: siteA,
    websiteName: "Example",
    websiteDomain: "example.com",
    publishedPolicyId: "pol-1",
    publishedPolicyVersionId: "ver-1",
    publishedPurposeIds: [purposeAnalytics],
    trackers: [
      {
        id: trackerId,
        identifier: "https://www.google-analytics.com/analytics.js",
        name: "Google Analytics",
        type: "script",
        domain: "www.google-analytics.com",
        vendorId: vendorGa,
        purposeId: purposeAnalytics,
        isEssential: false,
        status: "active",
      },
    ],
    vendors: [{ id: vendorGa, name: "Google Analytics", domain: "google-analytics.com", status: "active" }],
    purposes: [{ id: purposeAnalytics, name: "Analytics", key: "analytics", isRequired: false }],
    vendorPurposeIds: { [vendorGa]: [purposeAnalytics] },
    ...overrides,
  };
}

function item(partial = {}) {
  return {
    identifier: "https://www.google-analytics.com/analytics.js",
    name: "Google Analytics",
    type: "script",
    domain: "www.google-analytics.com",
    riskLevel: "medium",
    classificationStatus: "known",
    pageUrl: "https://example.com/",
    wouldExecuteOnParse: true,
    cmpPurposeValue: null,
    resourceKind: "script",
    ...partial,
  };
}

{
  const findings = detectShadowTrackers({
    latest: [
      item({
        wouldExecuteOnParse: false,
        cmpPurposeValue: "analytics",
      }),
    ],
    cmp: cmp(),
  });
  assert.equal(findings.length, 0, "gated mapped tracker produces no shadow finding");
}

{
  const findings = detectShadowTrackers({
    latest: [item({ wouldExecuteOnParse: true })],
    cmp: cmp(),
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].findingType, "shadow_ungated_script");
  assert.equal(findings[0].details.evidenceClass, "suspected_execution");
  assert.notEqual(findings[0].details.evidenceClass, EVIDENCE_CONFIRMED_EXECUTION);
}

{
  const findings = detectShadowTrackers({
    latest: [
      item({
        wouldExecuteOnParse: false,
        cmpPurposeValue: null,
      }),
    ],
    cmp: cmp(),
  });
  assert.equal(findings[0].findingType, "shadow_no_cmp_marker");
  assert.equal(findings[0].details.evidenceClass, "configuration_mismatch");
}

{
  const findings = detectShadowTrackers({
    latest: [item({ identifier: "https://ads.other.test/x.js", domain: "ads.other.test", name: "Other" })],
    cmp: cmp({ trackers: [] }),
  });
  assert.equal(findings.length, 0, "unmapped items are not shadow findings");
  const drift = detectDrift({
    latest: [item({ identifier: "https://ads.other.test/x.js", domain: "ads.other.test", name: "Other" })],
    previous: [],
    cmp: cmp({ trackers: [] }),
  });
  assert.ok(drift.some((finding) => finding.findingType === "missing_enforcement_rule"));
}

{
  const findings = detectShadowTrackers({
    latest: [item(), item()],
    cmp: cmp(),
  });
  assert.equal(findings.length, 1, "duplicate identifiers collapse to one fingerprint");
}

{
  const a = detectShadowTrackers({ latest: [item()], cmp: cmp() })[0];
  const b = detectShadowTrackers({ latest: [item()], cmp: cmp({ organizationId: orgB }) })[0];
  assert.notEqual(a.fingerprint, b.fingerprint);
  assert.equal(
    a.fingerprint,
    fingerprintFinding({
      organizationId: orgA,
      websiteId: siteA,
      findingType: "shadow_ungated_script",
      subjectKey: item().identifier,
    }),
  );
}

{
  assert.equal(decideFindingUpsert(null), "create");
  assert.equal(decideFindingUpsert({ fingerprint: "x", status: "resolved" }), "reopen");
  assert.equal(shouldNotifyForDecision("update"), false);
  assert.equal(shouldNotifyForDecision("reopen"), true);
}

{
  const now = new Date("2026-09-01T00:00:00.000Z");
  const perfect = {
    thirdPartyScanItems: 2,
    scanItemsWithActiveTracker: 2,
    nonEssentialTrackers: 2,
    trackersWithVendor: 2,
    trackersWithPurpose: 2,
    consentControlledTrackers: 2,
    enforcibleTrackers: 2,
    openFindings: [],
    hasPublishedPolicy: true,
    consentExpireDays: 365,
    consentRecordCount: 10,
    lastCompletedScanAt: now,
    now,
  };
  const a = calculateConsentQualityScore(perfect);
  const b = calculateConsentQualityScore(perfect);
  assert.equal(a.overall, 100);
  assert.equal(a.category, "excellent");
  assert.equal(a.overall, b.overall);
  assert.deepEqual(
    a.dimensions.map((row) => row.key),
    b.dimensions.map((row) => row.key),
  );

  const missingMaps = calculateConsentQualityScore({
    ...perfect,
    trackersWithVendor: 0,
    trackersWithPurpose: 0,
  });
  assert.ok(missingMaps.overall < a.overall);
  assert.ok(missingMaps.lostPoints.some((row) => row.includes("no vendor")));
  assert.ok(missingMaps.lostPoints.some((row) => row.includes("no purpose")));

  const withFindings = calculateConsentQualityScore({
    ...perfect,
    openFindings: [{ severity: "critical", findingType: "shadow_ungated_script" }],
  });
  assert.ok(withFindings.overall < a.overall);
  const driftDim = withFindings.dimensions.find((row) => row.key === "privacyDrift");
  assert.equal(driftDim.score, 88);
}

{
  const pages = buildPageIntelligence({
    websiteDomain: "example.com",
    items: [
      item(),
      item({
        identifier: "https://ads.other.test/x.js",
        domain: "ads.other.test",
        name: "Ads",
        classificationStatus: "unclassified",
        pageUrl: "https://example.com/pricing",
      }),
    ],
    trackers: cmp().trackers,
    vendorNamesById: { [vendorGa]: "Google Analytics" },
    purposeNamesById: { [purposeAnalytics]: "Analytics" },
    purposeRequiredById: { [purposeAnalytics]: false },
    findings: [
      {
        findingType: "shadow_ungated_script",
        severity: "high",
        detailsPageUrl: "https://example.com/",
        subjectKey: item().identifier,
      },
    ],
  });
  assert.equal(pages.length, 2);
  const home = pages.find((row) => row.path === "/");
  const pricing = pages.find((row) => row.path === "/pricing");
  assert.equal(home.trackerCount, 1);
  assert.equal(home.shadowFindingCount, 1);
  assert.equal(pricing.unmappedCount, 1);
}

{
  const pages = buildPageIntelligence({
    websiteDomain: "example.com",
    items: [item(), item({ name: "Pixel", identifier: "https://www.google-analytics.com/collect" })],
    trackers: cmp().trackers,
    vendorNamesById: {},
    purposeNamesById: {},
    purposeRequiredById: {},
    findings: [],
  });
  assert.equal(pages.length, 1, "same page URL does not invent extra pages");
}

{
  const empty = buildPageIntelligence({
    websiteDomain: "example.com",
    items: [],
    trackers: [],
    vendorNamesById: {},
    purposeNamesById: {},
    purposeRequiredById: {},
    findings: [],
  });
  assert.equal(empty.length, 0, "no scan items means no invented pages");
}

{
  const now = new Date("2026-09-01T00:00:00.000Z");
  const findings = [
    {
      id: "1",
      websiteId: siteA,
      findingType: "shadow_ungated_script",
      severity: "critical",
      status: "open",
      trackerId,
      vendorId: vendorGa,
      firstDetectedAt: now,
    },
    {
      id: "2",
      websiteId: siteA,
      findingType: "unmapped_tracker",
      severity: "high",
      status: "open",
      trackerId,
      vendorId: vendorGa,
      firstDetectedAt: now,
    },
    {
      id: "3",
      websiteId: "other-site",
      findingType: "removed_tracker",
      severity: "low",
      status: "resolved",
      trackerId: null,
      vendorId: null,
      firstDetectedAt: now,
    },
  ];
  const aggregated = aggregatePrivacyRisk(findings, now);
  assert.equal(aggregated.bySeverity.critical, 1);
  assert.equal(aggregated.bySeverity.high, 1);
  assert.equal(aggregated.unresolvedCount, 2);
  assert.deepEqual(aggregated.affectedWebsiteIds, [siteA]);
  assert.equal(overallRiskStatus(aggregated.bySeverity), "critical");
  const filtered = filterRiskFindings(findings, { severity: "critical" });
  assert.equal(filtered.length, 1);
  const ids = new Set(findings.map((row) => row.id));
  assert.equal(ids.size, findings.length);
}

{
  const quality = fs.readFileSync(path.join(root, "src/app/api/monitoring/quality/route.ts"), "utf8");
  assert.doesNotMatch(quality, /searchParams\.get\(["']organizationId["']\)/);
  assert.match(quality, /eq\(websites\.organizationId,\s*organization\.id\)/);
  const risk = fs.readFileSync(path.join(root, "src/app/api/monitoring/risk/route.ts"), "utf8");
  assert.doesNotMatch(risk, /searchParams\.get\(["']organizationId["']\)/);
  assert.match(risk, /loadOrgRiskSnapshot\(organization\.id/);
  const pages = fs.readFileSync(path.join(root, "src/app/api/monitoring/pages/route.ts"), "utf8");
  assert.doesNotMatch(pages, /searchParams\.get\(["']organizationId["']\)/);
  assert.match(pages, /eq\(websites\.organizationId,\s*organization\.id\)/);
  const shadow = fs.readFileSync(path.join(root, "src/lib/monitoring/shadow-trackers.ts"), "utf8");
  assert.match(shadow, /EVIDENCE_SUSPECTED_EXECUTION/);
  assert.doesNotMatch(shadow, /evidenceClass:\s*EVIDENCE_CONFIRMED_EXECUTION/);
}

console.log("privacy-intelligence.test.cjs passed");
