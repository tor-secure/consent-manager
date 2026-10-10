const assert = require("node:assert/strict");
const path = require("node:path");

const {
  completionPercentage,
  courseCompleted,
  examCoversEveryModule,
  examDrawIsBalanced,
  isPassingScore,
  moduleUnlocked,
  percentageFromCounts,
  scoreSubmission,
  selectExamQuestions,
} = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/learning/engine.js"));

function question(id, moduleNumber, correctOptionIds, type = "single") {
  return { id, moduleNumber, type, points: 1, correctOptionIds };
}

const five = [
  question("q1", 1, ["a"]),
  question("q2", 1, ["b"]),
  question("q3", 1, ["c"]),
  question("q4", 1, ["a", "b"], "multi"),
  question("q5", 1, ["t"], "boolean"),
];

const passed = scoreSubmission({
  questions: five,
  passPercent: 80,
  answers: [
    { questionId: "q1", optionIds: ["a"] },
    { questionId: "q2", optionIds: ["b"] },
    { questionId: "q3", optionIds: ["c"] },
    { questionId: "q4", optionIds: ["b", "a"] },
    { questionId: "q5", optionIds: ["t"] },
  ],
});
assert.equal(passed.percentage, 100);
assert.equal(passed.passed, true);
assert.equal(passed.answers[3].correct, true);

const failed = scoreSubmission({
  questions: five,
  passPercent: 80,
  answers: [
    { questionId: "q1", optionIds: ["a"] },
    { questionId: "q2", optionIds: ["b"] },
    { questionId: "q3", optionIds: ["b"] },
    { questionId: "q4", optionIds: ["a"] },
    { questionId: "q5", optionIds: ["f"] },
  ],
});
assert.equal(failed.correctCount, 2);
assert.equal(failed.percentage, 40);
assert.equal(failed.passed, false);
assert.equal(isPassingScore(80, 80), true);
assert.equal(percentageFromCounts(4, 5), 80);

assert.equal(moduleUnlocked(1, new Set()), true);
assert.equal(moduleUnlocked(2, new Set()), false);
assert.equal(moduleUnlocked(2, new Set([1])), true);
assert.equal(moduleUnlocked(3, new Set([1])), false);
assert.equal(moduleUnlocked(30, new Set([29])), true);
assert.equal(moduleUnlocked(0, new Set([1])), false);

const passedModules = new Set(Array.from({ length: 30 }, (_, index) => index + 1));
assert.equal(courseCompleted({ passedModuleNumbers: passedModules, examPassed: false }), false);
assert.equal(courseCompleted({ passedModuleNumbers: passedModules, examPassed: true }), true);
assert.equal(courseCompleted({ passedModuleNumbers: new Set([1]), examPassed: true }), false);
assert.equal(completionPercentage(18), 60);

const bank = [];
for (let moduleNumber = 1; moduleNumber <= 30; moduleNumber += 1) {
  for (let copy = 1; copy <= 4; copy += 1) {
    bank.push({ id: `m${moduleNumber}-e${copy}`, moduleNumber });
  }
}
const exam = selectExamQuestions({ bank, count: 60, random: () => 0.2 });
assert.equal(exam.length, 60);
assert.equal(examCoversEveryModule(exam), true);
assert.equal(examDrawIsBalanced(exam.map((item) => item.moduleNumber), 60), true);
const grouped = exam.every((item, index) => item.moduleNumber === Math.floor(index / 2) + 1);
assert.equal(grouped, false);
const thin = selectExamQuestions({
  bank: bank.filter((item) => item.moduleNumber !== 7),
  count: 60,
  random: () => 0.2,
});
assert.equal(thin.length, 0);
assert.equal(examCoversEveryModule(thin), false);
assert.equal(examDrawIsBalanced(thin.map((item) => item.moduleNumber), 60), false);

const fakeScore = scoreSubmission({
  questions: [question("q1", 1, ["a"])],
  passPercent: 80,
  answers: [{ questionId: "q1", optionIds: ["b"], percentage: 100, passed: true, completed: true }],
});
assert.equal(fakeScore.passed, false);
assert.equal(fakeScore.percentage, 0);

console.log("learning engine tests passed");
