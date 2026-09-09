const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "../../..");
const out = path.join(root, ".tmp/intelligence-tests");
execFileSync(
  process.execPath,
  [
    path.join(root, "node_modules/typescript/bin/tsc"),
    "--outDir", out,
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--target", "ES2022",
    "--esModuleInterop",
    "--skipLibCheck",
    "src/lib/monitoring/consent-quality.ts",
    "src/lib/intelligence/simulator.ts",
    "src/lib/intelligence/autopilot-engine.ts",
    "src/lib/intelligence/negotiation-engine.ts",
    "src/lib/intelligence/negotiation-offers.ts",
    "src/lib/roi/roi-engine.ts",
    "src/lib/ai/types.ts",
    "src/lib/ai/sanitize.ts",
    "src/lib/ai/bedrock-provider.ts",
  ],
  { cwd: root, stdio: "pipe" },
);

function load(relative) {
  const direct = path.join(out, `${relative}.js`);
  const nested = path.join(out, "src/lib", `${relative}.js`);
  return require(fs.existsSync(direct) ? direct : nested);
}

const { minimizeAiContext } = load("ai/sanitize");
const { BedrockProvider } = load("ai/bedrock-provider");
const { buildAutopilotPlan } = load("intelligence/autopilot-engine");
const { buildConsentNegotiationPlan } = load("intelligence/negotiation-engine");
const { publicNegotiationOffers } = load("intelligence/negotiation-offers");
const { simulatePrivacyImpact } = load("intelligence/simulator");
const { computeConsentRoi } = load("roi/roi-engine");

function quality() {
  return {
    nonEssentialTrackers: 10,
    consentControlledTrackers: 5,
    enforcibleTrackers: 5,
    trackersWithPurpose: 5,
    trackersWithVendor: 5,
    openFindings: [{ severity: "high", findingType: "tracker_drift" }],
    hasPublishedPolicy: false,
    consentExpireDays: null,
    thirdPartyScanItems: 10,
    scanItemsWithActiveTracker: 5,
    consentRecordCount: 100,
    lastCompletedScanAt: new Date(),
  };
}

test("sanitizer drops identifiers, personal data, and raw payloads", () => {
  assert.deepEqual(
    minimizeAiContext({
      qualityScore: 72,
      consentId: "secret",
      userAgent: "browser",
      email: "a@example.com",
      rawEventPayload: { anything: true },
      note: "aggregate only",
    }),
    { qualityScore: 72, note: "aggregate only" },
  );
});

test("Bedrock validates structured output and reports usage", async () => {
  const provider = new BedrockProvider({
    modelId: "test-model",
    client: {
      send: async () => ({
        output: { message: { content: [{ text: '{"summary":"ok"}' }] } },
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      }),
    },
  });
  const { z } = require("zod");
  const result = await provider.generate({
    system: "system",
    prompt: "{}",
    schema: z.object({ summary: z.string() }),
    fallback: () => ({ summary: "fallback" }),
  });
  assert.equal(result.fallback, false);
  assert.equal(result.value.summary, "ok");
  assert.equal(result.usage.totalTokens, 15);
});

test("Bedrock falls back on invalid JSON without throwing", async () => {
  const provider = new BedrockProvider({
    modelId: "test-model",
    client: { send: async () => ({ output: { message: { content: [{ text: "not-json" }] } } }) },
  });
  const { z } = require("zod");
  const result = await provider.generate({
    system: "system",
    prompt: "{}",
    schema: z.object({ summary: z.string() }),
    fallback: () => ({ summary: "deterministic" }),
  });
  assert.equal(result.fallback, true);
  assert.equal(result.errorCode, "invalid_output");
  assert.equal(result.value.summary, "deterministic");
});

test("plans recompute cumulative deltas instead of summing overlapping baselines", () => {
  const input = quality();
  const scenarios = simulatePrivacyImpact(input);
  const plan = buildConsentNegotiationPlan({
    baselineScore: scenarios[0].before,
    targetScore: 100,
    scenarios,
    qualityInput: input,
    maxSteps: 4,
  });
  assert.equal(plan.predictedScoreAfter, plan.steps.at(-1).estimatedScoreAfter);
  for (let i = 1; i < plan.steps.length; i++) {
    assert.equal(plan.steps[i].scenario.before, plan.steps[i - 1].estimatedScoreAfter);
  }
  assert.equal(buildAutopilotPlan(input).steps.some((step) => step.legalPublication), true);
});

test("visitor offers exclude required purposes and disabled configurations", () => {
  const offers = [{ key: "lite", title: "Lite", description: "Optional", purposeKeys: ["essential"], actionLabel: "Choose" }];
  assert.deepEqual(publicNegotiationOffers({ enabled: true, offers, requiredPurposeKeys: ["essential"] }), []);
  assert.deepEqual(publicNegotiationOffers({ enabled: false, offers, requiredPurposeKeys: [] }), []);
});

test("ROI is honest when inputs are absent and computes currency metrics when complete", () => {
  const scenarios = simulatePrivacyImpact(quality());
  const absent = computeConsentRoi({ baseline: 50, scenarios });
  assert.equal(absent.confidence, "low");
  assert.equal(absent.bestScenario.annualBenefit, null);
  const complete = computeConsentRoi({
    baseline: 50,
    scenarios,
    business: {
      monthlySessions: 10_000,
      valuePerConsent: 2,
      implementationCost: 1_000,
      recurringMonthlyCost: 100,
      measuredDecisionCount: 2_000,
    },
  });
  assert.equal(complete.confidence, "high");
  assert.equal(typeof complete.bestScenario.annualBenefit, "number");
});

test("intelligence mutation routes require authentication, throttling, and confirmation", () => {
  const intelligenceRoute = fs.readFileSync(path.join(root, "src/app/api/intelligence/route.ts"), "utf8");
  const actionRoute = fs.readFileSync(path.join(root, "src/app/api/intelligence/autopilot/[id]/route.ts"), "utf8");
  assert.match(intelligenceRoute, /await auth\(\)/);
  assert.match(intelligenceRoute, /rateLimit\(\{/);
  assert.match(actionRoute, /confirmed: z\.literal\(true\)/);
  assert.match(actionRoute, /legalPublication/);
  assert.match(actionRoute, /reversible/);
});
