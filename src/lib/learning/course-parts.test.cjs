const assert = require("node:assert/strict");
const path = require("node:path");

const {
  COURSE_PARTS,
  groupModulesByPart,
  partForModuleNumber,
  curriculumModuleOrder,
  displayModuleNumber,
} = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/learning/course-parts.js"));

assert.equal(COURSE_PARTS.length, 9);
const covered = COURSE_PARTS.flatMap((part) => [...part.moduleNumbers]);
assert.equal(covered.length, 30);
assert.equal(new Set(covered).size, 30);

const modules = Array.from({ length: 30 }, (_, index) => ({
  number: index + 1,
  title: `Module ${index + 1}`,
}));
const grouped = groupModulesByPart(modules);
assert.equal(grouped.length, 9);
assert.equal(
  grouped.reduce((sum, group) => sum + group.modules.length, 0),
  30,
);
assert.equal(grouped[0].part.number, 1);
assert.deepEqual(
  grouped[0].modules.map((item) => item.number),
  [1, 2, 3],
);
assert.equal(partForModuleNumber(15)?.number, 3);
assert.equal(partForModuleNumber(30)?.number, 9);

const order = curriculumModuleOrder();
assert.equal(order.length, 30);
assert.equal(displayModuleNumber(1), 1);
assert.equal(displayModuleNumber(order[0]), 1);
assert.equal(displayModuleNumber(order[13]), 14);
assert.equal(displayModuleNumber(27), order.indexOf(27) + 1);
assert.equal(displayModuleNumber(30), 30);

console.log("course-parts.test.cjs: ok");
