const assert = require("node:assert/strict");
const Module = require("node:module");
const { createHash } = require("node:crypto");

const originalLoad = Module._load;
Module._load = function loadWithServerOnlyStub(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

const {
  apiKeyHashMatches,
  getApiKeyPrefix,
  readBearerApiKey,
  validateApiKeyCandidate,
} = require("../../.tmp/enforcement/api-key-auth-logic.js");
const {
  evaluateConsentSnapshot,
} = require("../../.tmp/enforcement/consent-evaluation-core.js");

const RAW_KEY = `cmp_live_${"A".repeat(43)}`;
const KEY_HASH = createHash("sha256").update(RAW_KEY).digest("hex");

function apiKeyCandidate(overrides = {}) {
  return {
    status: "active",
    keyHash: KEY_HASH,
    expiresAt: null,
    revokedAt: null,
    scopes: ["consent:evaluate"],
    ...overrides,
  };
}

function evaluationSnapshot(recordOverrides = {}) {
  return {
    record: {
      status: "partial",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      withdrawnAt: null,
      ...recordOverrides,
    },
    decisions: [
      { purposeId: "purpose-analytics", vendorId: null, granted: true },
      { purposeId: null, vendorId: "vendor-example", granted: true },
      { purposeId: "foreign-purpose", vendorId: null, granted: true },
    ],
    purposes: [
      {
        id: "purpose-essential",
        key: "essential",
        isRequired: true,
        status: "active",
        dataCategories: ["Session identifier"],
      },
      {
        id: "purpose-analytics",
        key: "analytics",
        isRequired: false,
        status: "active",
        dataCategories: ["Browsing history"],
      },
    ],
    vendors: [
      { id: "vendor-example", domain: "example.com", status: "active" },
    ],
    trackers: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        purposeId: "purpose-analytics",
        vendorId: "vendor-example",
        isEssential: false,
        status: "active",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        purposeId: null,
        vendorId: null,
        isEssential: true,
        status: "active",
      },
    ],
  };
}

function evaluate(request, recordOverrides = {}) {
  return evaluateConsentSnapshot(
    {
      purposeKeys: [],
      vendorDomains: [],
      trackerIds: [],
      dataCategories: [],
      ...request,
    },
    evaluationSnapshot(recordOverrides),
    new Date("2028-01-01T00:00:00.000Z"),
  );
}

