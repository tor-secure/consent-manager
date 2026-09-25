const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.join(__dirname, "../../../.tmp/compiled/src/lib/tools");
const { runTool } = require(path.join(root, "assessment-engine.js"));
const { canAccessAssessment } = require(path.join(root, "access.js"));
const { redactAnswers } = require(path.join(root, "redact.js"));
const { parseToolAnswers } = require(path.join(root, "parse-answers.js"));
const { PENALTY_FACTORS } = require(path.join(__dirname, "../../../.tmp/compiled/src/config/tools/penalty.js"));
const { READINESS_QUESTIONS } = require(path.join(__dirname, "../../../.tmp/compiled/src/config/tools/readiness.js"));
const { SDF_QUESTIONS } = require(path.join(__dirname, "../../../.tmp/compiled/src/config/tools/sdf.js"));
const { TIMELINE_INPUTS } = require(path.join(__dirname, "../../../.tmp/compiled/src/config/tools/timeline.js"));

function fill(questions, picker) {
  return Object.fromEntries(questions.map((question) => [question.id, picker(question)]));
}

const lowPenalty = fill(PENALTY_FACTORS, (factor) => factor.options[0].value);
const highPenalty = fill(PENALTY_FACTORS, (factor) => factor.options[factor.options.length - 1].value);
const ready = fill(READINESS_QUESTIONS, () => "yes");
const emptyReady = fill(READINESS_QUESTIONS, () => "no");
const partialReady = fill(READINESS_QUESTIONS, () => "partial");
const timelineBase = fill(TIMELINE_INPUTS, (input) => input.options[0].value);

function testAccess() {
  assert.equal(canAccessAssessment({ organizationId: "org-a" }, { organizationId: "org-a" }), true);
  assert.equal(canAccessAssessment({ organizationId: "org-a" }, { organizationId: "org-b" }), false);
  assert.equal(canAccessAssessment({ organizationId: "org-a" }, { organizationId: null }), false);
}

function testPenalty() {
  assert.equal(runTool("penalty-risk", {}).ok, false);
  assert.equal(runTool("penalty-risk", { size: "small" }).ok, false);
  const low = runTool("penalty-risk", lowPenalty);
  const high = runTool("penalty-risk", highPenalty);
  assert.equal(low.ok, true);
  assert.equal(high.ok, true);
  assert.ok(low.result.score < 25);
  assert.ok(high.result.score > 70);
  assert.match(low.result.disclaimer, /not legal advice/i);
  assert.match(high.result.summary, /not a forecast/i);
}

function testReadiness() {
  const full = runTool("readiness-gap", ready);
  const none = runTool("readiness-gap", emptyReady);
  const half = runTool("readiness-gap", partialReady);
  assert.equal(full.result.score, 100);
  assert.equal(none.result.score, 0);
  assert.equal(half.result.score, 50);
  assert.ok(none.result.findings.length > full.result.findings.length);
  assert.ok(none.result.pillars.every((pillar) => pillar.score === 0));
}

function testNotice() {
  assert.equal(runTool("notice-auditor", {}).ok, false);
  assert.equal(runTool("notice-auditor", { notice: "   " }).ok, false);
  const injected = runTool("notice-auditor", {
    notice: "<script>withdraw access grievance privacy@example.com</script><b>By continuing you agree</b> we use data for any purpose.",
  });
  assert.equal(injected.ok, true);
  assert.ok(injected.result.findings.some((finding) => finding.id === "too-short" || finding.severity === "critical" || finding.severity === "high"));
  assert.equal(JSON.stringify(injected.result).includes("<script>"), false);
  const good = runTool("notice-auditor", {
    notice: "We are Example Ltd, the organisation that decides these purposes. We collect personal data such as your email in order to create your account. You can accept or reject analytics. You can withdraw consent in the preference center. You may ask for access, correction, or erasure, and you may nominate another person. Email privacy@example.com with a grievance or to complain to the Data Protection Board. Version 3. Last updated January 2026.",
  });
  assert.equal(good.ok, true);
  assert.ok(good.result.score > injected.result.score);
}

function testTimeline() {
  assert.equal(runTool("compliance-timeline", {}).ok, false);
  const basic = runTool("compliance-timeline", timelineBase);
  assert.equal(basic.ok, true);
  assert.ok(basic.result.phases.length >= 3);
  assert.equal(basic.result.phases.some((phase) => phase.tasks.some((task) => task.id === "child-audit")), false);
  const children = runTool("compliance-timeline", { ...timelineBase, children: "yes", window: "30", cmp: "none" });
  assert.equal(children.result.phases.some((phase) => phase.tasks.some((task) => task.id === "child-audit")), true);
  assert.notDeepEqual(
    basic.result.phases.map((phase) => phase.tasks.map((task) => task.id)),
    children.result.phases.map((phase) => phase.tasks.map((task) => task.id)),
  );
}

function testSdf() {
  const none = runTool("sdf-checker", fill(SDF_QUESTIONS, () => "no"));
  const many = runTool("sdf-checker", fill(SDF_QUESTIONS, () => "yes"));
  const unsure = runTool("sdf-checker", fill(SDF_QUESTIONS, () => "unsure"));
  assert.match(none.result.label, /Limited SDF indicators/);
  assert.match(many.result.label, /Potential SDF indicators/);
  assert.match(many.result.summary, /not a determination/i);
  assert.ok(unsure.result.unknowns.length === SDF_QUESTIONS.length);
  assert.equal(unsure.result.indicators.length, 0);
}

function testRedactAndParse() {
  const stored = redactAnswers("notice-auditor", { notice: "<b>secret notice</b>", language: "en" });
  assert.equal(stored.notice, undefined);
  assert.equal(stored.language, "en");
  assert.equal(stored.noticeCharacters, String("<b>secret notice</b>".length));
  assert.equal(parseToolAnswers({ toolType: "nope", answers: {} }), null);
  assert.equal(parseToolAnswers({ toolType: "penalty-risk", answers: { size: 1 } }), null);
  assert.deepEqual(parseToolAnswers({ toolType: "sdf-checker", answers: { scale: "yes" } }).answers.scale, "yes");
}

testAccess();
testPenalty();
testReadiness();
testNotice();
testTimeline();
testSdf();
testRedactAndParse();
console.log("dpdp tool engine tests passed");
