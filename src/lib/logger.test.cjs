const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const compiledCandidates = [
  path.join(root, ".tmp/logger/logger.js"),
  path.join(root, ".tmp/logger/src/lib/logger.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));

if (!compiledPath) {
  throw new Error(
    "Compiled logger.js not found. Run: npx tsc --outDir .tmp/logger --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck --noEmit false src/lib/logger.ts",
  );
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

const { sanitizeLogContext, logger } = require(compiledPath);

const sanitized = sanitizeLogContext({
  organizationId: "org_123",
  websiteId: "site_123",
  duration: 42,
  route: "POST /api/consent/record",
  operation: "consent.record.create",
  requesterEmail: "person@example.com",
  apiKey: "cmp_live_supersecret",
  DATABASE_URL: "postgresql://consent_admin:sathwik11@localhost:5432/consent_platform",
  nested: {
    webhookSecret: "whsec_hiddenvalue",
    clerkSecret: "sk_test_abcdefghijklmnopqrstuvwxyz",
    message: "Contact person@example.com postgres://user:hunter2@db.internal:5432/app",
    metadata: { visitorId: "vis_1", extra: "keep-out" },
  },
  error: new Error("Failed for person@example.com using sk_test_abcdefghijklmnopqrstuvwxyz"),
});

assert.equal(sanitized.organizationId, "org_123");
assert.equal(sanitized.websiteId, "site_123");
assert.equal(sanitized.duration, 42);
assert.equal(sanitized.route, "POST /api/consent/record");
assert.equal(sanitized.operation, "consent.record.create");
assert.equal(sanitized.requesterEmail, "[REDACTED]");
assert.equal(sanitized.apiKey, "[REDACTED]");
assert.equal(sanitized.DATABASE_URL, "[REDACTED]");
assert.equal(sanitized.nested.webhookSecret, "[REDACTED]");
assert.equal(sanitized.nested.clerkSecret, "[REDACTED]");
assert.equal(sanitized.nested.metadata, "[REDACTED]");
assert.match(String(sanitized.nested.message), /\[REDACTED_EMAIL\]/);
assert.match(String(sanitized.nested.message), /\[REDACTED_DB_URL\]/);
assert.doesNotMatch(String(sanitized.nested.message), /hunter2/);
assert.match(String(sanitized.error.message), /\[REDACTED_EMAIL\]/);
assert.match(String(sanitized.error.message), /\[REDACTED_KEY\]/);
assert.doesNotMatch(JSON.stringify(sanitized), /sathwik11/);
assert.doesNotMatch(JSON.stringify(sanitized), /sk_test_abcdefghijklmnopqrstuvwxyz/);

const captured = [];
const originalError = console.error;
console.error = (line) => {
  captured.push(String(line));
};
try {
  logger.error("unexpected failure", {
    route: "POST /api/api-keys",
    operation: "api-keys.create",
    organizationId: "org_safe",
    error: new Error("could not write postgresql://owner:neon-pass@ep-host/neondb"),
    fullKey: "cmp_live_should_not_appear",
  });
} finally {
  console.error = originalError;
}

assert.equal(captured.length, 1);
const payload = JSON.parse(captured[0]);
assert.equal(payload.level, "error");
assert.equal(payload.message, "unexpected failure");
assert.equal(payload.service, "consent-manager");
assert.equal(payload.context.organizationId, "org_safe");
assert.equal(payload.context.fullKey, "[REDACTED]");
assert.match(String(payload.context.error.message), /\[REDACTED_DB_URL\]/);
assert.doesNotMatch(captured[0], /neon-pass/);
assert.doesNotMatch(captured[0], /cmp_live_should_not_appear/);

console.log("logger tests passed");
