import "server-only";

import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { cache } from "react";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

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
import { readingSectionIds } from "@/lib/learning/lesson-sections";
import { lessonVideo, moduleDrivePreviewUrl } from "@/lib/learning/module-videos";
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

const COURSE_TITLE = "Digital Personal Data Protection Act, 2023 and Digital Personal Data Protection Rules, 2025";
const COURSE_DESCRIPTION = "30-Module Professional E-Learning Programme";
const COURSE_DIFFICULTY = "Foundation";
const COURSE_PASS_PERCENT = 60;

export async function enrollInCourse(ctx: LearnerContext) {
  const course = await ensureCatalog();
  const [enrollment, already] = await Promise.all([
    ensureEnrollment(ctx, course.id),
    enrollmentEvent(ctx, course.id, "course_enrolled"),
  ]);
  if (!already) await recordEvent(ctx, course.id, "course_enrolled", enrollment.id);
  return { enrolled: true as const, moduleCount: MODULE_COUNT };
}

export async function getPublicCourseCatalog() {
  const course = await ensureCatalog();
  const modules = await publishedModuleSummaries(course.id);
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

export async function getCourseHome(ctx: LearnerContext) {
  const course = await ensureCatalog();
  const [state, modules] = await Promise.all([loadLearnerCourseState(ctx, course.id), publishedModuleSummaries(course.id)]);
  const enrollment = state.enrollment;
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
  const passed = state.passed;
  const lessonDone = state.lessons;
  const completed = courseCompleted({ passedModuleNumbers: passed, examPassed: state.examPassed });
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
      examPassed: state.examPassed,
      examPercentage: state.examPercentage,
      completedAt: enrollment.completedAt,
      certificateEligible: completed,
      certificateCode: state.certificateCode,
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
  const [state, courseModule] = await Promise.all([
    loadLearnerCourseState(ctx, course.id),
    learnerModuleBySlug(course.id, slug),
  ]);
  const enrollment = state.enrollment;
  if (!enrollment) return { error: "not_enrolled" as const };
  const passed = state.passed;
  const lessonDone = state.lessons;
  if (!courseModule || courseModule.status !== "published") return { error: "not_found" as const };
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
  after(() =>
    Promise.all([
      touchEnrollment(enrollment.id),
      recordEvent(ctx, course.id, "module_opened", courseModule.id),
    ]),
  );
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
      video: {
        ...lessonVideo(courseModule.moduleNumber, courseModule.videoProvider, courseModule.videoUrl),
        title: `Module ${String(courseModule.moduleNumber).padStart(2, "0")} — ${courseModule.title}`,
        minutes: courseModule.estimatedMinutes,
      },
      lessonComplete: lessonDone.has(courseModule.id),
      quizPassed: passed.has(courseModule.moduleNumber),
    },
    progress: { completed: passed.size, total: MODULE_COUNT },
  };
}

