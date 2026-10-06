CREATE TABLE IF NOT EXISTS "learning_courses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(80) NOT NULL,
  "title" varchar(240) NOT NULL,
  "description" text NOT NULL,
  "disclaimer" text NOT NULL,
  "instructor" varchar(160) NOT NULL,
  "difficulty" varchar(40) NOT NULL,
  "pass_percent" integer DEFAULT 80 NOT NULL,
  "exam_question_count" integer DEFAULT 50 NOT NULL,
  "exam_pass_percent" integer DEFAULT 80 NOT NULL,
  "estimated_minutes" integer NOT NULL,
  "content_version" varchar(40) NOT NULL,
  "last_reviewed_on" varchar(20) NOT NULL,
  "published" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_courses_slug_unique" ON "learning_courses" ("slug");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL REFERENCES "learning_courses"("id") ON DELETE CASCADE,
  "module_number" integer NOT NULL,
  "slug" varchar(120) NOT NULL,
  "title" varchar(240) NOT NULL,
  "summary" text NOT NULL,
  "learning_objectives" jsonb NOT NULL,
  "estimated_minutes" integer NOT NULL,
  "video_url" text,
  "video_provider" varchar(24) DEFAULT 'placeholder' NOT NULL,
  "video_script" text NOT NULL,
  "lesson_content" text NOT NULL,
  "key_concepts" jsonb NOT NULL,
  "practical_example" text NOT NULL,
  "case_study" text NOT NULL,
  "key_takeaways" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'published' NOT NULL,
  "sort_order" integer NOT NULL,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_modules_course_number_unique" ON "learning_modules" ("course_id", "module_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_modules_course_slug_unique" ON "learning_modules" ("course_id", "slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_modules_course_idx" ON "learning_modules" ("course_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL REFERENCES "learning_courses"("id") ON DELETE CASCADE,
  "question_key" varchar(40) NOT NULL,
  "module_id" uuid NOT NULL REFERENCES "learning_modules"("id") ON DELETE CASCADE,
  "bank" varchar(16) NOT NULL,
  "question_type" varchar(16) NOT NULL,
  "prompt" text NOT NULL,
  "explanation" text NOT NULL,
  "points" integer DEFAULT 1 NOT NULL,
  "difficulty" varchar(24) NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_questions_course_key_unique" ON "learning_questions" ("course_id", "question_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_questions_module_bank_idx" ON "learning_questions" ("module_id", "bank");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_questions_course_bank_idx" ON "learning_questions" ("course_id", "bank");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_question_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_id" uuid NOT NULL REFERENCES "learning_questions"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "is_correct" boolean DEFAULT false NOT NULL,
  "sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_question_options_question_idx" ON "learning_question_options" ("question_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "course_id" uuid NOT NULL REFERENCES "learning_courses"("id") ON DELETE CASCADE,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_enrollments_org_user_course_unique" ON "learning_enrollments" ("organization_id", "user_id", "course_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_enrollments_org_idx" ON "learning_enrollments" ("organization_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_lesson_completions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enrollment_id" uuid NOT NULL REFERENCES "learning_enrollments"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "module_id" uuid NOT NULL REFERENCES "learning_modules"("id") ON DELETE CASCADE,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_lesson_completions_enrollment_module_unique" ON "learning_lesson_completions" ("enrollment_id", "module_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_quiz_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enrollment_id" uuid NOT NULL REFERENCES "learning_enrollments"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "module_id" uuid NOT NULL REFERENCES "learning_modules"("id") ON DELETE CASCADE,
  "attempt_number" integer NOT NULL,
  "question_ids" jsonb NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "submitted_at" timestamp with time zone,
  "score_points" integer,
  "max_points" integer,
  "percentage" integer,
  "passed" boolean
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_quiz_attempts_enrollment_module_number_unique" ON "learning_quiz_attempts" ("enrollment_id", "module_id", "attempt_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_quiz_attempts_enrollment_idx" ON "learning_quiz_attempts" ("enrollment_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_quiz_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL REFERENCES "learning_quiz_attempts"("id") ON DELETE CASCADE,
  "question_id" uuid NOT NULL REFERENCES "learning_questions"("id") ON DELETE CASCADE,
  "selected_option_ids" jsonb NOT NULL,
  "correct" boolean NOT NULL,
  "points_awarded" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_quiz_answers_attempt_question_unique" ON "learning_quiz_answers" ("attempt_id", "question_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_exam_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enrollment_id" uuid NOT NULL REFERENCES "learning_enrollments"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "course_id" uuid NOT NULL REFERENCES "learning_courses"("id") ON DELETE CASCADE,
  "attempt_number" integer NOT NULL,
  "question_ids" jsonb NOT NULL,
  "module_numbers" jsonb NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "submitted_at" timestamp with time zone,
  "score_points" integer,
  "max_points" integer,
  "percentage" integer,
  "passed" boolean
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_exam_attempts_enrollment_number_unique" ON "learning_exam_attempts" ("enrollment_id", "attempt_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_exam_attempts_org_idx" ON "learning_exam_attempts" ("organization_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_exam_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL REFERENCES "learning_exam_attempts"("id") ON DELETE CASCADE,
  "question_id" uuid NOT NULL REFERENCES "learning_questions"("id") ON DELETE CASCADE,
  "selected_option_ids" jsonb NOT NULL,
  "correct" boolean NOT NULL,
  "points_awarded" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_exam_answers_attempt_question_unique" ON "learning_exam_answers" ("attempt_id", "question_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enrollment_id" uuid NOT NULL REFERENCES "learning_enrollments"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "course_id" uuid NOT NULL REFERENCES "learning_courses"("id") ON DELETE CASCADE,
  "exam_attempt_id" uuid NOT NULL REFERENCES "learning_exam_attempts"("id") ON DELETE CASCADE,
  "certificate_code" varchar(40) NOT NULL,
  "learner_name" varchar(255) NOT NULL,
  "course_title" varchar(240) NOT NULL,
  "score_percent" integer NOT NULL,
  "completed_at" timestamp with time zone NOT NULL,
  "issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_certificates_code_unique" ON "learning_certificates" ("certificate_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_certificates_enrollment_unique" ON "learning_certificates" ("enrollment_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "course_id" uuid NOT NULL REFERENCES "learning_courses"("id") ON DELETE CASCADE,
  "action" varchar(64) NOT NULL,
  "resource_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_events_org_created_idx" ON "learning_events" ("organization_id", "created_at");
