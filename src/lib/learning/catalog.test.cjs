const assert = require("node:assert/strict");
const path = require("node:path");

const { COURSE_CATALOG, assertCatalogShape } = require(path.join(
  __dirname,
  "../../../.tmp/compiled/src/lib/learning/catalog.js",
));

assertCatalogShape();
assert.equal(COURSE_CATALOG.length, 30);

const keys = new Set();
for (const courseModule of COURSE_CATALOG) {
  assert.equal(courseModule.number, COURSE_CATALOG.indexOf(courseModule) + 1);
  assert.ok(courseModule.lesson.length >= 3);
  assert.ok(courseModule.scriptBeats.length >= 6);
  assert.equal(courseModule.quiz.length, 15);
  assert.equal(courseModule.exam.length, 0);
  for (const question of courseModule.quiz) {
    assert.equal(question.type, "single");
    assert.equal(question.options.length, 4);
    assert.equal(question.options.filter((option) => option.correct).length, 1);
    assert.equal(keys.has(question.key), false);
    keys.add(question.key);
    assert.ok(question.key.length <= 40);
  }
}

assert.equal(keys.size, 450);

// PDF MCQ chapters are wired by module title (not PDF module number).
const byTitle = new Map(COURSE_CATALOG.map((courseModule) => [courseModule.title, courseModule]));
assert.equal(
  byTitle.get("Data Retention, Erasure and Deletion")?.quiz[0]?.prompt.includes("withdraws their consent"),
  true,
);
assert.equal(
  byTitle.get("Privacy Governance, Audit and Data Protection Impact Assessment")?.quiz[0]?.prompt.includes(
    "Privacy governance",
  ),
  true,
);
assert.equal(
  byTitle.get("DPDP Compliance Programme for an Organisation")?.quiz[0]?.prompt.includes("foreign e-commerce"),
  true,
);
assert.equal(
  byTitle.get("Final DPDP Compliance Readiness Assessment")?.quiz[0]?.prompt.includes("readiness assessment"),
  true,
);
assert.equal(byTitle.get("Data Retention, Erasure and Deletion")?.number, 27);
assert.equal(byTitle.get("Final DPDP Compliance Readiness Assessment")?.number, 30);