export async function completeLesson(
  ctx: LearnerContext,
  slug: string,
  options?: { visitedSectionIds?: string[]; skipSectionCheck?: boolean },
) {
  const course = await ensureCatalog();
  const enrollment = await activeEnrollment(ctx, course.id);
  if (!enrollment) return { error: "not_enrolled" as const };
  const courseModule = await requireUnlockedModule(ctx, enrollment.id, course.id, slug);
  if ("error" in courseModule) return courseModule;
  if (!options?.skipSectionCheck) {
    const done = await lessonCompletionSet(enrollment.id);
    if (!done.has(courseModule.id)) {
      const lesson = await learnerModuleBySlug(course.id, slug);
      const expected = readingSectionIds(lesson?.lessonContent ?? "");
      const seen = new Set(options?.visitedSectionIds ?? []);
      if (expected.some((id) => !seen.has(id))) {
        return {
          error: "sections_required" as const,
          message: "Open every section of the lesson before marking it complete.",
        };
      }
    }
  }
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
  const existingQuiz = await openQuizAttempt(enrollment.id, courseModule.id);
  const openQuiz =
    existingQuiz && (await attemptStillMatches(existingQuiz.questionIds)) ? existingQuiz : null;
  if (existingQuiz && !openQuiz) {
    await db.delete(learningQuizAttempts).where(eq(learningQuizAttempts.id, existingQuiz.id));
  }
  const attempt = openQuiz ?? (await createQuizAttempt(ctx, enrollment.id, course.id, courseModule.id));
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
  if (missingAnswers(attempt.questionIds, answers)) {
    return { error: "incomplete" as const, message: "Answer every question before you submit." };
  }
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
  const [existingExam] = await db
    .select()
    .from(learningExamAttempts)
    .where(and(eq(learningExamAttempts.enrollmentId, enrollment.id), sql`${learningExamAttempts.submittedAt} is null`))
    .limit(1);
  const openExam =
    existingExam && (await attemptStillMatches(existingExam.questionIds)) ? existingExam : null;
  if (existingExam && !openExam) {
    await db.delete(learningExamAttempts).where(eq(learningExamAttempts.id, existingExam.id));
  }
  const attempt = openExam ?? (await createExamAttempt(ctx, enrollment.id, course));
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
  if (missingAnswers(attempt.questionIds, answers)) {
    return { error: "incomplete" as const, message: "Answer every question before you submit." };
  }
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
  if (!enrollment) {
    return { error: "not_eligible" as const, enrolled: false as const, moduleCount: MODULE_COUNT, progress: null };
  }
  const [certificate, passed, exam] = await Promise.all([
    certificateFor(enrollment.id),
    passedModuleNumbers(enrollment.id),
    latestExam(enrollment.id),
  ]);
  if (!certificate) {
    return {
      error: "not_eligible" as const,
      enrolled: true as const,
      moduleCount: MODULE_COUNT,
      progress: {
        completedModules: passed.size,
        totalModules: MODULE_COUNT,
        examPassed: Boolean(exam?.passed),
        examPercentage: exam?.percentage ?? null,
      },
    };
  }
  return { error: null, certificate: publicCertificate(certificate, course.estimatedMinutes) };
}

export const verifyCertificate = cache(async function verifyCertificate(code: string) {
  if (isDemoCertificateCode(code)) return demoCertificate();
  const [row] = await db
    .select()
    .from(learningCertificates)
    .where(eq(learningCertificates.certificateCode, code.trim()))
    .limit(1);
  if (!row) return null;
  const course = await ensureCatalog();
  const minutes = course.id === row.courseId ? course.estimatedMinutes : await courseMinutes(row.courseId);
  return publicCertificate(row, minutes);
});

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
  clearLearningContentCache();
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
  clearLearningContentCache();
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
  const counts = new Map<string, number>();
  if (rows.length > 0) {
    const passedRows = await db
      .select({
        enrollmentId: learningQuizAttempts.enrollmentId,
        completed: sql<number>`cast(count(distinct ${learningModules.moduleNumber}) as int)`,
      })
      .from(learningQuizAttempts)
      .innerJoin(learningModules, eq(learningModules.id, learningQuizAttempts.moduleId))
      .where(
        and(
          inArray(
            learningQuizAttempts.enrollmentId,
            rows.map((row) => row.enrollmentId),
          ),
          eq(learningQuizAttempts.passed, true),
        ),
      )
      .groupBy(learningQuizAttempts.enrollmentId);
    for (const row of passedRows) counts.set(row.enrollmentId, Number(row.completed));
  }
  return {
    error: null,
    progress: rows.map((row) => ({
      userId: row.userId,
      name: row.name,
      completedModules: counts.get(row.enrollmentId) ?? 0,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    })),
  };
}

type ModuleSummary = {
  id: string;
  moduleNumber: number;
  slug: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
};

type LearnerModuleRow = {
  id: string;
  moduleNumber: number;
  slug: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  learningObjectives: string[];
  lessonContent: string;
  videoUrl: string | null;
  videoProvider: string;
  status: string;
};

const COURSE_CACHE_TTL_MS = 60_000;
let cachedCourse: { row: typeof learningCourses.$inferSelect; expiresAt: number } | null = null;
let cachedSummaries: { courseId: string; rows: ModuleSummary[]; expiresAt: number } | null = null;
const lessonCache = new Map<string, { row: LearnerModuleRow; expiresAt: number }>();
let catalogShapeChecked = false;

function clearLearningContentCache() {
  cachedCourse = null;
  cachedSummaries = null;
  lessonCache.clear();
}

