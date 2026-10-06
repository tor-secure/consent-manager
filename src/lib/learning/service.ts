import "server-only";

import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import {
  learningCertificates,
  learningCourses,
  learningEnrollments,
  learningEvents,
  learningExamAnswers,
  learningExamAttempts,
  learningLessonCompletions,
  learningModules,
  learningQuestionOptions,
  learningQuestions,
  learningQuizAnswers,
  learningQuizAttempts,
} from "@/db/schema/learning";
import { users } from "@/db/schema/users";
import { isOperatorRole } from "@/lib/org-roles";
import {
  COURSE_CATALOG,
  COURSE_CONTENT_VERSION,
  COURSE_DISCLAIMER,
  COURSE_LAST_REVIEWED,
  assertCatalogShape,
  lessonText,
  scriptText,
} from "@/lib/learning/catalog";
import {
  CERTIFICATE_PROGRAM_LINE,
  certificateVerificationUrl,
  demoCertificate,
  isDemoCertificateCode,
} from "@/lib/learning/certificate-demo";
import {
  COURSE_SLUG,
  MODULE_COUNT,
  completionPercentage,
  courseCompleted,
  examCoversEveryModule,
  moduleUnlocked,
  nextLockedModuleNumber,
  scoreSubmission,
  selectExamQuestions,
  shuffle,
  type SubmittedAnswer,
} from "@/lib/learning/engine";

export type LearnerContext = {
  organizationId: string;
  userId: string;
  roleName: string;
  learnerName: string;
};

type PublicOption = { id: string; label: string };
type PublicQuestion = {
  id: string;
  type: string;
  prompt: string;
  options: PublicOption[];
};

const COURSE_TITLE = "DPDP Act 2023 — Complete Data Protection & Privacy Training";

export async function enrollInCourse(ctx: LearnerContext) {
  const course = await ensureCatalog();
  const enrollment = await ensureEnrollment(ctx, course.id);
  const already = await enrollmentEvent(ctx, course.id, "course_enrolled");
  if (!already) await recordEvent(ctx, course.id, "course_enrolled", enrollment.id);
  return { enrolled: true as const, moduleCount: MODULE_COUNT };
}

export async function getCourseHome(ctx: LearnerContext) {
  const course = await ensureCatalog();
  const enrollment = await activeEnrollment(ctx, course.id);
  const modules = await publishedModules(course.id);
  if (!enrollment) {
    return {
      enrolled: false as const,
      course: publicCourse(course),
      modules: modules.map((courseModule) => ({
        number: courseModule.moduleNumber,
        slug: courseModule.slug,
        title: courseModule.title,
        summary: courseModule.summary,
        minutes: courseModule.estimatedMinutes,
      })),
    };
  }
  const passed = await passedModuleNumbers(enrollment.id);
  const lessonDone = await lessonCompletionSet(enrollment.id);
  const exam = await latestExam(enrollment.id);
  const certificate = await certificateFor(enrollment.id);
  const completed = courseCompleted({ passedModuleNumbers: passed, examPassed: Boolean(exam?.passed) });
  return {
    enrolled: true as const,
    course: publicCourse(course),
    progress: {
      startedAt: enrollment.startedAt,
      lastAccessedAt: enrollment.lastAccessedAt,
      completedModules: passed.size,
      totalModules: MODULE_COUNT,
      completionPercentage: completionPercentage(passed.size),
      currentModuleNumber: currentModule(passed),
      examPassed: Boolean(exam?.passed),
      examPercentage: exam?.percentage ?? null,
      completedAt: enrollment.completedAt,
      certificateEligible: completed,
      certificateCode: certificate?.certificateCode ?? null,
    },
    modules: modules.map((courseModule) => {
      const unlocked = moduleUnlocked(courseModule.moduleNumber, passed);
      const passedModule = passed.has(courseModule.moduleNumber);
      const inProgress = unlocked && !passedModule && (lessonDone.has(courseModule.id) || courseModule.moduleNumber === currentModule(passed));
      return {
        number: courseModule.moduleNumber,
        slug: courseModule.slug,
        title: courseModule.title,
        summary: courseModule.summary,
        minutes: courseModule.estimatedMinutes,
        status: passedModule ? "completed" : !unlocked ? "locked" : inProgress ? "in_progress" : "available",
        unlocked,
        lessonComplete: lessonDone.has(courseModule.id),
        prerequisiteNumber: unlocked ? null : nextLockedModuleNumber(courseModule.moduleNumber),
      };
    }),
  };
}

