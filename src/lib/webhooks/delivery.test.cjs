const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const compiledCandidates = [
  path.join(root, ".tmp/webhook-delivery/delivery.js"),
  path.join(root, ".tmp/webhook-delivery/src/lib/webhooks/delivery.js"),
  path.join(root, ".tmp/webhook-delivery/lib/webhooks/delivery.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));

if (!compiledPath) {
  throw new Error(
    "Compiled delivery.js not found. Run: npx tsc --outDir .tmp/webhook-delivery --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/webhooks/delivery.ts",
  );
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "@/db") return { db: {} };
  if (request === "@/lib/logger") return { logger: { error() {}, warn() {}, info() {}, debug() {} } };
  if (request.startsWith("@/db/schema/")) return { webhookDeliveries: {}, webhookEndpoints: {} };
  return originalLoad.call(this, request, parent, isMain);
};

const {
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_EVENT_TYPE_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  createWebhookSignature,
  deliverWebhookToEndpoint,
  shouldRetryDelivery,
  sanitizeWebhookResponseBody,
  verifyWebhookSignature,
} = require(compiledPath);

function response(status, body = "") {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}

async function testSigningAndRetry() {
  const attempts = [];
  const requests = [];
  const sleeps = [];
  const marked = [];

  const result = await deliverWebhookToEndpoint(
    {
      id: "endpoint-a",
      organizationId: "org-a",
      url: "https://example.com/webhooks/cmp",
      subscribedEvents: ["consent.granted"],
      signingSecretHash: "stored-secret-hash",
    },
    {
      organizationId: "org-a",
      eventId: "event-a",
      eventType: "consent.granted",
      payload: { consentId: "cid_a" },
    },
    {
      maxAttempts: 3,
      backoffMs: [1, 1],
      sleep: async (ms) => { sleeps.push(ms); },
      recordAttempt: async (attempt) => { attempts.push(attempt); },
      markEndpointDelivered: async (endpointId, deliveredAt) => {
        marked.push({ endpointId, deliveredAt });
      },
      fetchImpl: async (url, init) => {
        requests.push({ url, init });
        return requests.length === 1
          ? response(500, "temporary failure")
          : response(204, "");
      },
    },
  );

  assert.equal(result.status, "success");
  assert.equal(requests.length, 2);
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].status, "retrying");
  assert.equal(attempts[0].responseStatusCode, 500);
  assert.ok(attempts[0].nextRetryAt instanceof Date);
  assert.equal(attempts[1].status, "success");
  assert.equal(attempts[1].responseStatusCode, 204);
  assert.equal(sleeps.length, 1);
  assert.equal(marked.length, 1);
  assert.equal(marked[0].endpointId, "endpoint-a");

  const headers = requests[0].init.headers;
  const signature = headers[WEBHOOK_SIGNATURE_HEADER].replace(/^sha256=/, "");
  assert.equal(headers[WEBHOOK_EVENT_ID_HEADER], "event-a");
  assert.equal(headers[WEBHOOK_EVENT_TYPE_HEADER], "consent.granted");
  assert.ok(headers[WEBHOOK_TIMESTAMP_HEADER]);
  assert.equal(
    verifyWebhookSignature({
      payload: requests[0].init.body,
      timestamp: headers[WEBHOOK_TIMESTAMP_HEADER],
      signingSecretHash: "stored-secret-hash",
      signature,
    }),
    true,
  );
}

async function testOwnershipGuard() {
  await assert.rejects(
    () => deliverWebhookToEndpoint(
      {
        id: "endpoint-b",
        organizationId: "org-b",
        url: "https://example.com/webhooks/cmp",
        subscribedEvents: ["consent.granted"],
        signingSecretHash: "stored-secret-hash",
      },
      {
        organizationId: "org-a",
        eventId: "event-b",
        eventType: "consent.granted",
        payload: {},
      },
      {
        fetchImpl: async () => response(200),
        recordAttempt: async () => {},
      },
    ),
    /does not belong/,
  );
}

async function testNonRetryableFailure() {
  const attempts = [];
  const result = await deliverWebhookToEndpoint(
    {
      id: "endpoint-c",
      organizationId: "org-a",
      url: "https://example.com/webhooks/cmp",
      subscribedEvents: ["consent.granted"],
      signingSecretHash: "stored-secret-hash",
    },
    {
      organizationId: "org-a",
      eventId: "event-c",
      eventType: "consent.granted",
      payload: {},
    },
    {
      maxAttempts: 3,
      sleep: async () => { throw new Error("should not sleep"); },
      recordAttempt: async (attempt) => { attempts.push(attempt); },
      fetchImpl: async () => response(400, "bad request"),
    },
  );

  assert.equal(result.status, "failed");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].status, "failed");
  assert.equal(attempts[0].responseStatusCode, 400);
}

async function testTimeoutIsSafeAndRetryable() {
  const attempts = [];
  const abortError = new Error("aborted");
  abortError.name = "AbortError";

  const result = await deliverWebhookToEndpoint(
    {
      id: "endpoint-d",
      organizationId: "org-a",
      url: "https://example.com/webhooks/cmp",
      subscribedEvents: ["consent.granted"],
      signingSecretHash: "stored-secret-hash",
    },
    {
      organizationId: "org-a",
      eventId: "event-d",
      eventType: "consent.granted",
      payload: {},
    },
    {
      maxAttempts: 1,
      timeoutMs: 1,
      recordAttempt: async (attempt) => { attempts.push(attempt); },
      fetchImpl: async () => { throw abortError; },
    },
  );

  assert.equal(result.status, "failed");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].errorMessage, "Webhook delivery timed out");
  assert.equal(attempts[0].responseBody, null);
}

async function main() {
  const signature = createWebhookSignature({
    payload: "{\"ok\":true}",
    timestamp: "1700000000",
    signingSecretHash: "stored-secret-hash",
  });
  assert.equal(signature.length, 64);
  assert.equal(shouldRetryDelivery(500, null), true);
  assert.equal(shouldRetryDelivery(400, null), false);
  assert.equal(shouldRetryDelivery(null, "network"), true);
  assert.equal(sanitizeWebhookResponseBody("x".repeat(2_500)).length, 2_000);

  await testSigningAndRetry();
  await testOwnershipGuard();
  await testNonRetryableFailure();
  await testTimeoutIsSafeAndRetryable();

  console.log("webhook delivery tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