let catalogInflight: Promise<typeof learningCourses.$inferSelect> | null = null;

async function ensureCatalog() {
  if (cachedCourse && cachedCourse.expiresAt > Date.now()) return cachedCourse.row;
  if (!catalogInflight) {
    catalogInflight = (async () => {
      if (!catalogShapeChecked) {
        assertCatalogShape();
        catalogShapeChecked = true;
      }
      const course = await loadOrSeedCatalog();
      cachedCourse = { row: course, expiresAt: Date.now() + COURSE_CACHE_TTL_MS };
      return course;
    })().finally(() => {
      catalogInflight = null;
    });
  }
  return catalogInflight;
}

/** Start course and module-list reads so they overlap the sign-in lookup. */
export function warmLearningCatalog() {
  return ensureCatalog().then((course) => publishedModuleSummaries(course.id));
}

/** Start the lesson row before sign-in finishes. The row is public course content. */
export function warmModuleLesson(slug: string) {
  return ensureCatalog().then((course) => learnerModuleBySlug(course.id, slug));
}

async function loadOrSeedCatalog() {
  const [row] = await db.select().from(learningCourses).where(eq(learningCourses.slug, COURSE_SLUG)).limit(1);
  let existing = row;
  if (existing) {
    if (existing.contentVersion !== COURSE_CONTENT_VERSION) {
      await refreshCatalogContent(existing.id);
      const [updated] = await db.select().from(learningCourses).where(eq(learningCourses.id, existing.id)).limit(1);
      existing = updated ?? existing;
    }
    if (existing.difficulty !== COURSE_DIFFICULTY || existing.passPercent !== COURSE_PASS_PERCENT || existing.examPassPercent !== COURSE_PASS_PERCENT) {
      await db
        .update(learningCourses)
        .set({
          difficulty: COURSE_DIFFICULTY,
          passPercent: COURSE_PASS_PERCENT,
          examPassPercent: COURSE_PASS_PERCENT,
          updatedAt: new Date(),
        })
        .where(eq(learningCourses.id, existing.id));
      existing = {
        ...existing,
        difficulty: COURSE_DIFFICULTY,
        passPercent: COURSE_PASS_PERCENT,
        examPassPercent: COURSE_PASS_PERCENT,
      };
    }
    return existing;
  }
  return db.transaction(async (tx) => {
    const [again] = await tx.select().from(learningCourses).where(eq(learningCourses.slug, COURSE_SLUG)).limit(1);
    if (again) return again;
    const minutes = COURSE_CATALOG.reduce((sum, courseModule) => sum + courseModule.minutes, 0);
    const [course] = await tx
      .insert(learningCourses)
      .values({
        slug: COURSE_SLUG,
        title: COURSE_TITLE,
        description: COURSE_DESCRIPTION,
        disclaimer: COURSE_DISCLAIMER,
        instructor: "Consent Guru",
        difficulty: COURSE_DIFFICULTY,
        passPercent: COURSE_PASS_PERCENT,
        examQuestionCount: 50,
        examPassPercent: COURSE_PASS_PERCENT,
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
          videoProvider: "embed",
          videoUrl: moduleDrivePreviewUrl(courseModule.number),
          videoScript: scriptText(courseModule),
          lessonContent: lessonText(courseModule),
          keyConcepts: courseModule.concepts,
          practicalExample: courseModule.example,
          caseStudy: courseModule.caseStudy,
          keyTakeaways: courseModule.takeaways,
          status: "published",
          sortOrder: courseModule.number,
          publishedAt: new Date("2026-10-07T00:00:00.000Z"),
        })
        .returning();
      await insertModuleQuestions(tx, course.id, row.id, courseModule);
    }
    return course;
  });
}