export async function getModuleForLearner(ctx: LearnerContext, slug: string) {
  const course = await ensureCatalog();
  const enrollment = await activeEnrollment(ctx, course.id);
  if (!enrollment) return { error: "not_enrolled" as const };
  const courseModule = await moduleBySlug(course.id, slug);
  if (!courseModule || courseModule.status !== "published") return { error: "not_found" as const };
  const passed = await passedModuleNumbers(enrollment.id);
  if (!moduleUnlocked(courseModule.moduleNumber, passed)) {
    return {
      error: "locked" as const,
      moduleNumber: courseModule.moduleNumber,
      title: courseModule.title,
      prerequisiteNumber: nextLockedModuleNumber(courseModule.moduleNumber),
      completedModules: passed.size,
      totalModules: MODULE_COUNT,
    };
  }
  await touchEnrollment(enrollment.id);
  await recordEvent(ctx, course.id, "module_opened", courseModule.id);
  const lessonDone = await lessonCompletionSet(enrollment.id);
  const attempts = await db
    .select({
      id: learningQuizAttempts.id,
      attemptNumber: learningQuizAttempts.attemptNumber,
      percentage: learningQuizAttempts.percentage,
      passed: learningQuizAttempts.passed,
      submittedAt: learningQuizAttempts.submittedAt,
    })
    .from(learningQuizAttempts)
    .where(and(eq(learningQuizAttempts.enrollmentId, enrollment.id), eq(learningQuizAttempts.moduleId, courseModule.id)))
    .orderBy(desc(learningQuizAttempts.attemptNumber));
  return {
    error: null,
    course: { slug: COURSE_SLUG, title: course.title, passPercent: course.passPercent },
    module: {
      number: courseModule.moduleNumber,
      slug: courseModule.slug,
      title: courseModule.title,
      summary: courseModule.summary,
      minutes: courseModule.estimatedMinutes,
      objectives: courseModule.learningObjectives,
      lesson: courseModule.lessonContent,
      concepts: courseModule.keyConcepts,
      example: courseModule.practicalExample,
      caseStudy: courseModule.caseStudy,
      takeaways: courseModule.keyTakeaways,
      video: {
        provider: courseModule.videoProvider,
        url: courseModule.videoUrl,
        title: `Module ${String(courseModule.moduleNumber).padStart(2, "0")} — ${courseModule.title}`,
        minutes: courseModule.estimatedMinutes,
      },
      script: courseModule.videoScript,
      lessonComplete: lessonDone.has(courseModule.id),
      quizPassed: passed.has(courseModule.moduleNumber),
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        number: attempt.attemptNumber,
        percentage: attempt.percentage,
        passed: attempt.passed,
        submitted: Boolean(attempt.submittedAt),
      })),
    },
    progress: { completed: passed.size, total: MODULE_COUNT },
  };
}

export async function completeLesson(ctx: LearnerContext, slug: string) {
  const course = await ensureCatalog();
  const enrollment = await activeEnrollment(ctx, course.id);
  if (!enrollment) return { error: "not_enrolled" as const };
  const courseModule = await requireUnlockedModule(ctx, enrollment.id, course.id, slug);
  if ("error" in courseModule) return courseModule;
  await db
    .insert(learningLessonCompletions)
    .values({
      enrollmentId: enrollment.id,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      moduleId: courseModule.id,
    })
    .onConflictDoNothing();
  await recordEvent(ctx, course.id, "lesson_completed", courseModule.id);
  return { ok: true as const, lessonComplete: true };
}

export async function startQuiz(ctx: LearnerContext, slug: string) {
  const course = await ensureCatalog();
  const enrollment = await activeEnrollment(ctx, course.id);
  if (!enrollment) return { error: "not_enrolled" as const };
  const courseModule = await requireUnlockedModule(ctx, enrollment.id, course.id, slug);
  if ("error" in courseModule) return courseModule;
  const lessonDone = await lessonCompletionSet(enrollment.id);
  if (!lessonDone.has(courseModule.id)) {
    return { error: "lesson_required" as const, message: "Mark the lesson complete before the quiz." };
  }
  const open = await openQuizAttempt(enrollment.id, courseModule.id);
  const attempt = open ?? (await createQuizAttempt(ctx, enrollment.id, course.id, courseModule.id));
  const questions = await publicQuestions(attempt.questionIds);
  await recordEvent(ctx, course.id, "quiz_started", attempt.id);
  return {
    error: null,
    attemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    passPercent: course.passPercent,
    questions,
  };
}

