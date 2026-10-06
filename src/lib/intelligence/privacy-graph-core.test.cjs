const assert = require("node:assert/strict");
const { uniqueGraph, simulatePurposeDisabled } = require("../../../.tmp/privacy-graph/privacy-graph-core.js");
const graph = uniqueGraph([{ id: "purpose:p", type: "purpose", label: "Analytics", provenance: "configured" }, { id: "tracker:t", type: "tracker", label: "Tracker", provenance: "configured" }], [{ id: "one", source: "tracker:t", target: "purpose:p", relation: "uses_purpose", provenance: "configured" }, { id: "duplicate", source: "tracker:t", target: "purpose:p", relation: "uses_purpose", provenance: "configured" }]);
assert.equal(graph.edges.length, 1);
assert.deepEqual(simulatePurposeDisabled(graph, "p").affected.map((node) => node.id).sort(), ["purpose:p", "tracker:t"]);
const evidenceGraph = uniqueGraph([
  { id: "purpose:p", type: "purpose", label: "Analytics", provenance: "configured" },
  { id: "tracker:t", type: "tracker", label: "Tracker", provenance: "configured" },
  { id: "observation:o", type: "observation", label: "fetch", provenance: "observed" },
  { id: "destination:d", type: "destination", label: "third.example", provenance: "observed" },
  { id: "page:x", type: "page", label: "https://site.example/pricing", provenance: "observed" },
], [
  { id: "tracker-purpose", source: "tracker:t", target: "purpose:p", relation: "uses_purpose", provenance: "configured" },
  { id: "observation-tracker", source: "observation:o", target: "tracker:t", relation: "identifies", provenance: "observed" },
  { id: "observation-destination", source: "observation:o", target: "destination:d", relation: "contacts", provenance: "observed" },
  { id: "observation-page", source: "observation:o", target: "page:x", relation: "occurs_on", provenance: "observed" },
]);
assert.deepEqual(
  simulatePurposeDisabled(evidenceGraph, "p").affected.map((node) => node.id).sort(),
  ["destination:d", "observation:o", "page:x", "purpose:p", "tracker:t"],
);
const transferGraph = uniqueGraph([
  { id: "purpose:cross", type: "purpose", label: "Cross-border processing", provenance: "configured" },
  { id: "consent_decision:d", type: "consent_decision", label: "Granted", provenance: "observed" },
  { id: "consent:c", type: "consent_state", label: "Consent", provenance: "observed" },
  { id: "transfer_authorization:a", type: "transfer_authorization", label: "Authorization", provenance: "configured" },
  { id: "transfer:t", type: "transfer", label: "Transfer", provenance: "configured" },
  { id: "secure_transfer:e", type: "secure_transfer", label: "Envelope", provenance: "enforced" },
], [
  { id: "purpose-decision", source: "consent_decision:d", target: "purpose:cross", relation: "decides_purpose", provenance: "observed" },
  { id: "decision-consent", source: "consent_decision:d", target: "consent:c", relation: "part_of_consent", provenance: "observed" },
  { id: "authorization-consent", source: "transfer_authorization:a", target: "consent:c", relation: "authorized_by_consent", provenance: "configured" },
  { id: "authorization-purpose", source: "transfer_authorization:a", target: "purpose:cross", relation: "limited_to_purpose", provenance: "configured" },
  { id: "authorization-transfer", source: "transfer_authorization:a", target: "transfer:t", relation: "authorizes_transfer", provenance: "configured" },
  { id: "envelope-authorization", source: "secure_transfer:e", target: "transfer_authorization:a", relation: "uses_authorization", provenance: "enforced" },
]);
assert.deepEqual(
  simulatePurposeDisabled(transferGraph, "cross").affected.map((node) => node.id).sort(),
  ["consent:c", "consent_decision:d", "purpose:cross", "secure_transfer:e", "transfer:t", "transfer_authorization:a"],
);
console.log("Privacy graph core tests passed");
