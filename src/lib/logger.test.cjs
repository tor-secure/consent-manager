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

const { sanitizeLogContext } = require(compiledPath);

const sanitized = sanitizeLogContext({
  organizationId: "org_123",
  websiteId: "site_123",
  requesterEmail: "person@example.com",
  nested: {
    webhookSecret: "whsec_hidden",
    message: "Contact person@example.com for details",
  },
  error: new Error("Failed for person@example.com"),
});

assert.equal(sanitized.organizationId, "org_123");
assert.equal(sanitized.websiteId, "site_123");
assert.equal(sanitized.requesterEmail, "[REDACTED]");
assert.equal(sanitized.nested.webhookSecret, "[REDACTED]");
assert.equal(sanitized.nested.message, "Contact [REDACTED_EMAIL] for details");
assert.equal(sanitized.error.message, "Failed for [REDACTED_EMAIL]");

console.log("logger tests passed");