export async function submitQuiz(ctx: LearnerContext, attemptId: string, answers: SubmittedAnswer[]) {
  const attempt = await ownedQuizAttempt(ctx, attemptId);
  if (!attempt) return { error: "not_found" as const };
  if (attempt.submittedAt) return { error: "already_submitted" as const };
  const course = await ensureCatalog();
  const scored = await scoreStoredQuestions(attempt.questionIds, answers, course.passPercent);
  await db.transaction(async (tx) => {
    await tx.insert(learningQuizAnswers).values(
      scored.answers.map((answer) => ({
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedOptionIds: answers.find((item) => item.questionId === answer.questionId)?.optionIds ?? [],
        correct: answer.correct,
        pointsAwarded: answer.pointsAwarded,
      })),
    );
    await tx
      .update(learningQuizAttempts)
      .set({
        submittedAt: new Date(),
        scorePoints: scored.pointsAwarded,
        maxPoints: scored.maxPoints,
        percentage: scored.percentage,
        passed: scored.passed,
      })
      .where(eq(learningQuizAttempts.id, attempt.id));
  });
  await recordEvent(ctx, course.id, scored.passed ? "quiz_passed" : "quiz_failed", attempt.id);
  const review = await reviewQuestions(attempt.questionIds, scored.answers);
  const moduleRow = await db
    .select({ moduleNumber: learningModules.moduleNumber })
    .from(learningModules)
    .where(eq(learningModules.id, attempt.moduleId))
    .limit(1);
  return {
    error: null,
    percentage: scored.percentage,
    passed: scored.passed,
    correctCount: scored.correctCount,
    total: scored.totalQuestions,
    passPercent: course.passPercent,
    nextModuleUnlocked: scored.passed && (moduleRow[0]?.moduleNumber ?? MODULE_COUNT) < MODULE_COUNT,
    review,
  };
}

export async function startExam(ctx: LearnerContext) {
  const course = await ensureCatalog();
  const enrollment = await activeEnrollment(ctx, course.id);
  if (!enrollment) return { error: "not_enrolled" as const, message: "Enroll in the course before the examination.", completed: 0 };
  const passed = await passedModuleNumbers(enrollment.id);
  if (passed.size < MODULE_COUNT) {
    return { error: "locked" as const, message: "Complete all 30 modules before the final examination.", completed: passed.size };
  }
  const open = await db
    .select()
    .from(learningExamAttempts)
    .where(and(eq(learningExamAttempts.enrollmentId, enrollment.id), sql`${learningExamAttempts.submittedAt} is null`))
    .limit(1);
  const attempt = open[0] ?? (await createExamAttempt(ctx, enrollment.id, course));
  await recordEvent(ctx, course.id, "final_exam_started", attempt.id);
  return {
    error: null,
    attemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    passPercent: course.examPassPercent,
    questionCount: course.examQuestionCount,
    questions: await publicQuestions(attempt.questionIds),
  };
}

export async function submitExam(ctx: LearnerContext, attemptId: string, answers: SubmittedAnswer[]) {
  const [attempt] = await db
    .select()
    .from(learningExamAttempts)
    .where(
      and(
        eq(learningExamAttempts.id, attemptId),
        eq(learningExamAttempts.organizationId, ctx.organizationId),
        eq(learningExamAttempts.userId, ctx.userId),
      ),
    )
    .limit(1);
  if (!attempt) return { error: "not_found" as const };
  if (attempt.submittedAt) return { error: "already_submitted" as const };
  const course = await ensureCatalog();
  const scored = await scoreStoredQuestions(attempt.questionIds, answers, course.examPassPercent);
  const passedModules = await passedModuleNumbers(attempt.enrollmentId);
  const completed = courseCompleted({ passedModuleNumbers: passedModules, examPassed: scored.passed });
  await db.transaction(async (tx) => {
    await tx.insert(learningExamAnswers).values(
      scored.answers.map((answer) => ({
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedOptionIds: answers.find((item) => item.questionId === answer.questionId)?.optionIds ?? [],
        correct: answer.correct,
        pointsAwarded: answer.pointsAwarded,
      })),
    );
    await tx
      .update(learningExamAttempts)
      .set({
        submittedAt: new Date(),
        scorePoints: scored.pointsAwarded,
        maxPoints: scored.maxPoints,
        percentage: scored.percentage,
        passed: scored.passed,
      })
      .where(eq(learningExamAttempts.id, attempt.id));
    if (completed) {
      const now = new Date();
      await tx
        .update(learningEnrollments)
        .set({ completedAt: now, lastAccessedAt: now })
        .where(and(eq(learningEnrollments.id, attempt.enrollmentId), sql`${learningEnrollments.completedAt} is null`));
      const [existing] = await tx
        .select({ id: learningCertificates.id })
        .from(learningCertificates)
        .where(eq(learningCertificates.enrollmentId, attempt.enrollmentId))
        .limit(1);
      if (!existing) {
        await tx.insert(learningCertificates).values({
          enrollmentId: attempt.enrollmentId,
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          courseId: course.id,
          examAttemptId: attempt.id,
          certificateCode: certificateCode(),
          learnerName: ctx.learnerName,
          courseTitle: course.title,
          scorePercent: scored.percentage,
          completedAt: now,
        });
      }
    }
  });
  await recordEvent(ctx, course.id, scored.passed ? "course_completed" : "final_exam_submitted", attempt.id);
  const certificate = completed ? await certificateFor(attempt.enrollmentId) : null;
  return {
    error: null,
    percentage: scored.percentage,
    passed: scored.passed,
    correctCount: scored.correctCount,
    total: scored.totalQuestions,
    passPercent: course.examPassPercent,
    attemptNumber: attempt.attemptNumber,
    moduleNumbers: attempt.moduleNumbers,
    courseCompleted: completed,
    certificateCode: certificate?.certificateCode ?? null,
    review: await reviewQuestions(attempt.questionIds, scored.answers),
  };
}

