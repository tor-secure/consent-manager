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
  assert.ok(courseModule.quiz.length >= 6);
  assert.ok(courseModule.exam.length >= 4);
  const quizPrompts = new Set(courseModule.quiz.map((question) => question.prompt));
  for (const question of courseModule.exam) {
    assert.equal(quizPrompts.has(question.prompt), false, `${question.key} copies a module quiz prompt`);
  }
  for (const question of [...courseModule.quiz, ...courseModule.exam]) {
    assert.equal(keys.has(question.key), false);
    keys.add(question.key);
    assert.ok(question.key.length <= 40);
  }
}

const examBank = COURSE_CATALOG.reduce((sum, courseModule) => sum + courseModule.exam.length, 0);
assert.ok(examBank >= 100);
