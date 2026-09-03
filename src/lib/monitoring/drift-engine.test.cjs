const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const compiledCandidates = [
  path.join(root, ".tmp/drift-engine/drift-engine.js"),
  path.join(root, ".tmp/drift-engine/src/lib/monitoring/drift-engine.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));
if (!compiledPath) {
  throw new Error(
    "Compiled drift-engine.js not found. Run: npx tsc --outDir .tmp/drift-engine --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/monitoring/drift-engine.ts",
  );
}

const {
  detectDrift,
  decideFindingUpsert,
  fingerprintFinding,
  shouldNotifyForDecision,
  severityForFinding,
} = require(compiledPath);

const orgA = "11111111-1111-1111-1111-111111111111";
const orgB = "22222222-2222-2222-2222-222222222222";
const siteA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const siteB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const trackerId = "t1111111-1111-1111-1111-111111111111";
const vendorGa = "v1111111-1111-1111-1111-111111111111";
const vendorOther = "v2222222-2222-2222-2222-222222222222";
const purposeAnalytics = "p1111111-1111-1111-1111-111111111111";
const purposeAds = "p2222222-2222-2222-2222-222222222222";

function cmp(overrides = {}) {
  return {
    organizationId: orgA,
    websiteId: siteA,
    websiteName: "Example",
    websiteDomain: "example.com",
    publishedPolicyId: "pol-1",
    publishedPolicyVersionId: "ver-1",
    publishedPurposeIds: [purposeAnalytics],
    trackers: [],
    vendors: [
      { id: vendorGa, name: "Google Analytics", domain: "google-analytics.com", status: "active" },
      { id: vendorOther, name: "Other Ads", domain: "ads.other.test", status: "active" },
    ],
    purposes: [
      { id: purposeAnalytics, name: "Analytics", key: "analytics", isRequired: false },
      { id: purposeAds, name: "Advertising", key: "advertising", isRequired: false },
    ],
    vendorPurposeIds: {
      [vendorGa]: [purposeAnalytics],
    },
    ...overrides,
  };
}

function item(partial) {
  return {
    identifier: "https://www.google-analytics.com/analytics.js",
    name: "Google Analytics",
    type: "script",
    domain: "www.google-analytics.com",
    riskLevel: "medium",
    classificationStatus: "known",
    ...partial,
  };
}

function types(findings) {
  return findings.map((finding) => finding.findingType).sort();
}

{
  const previous = [];
  const latest = [item()];
  const findings = detectDrift({
    latest,
    previous,
    cmp: cmp({
      trackers: [
        {
          id: trackerId,
          identifier: item().identifier,
          name: "Google Analytics",
          type: "script",
          domain: "google-analytics.com",
          vendorId: vendorGa,
          purposeId: purposeAnalytics,
          isEssential: false,
          status: "active",
        },
      ],
    }),
  });
  assert.ok(findings.some((finding) => finding.findingType === "new_tracker"));
}

{
  const previous = [item()];
  const latest = [];
  const findings = detectDrift({ latest, previous, cmp: cmp() });
  assert.ok(findings.some((finding) => finding.findingType === "removed_tracker"));
}

{
  const mappedWrong = detectDrift({
    latest: [item()],
    previous: null,
    cmp: cmp({
      trackers: [
        {
          id: trackerId,
          identifier: item().identifier,
          name: "Google Analytics",
          type: "script",
          domain: "google-analytics.com",
          vendorId: vendorOther,
          purposeId: purposeAnalytics,
          isEssential: false,
          status: "active",
        },
      ],
    }),
  });
  assert.ok(mappedWrong.some((finding) => finding.findingType === "vendor_mapping_changed"));
}

{
  const findings = detectDrift({
    latest: [item()],
    previous: null,
    cmp: cmp({
      publishedPurposeIds: [purposeAds],
      trackers: [
        {
          id: trackerId,
          identifier: item().identifier,
          name: "Google Analytics",
          type: "script",
          domain: "google-analytics.com",
          vendorId: vendorGa,
          purposeId: purposeAnalytics,
          isEssential: false,
          status: "active",
        },
      ],
    }),
  });
  assert.ok(findings.some((finding) => finding.findingType === "purpose_mapping_changed"));
}

{
  const findings = detectDrift({
    latest: [item()],
    previous: null,
    cmp: cmp({
      trackers: [
        {
          id: trackerId,
          identifier: item().identifier,
          name: "Google Analytics",
          type: "script",
          domain: "google-analytics.com",
          vendorId: null,
          purposeId: null,
          isEssential: false,
          status: "active",
        },
      ],
    }),
  });
  assert.ok(findings.some((finding) => finding.findingType === "unmapped_tracker"));
}

{
  const findings = detectDrift({
    latest: [item({ domain: "unknown-tracker.test", identifier: "https://unknown-tracker.test/x.js" })],
    previous: null,
    cmp: cmp({
      trackers: [
        {
          id: trackerId,
          identifier: "https://unknown-tracker.test/x.js",
          name: "Unknown",
          type: "script",
          domain: "unknown-tracker.test",
          vendorId: vendorGa,
          purposeId: purposeAnalytics,
          isEssential: false,
          status: "active",
        },
      ],
    }),
  });
  assert.ok(findings.some((finding) => finding.findingType === "unmapped_vendor"));
}

{
  const findings = detectDrift({
    latest: [item()],
    previous: null,
    cmp: cmp({ trackers: [] }),
  });
  assert.ok(findings.some((finding) => finding.findingType === "missing_enforcement_rule"));
}

{
  const first = detectDrift({
    latest: [item()],
    previous: [item()],
    cmp: cmp({
      trackers: [
        {
          id: trackerId,
          identifier: item().identifier,
          name: "Google Analytics",
          type: "script",
          domain: "google-analytics.com",
          vendorId: vendorGa,
          purposeId: purposeAnalytics,
          isEssential: false,
          status: "active",
        },
      ],
    }),
  });
  const second = detectDrift({
    latest: [item()],
    previous: [item()],
    cmp: cmp({
      trackers: [
        {
          id: trackerId,
          identifier: item().identifier,
          name: "Google Analytics",
          type: "script",
          domain: "google-analytics.com",
          vendorId: vendorGa,
          purposeId: purposeAnalytics,
          isEssential: false,
          status: "active",
        },
      ],
    }),
  });
  assert.deepEqual(types(first), types(second));
  assert.equal(first.length, 0);
  assert.equal(second.length, 0);
}

{
  const findings = detectDrift({
    latest: [item()],
    previous: [item()],
    cmp: cmp({
      trackers: [
        {
          id: trackerId,
          identifier: item().identifier,
          name: "Google Analytics",
          type: "script",
          domain: "google-analytics.com",
          vendorId: null,
          purposeId: null,
          isEssential: false,
          status: "active",
        },
      ],
    }),
  });
  const again = detectDrift({
    latest: [item()],
    previous: [item()],
    cmp: cmp({
      trackers: [
        {
          id: trackerId,
          identifier: item().identifier,
          name: "Google Analytics",
          type: "script",
          domain: "google-analytics.com",
          vendorId: null,
          purposeId: null,
          isEssential: false,
          status: "active",
        },
      ],
    }),
  });
  assert.equal(findings.length, again.length);
  assert.equal(findings[0].fingerprint, again[0].fingerprint);
}

{
  const a = fingerprintFinding({
    organizationId: orgA,
    websiteId: siteA,
    findingType: "new_tracker",
    subjectKey: "https://www.google-analytics.com/analytics.js",
  });
  const b = fingerprintFinding({
    organizationId: orgA,
    websiteId: siteA,
    findingType: "new_tracker",
    subjectKey: "HTTPS://www.google-analytics.com/analytics.js",
  });
  const otherOrg = fingerprintFinding({
    organizationId: orgB,
    websiteId: siteA,
    findingType: "new_tracker",
    subjectKey: "https://www.google-analytics.com/analytics.js",
  });
  const otherSite = fingerprintFinding({
    organizationId: orgA,
    websiteId: siteB,
    findingType: "new_tracker",
    subjectKey: "https://www.google-analytics.com/analytics.js",
  });
  assert.equal(a, b);
  assert.notEqual(a, otherOrg);
  assert.notEqual(a, otherSite);
}

{
  assert.equal(decideFindingUpsert(null), "create");
  assert.equal(decideFindingUpsert({ fingerprint: "x", status: "open" }), "update");
  assert.equal(decideFindingUpsert({ fingerprint: "x", status: "reviewed" }), "update");
  assert.equal(decideFindingUpsert({ fingerprint: "x", status: "resolved" }), "reopen");
  assert.equal(shouldNotifyForDecision("create"), true);
  assert.equal(shouldNotifyForDecision("reopen"), true);
  assert.equal(shouldNotifyForDecision("update"), false);
}

{
  assert.equal(severityForFinding({ findingType: "removed_tracker" }), "low");
  assert.equal(severityForFinding({ findingType: "new_tracker", type: "script" }), "high");
  assert.equal(severityForFinding({ findingType: "new_tracker", type: "fingerprint" }), "critical");
  assert.equal(severityForFinding({ findingType: "unmapped_tracker" }), "high");
}

{
  const source = fs.readFileSync(path.join(root, "src/app/api/monitoring/findings/route.ts"), "utf8");
  assert.match(source, /eq\(privacyFindings\.organizationId,\s*organization\.id\)/);
  assert.match(source, /eq\(websites\.organizationId,\s*organization\.id\)/);
  const detail = fs.readFileSync(path.join(root, "src/app/api/monitoring/findings/[id]/route.ts"), "utf8");
  assert.match(detail, /eq\(privacyFindings\.organizationId,\s*organization\.id\)/);
  assert.match(detail, /eq\(websites\.organizationId,\s*organization\.id\)/);
  const review = fs.readFileSync(path.join(root, "src/app/api/monitoring/findings/[id]/review/route.ts"), "utf8");
  assert.match(review, /privacy_finding\.reviewed/);
  const resolve = fs.readFileSync(path.join(root, "src/app/api/monitoring/findings/[id]/resolve/route.ts"), "utf8");
  assert.match(resolve, /privacy_finding\.resolved/);
  const engine = fs.readFileSync(path.join(root, "src/lib/scanner/scan-engine.ts"), "utf8");
  assert.match(engine, /runDriftForScan/);
  assert.match(engine, /Privacy drift processing failed after successful scan/);
}

console.log("drift-engine.test.cjs passed");
