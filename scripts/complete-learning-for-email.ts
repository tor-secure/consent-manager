import "dotenv/config";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { learningQuestionOptions } from "@/db/schema/learning";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { users } from "@/db/schema/users";
import {
  completeLesson,
  enrollInCourse,
  getCourseHome,
  startExam,
  startQuiz,
  submitExam,
  submitQuiz,
  type LearnerContext,
} from "@/lib/learning/service";

const email = process.argv[2]?.trim().toLowerCase();

async function correctAnswers(questionIds: string[]) {
  const rows = await db
    .select({ questionId: learningQuestionOptions.questionId, id: learningQuestionOptions.id })
    .from(learningQuestionOptions)
    .where(and(inArray(learningQuestionOptions.questionId, questionIds), eq(learningQuestionOptions.isCorrect, true)));
  return questionIds.map((questionId) => ({
    questionId,
    optionIds: rows.filter((row) => row.questionId === questionId).map((row) => row.id),
  }));
}

async function completeFor(ctx: LearnerContext, label: string) {
  await enrollInCourse(ctx);
  const home = await getCourseHome(ctx);
  if (!home.enrolled) throw new Error(`${label}: enrollment did not stick`);

  for (const courseModule of home.modules) {
    if (courseModule.status === "completed") continue;
    const lesson = await completeLesson(ctx, courseModule.slug);
    if (lesson.error) throw new Error(`${label}: lesson ${courseModule.number} — ${lesson.error}`);
    const quiz = await startQuiz(ctx, courseModule.slug);
    if (quiz.error || !quiz.attemptId) throw new Error(`${label}: quiz ${courseModule.number} start — ${quiz.error}`);
    const result = await submitQuiz(ctx, quiz.attemptId, await correctAnswers(quiz.questions.map((question) => question.id)));
    if (result.error || !result.passed) throw new Error(`${label}: quiz ${courseModule.number} not passed`);
  }

  const after = await getCourseHome(ctx);
  if (after.enrolled && after.progress.examPassed) {
    console.log(`${label}: final exam already passed · certificate ${after.progress.certificateCode ?? "—"}`);
    return;
  }

  const exam = await startExam(ctx);
  if (exam.error || !exam.attemptId) throw new Error(`${label}: exam start — ${exam.error}`);
  const examResult = await submitExam(ctx, exam.attemptId, await correctAnswers(exam.questions.map((question) => question.id)));
  if (examResult.error || !examResult.passed) throw new Error(`${label}: final exam not passed`);
  console.log(`${label}: 30/30 modules · exam ${examResult.percentage}% · certificate ${examResult.certificateCode ?? "—"}`);
}

async function main() {
  if (!email) throw new Error("Usage: complete-learning-for-email <email>");
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error(`No user with email ${email}. Sign in once so the account exists.`);

  const rows = await db
    .select({ organizationId: memberships.organizationId, roleName: roles.name })
    .from(memberships)
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active")));
  if (rows.length === 0) throw new Error(`${email} has no active organisation membership.`);

  console.log(`User ${user.name} · ${rows.length} active organisation(s)`);
  for (const [index, row] of rows.entries()) {
    await completeFor(
      { organizationId: row.organizationId, userId: user.id, roleName: row.roleName, learnerName: user.name },
      `Organisation ${index + 1}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
