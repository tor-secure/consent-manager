/**
 * Passes every module quiz and the final exam for one e-learning account.
 *
 * 1. Change EMAIL below.
 * 2. The person must have signed in once at /e-learning/sign-in.
 * 3. Run: npx tsx scripts/complete-learning-for-email.ts
 */
import "dotenv/config";

import { randomBytes } from "node:crypto";
import { setServers } from "node:dns";

import postgres, { type TransactionSql } from "postgres";

const EMAIL = "change-me@example.com";

const COURSE_SLUG = "dpdp-act-2023";
const MODULE_COUNT = 30;
const QUIZ_DRAW = 5;

type Question = { id: string; moduleId: string; moduleNumber: number; points: number };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap] as T;
    copy[swap] = current as T;
  }
  return copy;
}

function certificateCode() {
  return `CG-DPDP-${randomBytes(5).toString("hex").toUpperCase()}`;
}

async function main() {
  const email = EMAIL.trim().toLowerCase();
  if (!email || email === "change-me@example.com") {
    throw new Error("Set EMAIL at the top of scripts/complete-learning-for-email.ts, then run it again.");
  }

  const url = process.env.LEARNING_DATABASE_URL?.trim();
  if (!url) throw new Error("LEARNING_DATABASE_URL is required.");
  if (process.env.DATABASE_USE_SYSTEM_DNS !== "1" && url.includes("neon.tech")) {
    setServers(["8.8.8.8", "1.1.1.1"]);
  }

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    await sql.begin(async (tx) => {
      const [learner] = await tx<{ id: string; name: string }[]>`
        SELECT id, name FROM learning_learners WHERE lower(email) = ${email} LIMIT 1
      `;
      if (!learner) {
        throw new Error(`No e-learning account for ${email}. Sign in at /e-learning/sign-in once, then run this again.`);
      }

      const [course] = await tx<{ id: string; title: string; exam_question_count: number }[]>`
        SELECT id, title, exam_question_count
        FROM learning_courses
        WHERE slug = ${COURSE_SLUG}
        LIMIT 1
      `;
      if (!course) throw new Error("DPDP course is not in the learning database yet.");
      if (course.exam_question_count % MODULE_COUNT !== 0) {
        throw new Error("Final exam question count does not divide evenly across the modules.");
      }

      const [enrollment] = await tx<{ id: string }[]>`
        INSERT INTO learning_enrollments (learner_id, course_id)
        VALUES (${learner.id}::uuid, ${course.id}::uuid)
        ON CONFLICT (learner_id, course_id)
        DO UPDATE SET last_accessed_at = now()
        RETURNING id
      `;
      if (!enrollment) throw new Error("Could not open the enrollment.");

      await tx`
        INSERT INTO learning_events (learner_id, course_id, action, resource_id)
        SELECT ${learner.id}::uuid, ${course.id}::uuid, 'course_enrolled', ${enrollment.id}::uuid
        WHERE NOT EXISTS (
          SELECT 1 FROM learning_events
          WHERE learner_id = ${learner.id}::uuid
            AND course_id = ${course.id}::uuid
            AND action = 'course_enrolled'
        )
      `;

      const modules = await tx<{ id: string; module_number: number }[]>`
        SELECT id, module_number
        FROM learning_modules
        WHERE course_id = ${course.id}::uuid AND status = 'published'
        ORDER BY module_number
      `;
      if (modules.length !== MODULE_COUNT) {
        throw new Error(`Expected ${MODULE_COUNT} published modules, found ${modules.length}.`);
      }

      const questions = await tx<Question[]>`
        SELECT q.id, q.module_id AS "moduleId", m.module_number AS "moduleNumber", q.points
        FROM learning_questions q
        INNER JOIN learning_modules m ON m.id = q.module_id
        WHERE q.course_id = ${course.id}::uuid AND q.bank = 'module'
      `;
      const byModule = new Map<number, Question[]>();
      for (const question of questions) {
        const list = byModule.get(question.moduleNumber) ?? [];
        list.push(question);
        byModule.set(question.moduleNumber, list);
      }

      const optionRows = await tx<{ question_id: string; id: string }[]>`
        SELECT question_id, id
        FROM learning_question_options
        WHERE is_correct IS TRUE
          AND question_id IN (SELECT id FROM learning_questions WHERE course_id = ${course.id}::uuid AND bank = 'module')
      `;
      const correctByQuestion = new Map<string, string[]>();
      for (const row of optionRows) {
        const list = correctByQuestion.get(row.question_id) ?? [];
        list.push(row.id);
        correctByQuestion.set(row.question_id, list);
      }

      let quizzesPassed = 0;
      for (const courseModule of modules) {
        await tx`
          INSERT INTO learning_lesson_completions (enrollment_id, module_id)
          VALUES (${enrollment.id}::uuid, ${courseModule.id}::uuid)
          ON CONFLICT (enrollment_id, module_id) DO NOTHING
        `;

        const [already] = await tx<{ id: string }[]>`
          SELECT id FROM learning_quiz_attempts
          WHERE enrollment_id = ${enrollment.id}::uuid
            AND module_id = ${courseModule.id}::uuid
            AND passed IS TRUE
          LIMIT 1
        `;
        if (already) continue;

        const drawn = shuffle(byModule.get(courseModule.module_number) ?? []).slice(0, QUIZ_DRAW);
        if (drawn.length < QUIZ_DRAW) {
          throw new Error(`Module ${courseModule.module_number} does not have ${QUIZ_DRAW} quiz questions.`);
        }
        await storePassedAttempt(tx, {
          kind: "quiz",
          enrollmentId: enrollment.id,
          learnerId: learner.id,
          courseId: course.id,
          moduleId: courseModule.id,
          questions: drawn,
          correctByQuestion,
        });
        quizzesPassed += 1;
      }

      const [latestExam] = await tx<{ id: string; passed: boolean; percentage: number }[]>`
        SELECT id, passed, percentage
        FROM learning_exam_attempts
        WHERE enrollment_id = ${enrollment.id}::uuid AND submitted_at IS NOT NULL
        ORDER BY submitted_at DESC
        LIMIT 1
      `;

      let examAttemptId = latestExam?.passed ? latestExam.id : null;
      let examPercentage = latestExam?.passed ? latestExam.percentage : null;
      if (!examAttemptId) {
        const perModule = course.exam_question_count / MODULE_COUNT;
        const paper: Question[] = [];
        for (let number = 1; number <= MODULE_COUNT; number += 1) {
          const drawn = shuffle(byModule.get(number) ?? []).slice(0, perModule);
          if (drawn.length < perModule) throw new Error(`Module ${number} does not have enough exam questions.`);
          paper.push(...drawn);
        }
        const stored = await storePassedAttempt(tx, {
          kind: "exam",
          enrollmentId: enrollment.id,
          learnerId: learner.id,
          courseId: course.id,
          questions: shuffle(paper),
          correctByQuestion,
        });
        examAttemptId = stored.id;
        examPercentage = stored.percentage;
      }

      await tx`
        UPDATE learning_enrollments
        SET completed_at = COALESCE(completed_at, now()), last_accessed_at = now()
        WHERE id = ${enrollment.id}::uuid
      `;

      const [existingCertificate] = await tx<{ certificate_code: string }[]>`
        SELECT certificate_code FROM learning_certificates WHERE enrollment_id = ${enrollment.id}::uuid LIMIT 1
      `;
      let code = existingCertificate?.certificate_code ?? null;
      if (!code) {
        code = certificateCode();
        await tx`
          INSERT INTO learning_certificates (
            enrollment_id, learner_id, course_id, exam_attempt_id,
            certificate_code, learner_name, course_title, score_percent, completed_at
          )
          VALUES (
            ${enrollment.id}::uuid,
            ${learner.id}::uuid,
            ${course.id}::uuid,
            ${examAttemptId}::uuid,
            ${code},
            ${learner.name},
            ${course.title},
            ${examPercentage ?? 100},
            now()
          )
        `;
      }

      console.log(`${learner.name} <${email}>`);
      console.log(`Module quizzes newly passed: ${quizzesPassed}. All ${MODULE_COUNT} modules are complete.`);
      console.log(`Final exam: ${examPercentage ?? 100}%. Certificate ${code}.`);
    });
  } finally {
    await sql.end();
  }
}