export async function getExamHistory(ctx: LearnerContext) {
  const course = await ensureCatalog();
  const enrollment = await activeEnrollment(ctx, course.id);
  if (!enrollment) return { error: "not_enrolled" as const };
  const passed = await passedModuleNumbers(enrollment.id);
  const attempts = await db
    .select({
      id: learningExamAttempts.id,
      attemptNumber: learningExamAttempts.attemptNumber,
      percentage: learningExamAttempts.percentage,
      passed: learningExamAttempts.passed,
      submittedAt: learningExamAttempts.submittedAt,
      moduleNumbers: learningExamAttempts.moduleNumbers,
    })
    .from(learningExamAttempts)
    .where(eq(learningExamAttempts.enrollmentId, enrollment.id))
    .orderBy(asc(learningExamAttempts.attemptNumber));
  return {
    error: null,
    unlocked: passed.size >= MODULE_COUNT,
    completedModules: passed.size,
    questionCount: course.examQuestionCount,
    passPercent: course.examPassPercent,
    estimatedMinutes: 60,
    attempts,
  };
}

export async function getCertificate(ctx: LearnerContext) {
  const course = await ensureCatalog();
  const enrollment = await activeEnrollment(ctx, course.id);
  if (!enrollment) return { error: "not_eligible" as const };
  const certificate = await certificateFor(enrollment.id);
  if (!certificate) return { error: "not_eligible" as const };
  return { error: null, certificate: publicCertificate(certificate, await courseMinutes(certificate.courseId)) };
}

export async function verifyCertificate(code: string) {
  if (isDemoCertificateCode(code)) return demoCertificate();
  const [row] = await db
    .select()
    .from(learningCertificates)
    .where(eq(learningCertificates.certificateCode, code.trim()))
    .limit(1);
  if (!row) return null;
  return publicCertificate(row, await courseMinutes(row.courseId));
}

export async function updateModuleContent(
  ctx: LearnerContext,
  slug: string,
  patch: {
    lessonContent?: string;
    videoScript?: string;
    videoUrl?: string | null;
    videoProvider?: string;
    summary?: string;
    status?: string;
  },
) {
  if (!isOperatorRole(ctx.roleName)) return { error: "forbidden" as const };
  const course = await ensureCatalog();
  const courseModule = await moduleBySlug(course.id, slug);
  if (!courseModule) return { error: "not_found" as const };
  const status = patch.status === "draft" || patch.status === "published" ? patch.status : courseModule.status;
  const videoUrl = patch.videoUrl === undefined ? courseModule.videoUrl : httpsVideoUrl(patch.videoUrl);
  if (patch.videoUrl && !videoUrl) return { error: "invalid" as const, message: "Video URL must be https." };
  await db
    .update(learningModules)
    .set({
      lessonContent: patch.lessonContent ?? courseModule.lessonContent,
      videoScript: patch.videoScript ?? courseModule.videoScript,
      videoUrl,
      videoProvider: patch.videoProvider ?? courseModule.videoProvider,
      summary: patch.summary ?? courseModule.summary,
      status,
      updatedAt: new Date(),
    })
    .where(eq(learningModules.id, courseModule.id));
  return { ok: true as const };
}

export async function updateCourseSettings(
  ctx: LearnerContext,
  patch: { passPercent?: number; examPassPercent?: number; examQuestionCount?: number },
) {
  if (!isOperatorRole(ctx.roleName)) return { error: "forbidden" as const };
  const course = await ensureCatalog();
  const passPercent = clampPercent(patch.passPercent ?? course.passPercent);
  const examPassPercent = clampPercent(patch.examPassPercent ?? course.examPassPercent);
  const examQuestionCount = Math.min(120, Math.max(MODULE_COUNT, patch.examQuestionCount ?? course.examQuestionCount));
  await db
    .update(learningCourses)
    .set({ passPercent, examPassPercent, examQuestionCount, updatedAt: new Date() })
    .where(eq(learningCourses.id, course.id));
  return { ok: true as const, passPercent, examPassPercent, examQuestionCount };
}

export async function getModuleEditor(ctx: LearnerContext, slug: string) {
  if (!isOperatorRole(ctx.roleName)) return { error: "forbidden" as const };
  const course = await ensureCatalog();
  const courseModule = await moduleBySlug(course.id, slug);
  if (!courseModule) return { error: "not_found" as const };
  const questions = await db
    .select()
    .from(learningQuestions)
    .where(eq(learningQuestions.moduleId, courseModule.id))
    .orderBy(asc(learningQuestions.sortOrder));
  const options = questions.length
    ? await db
        .select()
        .from(learningQuestionOptions)
        .where(inArray(learningQuestionOptions.questionId, questions.map((question) => question.id)))
        .orderBy(asc(learningQuestionOptions.sortOrder))
    : [];
  return {
    error: null,
    module: courseModule,
    questions: questions.map((question) => ({
      ...question,
      options: options.filter((option) => option.questionId === question.id),
    })),
  };
}

