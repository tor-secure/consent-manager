const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const compiledCandidates = [
  path.join(root, ".tmp/health/health.js"),
  path.join(root, ".tmp/health/src/lib/health.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));

if (!compiledPath) {
  throw new Error(
    "Compiled health.js not found. Run: npx tsc --outDir .tmp/health --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck --noEmit false src/lib/health.ts",
  );
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "./logger" || request === "@/lib/logger" || /[/\\]logger$/.test(request)) {
    return { logger: { error() {}, warn() {}, info() {}, debug() {} } };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { buildHealthResponse, runHealthCheck } = require(compiledPath);

function assertSafeBody(body) {
  const serialized = JSON.stringify(body);
  assert.equal(typeof body.status, "string");
  assert.equal(body.checks.app, "ok");
  assert.ok(body.checks.database === "ok" || body.checks.database === "unhealthy");
  assert.doesNotMatch(serialized, /password/i);
  assert.doesNotMatch(serialized, /postgres/i);
  assert.doesNotMatch(serialized, /stack/i);
  assert.doesNotMatch(serialized, /ECONNREFUSED/);
  assert.doesNotMatch(serialized, /SELECT/i);
  assert.doesNotMatch(serialized, /node_modules/);
}

async function testHealthy() {
  const built = buildHealthResponse(true);
  assert.equal(built.ok, true);
  assert.equal(built.statusCode, 200);
  assert.equal(built.body.status, "ok");
  assert.equal(built.body.checks.database, "ok");
  assertSafeBody(built.body);

  const result = await runHealthCheck(async () => ({ rows: [{ "?column?": 1 }] }));
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, "ok");
  assertSafeBody(result.body);
}

async function testDatabaseFailure() {
  const built = buildHealthResponse(false);
  assert.equal(built.ok, false);
  assert.equal(built.statusCode, 503);
  assert.equal(built.body.status, "unhealthy");
  assert.equal(built.body.checks.app, "ok");
  assert.equal(built.body.checks.database, "unhealthy");
  assertSafeBody(built.body);

  const result = await runHealthCheck(async () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:5432 password=super-secret");
  });
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.status, "unhealthy");
  assertSafeBody(result.body);
}

async function main() {
  await testHealthy();
  await testDatabaseFailure();
  console.log("health tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
