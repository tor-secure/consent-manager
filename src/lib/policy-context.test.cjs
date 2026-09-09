const assert = require("node:assert/strict");

process.env.POLICY_CONTEXT_SECRET = "test-policy-context-secret-with-sufficient-entropy";

const {
  buildPolicyNoticeSnapshot,
  issuePolicyContext,
  policyContextMatchesScope,
  policyContextMatchesVersion,
  verifyPolicyContextEnvelope,
} = require("../../.tmp/policy-context/policy-context.js");

const ids = {
  organizationA: "11111111-1111-4111-8111-111111111111",
  organizationB: "22222222-2222-4222-8222-222222222222",
  websiteA: "33333333-3333-4333-8333-333333333333",
  policyA: "44444444-4444-4444-8444-444444444444",
  version1: "55555555-5555-4555-8555-555555555555",
  version2: "66666666-6666-4666-8666-666666666666",
  context1: "77777777-7777-4777-8777-777777777777",
};

const now = new Date("2028-01-01T00:00:00.000Z");
const noticeSnapshot = buildPolicyNoticeSnapshot({
  policy: {
    id: ids.policyA,
    name: "Privacy notice",
    versionId: ids.version1,
    version: 1,
  },
  jurisdiction: "gdpr",
  locale: "en-GB",
  variantId: null,
  bannerConfig: {
    title: "Your privacy choices",
    description: "Choose how optional data may be used.",
  },
  purposes: [{ id: "purpose-analytics", name: "Analytics", isRequired: false }],
  vendors: [{ id: "vendor-example", name: "Example Analytics" }],
  grievance: { dpoEmail: "privacy@example.test" },
});

const versionOneContext = issuePolicyContext(
  {
    organizationId: ids.organizationA,
    websiteId: ids.websiteA,
    siteKey: "site_policy_context_test",
    policyId: ids.policyA,
    policyVersionId: ids.version1,
    policyVersionNumber: 1,
    jurisdiction: "gdpr",
    locale: "en-GB",
    variantId: null,
    noticeSnapshot,
  },
  { now, ttlMs: 60_000, contextId: ids.context1 },
);

// Scenario A: the version shown is the version authorized for recording.
const verified = verifyPolicyContextEnvelope(versionOneContext, now);
assert.equal(verified.ok, true);
assert.equal(verified.claims.policyVersionId, ids.version1);
assert.equal(
  policyContextMatchesVersion(verified.claims, {
    policyId: ids.policyA,
    policyVersionId: ids.version1,
    policyVersionNumber: 1,
  }),
  true,
);

// Scenario B: publishing v2 cannot rewrite a still-open v1 policy context.
assert.equal(
  policyContextMatchesVersion(verified.claims, {
    policyId: ids.policyA,
    policyVersionId: ids.version2,
    policyVersionNumber: 2,
  }),
  false,
);
assert.equal(verified.claims.policyVersionId, ids.version1);

// Scenario C: expiry, signature tampering, and notice tampering are rejected.
assert.deepEqual(
  verifyPolicyContextEnvelope(
    versionOneContext,
    new Date(now.getTime() + 60_001),
  ),
  { ok: false, reason: "expired" },
);
const tamperedToken = {
  ...versionOneContext,
  token: `${versionOneContext.token.slice(0, -1)}x`,
};
assert.equal(verifyPolicyContextEnvelope(tamperedToken, now).ok, false);
const tamperedNotice = {
  ...versionOneContext,
  noticeSnapshot: {
    ...versionOneContext.noticeSnapshot,
    bannerConfig: { title: "Different notice" },
  },
};
assert.deepEqual(verifyPolicyContextEnvelope(tamperedNotice, now), {
  ok: false,
  reason: "notice_hash_mismatch",
});

// Scenario D: a signed context for tenant A cannot be used by tenant B.
assert.equal(
  policyContextMatchesScope(verified.claims, {
    organizationId: ids.organizationA,
    websiteId: ids.websiteA,
    siteKey: "site_policy_context_test",
  }),
  true,
);
assert.equal(
  policyContextMatchesScope(verified.claims, {
    organizationId: ids.organizationB,
    websiteId: ids.websiteA,
    siteKey: "site_policy_context_test",
  }),
  false,
);
