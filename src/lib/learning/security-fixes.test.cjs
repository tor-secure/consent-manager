const assert = require("node:assert/strict");
const path = require("node:path");

const {
  resolveLearningRole,
  parseOperatorEmailAllowlist,
} = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/learning/operator-access.js"));
const {
  parseSubmittedAnswers,
  isLearningAttemptId,
  safeDecodeCertificateCode,
} = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/learning/assessment-input.js"));
const {
  courseEnsureMetadataPatch,
  courseRefreshSettingsPatch,
} = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/learning/catalog-ensure.js"));
const { lessonVideo } = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/learning/module-videos.js"));
const {
  shouldEnforceCsrfOrigin,
  isTrustedDashboardMutation,
} = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/security-headers.js"));
const { ADMIN_ROLE, MEMBER_ROLE } = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/org-roles.js"));

const allowlist = parseOperatorEmailAllowlist("ops@example.com, other@example.com");

assert.equal(resolveLearningRole("ops@example.com", true, allowlist), ADMIN_ROLE);
assert.equal(resolveLearningRole("ops@example.com", false, allowlist), MEMBER_ROLE);
assert.equal(resolveLearningRole("ops@example.com", true, new Set()), MEMBER_ROLE);
assert.equal(resolveLearningRole("stranger@example.com", true, allowlist), MEMBER_ROLE);

const q1 = "11111111-1111-4111-8111-111111111111";
const q2 = "22222222-2222-4222-8222-222222222222";
const o1 = "33333333-3333-4333-8333-333333333333";

assert.equal(isLearningAttemptId(q1), true);
assert.equal(isLearningAttemptId("not-a-uuid"), false);

const valid = parseSubmittedAnswers({
  answers: [
    { questionId: q1, optionIds: [o1] },
    { questionId: q2, optionIds: [o1] },
  ],
});
assert.equal(valid.ok, true);

const duplicate = parseSubmittedAnswers({
  answers: [
    { questionId: q1, optionIds: [o1] },
    { questionId: q1, optionIds: [o1] },
  ],
});
assert.equal(duplicate.ok, false);
assert.equal(duplicate.error, "duplicate_question");

const badOption = parseSubmittedAnswers({
  answers: [{ questionId: q1, optionIds: "not-array" }],
});
assert.equal(badOption.ok, false);

assert.equal(safeDecodeCertificateCode("CG-DPDP-DEMO30"), "CG-DPDP-DEMO30");
assert.equal(safeDecodeCertificateCode("%E0%A4%A"), null);
assert.equal(safeDecodeCertificateCode("a".repeat(100)), null);

const existing = {
  difficulty: "Foundation",
  passPercent: 72,
  examPassPercent: 55,
  examQuestionCount: 40,
};
assert.equal(courseEnsureMetadataPatch(existing, { difficulty: "Foundation" }), null);
assert.deepEqual(courseEnsureMetadataPatch({ ...existing, difficulty: "Advanced" }, { difficulty: "Foundation" }), {
  difficulty: "Foundation",
});
const refresh = courseRefreshSettingsPatch(existing, {
  difficulty: "Foundation",
  passPercent: 60,
  examPassPercent: 50,
  examQuestionCount: 60,
});
assert.deepEqual(refresh, { difficulty: "Foundation" });
assert.equal("passPercent" in refresh, false);

const operatorYoutube = lessonVideo(1, "youtube", "https://www.youtube.com/watch?v=CUSTOM123456");
assert.match(operatorYoutube.url, /CUSTOM123456/);

const operatorFile = lessonVideo(1, "mp4", "https://cdn.example.com/lesson.mp4");
assert.equal(operatorFile.provider, "mp4");
assert.equal(operatorFile.url, "https://cdn.example.com/lesson.mp4");

const catalogDefault = lessonVideo(1, "placeholder", null);
assert.match(catalogDefault.url, /OA6100k37YI/);

assert.equal(shouldEnforceCsrfOrigin("POST", "/api/learning/enroll"), true);
assert.equal(shouldEnforceCsrfOrigin("GET", "/api/learning/video/1"), false);
assert.equal(
  isTrustedDashboardMutation({
    origin: "https://evil.example",
    referer: null,
    secFetchSite: "cross-site",
    requestOrigin: "https://app.example",
  }),
  false,
);
assert.equal(
  isTrustedDashboardMutation({
    origin: "https://app.example",
    referer: null,
    secFetchSite: "same-origin",
    requestOrigin: "https://app.example",
  }),
  true,
);

console.log("security-fixes.test.cjs: ok");
