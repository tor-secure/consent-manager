# DPDP LMS implementation report

Date: 2 October 2026.

The DPDP course is implemented inside the existing Consent Guru dashboard. It uses Clerk authentication, organization membership, Drizzle, the existing dashboard layout, and the existing audit log table. Progress is stored in PostgreSQL. The public `/e-learning` page is unchanged except for a short pointer to the signed-in course. That public page still stores its own short overview in the browser.

## What was implemented

- One shared course, slug `dpdp-act-2023`: "DPDP Act 2023 — Complete Data Protection & Privacy Training".
- 30 modules. Each has objectives, a lesson, key concepts, an example, a case study, takeaways, a video placeholder, a NotebookLM-style script, 6 module-quiz questions, and 4 final-exam-bank questions.
- Counts from the catalog: 180 module-quiz questions, 120 final-exam-bank questions, about 364 minutes of estimated lesson time.
- Sequential unlocking. Module 1 is open. Module N opens only after module N-1 has a passing quiz attempt. The check runs on the server for the module page, lesson completion, quiz start, and the final exam.
- A module is complete only after the learner marks the lesson complete and then scores at least the course pass percentage. The default is 80%. The server scores the attempt. A client `percentage`, `passed`, or `completed` field is ignored.
- Final exam: 50 questions by default, pass 80%, both configurable by Owner or Admin. Selection takes at least one question from every module, then fills the rest round-robin, then shuffles. A start is refused if that coverage cannot be met.
- Every quiz and exam attempt is stored. Retakes do not overwrite earlier attempts.
- Course completion requires all 30 passing module quizzes and a passing final exam. That inserts a Certificate of Completion with a code and a public verification URL. The certificate does not claim to be a government or legally mandated DPDP certification.
- Owner and Admin can edit lesson text, scripts, video URL and provider, publish state, pass scores, exam length, question prompts, option text, and the correct option. They can see workspace learner progress. Members cannot open the manage or edit pages.
- Learning events are written to `learning_events` and `audit_logs`.

## Legal content position

Content version and last-reviewed date: 2026-10-02.

The lessons distinguish the Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023), Notification G.S.R. 843(E) dated 13 November 2025, and the Digital Personal Data Protection Rules, 2025 (G.S.R. 846(E)). Practical steps are labelled as recommendations. The course disclaimer says the material is educational and is not legal advice, and that Consent Guru is not described as a Consent Manager registered with the Data Protection Board.

Module 11 is titled "Lawful Purpose, Specified Purpose, and Certain Legitimate Uses" so the course does not teach a GDPR-style legitimate-interest ground. The lessons do not invent a 72-hour breach deadline.

## Database

Migration: `drizzle/0058_learning_courses.sql`.

Journal entry: `drizzle/meta/_journal.json` index 57, tag `0058_learning_courses`.

The same `CREATE TABLE IF NOT EXISTS` statements are appended to `scripts/neon-ensure-schema.sql`, because `scripts/ensure-schema.ts` applies that file and then stamps the Drizzle journal. It does not execute files in `drizzle/` by itself.

Tables:

- `learning_courses`
- `learning_modules`
- `learning_questions`
- `learning_question_options`
- `learning_enrollments`
- `learning_lesson_completions`
- `learning_quiz_attempts`
- `learning_quiz_answers`
- `learning_exam_attempts`
- `learning_exam_answers`
- `learning_certificates`
- `learning_events`

Completion is derived from passing quiz rows and a passing exam row. There is no client-writable completion flag.

The 0058 statements were applied to the database configured in this workspace. `information_schema` then listed all twelve `learning_*` tables. The course row is still empty until the first signed-in visit, which seeds the catalog.

## API routes

All of these require a signed-in user and an active organization membership. Scores and user ids are taken from the server session and the stored attempt, not from the body.

- `POST /api/learning/modules/[slug]/lesson`
- `POST /api/learning/modules/[slug]/quiz`
- `POST /api/learning/quizzes/[attemptId]`
- `POST /api/learning/exam`
- `POST /api/learning/exam/[attemptId]`
- `PATCH /api/learning/modules/[slug]` (Owner or Admin)
- `PATCH /api/learning/settings` (Owner or Admin)
- `PATCH /api/learning/questions/[questionId]` (Owner or Admin)

Quiz and exam start responses omit `isCorrect`. Explanations and correct option ids are returned only after that attempt is submitted. An attempt can be submitted only by the same user and organization that owns it.

## UI routes

