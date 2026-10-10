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
