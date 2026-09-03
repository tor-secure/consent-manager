const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const compiledCandidates = [
  path.join(root, ".tmp/dashboard-feedback/dashboard-feedback.js"),
  path.join(root, ".tmp/dashboard-feedback/src/lib/dashboard-feedback.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));

if (!compiledPath) {
  throw new Error(
    "Compiled dashboard-feedback.js not found. Run: npx tsc --outDir .tmp/dashboard-feedback --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/dashboard-feedback.ts",
  );
}

const { userFacingError, isSafeUserMessage } = require(compiledPath);

assert.equal(isSafeUserMessage("Please check the domain."), true);
assert.equal(isSafeUserMessage("relation websites does not exist"), false);
assert.equal(isSafeUserMessage("ECONNREFUSED 127.0.0.1"), false);
assert.equal(isSafeUserMessage("SELECT * FROM users"), false);

const validation = userFacingError(400, "Name is required", "Unable to save.");
assert.equal(validation.kind, "validation");
assert.equal(validation.showInline, true);
assert.equal(validation.message, "Name is required");

const unsafeValidation = userFacingError(400, "password hash failed at Object.query", "Unable to save.");
assert.equal(unsafeValidation.showInline, true);
assert.equal(unsafeValidation.message, "Please check the form and try again.");

assert.equal(userFacingError(401, "nope", "x").kind, "auth");
assert.equal(userFacingError(403, "nope", "x").kind, "auth");
assert.equal(userFacingError(404, "nope", "x").kind, "not_found");
assert.equal(userFacingError(409, "Domain already exists", "x").kind, "conflict");
assert.equal(userFacingError(429, "slow down", "x").kind, "rate_limit");
assert.equal(userFacingError(0, undefined, "fallback").kind, "network");
assert.equal(userFacingError(500, "SQLSTATE 23505", "Unable to add website. Please try again.").message, "Unable to add website. Please try again.");

console.log("dashboard-feedback.test.cjs passed");