- `/dashboard/learning` redirects to the course
- `/dashboard/learning/dpdp-act`
- `/dashboard/learning/dpdp-act/module/[moduleSlug]`
- `/dashboard/learning/dpdp-act/module/[moduleSlug]/quiz`
- `/dashboard/learning/dpdp-act/module/[moduleSlug]/edit` (Owner or Admin)
- `/dashboard/learning/dpdp-act/final-exam`
- `/dashboard/learning/dpdp-act/certificate`
- `/dashboard/learning/dpdp-act/manage` (Owner or Admin)
- `/learning/verify/[code]` public. Added to the proxy public matcher.

Sidebar label: "DPDP training". The same link is also listed under Security & Governance.

## Components

- `VideoPlayer` supports `placeholder`, `youtube`, `vimeo`, `mp4`, and `embed`. Placeholder shows the module title, duration, and "Video unavailable".
- `AssessmentRunner` for module quizzes and the final exam.
- `LessonActions`, `ScriptPanel` (copy and download), `ModuleEditor`, `QuestionEditor`, `CourseSettingsForm`.

Video URLs saved by an operator must be `https`.

## Security controls

1. A locked module URL returns a locked state and does not include the lesson, script, or questions.
2. There is no endpoint that accepts `completed=true`.
3. Quiz and exam scoring ignore any client score. Unit test covers an answer object that also carries `percentage: 100` and `passed: true` and still fails.
4. Attempts are loaded with `organization_id` and `user_id` from the session.
5. The catalog is shared. Enrollments, attempts, certificates, and the operator progress list are filtered by organization.
6. Correct options are not selected in the pre-submit question query.
7. The final-exam bank is not sent to the browser. Only the selected attempt's prompts and option labels are sent.
8. Unlock checks use the previous module's passing attempt, not a status field the client can set.
9. Submitting another user's attempt id returns not found.
10. The exam submit route does not read a client `passed` flag.

## Tests and commands

Passed:

- `npm run typecheck` — exit 0
- `npm run build` — exit 0. The build lists the learning pages and API routes above.
- `npx eslint` on `src/lib/learning`, `src/components/learning`, `src/app/dashboard/learning`, `src/app/learning`, `src/app/api/learning`, `src/app/e-learning/page.tsx`, and `src/db/schema/learning.ts` — exit 0
- `node --test src/lib/learning/engine.test.cjs src/lib/learning/catalog.test.cjs` — 2 files, 0 failures

The engine test covers pass/fail at 80%, multi-select order, module unlock rules, course completion, 18/30 = 60%, a 50-question exam that covers all 30 modules, a bank missing module 7 that fails coverage, and a forged score that stays at 0%.

The catalog test checks 30 modules, unique question keys of at most 40 characters, at least 6 quiz and 4 exam questions per module, exam prompts that are not copies of that module's quiz prompts, and an exam bank of at least 100 questions.

Not run:

- `npm test` was not run in this session. In the earlier SDK-cache validation it failed first at `src/lib/consent-manager-e2e-regression.test.cjs` (`testPublishedPolicyRefresh`, expected banner title "Privacy choices", actual "Updated privacy policy") and then stopped. That failure was reproduced on the pre-cache SDK script and was left unchanged. This LMS work does not change that test.
- No database integration test. The repository's test runner compiles pure modules and does not provide a test database.
- The signed-in learner journey was not clicked through. `npm start` served the production build on port 3000. `/e-learning` rendered the existing public overview plus the new pointer to the workspace course. `/dashboard/learning/dpdp-act` redirected to `/sign-in` with that course path as `redirect_url`. `/learning/verify/NOT-A-REAL-CODE` returned the site 404 after the tables existed. Before the tables existed, that same URL returned a server error because `learning_certificates` was missing. There was no signed-in session, so module locking, the quiz, the exam, and the certificate page were not exercised in the browser.

## Known limitations

- The tables exist on the database used in this session. Another environment still needs `drizzle/0058_learning_courses.sql` or `npm run db:ensure-schema`. The first signed-in visit seeds the catalog if the slug is missing. Later edits in the admin UI are not overwritten, and a newer content version does not automatically replace an existing seeded course.
- Operators can edit the seeded questions. They cannot add a brand-new question row from the UI.
- Module order is `module_number` 1 through 30. There is no reorder control.
- Placeholder videos do not record `video_started` or `video_completed`. Those events can be added when a real provider URL is stored.
- The public `/e-learning` overview remains a separate, browser-local course. It is not the 30-module record.
- Certificate verification shows the learner name, course, score, duration, date, and certificate id. It does not show an email address.

## Assumptions

- Every workspace member may take the course. Owner and Admin manage content. The catalog is one product course, not a copy per tenant.
- Default pass mark is 80% for module quizzes and the final exam. Default exam length is 50.
- "Certificate of Completion" is the correct wording. Nothing in the implementation presents it as a certification required by the Act.