export async function saveQuestion(
  ctx: LearnerContext,
  questionId: string,
  patch: { prompt: string; explanation: string; options: { id: string; label: string; correct: boolean }[] },
) {
  if (!isOperatorRole(ctx.roleName)) return { error: "forbidden" as const };
  const [question] = await db.select().from(learningQuestions).where(eq(learningQuestions.id, questionId)).limit(1);
  if (!question) return { error: "not_found" as const };
  const options = await db
    .select()
    .from(learningQuestionOptions)
    .where(eq(learningQuestionOptions.questionId, questionId));
  const allowed = new Set(options.map((option) => option.id));
  const incoming = patch.options.filter((option) => allowed.has(option.id) && option.label.trim().length > 0);
  if (incoming.length !== options.length) return { error: "invalid" as const, message: "Every option needs text." };
  const correctCount = incoming.filter((option) => option.correct).length;
  if (correctCount === 0) return { error: "invalid" as const, message: "Mark at least one correct option." };
  if (question.questionType !== "multi" && correctCount !== 1) {
    return { error: "invalid" as const, message: "This question needs exactly one correct option." };
  }
  await db.transaction(async (tx) => {
    await tx
      .update(learningQuestions)
      .set({ prompt: patch.prompt, explanation: patch.explanation, updatedAt: new Date() })
      .where(eq(learningQuestions.id, questionId));
    for (const option of incoming) {
      await tx
        .update(learningQuestionOptions)
        .set({ isCorrect: option.correct, label: option.label.trim() })
        .where(eq(learningQuestionOptions.id, option.id));
    }
  });
  return { ok: true as const };
}

export async function listOrgProgress(ctx: LearnerContext) {
  if (!isOperatorRole(ctx.roleName)) return { error: "forbidden" as const };
  const course = await ensureCatalog();
  const rows = await db
    .select({
      enrollmentId: learningEnrollments.id,
      userId: learningEnrollments.userId,
      name: users.name,
      startedAt: learningEnrollments.startedAt,
      completedAt: learningEnrollments.completedAt,
    })
    .from(learningEnrollments)
    .innerJoin(users, eq(users.id, learningEnrollments.userId))
    .where(and(eq(learningEnrollments.organizationId, ctx.organizationId), eq(learningEnrollments.courseId, course.id)));
  const progress = [];
  for (const row of rows) {
    const passed = await passedModuleNumbers(row.enrollmentId);
    progress.push({
      userId: row.userId,
      name: row.name,
      completedModules: passed.size,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    });
  }
  return { error: null, progress };
}

async function ensureCatalog() {
  assertCatalogShape();
  const [existing] = await db.select().from(learningCourses).where(eq(learningCourses.slug, COURSE_SLUG)).limit(1);
  if (existing) return existing;
  return db.transaction(async (tx) => {
    const [again] = await tx.select().from(learningCourses).where(eq(learningCourses.slug, COURSE_SLUG)).limit(1);
    if (again) return again;
    const minutes = COURSE_CATALOG.reduce((sum, courseModule) => sum + courseModule.minutes, 0);
    const [course] = await tx
      .insert(learningCourses)
      .values({
        slug: COURSE_SLUG,
        title: COURSE_TITLE,
        description:
          "A 30-module workplace course on India's Digital Personal Data Protection Act, 2023, the phased commencement in G.S.R. 843(E), and practical preparation for the duties that commence later.",
        disclaimer: COURSE_DISCLAIMER,
        instructor: "Consent Guru",
        difficulty: "Foundation to applied",
        passPercent: 80,
        examQuestionCount: 50,
        examPassPercent: 80,
        estimatedMinutes: minutes,
        contentVersion: COURSE_CONTENT_VERSION,
        lastReviewedOn: COURSE_LAST_REVIEWED,
        published: true,
      })
      .returning();
    for (const courseModule of COURSE_CATALOG) {
      const [row] = await tx
        .insert(learningModules)
        .values({
          courseId: course.id,
          moduleNumber: courseModule.number,
          slug: courseModule.slug,
          title: courseModule.title,
          summary: courseModule.summary,
          learningObjectives: courseModule.objectives,
          estimatedMinutes: courseModule.minutes,
          videoProvider: "placeholder",
          videoScript: scriptText(courseModule),
          lessonContent: lessonText(courseModule),
          keyConcepts: courseModule.concepts,
          practicalExample: courseModule.example,
          caseStudy: courseModule.caseStudy,
          keyTakeaways: courseModule.takeaways,
          status: "published",
          sortOrder: courseModule.number,
          publishedAt: new Date("2026-10-02T00:00:00.000Z"),
        })
        .returning();
      let order = 0;
      for (const question of [...courseModule.quiz, ...courseModule.exam]) {
        order += 1;
        const [saved] = await tx
          .insert(learningQuestions)
          .values({
            courseId: course.id,
            moduleId: row.id,
            questionKey: question.key,
            bank: question.bank,
            questionType: question.type,
            prompt: question.prompt,
            explanation: question.explanation,
            points: 1,
            difficulty: question.difficulty,
            sortOrder: order,
          })
          .returning();
        await tx.insert(learningQuestionOptions).values(
          question.options.map((option, index) => ({
            questionId: saved.id,
            label: option.label,
            isCorrect: option.correct,
            sortOrder: index + 1,
          })),
        );
      }
    }
    return course;
  });
}

