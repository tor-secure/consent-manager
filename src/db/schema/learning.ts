import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { users } from "./users";

export const learningCourses = pgTable(
  "learning_courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description").notNull(),
    disclaimer: text("disclaimer").notNull(),
    instructor: varchar("instructor", { length: 160 }).notNull(),
    difficulty: varchar("difficulty", { length: 40 }).notNull(),
    passPercent: integer("pass_percent").notNull().default(80),
    examQuestionCount: integer("exam_question_count").notNull().default(50),
    examPassPercent: integer("exam_pass_percent").notNull().default(80),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    contentVersion: varchar("content_version", { length: 40 }).notNull(),
    lastReviewedOn: varchar("last_reviewed_on", { length: 20 }).notNull(),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("learning_courses_slug_unique").on(table.slug)],
);

export const learningModules = pgTable(
  "learning_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    moduleNumber: integer("module_number").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    summary: text("summary").notNull(),
    learningObjectives: jsonb("learning_objectives").$type<string[]>().notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    videoUrl: text("video_url"),
    videoProvider: varchar("video_provider", { length: 24 }).notNull().default("placeholder"),
    videoScript: text("video_script").notNull(),
    lessonContent: text("lesson_content").notNull(),
    keyConcepts: jsonb("key_concepts").$type<string[]>().notNull(),
    practicalExample: text("practical_example").notNull(),
    caseStudy: text("case_study").notNull(),
    keyTakeaways: jsonb("key_takeaways").$type<string[]>().notNull(),
    status: varchar("status", { length: 20 }).notNull().default("published"),
    sortOrder: integer("sort_order").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("learning_modules_course_number_unique").on(table.courseId, table.moduleNumber),
    uniqueIndex("learning_modules_course_slug_unique").on(table.courseId, table.slug),
    index("learning_modules_course_idx").on(table.courseId),
  ],
);

export const learningQuestions = pgTable(
  "learning_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    questionKey: varchar("question_key", { length: 40 }).notNull(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => learningModules.id, { onDelete: "cascade" }),
    bank: varchar("bank", { length: 16 }).notNull(),
    questionType: varchar("question_type", { length: 16 }).notNull(),
    prompt: text("prompt").notNull(),
    explanation: text("explanation").notNull(),
    points: integer("points").notNull().default(1),
    difficulty: varchar("difficulty", { length: 24 }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("learning_questions_course_key_unique").on(table.courseId, table.questionKey),
    index("learning_questions_module_bank_idx").on(table.moduleId, table.bank),
    index("learning_questions_course_bank_idx").on(table.courseId, table.bank),
  ],
);

export const learningQuestionOptions = pgTable(
  "learning_question_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => learningQuestions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("learning_question_options_question_idx").on(table.questionId)],
);

export const learningEnrollments = pgTable(
  "learning_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("learning_enrollments_org_user_course_unique").on(
      table.organizationId,
      table.userId,
      table.courseId,
    ),
    index("learning_enrollments_org_idx").on(table.organizationId),
  ],
);

export const learningLessonCompletions = pgTable(
  "learning_lesson_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => learningEnrollments.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => learningModules.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("learning_lesson_completions_enrollment_module_unique").on(table.enrollmentId, table.moduleId),
  ],
);

export const learningQuizAttempts = pgTable(
  "learning_quiz_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => learningEnrollments.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => learningModules.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    questionIds: jsonb("question_ids").$type<string[]>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    scorePoints: integer("score_points"),
    maxPoints: integer("max_points"),
    percentage: integer("percentage"),
    passed: boolean("passed"),
  },
  (table) => [
    uniqueIndex("learning_quiz_attempts_enrollment_module_number_unique").on(
      table.enrollmentId,
      table.moduleId,
      table.attemptNumber,
    ),
    index("learning_quiz_attempts_enrollment_idx").on(table.enrollmentId),
  ],
);

export const learningQuizAnswers = pgTable(
  "learning_quiz_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => learningQuizAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => learningQuestions.id, { onDelete: "cascade" }),
    selectedOptionIds: jsonb("selected_option_ids").$type<string[]>().notNull(),
    correct: boolean("correct").notNull(),
    pointsAwarded: integer("points_awarded").notNull(),
  },
  (table) => [uniqueIndex("learning_quiz_answers_attempt_question_unique").on(table.attemptId, table.questionId)],
);

export const learningExamAttempts = pgTable(
  "learning_exam_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => learningEnrollments.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    questionIds: jsonb("question_ids").$type<string[]>().notNull(),
    moduleNumbers: jsonb("module_numbers").$type<number[]>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    scorePoints: integer("score_points"),
    maxPoints: integer("max_points"),
    percentage: integer("percentage"),
    passed: boolean("passed"),
  },
  (table) => [
    uniqueIndex("learning_exam_attempts_enrollment_number_unique").on(table.enrollmentId, table.attemptNumber),
    index("learning_exam_attempts_org_idx").on(table.organizationId),
  ],
);

export const learningExamAnswers = pgTable(
  "learning_exam_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => learningExamAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => learningQuestions.id, { onDelete: "cascade" }),
    selectedOptionIds: jsonb("selected_option_ids").$type<string[]>().notNull(),
    correct: boolean("correct").notNull(),
    pointsAwarded: integer("points_awarded").notNull(),
  },
  (table) => [uniqueIndex("learning_exam_answers_attempt_question_unique").on(table.attemptId, table.questionId)],
);

export const learningCertificates = pgTable(
  "learning_certificates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => learningEnrollments.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    examAttemptId: uuid("exam_attempt_id")
      .notNull()
      .references(() => learningExamAttempts.id, { onDelete: "cascade" }),
    certificateCode: varchar("certificate_code", { length: 40 }).notNull(),
    learnerName: varchar("learner_name", { length: 255 }).notNull(),
    courseTitle: varchar("course_title", { length: 240 }).notNull(),
    scorePercent: integer("score_percent").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("learning_certificates_code_unique").on(table.certificateCode),
    uniqueIndex("learning_certificates_enrollment_unique").on(table.enrollmentId),
  ],
);

export const learningEvents = pgTable(
  "learning_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 64 }).notNull(),
    resourceId: uuid("resource_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("learning_events_org_created_idx").on(table.organizationId, table.createdAt)],
);
