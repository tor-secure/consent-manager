const assert = require("node:assert/strict");

const {
  createPortableConsentCryptoProof,
  verifyPortableConsentCryptoProof,
} = require("../../.tmp/portable-redaction/portable-consent-proof.js");
const {
  canConsumePortableExchange,
  validatePortableClaims,
} = require("../../.tmp/portable-redaction/portable-consent-core.js");
const {
  redactValue,
  validateRedactionPolicy,
} = require("../../.tmp/portable-redaction/redaction-core.js");

const now = new Date("2028-01-01T00:00:00.000Z");
const claims = {
  v: 2,
  jti: "00000000-0000-4000-8000-000000000001",
  consentId: "consent_12345678",
  originWebsiteId: "00000000-0000-4000-8000-000000000010",
  targetWebsiteId: "00000000-0000-4000-8000-000000000020",
  audience: "portable-consent-import",
  status: "accepted",
  choice: "accept-all",
  jurisdiction: "EU",
  consentedAt: "2027-12-01T00:00:00.000Z",
  expiresAt: "2029-01-01T00:00:00.000Z",
  issuedAt: now.toISOString(),
  exchangeExpiresAt: new Date(now.getTime() + 600_000).toISOString(),
  decisions: [{ purposeKey: "analytics", vendorDomain: null, granted: true }],
};

const proof = createPortableConsentCryptoProof(claims, now);
assert.equal(verifyPortableConsentCryptoProof({ claims, proof }).intact, true);
assert.equal(
  verifyPortableConsentCryptoProof({
    claims: { ...claims, targetWebsiteId: "00000000-0000-4000-8000-000000000099" },
    proof,
  }).intact,
  false,
  "target tampering must invalidate the signature",
);
assert.equal(validatePortableClaims(claims, claims.targetWebsiteId, now), true);
assert.equal(validatePortableClaims(claims, claims.originWebsiteId, now), false, "audience must be target-bound");
assert.equal(validatePortableClaims(claims, claims.targetWebsiteId, new Date(now.getTime() + 600_001)), false);

const exchange = {
  organizationId: "org-a",
  targetWebsiteId: claims.targetWebsiteId,
  status: "issued",
  consumedAt: null,
  expiresAt: new Date(now.getTime() + 600_000),
};
assert.equal(canConsumePortableExchange(exchange, "org-a", claims.targetWebsiteId, now), true);
assert.equal(canConsumePortableExchange({ ...exchange, consumedAt: now }, "org-a", claims.targetWebsiteId, now), false, "replay must fail");
assert.equal(canConsumePortableExchange(exchange, "org-b", claims.targetWebsiteId, now), false, "cross-tenant consume must fail");

const parsed = validateRedactionPolicy({
  fields: [
    { path: "requestId", essential: true },
    { path: "user.email", purposeKeys: ["marketing"] },
    { path: "events.*.url", dataCategories: ["Browsing_history"] },
  ],
});
assert.equal(parsed.ok, true);
const result = redactValue({
  requestId: "r1",
  secret: "remove",
  user: { email: "a@example.test", name: "remove" },
  events: [{ url: "/one", fingerprint: "remove" }, { url: "/two" }],
}, parsed.policy, {
  allowedPurposeKeys: new Set(),
  allowedDataCategories: new Set(["browsing_history"]),
});
assert.deepEqual(result.value, {
  requestId: "r1",
  user: {},
  events: [{ url: "/one" }, { url: "/two" }],
});
assert.ok(result.removedPaths.includes("secret"));
assert.ok(result.removedPaths.includes("user.email"));

assert.equal(validateRedactionPolicy({ fields: [{ path: "open" }] }).ok, false, "implicit allow rules are forbidden");

{
  const previousNodeEnv = process.env.NODE_ENV;
  const previousProofSecret = process.env.CONSENT_PROOF_SECRET;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.NODE_ENV = "production";
  delete process.env.CONSENT_PROOF_SECRET;
  delete process.env.DATABASE_URL;
  assert.throws(
    () => createPortableConsentCryptoProof(claims, now),
    /CONSENT_PROOF_SECRET is required/,
    "production portable proofs must never use a development fallback key",
  );
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousProofSecret === undefined) delete process.env.CONSENT_PROOF_SECRET;
  else process.env.CONSENT_PROOF_SECRET = previousProofSecret;
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
}

console.log("Portable consent and redaction tests passed");