async function findEnrollment(ctx: LearnerContext, courseId: string) {
  const [existing] = await db
    .select()
    .from(learningEnrollments)
    .where(
      and(
        eq(learningEnrollments.organizationId, ctx.organizationId),
        eq(learningEnrollments.userId, ctx.userId),
        eq(learningEnrollments.courseId, courseId),
      ),
    )
    .limit(1);
  return existing ?? null;
}

async function enrollmentEvent(ctx: LearnerContext, courseId: string, action: string) {
  const [row] = await db
    .select({ id: learningEvents.id })
    .from(learningEvents)
    .where(
      and(
        eq(learningEvents.organizationId, ctx.organizationId),
        eq(learningEvents.userId, ctx.userId),
        eq(learningEvents.courseId, courseId),
        eq(learningEvents.action, action),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function learnerHasEntered(ctx: LearnerContext, courseId: string, enrollmentId: string) {
  if (await enrollmentEvent(ctx, courseId, "course_enrolled")) return true;
  const [lesson] = await db
    .select({ id: learningLessonCompletions.id })
    .from(learningLessonCompletions)
    .where(eq(learningLessonCompletions.enrollmentId, enrollmentId))
    .limit(1);
  if (lesson) return true;
  const [quiz] = await db
    .select({ id: learningQuizAttempts.id })
    .from(learningQuizAttempts)
    .where(eq(learningQuizAttempts.enrollmentId, enrollmentId))
    .limit(1);
  return Boolean(quiz);
}

async function activeEnrollment(ctx: LearnerContext, courseId: string) {
  const enrollment = await findEnrollment(ctx, courseId);
  if (!enrollment || !(await learnerHasEntered(ctx, courseId, enrollment.id))) return null;
  return enrollment;
}

async function ensureEnrollment(ctx: LearnerContext, courseId: string) {
  const existing = await findEnrollment(ctx, courseId);
  if (existing) return existing;
  const [created] = await db
    .insert(learningEnrollments)
    .values({ organizationId: ctx.organizationId, userId: ctx.userId, courseId })
    .onConflictDoNothing()
    .returning();
  if (created) {
    await recordEvent(ctx, courseId, "course_started", created.id);
    return created;
  }
  const [row] = await db
    .select()
    .from(learningEnrollments)
    .where(
      and(
        eq(learningEnrollments.organizationId, ctx.organizationId),
        eq(learningEnrollments.userId, ctx.userId),
        eq(learningEnrollments.courseId, courseId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Unable to enroll learner");
  return row;
}

async function publishedModules(courseId: string) {
  return db
    .select()
    .from(learningModules)
    .where(and(eq(learningModules.courseId, courseId), eq(learningModules.status, "published")))
    .orderBy(asc(learningModules.moduleNumber));
}

async function moduleBySlug(courseId: string, slug: string) {
  const [row] = await db
    .select()
    .from(learningModules)
    .where(and(eq(learningModules.courseId, courseId), eq(learningModules.slug, slug)))
    .limit(1);
  return row ?? null;
}

async function passedModuleNumbers(enrollmentId: string) {
  const rows = await db
    .select({ moduleNumber: learningModules.moduleNumber })
    .from(learningQuizAttempts)
    .innerJoin(learningModules, eq(learningModules.id, learningQuizAttempts.moduleId))
    .where(and(eq(learningQuizAttempts.enrollmentId, enrollmentId), eq(learningQuizAttempts.passed, true)));
  return new Set(rows.map((row) => row.moduleNumber));
}

async function lessonCompletionSet(enrollmentId: string) {
  const rows = await db
    .select({ moduleId: learningLessonCompletions.moduleId })
    .from(learningLessonCompletions)
    .where(eq(learningLessonCompletions.enrollmentId, enrollmentId));
  return new Set(rows.map((row) => row.moduleId));
}

async function requireUnlockedModule(ctx: LearnerContext, enrollmentId: string, courseId: string, slug: string) {
  const courseModule = await moduleBySlug(courseId, slug);
  if (!courseModule || courseModule.status !== "published") return { error: "not_found" as const };
  const passed = await passedModuleNumbers(enrollmentId);
  if (!moduleUnlocked(courseModule.moduleNumber, passed)) {
    return {
      error: "locked" as const,
      prerequisiteNumber: nextLockedModuleNumber(courseModule.moduleNumber),
      message: `Complete Module ${nextLockedModuleNumber(courseModule.moduleNumber)} to unlock this module.`,
    };
  }
  void ctx;
  return courseModule;
}

async function openQuizAttempt(enrollmentId: string, moduleId: string) {
  const [row] = await db
    .select()
    .from(learningQuizAttempts)
    .where(
      and(
        eq(learningQuizAttempts.enrollmentId, enrollmentId),
        eq(learningQuizAttempts.moduleId, moduleId),
        sql`${learningQuizAttempts.submittedAt} is null`,
      ),
    )
    .limit(1);
  return row ?? null;
}

async function createQuizAttempt(ctx: LearnerContext, enrollmentId: string, courseId: string, moduleId: string) {
  const questions = await db
    .select({ id: learningQuestions.id })
    .from(learningQuestions)
    .where(and(eq(learningQuestions.moduleId, moduleId), eq(learningQuestions.bank, "module")))
    .orderBy(asc(learningQuestions.sortOrder));
  const questionIds = shuffle(questions.map((question) => question.id));
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(learningQuizAttempts)
    .where(and(eq(learningQuizAttempts.enrollmentId, enrollmentId), eq(learningQuizAttempts.moduleId, moduleId)));
  const [created] = await db
    .insert(learningQuizAttempts)
    .values({
      enrollmentId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      moduleId,
      attemptNumber: Number(countRow?.count ?? 0) + 1,
      questionIds,
    })
    .returning();
  void courseId;
  return created;
}

async function createExamAttempt(
  ctx: LearnerContext,
  enrollmentId: string,
  course: typeof learningCourses.$inferSelect,
) {
  const bank = await db
    .select({ id: learningQuestions.id, moduleNumber: learningModules.moduleNumber })
    .from(learningQuestions)
    .innerJoin(learningModules, eq(learningModules.id, learningQuestions.moduleId))
    .where(and(eq(learningQuestions.courseId, course.id), eq(learningQuestions.bank, "final")));
  const selected = selectExamQuestions({ bank, count: course.examQuestionCount });
  if (!examCoversEveryModule(selected) || selected.length < course.examQuestionCount) {
    throw new Error("Final exam bank does not cover every module");
  }
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(learningExamAttempts)
    .where(eq(learningExamAttempts.enrollmentId, enrollmentId));
  const [created] = await db
    .insert(learningExamAttempts)
    .values({
      enrollmentId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      courseId: course.id,
      attemptNumber: Number(countRow?.count ?? 0) + 1,
      questionIds: selected.map((question) => question.id),
      moduleNumbers: selected.map((question) => question.moduleNumber),
    })
    .returning();
  return created;
}

async function publicQuestions(ids: string[]): Promise<PublicQuestion[]> {
  if (ids.length === 0) return [];
  const questions = await db
    .select({
      id: learningQuestions.id,
      type: learningQuestions.questionType,
      prompt: learningQuestions.prompt,
    })
    .from(learningQuestions)
    .where(inArray(learningQuestions.id, ids));
  const options = await db
    .select({
      id: learningQuestionOptions.id,
      questionId: learningQuestionOptions.questionId,
      label: learningQuestionOptions.label,
      sortOrder: learningQuestionOptions.sortOrder,
    })
    .from(learningQuestionOptions)
    .where(inArray(learningQuestionOptions.questionId, ids))
    .orderBy(asc(learningQuestionOptions.sortOrder));
  const byId = new Map(questions.map((question) => [question.id, question]));
  return ids.flatMap((id) => {
    const question = byId.get(id);
    if (!question) return [];
    return [
      {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        options: options
          .filter((option) => option.questionId === id)
          .map((option) => ({ id: option.id, label: option.label })),
      },
    ];
  });
}

async function scoreStoredQuestions(ids: string[], answers: SubmittedAnswer[], passPercent: number) {
  const rows = await db
    .select({
      questionId: learningQuestions.id,
      moduleNumber: learningModules.moduleNumber,
      type: learningQuestions.questionType,
      points: learningQuestions.points,
      optionId: learningQuestionOptions.id,
      isCorrect: learningQuestionOptions.isCorrect,
    })
    .from(learningQuestions)
    .innerJoin(learningModules, eq(learningModules.id, learningQuestions.moduleId))
    .innerJoin(learningQuestionOptions, eq(learningQuestionOptions.questionId, learningQuestions.id))
    .where(inArray(learningQuestions.id, ids));
  const grouped = new Map<string, { moduleNumber: number; type: "single" | "multi" | "boolean"; points: number; correct: string[] }>();
  for (const row of rows) {
    const current = grouped.get(row.questionId) ?? {
      moduleNumber: row.moduleNumber,
      type: row.type as "single" | "multi" | "boolean",
      points: row.points,
      correct: [],
    };
    if (row.isCorrect) current.correct.push(row.optionId);
    grouped.set(row.questionId, current);
  }
  const allowed = new Set(ids);
  return scoreSubmission({
    passPercent,
    questions: ids.flatMap((id) => {
      const question = grouped.get(id);
      if (!question) return [];
      return [{ id, moduleNumber: question.moduleNumber, type: question.type, points: question.points, correctOptionIds: question.correct }];
    }),
    answers: answers.filter((answer) => allowed.has(answer.questionId)),
  });
}

async function reviewQuestions(
  ids: string[],
  scored: { questionId: string; correct: boolean; correctOptionIds: string[] }[],
) {
  const questions = await publicQuestions(ids);
  const prompts = await db
    .select({ id: learningQuestions.id, explanation: learningQuestions.explanation })
    .from(learningQuestions)
    .where(inArray(learningQuestions.id, ids));
  const explanation = new Map(prompts.map((row) => [row.id, row.explanation]));
  const score = new Map(scored.map((row) => [row.questionId, row]));
  return questions.map((question) => ({
    ...question,
    correct: score.get(question.id)?.correct ?? false,
    correctOptionIds: score.get(question.id)?.correctOptionIds ?? [],
    explanation: explanation.get(question.id) ?? "",
  }));
}

async function ownedQuizAttempt(ctx: LearnerContext, attemptId: string) {
  const [row] = await db
    .select()
    .from(learningQuizAttempts)
    .where(
      and(
        eq(learningQuizAttempts.id, attemptId),
        eq(learningQuizAttempts.organizationId, ctx.organizationId),
        eq(learningQuizAttempts.userId, ctx.userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function latestExam(enrollmentId: string) {
  const [row] = await db
    .select()
    .from(learningExamAttempts)
    .where(and(eq(learningExamAttempts.enrollmentId, enrollmentId), eq(learningExamAttempts.passed, true)))
    .orderBy(desc(learningExamAttempts.submittedAt))
    .limit(1);
  return row ?? null;
}

async function certificateFor(enrollmentId: string) {
  const [row] = await db
    .select()
    .from(learningCertificates)
    .where(eq(learningCertificates.enrollmentId, enrollmentId))
    .limit(1);
  return row ?? null;
}

async function courseMinutes(courseId: string) {
  const [row] = await db
    .select({ estimatedMinutes: learningCourses.estimatedMinutes })
    .from(learningCourses)
    .where(eq(learningCourses.id, courseId))
    .limit(1);
  return row?.estimatedMinutes ?? 0;
}

function publicCertificate(row: typeof learningCertificates.$inferSelect, durationMinutes: number) {
  return {
    certificateCode: row.certificateCode,
    learnerName: row.learnerName,
    courseTitle: row.courseTitle,
    scorePercent: row.scorePercent,
    completedAt: row.completedAt,
    issuedAt: row.issuedAt,
    durationMinutes,
    kind: "Certificate of Completion",
    programLine: CERTIFICATE_PROGRAM_LINE,
    verificationPath: `/learning/verify/${row.certificateCode}`,
    verificationUrl: certificateVerificationUrl(row.certificateCode),
    specimen: false,
  };
}

function publicCourse(course: typeof learningCourses.$inferSelect) {
  return {
    slug: course.slug,
    title: course.title,
    description: course.description,
    disclaimer: course.disclaimer,
    instructor: course.instructor,
    difficulty: course.difficulty,
    passPercent: course.passPercent,
    examQuestionCount: course.examQuestionCount,
    examPassPercent: course.examPassPercent,
    estimatedMinutes: course.estimatedMinutes,
    lastReviewedOn: course.lastReviewedOn,
    moduleCount: MODULE_COUNT,
  };
}

function currentModule(passed: Set<number>): number {
  for (let number = 1; number <= MODULE_COUNT; number += 1) {
    if (!passed.has(number)) return number;
  }
  return MODULE_COUNT;
}

function httpsVideoUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 80;
  return Math.min(100, Math.max(1, Math.round(value)));
}

function certificateCode(): string {
  return `CG-DPDP-${randomBytes(5).toString("hex").toUpperCase()}`;
}

async function touchEnrollment(enrollmentId: string) {
  await db
    .update(learningEnrollments)
    .set({ lastAccessedAt: new Date() })
    .where(eq(learningEnrollments.id, enrollmentId));
}

async function recordEvent(ctx: LearnerContext, courseId: string, action: string, resourceId: string | null) {
  await db.insert(learningEvents).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    courseId,
    action,
    resourceId,
  });
  await db.insert(auditLogs).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: `learning.${action}`,
    resourceType: "learning_course",
    resourceId: resourceId,
    description: action,
  });
}
