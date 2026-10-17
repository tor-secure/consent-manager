"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("@/db/learning/client");
const schema_1 = require("@/db/learning/schema");
const service_1 = require("@/lib/learning/service");
const email = process.argv[2]?.trim().toLowerCase();
async function correctAnswers(questionIds) {
    const rows = await client_1.learningDb
        .select({ questionId: schema_1.learningQuestionOptions.questionId, id: schema_1.learningQuestionOptions.id })
        .from(schema_1.learningQuestionOptions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.learningQuestionOptions.questionId, questionIds), (0, drizzle_orm_1.eq)(schema_1.learningQuestionOptions.isCorrect, true)));
    return questionIds.map((questionId) => ({
        questionId,
        optionIds: rows.filter((row) => row.questionId === questionId).map((row) => row.id),
    }));
}
async function completeFor(ctx, label) {
    await (0, service_1.enrollInCourse)(ctx);
    const home = await (0, service_1.getCourseHome)(ctx);
    if (!home.enrolled)
        throw new Error(`${label}: enrollment did not stick`);
    for (const courseModule of home.modules) {
        if (courseModule.status === "completed")
            continue;
        const lesson = await (0, service_1.completeLesson)(ctx, courseModule.slug, { skipSectionCheck: true });
        if (lesson.error)
            throw new Error(`${label}: lesson ${courseModule.number} — ${lesson.error}`);
        const quiz = await (0, service_1.startQuiz)(ctx, courseModule.slug);
        if (quiz.error || !quiz.attemptId)
            throw new Error(`${label}: quiz ${courseModule.number} start — ${quiz.error}`);
        const result = await (0, service_1.submitQuiz)(ctx, quiz.attemptId, await correctAnswers(quiz.questions.map((question) => question.id)));
        if (result.error || !result.passed)
            throw new Error(`${label}: quiz ${courseModule.number} not passed`);
    }
    const after = await (0, service_1.getCourseHome)(ctx);
    if (after.enrolled && after.progress.examPassed) {
        console.log(`${label}: final exam already passed · certificate ${after.progress.certificateCode ?? "—"}`);
        return;
    }
    const exam = await (0, service_1.startExam)(ctx);
    if (exam.error || !exam.attemptId)
        throw new Error(`${label}: exam start — ${exam.error}`);
    const examResult = await (0, service_1.submitExam)(ctx, exam.attemptId, await correctAnswers(exam.questions.map((question) => question.id)));
    if (examResult.error || !examResult.passed)
        throw new Error(`${label}: final exam not passed`);
    console.log(`${label}: 30/30 modules · exam ${examResult.percentage}% · certificate ${examResult.certificateCode ?? "—"}`);
}
async function main() {
    if (!email)
        throw new Error("Usage: complete-learning-for-email <email>");
    const [learner] = await client_1.learningDb
        .select()
        .from(schema_1.learningLearners)
        .where((0, drizzle_orm_1.eq)(schema_1.learningLearners.email, email))
        .limit(1);
    if (!learner)
        throw new Error(`No e-learning account for ${email}. Sign in at /e-learning/sign-in once, then run this again.`);
    await completeFor({
        learnerId: learner.id,
        clerkUserId: learner.clerkUserId,
        email: learner.email,
        roleName: learner.roleName,
        learnerName: learner.name,
    }, learner.name);
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
