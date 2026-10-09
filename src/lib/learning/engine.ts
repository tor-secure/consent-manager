/**
 * Pure DPDP course rules. The database layer must use these results.
 * Clients never supply completion, scores, or unlock state.
 */

export const COURSE_SLUG = "dpdp-act-2023";
export const DEFAULT_PASS_PERCENT = 80;
export const DEFAULT_EXAM_QUESTION_COUNT = 50;
export const MODULE_COUNT = 30;

export type QuestionType = "single" | "multi" | "boolean";

export type ScoreQuestion = {
  id: string;
  moduleNumber: number;
  type: QuestionType;
  points: number;
  correctOptionIds: string[];
};

export type SubmittedAnswer = {
  questionId: string;
  optionIds: string[];
};

export type ScoredAnswer = {
  questionId: string;
  correct: boolean;
  pointsAwarded: number;
  correctOptionIds: string[];
};

export type ScoreResult = {
  correctCount: number;
  totalQuestions: number;
  pointsAwarded: number;
  maxPoints: number;
  percentage: number;
  passed: boolean;
  answers: ScoredAnswer[];
};

export function percentageFromCounts(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.floor((correct * 100) / total);
}

export function isPassingScore(percentage: number, passPercent: number): boolean {
  return percentage >= passPercent;
}

export function moduleUnlocked(moduleNumber: number, passedModuleNumbers: ReadonlySet<number>): boolean {
  if (!Number.isInteger(moduleNumber) || moduleNumber < 1 || moduleNumber > MODULE_COUNT) return false;
  if (moduleNumber === 1) return true;
  return passedModuleNumbers.has(moduleNumber - 1);
}

export function nextLockedModuleNumber(moduleNumber: number): number | null {
  if (moduleNumber <= 1) return null;
  return moduleNumber - 1;
}

export function scoreSubmission(input: {
  questions: ScoreQuestion[];
  answers: SubmittedAnswer[];
  passPercent: number;
}): ScoreResult {
  const byQuestion = new Map(input.answers.map((answer) => [answer.questionId, answer.optionIds]));
  const answers: ScoredAnswer[] = input.questions.map((question) => {
    const selected = normalizeIds(byQuestion.get(question.id) ?? []);
    const correct = normalizeIds(question.correctOptionIds);
    const matched = sameSet(selected, correct);
    return {
      questionId: question.id,
      correct: matched,
      pointsAwarded: matched ? question.points : 0,
      correctOptionIds: correct,
    };
  });
  const correctCount = answers.filter((answer) => answer.correct).length;
  const pointsAwarded = answers.reduce((sum, answer) => sum + answer.pointsAwarded, 0);
  const maxPoints = input.questions.reduce((sum, question) => sum + question.points, 0);
  const percentage = percentageFromCounts(correctCount, input.questions.length);
  return {
    correctCount,
    totalQuestions: input.questions.length,
    pointsAwarded,
    maxPoints,
    percentage,
    passed: isPassingScore(percentage, input.passPercent),
    answers,
  };
}

export function courseCompleted(input: {
  passedModuleNumbers: ReadonlySet<number>;
  examPassed: boolean;
}): boolean {
  for (let number = 1; number <= MODULE_COUNT; number += 1) {
    if (!input.passedModuleNumbers.has(number)) return false;
  }
  return input.examPassed;
}

export function completionPercentage(passedModuleCount: number): number {
  return percentageFromCounts(Math.min(passedModuleCount, MODULE_COUNT), MODULE_COUNT);
}

export type ExamCandidate = {
  id: string;
  moduleNumber: number;
};

/**
 * Picks the exam from the module question bank. Every module appears at
 * least once, then the remaining seats rotate through a shuffled module
 * order so one module cannot crowd out the others. The result is shuffled.
 */
export function selectExamQuestions<T extends ExamCandidate>(input: {
  bank: T[];
  count: number;
  random?: () => number;
}): T[] {
  const random = input.random ?? Math.random;
  const byModule = new Map<number, T[]>();
  for (const question of input.bank) {
    const list = byModule.get(question.moduleNumber) ?? [];
    list.push(question);
    byModule.set(question.moduleNumber, list);
  }
  for (const list of byModule.values()) shuffle(list, random);

  const selected: T[] = [];
  const used = new Set<string>();
  for (let moduleNumber = 1; moduleNumber <= MODULE_COUNT; moduleNumber += 1) {
    const next = byModule.get(moduleNumber)?.find((question) => !used.has(question.id));
    if (!next) continue;
    used.add(next.id);
    selected.push(next);
  }

  const moduleOrder = shuffle(
    Array.from({ length: MODULE_COUNT }, (_, index) => index + 1),
    random,
  );
  let cursor = 0;
  let idle = 0;
  while (selected.length < input.count && idle < MODULE_COUNT) {
    const list = byModule.get(moduleOrder[cursor] ?? 1) ?? [];
    const next = list.find((question) => !used.has(question.id));
    if (next) {
      used.add(next.id);
      selected.push(next);
      idle = 0;
    } else {
      idle += 1;
    }
    cursor = (cursor + 1) % MODULE_COUNT;
  }

  shuffle(selected, random);
  return selected.slice(0, input.count);
}

export function examCoversEveryModule(questions: ExamCandidate[]): boolean {
  const seen = new Set(questions.map((question) => question.moduleNumber));
  for (let moduleNumber = 1; moduleNumber <= MODULE_COUNT; moduleNumber += 1) {
    if (!seen.has(moduleNumber)) return false;
  }
  return true;
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = items[index];
    items[index] = items[swap] as T;
    items[swap] = current as T;
  }
  return items;
}

function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => id.length > 0))].sort();
}

function sameSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
