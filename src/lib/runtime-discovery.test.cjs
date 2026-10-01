const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "@/db" || request.startsWith("@/db/schema/")) return {};
  if (request === "@/lib/discovery-redaction-core") return originalLoad.call(this, path.join(__dirname, "../../.tmp/transfer-security/discovery-redaction-core.js"), parent, isMain);
  return originalLoad.call(this, request, parent, isMain);
};
const { runtimeDiscoveryBatchSchema } = require(path.join(__dirname, "../../.tmp/runtime-discovery/runtime-discovery.js"));
const valid = { schemaVersion: 1, observations: [{ eventId: "00000000-0000-4000-8000-000000000001", type: "fetch", pageUrl: "https://example.com/account", pageOrigin: "example.com", destinationHost: "cdn.example.net", resourcePath: "/collect", requestMethod: "POST", consentState: { analytics: false }, observedAt: "2026-09-29T10:00:00.000Z" }] };
assert.equal(runtimeDiscoveryBatchSchema.safeParse(valid).success, true, "sanitized fetch evidence is accepted");
assert.equal(runtimeDiscoveryBatchSchema.safeParse({ ...valid, observations: [{ ...valid.observations[0], resourcePath: "/collect?email=a@example.com" }] }).success, false, "query strings are rejected");
assert.equal(runtimeDiscoveryBatchSchema.safeParse({ ...valid, observations: [{ ...valid.observations[0], pageUrl: "https://example.com/?token=secret" }] }).success, false, "page query strings are rejected");
const sanitized = runtimeDiscoveryBatchSchema.parse({ ...valid, observations: [{ ...valid.observations[0], pageUrl: "https://example.com/account/12345678", resourcePath: "/oauth/access_token/secret-value", storageKey: "session_token" }] });
assert.equal(sanitized.observations[0].pageUrl, "https://example.com/account/[redacted]", "sensitive path identifiers are removed before persistence");
assert.equal(sanitized.observations[0].resourcePath, "/oauth/[redacted]/[redacted]", "token-like path elements are removed before persistence");
assert.equal(sanitized.observations[0].storageKey, "[redacted]", "sensitive cookie/storage key names are removed");
assert.equal(runtimeDiscoveryBatchSchema.safeParse({ ...valid, observations: Array.from({ length: 101 }, () => valid.observations[0]) }).success, false, "abusive batches are rejected");
console.log("runtime discovery validation tests passed");
