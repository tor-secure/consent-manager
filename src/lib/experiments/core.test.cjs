const assert = require("node:assert/strict");
const core = require("../../../.tmp/experiments/core.js");

const raw = {
  controlVariantId: "control",
  variants: [
    { id: "control", label: "Control", weight: 60, overrides: { layout: "bar" } },
    { id: "dialog", label: "Dialog", weight: 40, overrides: { layout: "dialog", position: "center", backgroundColor: "#fff" } },
  ],
};
const parsed = core.parseExperimentVariants(raw);
assert.ok(parsed);
assert.deepEqual(parsed.allocation, { control: 60, dialog: 40 });
assert.equal(core.parseExperimentVariants({ ...raw, variants: raw.variants.map((v) => v.id === "control" ? { ...v, overrides: { showRejectAll: false } } : v) }), null, "experiments cannot hide legal consent choices");
assert.equal(core.parseExperimentVariants({ ...raw, variants: raw.variants.map((v) => v.id === "control" ? { ...v, overrides: { title: "Changed legal copy" } } : v) }), null, "experiments cannot change policy copy");
assert.equal(core.parseExperimentVariants({ ...raw, variants: raw.variants.map((v) => v.id === "control" ? { ...v, weight: 50 } : { ...v, weight: 40 }) }), null, "allocation must sum to 100");
assert.equal(core.parseExperimentVariants({ ...raw, controlVariantId: "missing" }), null);

const visitorKey = "session-browser-key-0123456789";
const first = core.assignExperimentVariant({ experimentId: "experiment-1", visitorKey, variants: parsed.variants });
assert.equal(core.assignExperimentVariant({ experimentId: "experiment-1", visitorKey, variants: parsed.variants })?.id, first.id, "assignment stays stable");
assert.notEqual(core.assignExperimentVariant({ experimentId: "experiment-2", visitorKey, variants: parsed.variants }), null);
assert.equal(core.canTransitionExperiment("DRAFT", "RUNNING"), true);
assert.equal(core.canTransitionExperiment("RUNNING", "ARCHIVED"), false);
assert.equal(core.canTransitionExperiment("COMPLETED", "RUNNING"), false);

const results = core.experimentResults([
  { variantId: "control", eventType: "assignment" },
  { variantId: "control", eventType: "impression" },
  { variantId: "control", eventType: "consent_decision", choice: "accept-all" },
  { variantId: "control", eventType: "consent_decision", choice: "reject-all" },
  { variantId: "control", eventType: "consent_decision", choice: "granular" },
  { variantId: "control", eventType: "withdrawal" },
], parsed.variants);
assert.deepEqual({ assignments: results[0].assignments, impressions: results[0].impressions, decisions: results[0].consentDecisions, accepts: results[0].acceptances, rejects: results[0].rejections, granular: results[0].granularDecisions, withdrawals: results[0].withdrawals }, { assignments: 1, impressions: 1, decisions: 3, accepts: 1, rejects: 1, granular: 1, withdrawals: 1 });
assert.equal(results[1].decisionRate, null, "empty denominators stay unknown instead of showing zero percent");
console.log("Experiment lifecycle, allocation, invariant, and result tests passed");