async function storePassedAttempt(
  tx: TransactionSql,
  input: {
    kind: "quiz" | "exam";
    enrollmentId: string;
    learnerId: string;
    courseId: string;
    moduleId?: string;
    questions: Question[];
    correctByQuestion: Map<string, string[]>;
  },
) {
  const questionIds = input.questions.map((question) => question.id);
  const points = input.questions.reduce((sum, question) => sum + question.points, 0);
  const answers = input.questions.map((question) => {
    const optionIds = input.correctByQuestion.get(question.id) ?? [];
    if (optionIds.length === 0) throw new Error(`Question ${question.id} has no correct option.`);
    return { questionId: question.id, optionIds, points: question.points };
  });

  if (input.kind === "quiz") {
    if (!input.moduleId) throw new Error("A module quiz needs a module.");
    const moduleId = input.moduleId;
    const [countRow] = await tx<{ next: number }[]>`
      SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next
      FROM learning_quiz_attempts
      WHERE enrollment_id = ${input.enrollmentId}::uuid AND module_id = ${moduleId}::uuid
    `;
    const [attempt] = await tx<{ id: string }[]>`
      INSERT INTO learning_quiz_attempts (
        enrollment_id, learner_id, module_id, attempt_number, question_ids,
        submitted_at, score_points, max_points, percentage, passed
      )
      VALUES (
        ${input.enrollmentId}::uuid,
        ${input.learnerId}::uuid,
        ${moduleId}::uuid,
        ${countRow?.next ?? 1},
        ${tx.json(questionIds)},
        now(),
        ${points},
        ${points},
        100,
        true
      )
      RETURNING id
    `;
    if (!attempt) throw new Error("Could not store a module quiz.");
    for (const answer of answers) {
      await tx`
        INSERT INTO learning_quiz_answers (attempt_id, question_id, selected_option_ids, correct, points_awarded)
        VALUES (
          ${attempt.id}::uuid,
          ${answer.questionId}::uuid,
          ${tx.json(answer.optionIds)},
          true,
          ${answer.points}
        )
      `;
    }
    return { id: attempt.id, percentage: 100 };
  }

  const [countRow] = await tx<{ next: number }[]>`
    SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next
    FROM learning_exam_attempts
    WHERE enrollment_id = ${input.enrollmentId}::uuid
  `;
  const [attempt] = await tx<{ id: string }[]>`
    INSERT INTO learning_exam_attempts (
      enrollment_id, learner_id, course_id, attempt_number, question_ids, module_numbers,
      submitted_at, score_points, max_points, percentage, passed
    )
    VALUES (
      ${input.enrollmentId}::uuid,
      ${input.learnerId}::uuid,
      ${input.courseId}::uuid,
      ${countRow?.next ?? 1},
      ${tx.json(questionIds)},
      ${tx.json(input.questions.map((question) => question.moduleNumber))},
      now(),
      ${points},
      ${points},
      100,
      true
    )
    RETURNING id
  `;
  if (!attempt) throw new Error("Could not store the final exam.");
  for (const answer of answers) {
    await tx`
      INSERT INTO learning_exam_answers (attempt_id, question_id, selected_option_ids, correct, points_awarded)
      VALUES (
        ${attempt.id}::uuid,
        ${answer.questionId}::uuid,
        ${tx.json(answer.optionIds)},
        true,
        ${answer.points}
      )
    `;
  }
  return { id: attempt.id, percentage: 100 };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
