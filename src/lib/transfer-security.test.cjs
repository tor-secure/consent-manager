const assert = require("node:assert/strict");
const { generateKeyPairSync } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../../.tmp/transfer-security/transfer-security-core.js");
const redaction = require("../../.tmp/transfer-security/discovery-redaction-core.js");

const uuid = (tail) => `00000000-0000-4000-8000-${tail.padStart(12, "0")}`;
const recipient = generateKeyPairSync("x25519");
const wrongRecipient = generateKeyPairSync("x25519");
const publicKey = recipient.publicKey.export({ format: "der", type: "spki" }).toString("base64");
const binding = { id: uuid("1"), transferId: uuid("2"), authorizationId: uuid("3"), recipientVendorId: uuid("4"), recipientKeyId: "vendor-key-1", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() };
const envelope = core.createSecureTransferEnvelope({ plaintext: { customer: "example", purpose: "support" }, recipientPublicKey: publicKey, binding });
assert.deepEqual(JSON.parse(core.decryptSecureTransferEnvelope(envelope, recipient.privateKey)), { customer: "example", purpose: "support" }, "X25519/HKDF/AES-GCM round-trip decrypts for recipient");
assert.throws(() => core.decryptSecureTransferEnvelope(envelope, wrongRecipient.privateKey), "wrong private key rejected");
assert.throws(() => core.decryptSecureTransferEnvelope(envelope, recipient.privateKey, { recipientVendorId: uuid("5") }), "wrong recipient rejected");
assert.throws(() => core.decryptSecureTransferEnvelope(envelope, recipient.privateKey, { authorizationId: uuid("9") }), "wrong authorization rejected");
assert.throws(() => core.decryptSecureTransferEnvelope({ ...envelope, ciphertext: envelope.ciphertext.slice(0, -4) + "AAAA" }, recipient.privateKey), "tampered ciphertext rejected by GCM tag");
assert.throws(() => core.decryptSecureTransferEnvelope({ ...envelope, recipientKeyId: "other-key" }, recipient.privateKey), "altered authenticated metadata rejected");
assert.throws(() => core.decryptSecureTransferEnvelope({ ...envelope, authenticationTag: Buffer.alloc(16).toString("base64") }, recipient.privateKey), "invalid authentication tag rejected");
assert.throws(() => core.decryptSecureTransferEnvelope(envelope, recipient.privateKey, undefined, new Date(Date.now() + 120_000)), "expired envelope rejected");
assert.throws(() => core.createSecureTransferEnvelope({ plaintext: "x".repeat(1_000_001), recipientPublicKey: publicKey, binding }), "oversized payload rejected");
assert.throws(() => core.validateRecipientPublicKey("not-a-key"), "invalid recipient key rejected");

const now = new Date();
const usable = { state: "active", expiresAt: new Date(now.getTime() + 60_000), revokedAt: null, consumedAt: null, singleUse: true, transferActive: true, recipientMatches: true, consentActive: true, exactPurposeGrant: true, sessionActive: true, recipientKeyActive: true };
assert.equal(core.transferAuthorizationFailure(usable, now), null);
for (const [field, value] of [["expiresAt", new Date(now.getTime() - 1)], ["revokedAt", now], ["consumedAt", now], ["transferActive", false], ["recipientMatches", false], ["consentActive", false], ["exactPurposeGrant", false], ["sessionActive", false], ["recipientKeyActive", false]]) {
  assert.ok(core.transferAuthorizationFailure({ ...usable, [field]: value }, now), `${field} blocks transfer execution`);
}
assert.equal(core.transferAuthorizationFailure({ ...usable, consumedAt: now, singleUse: false }, now), null, "multi-use authorization permits another use while otherwise valid");
const issueRequirements = { transferActive: true, transferIsSiteScoped: true, processingActivityActive: true, activityMatchesRecipient: true, activityMatchesSite: true, purposeMatchesActivity: true, recipientActive: true, recipientKeyMatches: true, consentActive: true, purposeGranted: true, recipientGranted: true, sessionValid: true, expiryValid: true };
assert.equal(core.transferAuthorizationIssueFailure(issueRequirements), null, "authorization issues only when all explicit bindings are valid");
for (const field of ["transferActive", "transferIsSiteScoped", "processingActivityActive", "activityMatchesRecipient", "activityMatchesSite", "purposeMatchesActivity", "recipientActive", "recipientKeyMatches", "consentActive", "purposeGranted", "recipientGranted", "sessionValid", "expiryValid"]) {
  assert.ok(core.transferAuthorizationIssueFailure({ ...issueRequirements, [field]: false }), `${field} is required to issue authorization`);
}

assert.equal(redaction.sanitizeDiscoveryPageUrl("https://shop.example/account?email=user@example.com&token=abc#section"), "https://shop.example/account", "page query and fragment are never retained");
assert.equal(redaction.redactDiscoveryPath("/users/123456789/access_token/abc123456789abcdef012345"), "/users/[redacted]/[redacted]/[redacted]", "identifier and token-like path values are removed");
assert.equal(redaction.redactDiscoveryKey("session_token"), "[redacted]", "sensitive storage/cookie key is removed");
assert.equal(redaction.redactDiscoveryKey("cmp_choice"), "cmp_choice", "non-sensitive storage key remains useful");

const read = (relative) => fs.readFileSync(path.join(__dirname, "../../", relative), "utf8");
const authorizeRoute = read("src/app/api/transfer-authorizations/route.ts");
const executeRoute = read("src/app/api/secure-transfers/route.ts");
const recipientKeyRoute = read("src/app/api/transfers/recipient-keys/route.ts");
const schemaSource = read("src/db/schema/transfer-security.ts");
const migrationSource = read("drizzle/0062_secure_transfers.sql");
assert.match(authorizeRoute, /eq\(crossBorderTransfers\.organizationId, authz\.organization\.id\)/, "authorization creation isolates transfer by tenant");
assert.match(authorizeRoute, /eq\(transferRecipientKeys\.vendorId, transfer\.vendorId\)/, "recipient key must belong to existing transfer vendor");
assert.match(authorizeRoute, /eq\(consentDecisions\.purposeId, activity\.purposeId\)/, "authorization binds the exact processing purpose grant");
assert.match(executeRoute, /eq\(transferAuthorizations\.organizationId, authz\.organization\.id\)/, "transfer execution isolates authorization by tenant");
assert.match(executeRoute, /eq\(consentDecisions\.id, authorization\.consentDecisionId\)/, "execution checks the exact recorded consent decision");
assert.match(migrationSource, /secure_transfer_idempotency_unique/, "duplicate submissions have a database uniqueness gate");
assert.match(recipientKeyRoute, /eq\(vendors\.organizationId, authz\.organization\.id\)/, "recipient identity cannot cross tenant boundary");
assert.doesNotMatch(schemaSource, /privateKey|private_key|secretKey|secret_key/i, "schema contains no private key material");

console.log("Secure transfer crypto, authorization gates, and runtime redaction tests passed");