type CatalogWriter = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertModuleQuestions(
  tx: CatalogWriter,
  courseId: string,
  moduleId: string,
  courseModule: (typeof COURSE_CATALOG)[number],
) {
  let order = 0;
  for (const question of [...courseModule.quiz, ...courseModule.exam]) {
    order += 1;
    const [saved] = await tx
      .insert(learningQuestions)
      .values({
        courseId,
        moduleId,
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

async function refreshCatalogContent(courseId: string) {
  const minutes = COURSE_CATALOG.reduce((sum, courseModule) => sum + courseModule.minutes, 0);
  await db.transaction(async (tx) => {
    await tx
      .update(learningCourses)
      .set({
        title: COURSE_TITLE,
        description: COURSE_DESCRIPTION,
        disclaimer: COURSE_DISCLAIMER,
        difficulty: COURSE_DIFFICULTY,
        passPercent: COURSE_PASS_PERCENT,
        examPassPercent: COURSE_PASS_PERCENT,
        estimatedMinutes: minutes,
        contentVersion: COURSE_CONTENT_VERSION,
        lastReviewedOn: COURSE_LAST_REVIEWED,
        updatedAt: new Date(),
      })
      .where(eq(learningCourses.id, courseId));
    for (const courseModule of COURSE_CATALOG) {
      await tx
        .update(learningModules)
        .set({ slug: `refresh-${courseModule.number}` })
        .where(and(eq(learningModules.courseId, courseId), eq(learningModules.moduleNumber, courseModule.number)));
    }
    for (const courseModule of COURSE_CATALOG) {
      const [row] = await tx
        .update(learningModules)
        .set({
          slug: courseModule.slug,
          title: courseModule.title,
          summary: courseModule.summary,
          learningObjectives: courseModule.objectives,
          estimatedMinutes: courseModule.minutes,
          videoScript: scriptText(courseModule),
          lessonContent: lessonText(courseModule),
          keyConcepts: courseModule.concepts,
          practicalExample: courseModule.example,
          caseStudy: courseModule.caseStudy,
          keyTakeaways: courseModule.takeaways,
          updatedAt: new Date(),
        })
        .where(and(eq(learningModules.courseId, courseId), eq(learningModules.moduleNumber, courseModule.number)))
        .returning({ id: learningModules.id });
      if (!row) throw new Error(`Missing module ${courseModule.number}`);
      const existing = await tx
        .select({ id: learningQuestions.id, questionKey: learningQuestions.questionKey })
        .from(learningQuestions)
        .where(eq(learningQuestions.moduleId, row.id));
      const desired = [...courseModule.quiz, ...courseModule.exam];
      const desiredKeys = new Set(desired.map((question) => question.key));
      const removable = existing.filter((question) => !desiredKeys.has(question.questionKey)).map((question) => question.id);
      if (removable.length > 0) {
        await tx.delete(learningQuestions).where(inArray(learningQuestions.id, removable));
      }
      let order = 0;
      for (const question of desired) {
        order += 1;
        const found = existing.find((item) => item.questionKey === question.key);
        const values = {
          bank: question.bank,
          questionType: question.type,
          prompt: question.prompt,
          explanation: question.explanation,
          difficulty: question.difficulty,
          sortOrder: order,
          updatedAt: new Date(),
        };
        const questionId = found
          ? found.id
          : (
              await tx
                .insert(learningQuestions)
                .values({
                  courseId,
                  moduleId: row.id,
                  questionKey: question.key,
                  points: 1,
                  ...values,
                })
                .returning({ id: learningQuestions.id })
            )[0].id;
        if (found) {
          await tx.update(learningQuestions).set(values).where(eq(learningQuestions.id, found.id));
        }
        await tx.delete(learningQuestionOptions).where(eq(learningQuestionOptions.questionId, questionId));
        await tx.insert(learningQuestionOptions).values(
          question.options.map((option, index) => ({
            questionId,
            label: option.label,
            isCorrect: option.correct,
            sortOrder: index + 1,
          })),
        );
      }
    }
  });
  clearLearningContentCache();
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
  const [enrolled, [lesson], [quiz]] = await Promise.all([
    enrollmentEvent(ctx, courseId, "course_enrolled"),
    db
      .select({ id: learningLessonCompletions.id })
      .from(learningLessonCompletions)
      .where(eq(learningLessonCompletions.enrollmentId, enrollmentId))
      .limit(1),
    db
      .select({ id: learningQuizAttempts.id })
      .from(learningQuizAttempts)
      .where(eq(learningQuizAttempts.enrollmentId, enrollmentId))
      .limit(1),
  ]);
  return Boolean(enrolled || lesson || quiz);
}

const activeEnrollment = cache(async function activeEnrollment(ctx: LearnerContext, courseId: string) {
  const enrollment = await findEnrollment(ctx, courseId);
  if (!enrollment || !(await learnerHasEntered(ctx, courseId, enrollment.id))) return null;
  return enrollment;
});

type LearnerCourseState = {
  enrollment: {
    id: string;
    startedAt: Date;
    lastAccessedAt: Date;
    completedAt: Date | null;
  } | null;
  passed: Set<number>;
  lessons: Set<string>;
  examPassed: boolean;
  examPercentage: number | null;
  certificateCode: string | null;
};

const loadLearnerCourseState = cache(async function loadLearnerCourseState(
  ctx: LearnerContext,
  courseId: string,
): Promise<LearnerCourseState> {
  const empty: LearnerCourseState = {
    enrollment: null,
    passed: new Set(),
    lessons: new Set(),
    examPassed: false,
    examPercentage: null,
    certificateCode: null,
  };
  const result = await db.execute(sql`
    SELECT jsonb_build_object(
      'id', e.id,
      'startedAt', e.started_at,
      'lastAccessedAt', e.last_accessed_at,
      'completedAt', e.completed_at,
      'entered', (
        EXISTS (
          SELECT 1 FROM learning_events ev
          WHERE ev.organization_id = e.organization_id
            AND ev.user_id = e.user_id
            AND ev.course_id = e.course_id
            AND ev.action = 'course_enrolled'
        )
        OR EXISTS (SELECT 1 FROM learning_lesson_completions c WHERE c.enrollment_id = e.id)
        OR EXISTS (SELECT 1 FROM learning_quiz_attempts q WHERE q.enrollment_id = e.id)
      ),
      'passed', COALESCE((
        SELECT jsonb_agg(DISTINCT m.module_number)
        FROM learning_quiz_attempts qa
        INNER JOIN learning_modules m ON m.id = qa.module_id
        WHERE qa.enrollment_id = e.id AND qa.passed IS TRUE
      ), '[]'::jsonb),
      'lessons', COALESCE((
        SELECT jsonb_agg(c.module_id)
        FROM learning_lesson_completions c
        WHERE c.enrollment_id = e.id
      ), '[]'::jsonb),
      'examPassed', ex.passed,
      'examPercentage', ex.percentage,
      'certificateCode', cert.certificate_code
    ) AS payload
    FROM learning_enrollments e
    LEFT JOIN LATERAL (
      SELECT passed, percentage
      FROM learning_exam_attempts
      WHERE enrollment_id = e.id AND submitted_at IS NOT NULL
      ORDER BY submitted_at DESC
      LIMIT 1
    ) ex ON true
    LEFT JOIN learning_certificates cert ON cert.enrollment_id = e.id
    WHERE e.organization_id = ${ctx.organizationId}::uuid
      AND e.user_id = ${ctx.userId}::uuid
      AND e.course_id = ${courseId}::uuid
    LIMIT 1
  `);
  const payload = (result as unknown as { payload?: unknown }[])[0]?.payload;
  if (!payload || typeof payload !== "object") return empty;
  const row = payload as Record<string, unknown>;
  if (row.entered !== true || typeof row.id !== "string") return empty;
  const passed = new Set<number>();
  if (Array.isArray(row.passed)) {
    for (const value of row.passed) {
      const number = Number(value);
      if (Number.isFinite(number)) passed.add(number);
    }
  }
  const lessons = new Set<string>();
  if (Array.isArray(row.lessons)) {
    for (const value of row.lessons) {
      if (typeof value === "string") lessons.add(value);
    }
  }
  return {
    enrollment: {
      id: row.id,
      startedAt: new Date(String(row.startedAt)),
      lastAccessedAt: new Date(String(row.lastAccessedAt)),
      completedAt: row.completedAt ? new Date(String(row.completedAt)) : null,
    },
    passed,
    lessons,
    examPassed: row.examPassed === true,
    examPercentage: row.examPercentage == null ? null : Number(row.examPercentage),
    certificateCode: typeof row.certificateCode === "string" ? row.certificateCode : null,
  };
});

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

const publishedModuleSummaries = cache(async function publishedModuleSummaries(courseId: string) {
  if (cachedSummaries && cachedSummaries.courseId === courseId && cachedSummaries.expiresAt > Date.now()) {
    return cachedSummaries.rows;
  }
  const rows = await db
    .select({
      id: learningModules.id,
      moduleNumber: learningModules.moduleNumber,
      slug: learningModules.slug,
      title: learningModules.title,
      summary: learningModules.summary,
      estimatedMinutes: learningModules.estimatedMinutes,
    })
    .from(learningModules)
    .where(and(eq(learningModules.courseId, courseId), eq(learningModules.status, "published")))
    .orderBy(asc(learningModules.moduleNumber));
  cachedSummaries = { courseId, rows, expiresAt: Date.now() + COURSE_CACHE_TTL_MS };
  return rows;
});

const learnerModuleBySlug = cache(async function learnerModuleBySlug(courseId: string, slug: string) {
  const key = `${courseId}:${slug}`;
  const hit = lessonCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.row;
  const [row] = await db
    .select({
      id: learningModules.id,
      moduleNumber: learningModules.moduleNumber,
      slug: learningModules.slug,
      title: learningModules.title,
      summary: learningModules.summary,
      estimatedMinutes: learningModules.estimatedMinutes,
      learningObjectives: learningModules.learningObjectives,
      lessonContent: learningModules.lessonContent,
      videoUrl: learningModules.videoUrl,
      videoProvider: learningModules.videoProvider,
      status: learningModules.status,
    })
    .from(learningModules)
    .where(and(eq(learningModules.courseId, courseId), eq(learningModules.slug, slug)))
    .limit(1);
  if (!row) return null;
  lessonCache.set(key, { row, expiresAt: Date.now() + COURSE_CACHE_TTL_MS });
  return row;
});

async function moduleBySlug(courseId: string, slug: string) {
  const [row] = await db
    .select()
    .from(learningModules)
    .where(and(eq(learningModules.courseId, courseId), eq(learningModules.slug, slug)))
    .limit(1);
  return row ?? null;
}

const passedModuleNumbers = cache(async function passedModuleNumbers(enrollmentId: string) {
  const rows = await db
    .selectDistinct({ moduleNumber: learningModules.moduleNumber })
    .from(learningQuizAttempts)
    .innerJoin(learningModules, eq(learningModules.id, learningQuizAttempts.moduleId))
    .where(and(eq(learningQuizAttempts.enrollmentId, enrollmentId), eq(learningQuizAttempts.passed, true)));
  return new Set(rows.map((row) => row.moduleNumber));
});

const lessonCompletionSet = cache(async function lessonCompletionSet(enrollmentId: string) {
  const rows = await db
    .select({ moduleId: learningLessonCompletions.moduleId })
    .from(learningLessonCompletions)
    .where(eq(learningLessonCompletions.enrollmentId, enrollmentId));
  return new Set(rows.map((row) => row.moduleId));
});

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
    .where(and(eq(learningQuestions.courseId, course.id), eq(learningQuestions.bank, "module")));
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

async function attemptStillMatches(questionIds: string[]): Promise<boolean> {
  if (questionIds.length === 0) return false;
  const questions = await publicQuestions(questionIds);
  return questions.length === questionIds.length && questions.every((question) => question.options.length > 0);
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
    .select({
      passed: learningExamAttempts.passed,
      percentage: learningExamAttempts.percentage,
    })
    .from(learningExamAttempts)
    .where(and(eq(learningExamAttempts.enrollmentId, enrollmentId), isNotNull(learningExamAttempts.submittedAt)))
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
  if (!Number.isFinite(value)) return COURSE_PASS_PERCENT;
  return Math.min(100, Math.max(1, Math.round(value)));
}

function missingAnswers(ids: string[], answers: SubmittedAnswer[]) {
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer.optionIds]));
  return ids.some((id) => (byQuestion.get(id) ?? []).length === 0);
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
  await Promise.all([
    db.insert(learningEvents).values({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      courseId,
      action,
      resourceId,
    }),
    db.insert(auditLogs).values({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: `learning.${action}`,
      resourceType: "learning_course",
      resourceId: resourceId,
      description: action,
    }),
  ]);
}