(async () => {
  const bearerRequest = new Request("https://cmp.example.test", {
    headers: { authorization: `Bearer ${RAW_KEY}` },
  });
  assert.equal(readBearerApiKey(bearerRequest), RAW_KEY);
  assert.equal(
    readBearerApiKey(
      new Request("https://cmp.example.test", {
        headers: { authorization: `Basic ${RAW_KEY}` },
      }),
    ),
    null,
  );
  assert.equal(getApiKeyPrefix(RAW_KEY), RAW_KEY.slice(0, 16));
  assert.equal(apiKeyHashMatches(RAW_KEY, KEY_HASH), true);
  assert.equal(apiKeyHashMatches(`${RAW_KEY.slice(0, -1)}B`, KEY_HASH), false);
  assert.deepEqual(
    validateApiKeyCandidate(apiKeyCandidate(), RAW_KEY, "consent:evaluate"),
    { ok: true },
  );
  assert.equal(
    validateApiKeyCandidate(
      apiKeyCandidate({ status: "revoked" }),
      RAW_KEY,
      "consent:evaluate",
    ).reason,
    "inactive",
  );
  assert.equal(
    validateApiKeyCandidate(
      apiKeyCandidate({ expiresAt: new Date("2020-01-01T00:00:00.000Z") }),
      RAW_KEY,
      "consent:evaluate",
      new Date("2021-01-01T00:00:00.000Z"),
    ).reason,
    "expired",
  );
  assert.equal(
    validateApiKeyCandidate(
      apiKeyCandidate({ scopes: [] }),
      RAW_KEY,
      "consent:evaluate",
    ).reason,
    "insufficient_scope",
  );

  const granted = evaluate({
    purposeKeys: ["analytics", "essential"],
    vendorDomains: ["example.com"],
    trackerIds: [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ],
    dataCategories: ["Browsing history", "Session identifier"],
  });
  assert.equal(granted.allowed, true);
  assert.equal(granted.consentState, "active");
  assert.equal(granted.results.purposes[1].reasonCode, "ESSENTIAL_PURPOSE");
  assert.equal(granted.results.trackers[1].reasonCode, "ESSENTIAL_TRACKER");

  const unknown = evaluate({
    purposeKeys: ["foreign-purpose"],
    vendorDomains: ["foreign.example"],
    trackerIds: ["00000000-0000-4000-8000-000000000099"],
    dataCategories: ["Unknown category"],
  });
  assert.equal(unknown.allowed, false);
  assert.deepEqual(
    [
      unknown.results.purposes[0].reasonCode,
      unknown.results.vendors[0].reasonCode,
      unknown.results.trackers[0].reasonCode,
      unknown.results.dataCategories[0].reasonCode,
    ],
    [
      "UNKNOWN_PURPOSE",
      "UNKNOWN_VENDOR",
      "UNKNOWN_TRACKER",
      "UNKNOWN_DATA_CATEGORY",
    ],
  );

  const withdrawn = evaluate(
    { purposeKeys: ["analytics", "essential"], vendorDomains: ["example.com"] },
    {
      status: "withdrawn",
      withdrawnAt: new Date("2027-01-01T00:00:00.000Z"),
    },
  );
  assert.equal(withdrawn.consentState, "withdrawn");
  assert.equal(withdrawn.results.purposes[0].reasonCode, "CONSENT_WITHDRAWN");
  assert.equal(withdrawn.results.purposes[1].reasonCode, "ESSENTIAL_PURPOSE");
  assert.equal(withdrawn.results.vendors[0].allowed, false);

  const expired = evaluate(
    { purposeKeys: ["analytics"] },
    { expiresAt: new Date("2027-01-01T00:00:00.000Z") },
  );
  assert.equal(expired.consentState, "expired");
  assert.equal(expired.results.purposes[0].reasonCode, "CONSENT_EXPIRED");

  const inactive = evaluate(
    { purposeKeys: ["analytics"] },
    { status: "pending", expiresAt: null },
  );
  assert.equal(inactive.consentState, "inactive");
  assert.equal(inactive.results.purposes[0].reasonCode, "CONSENT_INACTIVE");

  const trackerDenied = evaluationSnapshot();
  trackerDenied.decisions = trackerDenied.decisions.filter(
    (decision) => decision.vendorId !== "vendor-example",
  );
  const trackerResult = evaluateConsentSnapshot(
    {
      purposeKeys: [],
      vendorDomains: [],
      trackerIds: ["00000000-0000-4000-8000-000000000001"],
      dataCategories: [],
    },
    trackerDenied,
    new Date("2028-01-01T00:00:00.000Z"),
  );
  assert.equal(trackerResult.results.trackers[0].reasonCode, "NOT_GRANTED");

  const childRestricted = evaluateConsentSnapshot(
    {
      purposeKeys: ["analytics"],
      vendorDomains: [],
      trackerIds: ["00000000-0000-4000-8000-000000000001"],
      dataCategories: [],
    },
    {
      ...evaluationSnapshot(),
      childProtection: { restrictedPurposeKeys: ["analytics"], allowRestricted: false },
    },
    new Date("2028-01-01T00:00:00.000Z"),
  );
  assert.equal(childRestricted.results.purposes[0].reasonCode, "CHILD_RESTRICTED");
  assert.equal(childRestricted.results.trackers[0].reasonCode, "CHILD_RESTRICTED");

  console.log("Enforcement tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
