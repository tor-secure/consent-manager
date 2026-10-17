# E-learning platform bug audit

**Date:** 2026-10-17  
**Scope:** Consent Guru DPDP e-learning portal (`/e-learning`, `/api/learning`, `/learning/verify`)  
**Auditor mode:** Static code inspection + local automated checks + limited browser/API probes  
**App code changes in this pass:** None (report only)

---

## Executive summary

The e-learning surface is a **standalone learner portal** (separate Clerk app + `LEARNING_DATABASE_URL`), not a marketplace LMS. Payments, file uploads, assignments, downloads, and instructor analytics **do not exist**.

**Highest-priority confirmed issues:**

1. **Unauthenticated video proxy** streams Drive-backed MP4 for modules 1–30 without login (**reproduced**: HTTP 200 `video/mp4`).
2. **Operator course settings are silently reverted** on every catalog load (`loadOrSeedCatalog` forces constants).
3. **Operator privilege may be granted from an unverified Clerk email** allowlist match (**code inspection**; Clerk dashboard verification settings not audited).
4. **Logout is a prefetchable GET** that does not revoke the Learning Clerk session.

Learning unit tests (`engine`, `catalog`) **pass** when run directly. Full `npm test` / `npm run typecheck` **fail** due to unrelated WhatsApp route stubs in `.next/types` and a typing error in `scripts/complete-learning-for-email.ts`. ESLint **fails** on React Compiler `set-state-in-effect` rules in learning UI (and other files).

Coverage is **not complete**. Signed-in full course path (quiz → exam → certificate issue) was **not** end-to-end exercised with a dedicated learner test account in this pass.

---

## Product map (what exists)

| Area | Present? | Notes |
|------|----------|--------|
| Learning auth (Clerk + `cg_learning`) | Yes | Separate from workspace Clerk |
| Enroll, 30 modules, sequential unlock | Yes | |
| Lessons + YouTube video | Yes | Optional Drive stream API also present |
| Module quizzes + final exam | Yes | Server-side scoring |
| Certificates + public verify | Yes | `/learning/verify/[code]` |
| Operator manage/edit | Yes | `LEARNING_OPERATOR_EMAILS` → Admin |
| Payments / coupons / refunds | **No** | N/A for this audit |
| Uploads / downloads / notifications / assignments | **No** | N/A |

**Stack:** Next.js 16.3.4, React 19, Drizzle + Postgres (`src/db/learning`), domain logic in `src/lib/learning/`.

**Doc drift:** `DPDP_LMS_IMPLEMENTATION_REPORT.md` still describes org-scoped `/dashboard/learning`; live product redirects that tree to `/e-learning` and uses the learner DB.

---

## Environment and access limitations

| Item | Status |
|------|--------|
| `LEARNING_CLERK_SECRET_KEY` | Present in process env (value not recorded) |
| `NEXT_PUBLIC_LEARNING_CLERK_PUBLISHABLE_KEY` | Present |
| `LEARNING_DATABASE_URL` | Present |
| `LEARNING_OPERATOR_EMAILS` | Not confirmed in this session |
| `.env.local` | Absent in workspace; env came from shell/process |
| Local `next dev` on `:3000` | Available (`/e-learning` → 200) |
| Dedicated learner/operator test accounts | Not used for full login → enroll → quiz → exam |
| Production data / real purchases | Not touched (no payments) |

---

## Checks performed

| Check | Outcome |
|-------|---------|
| `npm run typecheck` | **Fail** — `.next/types/validator.ts` missing WhatsApp route modules; `scripts/complete-learning-for-email.ts` union narrowing on `completeLesson` result |
| `npm run lint` | **Fail** — learning: `assessment-runner.tsx` (~163), `module-reading.tsx` (~299, ~333) `react-hooks/set-state-in-effect`; plus non-learning warnings/errors |
| `npm test` (full suite via `scripts/run-tests.cjs`) | **Fail** — blocked by same TypeScript compile errors as typecheck |
| `node --test src/lib/learning/engine.test.cjs src/lib/learning/catalog.test.cjs` | **Pass** (2 files) |
| `npm run build` | **Not run** (typecheck already failing; time boxed) |
| Code trace: auth, enroll, lesson, quiz, exam, certificate, operator PATCH, proxy CSRF | Done |
| Browser: guest `/e-learning` | Done — banner, Enroll, Log in, modules grid, no curriculum sidebar |
| Browser: guest Enroll | Redirects toward `/e-learning/sign-in` via `learnerPageContext` |
| Browser: `/e-learning/sign-in` | Observed error UI (`useSession` outside `<ClerkProvider />` in logs); sign-up shell rendered |
| Browser: `/learning/verify/CG-DPDP-DEMO30` | Renders as fully verified certificate for “Sample Learner” |
| API: `GET /api/learning/video/1` (no cookie) | **200** `video/mp4` (~62 MB) |
| API: `POST /api/learning/enroll` (no cookie) | **401** `{"error":"Unauthorized"}` |

---

## Findings (ordered by severity)

### Critical

_None confirmed as Critical in this pass._  
(Unauthenticated media streaming is rated High below because primary lesson delivery uses YouTube embeds; the open Drive proxy is still a serious content/egress leak.)

---

### High

#### H1 — Unauthenticated Drive video proxy streams course media

- **Feature:** Video delivery  
- **Files:** `src/app/api/learning/video/[moduleNumber]/route.ts` (entire `GET`, lines 7–37); `src/proxy.ts` `learningPass` (lines 178–203)  
- **Evidence:** **Reproduced** — `GET http://localhost:3000/api/learning/video/1` → `200`, `Content-Type: video/mp4`, `Content-Length: 62400418` with no session cookie.  
- **Expected:** Require learner session + enrollment/unlock (or remove dead endpoint).  
- **Actual:** No `requireLearner()` / session check; proxies Google Drive with `Range` support for modules 1–30.  
- **Impact:** Anyone who can reach the app can download/stream legacy Drive lesson files; Drive bandwidth abuse. Lesson UI currently prefers YouTube (`lessonVideo` in `module-videos.ts`), so this is partly “dead path” but still live.  
- **Fix:** Delete the route, or gate with `requireLearner()` + enrollment/unlock + rate limit.

#### H2 — Operator course settings are silently overwritten

- **Feature:** Operator settings (`PATCH /api/learning/settings`, manage UI)  
- **Files:** `src/lib/learning/service.ts` `loadOrSeedCatalog` (lines 819–841); `updateCourseSettings` (~619–634)  
- **Evidence:** **Code inspection**  
- **Expected:** Persisted `passPercent` / `examPassPercent` / `examQuestionCount` remain until an operator changes them again.  
- **Actual:** On every catalog ensure, if DB values differ from `COURSE_PASS_PERCENT` (60), `COURSE_EXAM_PASS_PERCENT` (50), `DEFAULT_EXAM_QUESTION_COUNT` (60), they are force-updated back to constants. Settings PATCH appears to work then is undone.  
- **Impact:** Operators cannot reliably tune pass marks / exam size; UI/forms mislead. Schema defaults (80) also disagree with service constants.  
- **Fix:** Only apply constants on initial seed or content-version migration; never clobber operator-updated settings on read.

#### H3 — Operator role may be granted without verified email

- **Feature:** Operator authorization  
- **Files:** `src/lib/learning/auth.ts` `establishLearningSession` (lines 63–66, 91–93); `LEARNING_OPERATOR_EMAILS`  
- **Evidence:** **Code inspection** (Clerk dashboard “require verified email” setting **not** verified)  
- **Expected:** Only verified emails matching the allowlist become Admin.  
- **Actual:** Primary/`emailAddresses[0]` is used with no `verification.status === "verified"` check before `operatorEmails().has(email)`.  
- **Impact:** If the Learning Clerk instance allows unverified addresses, an attacker who can register as an allowlisted address gains lesson/question/settings control and learner listing.  
- **Fix:** Require verified email for operator; optionally bind operators to Clerk user IDs.

---

### Medium

#### M1 — Learning APIs skip CSRF/origin enforcement; no CSP on learning pages

- **Feature:** AuthZ / browser security  
- **Files:** `src/proxy.ts` `isLearningPath` / `learningPass` (170–203); CSRF only inside workspace `clerkProxy` (~96–115); `security-headers.ts` baseline without CSP  
- **Evidence:** **Code inspection**  
- **Expected:** Mutating learning APIs get the same Origin checks as dashboard mutations; learning pages get a CSP.  
- **Actual:** `/api/learning/*` returns early via `learningPass` with baseline headers only. Mutations rely on `cg_learning` (`SameSite=Lax`, httpOnly). No CSP / nonce on learning HTML.  
- **Impact:** Cross-site POST/PATCH is largely mitigated by Lax cookies; same-site sibling XSS or future XSS is unconstrained by CSP.  
- **Fix:** Run `shouldEnforceCsrfOrigin` in `learningPass` for mutating methods; add learning CSP.

#### M2 — Logout is a state-changing GET and does not revoke Clerk

- **Feature:** Sign-out  
- **Files:** `src/app/api/learning/sign-out/route.ts`; `src/lib/learning/auth.ts` `endLearningSession` (84–88); `src/components/learning/learning-portal.tsx` Log out `<Link href="/api/learning/sign-out">` (~218–224)  
- **Evidence:** **Code inspection** (prefetch/logout-CSRF not browser-proved in this pass)  
- **Expected:** Explicit POST logout; revoke Learning Clerk session; clear app cookie.  
- **Actual:** GET clears `cg_learning` only; no Clerk `sessions.revokeSession` / client signOut. Link may be prefetched. Top-level cross-site GET can clear cookie (logout CSRF). Stateless cookie remains forgeable until expiry if secret known; session not server-revoked.  
- **Impact:** Incomplete logout; accidental prefetch logout; session resurrection if Clerk browser session remains.  
- **Fix:** POST + CSRF; revoke Clerk session; `prefetch={false}` interim; dedicated `LEARNING_SESSION_SECRET` + shorter TTL / denylist.

#### M3 — Session HMAC reuses Clerk secret; no revocation

- **Feature:** Session security  
- **Files:** `src/lib/learning/auth.ts` `sessionSecret` / `signSession` / `verifySession`  
- **Evidence:** **Code inspection**  
- **Expected:** Dedicated signing secret; revocable sessions.  
- **Actual:** HMAC key = `LEARNING_CLERK_SECRET_KEY`; 14-day exp; no `jti`/server denylist.  
- **Impact:** Key-compromise blast radius; cannot invalidate sessions after ban/password change without waiting for expiry.  
- **Fix:** Separate `LEARNING_SESSION_SECRET`; store session version on learner row.

#### M4 — Demo / specimen certificate presented as real verification

- **Feature:** Certificate verify  
- **Files:** `src/lib/learning/service.ts` `verifyCertificate` (571–572); `src/lib/learning/certificate-demo.ts`; `src/app/learning/verify/[code]/page.tsx` (31–37)  
- **Evidence:** **Reproduced** — `/learning/verify/CG-DPDP-DEMO30` shows “Certificate verified” / “Consent Guru confirms this certificate” for Sample Learner; `specimen: true` not reflected in UI.  
- **Expected:** Specimen clearly labeled as non-authentic design sample.  
- **Actual:** Same verified chrome as real certificates.  
- **Impact:** Misrepresentation if demo code is shared externally.  
- **Fix:** Branch UI on `specimen`; watermark; no “confirms” copy for demos.

#### M5 — Certificate verify ignores validity window / no rate limit

- **Feature:** Certificate verify  
- **Files:** `verifyCertificate` / `publicCertificate` in `service.ts`; certificate UI shows `validUntil` but verify page does not fail after expiry  
- **Evidence:** **Code inspection**  
- **Expected:** Expired certificates show expired/not valid; verify endpoint rate-limited.  
- **Actual:** DB row presence alone verifies; no expiry check; no rate limit.  
- **Impact:** Expired certs still “verified”; enumeration pressure (40-bit codes, low practical risk).  
- **Fix:** Enforce `validUntil`; rate-limit verify.

#### M6 — Answer-key harvesting via unlimited quiz retakes

- **Feature:** Module quizzes  
- **Files:** Quiz submit review returns `correctOptionIds` (`service.ts` scoring/review); unlimited retakes; shared module bank for exam draws  
- **Evidence:** **Code inspection**  
- **Expected:** Limited feedback / cooldowns / separate exam bank.  
- **Actual:** Full correct options + explanations on fail; retake freely; exam draws from same module bank.  
- **Impact:** Learners can farm keys before final exam.  
- **Fix:** Cooldown; hide full key until pass or delay; separate exam bank.

#### M7 — Content version refresh overwrites operator edits

- **Feature:** Catalog / operator edit  
- **Files:** `src/lib/learning/service.ts` `refreshCatalogContent`  
- **Evidence:** **Code inspection**  
- **Expected:** Operator edits preserved or merged carefully.  
- **Actual:** Content-version bump overwrites lesson/summary/video and deletes questions not in code catalog (cascade answer rows).  
- **Impact:** Lost editorial work; broken historical attempts referencing deleted question IDs.  
- **Fix:** Merge strategy; soft-delete; never delete questions referenced by attempts.

#### M8 — Learning ClerkProvider / sign-in reliability issues (observed)

- **Feature:** Sign-in / AuthPageShell  
- **Files:** `src/app/layout.tsx` LearningClerkProvider; `src/app/e-learning/sign-in/[[...sign-in]]/page.tsx`; `src/app/e-learning/error.tsx`  
- **Evidence:** **Reproduced (partial)** — navigating to sign-in after guest Enroll showed e-learning error UI; next-dev logs include `useSession can only be used within the <ClerkProvider />`. Sign-up page rendered shell copy. Full clean sign-in with a fresh account was **not** completed.  
- **Expected:** Stable Learning Clerk `<SignIn>` under LearningClerkProvider.  
- **Actual:** Intermittent/provider-boundary failures surface as “This page could not load” (error.tsx copy assumes course progress).  
- **Impact:** Blocks onboarding when it occurs.  
- **Fix:** Ensure provider wraps all Clerk hooks on learning auth routes; dedicated auth error boundary; retest with clean browser profile.

#### M9 — ESLint / React Compiler violations in learning UI

- **Feature:** Lesson reading / assessment  
- **Files:** `assessment-runner.tsx` ~163; `module-reading.tsx` ~299, ~333  
- **Evidence:** **Reproduced** via `npm run lint`  
- **Expected:** Clean lint for CI.  
- **Actual:** `react-hooks/set-state-in-effect` errors on preload/visited state.  
- **Impact:** CI gate failure; possible cascading renders.  
- **Fix:** Initialize from storage without sync setState-in-effect patterns (lazy state / external store).

---

### Low

#### L1 — Client `sectionIds` can skip lesson reading UX

- **Files:** `src/app/api/learning/modules/[slug]/lesson/route.ts`; `prepareLessonCompletion` in `service.ts`  
- **Evidence:** **Code inspection**  
- **Expected:** Server tracks opened sections, or accepts only after meaningful completion signals.  
- **Actual:** Client may POST the full expected ID set without reading. Unlock chain + quiz scoring still apply.  
- **Impact:** Completes lesson without consuming content.  
- **Fix:** Server-side section events, or drop section gate and rely on quiz.

#### L2 — Operator `videoUrl` ignored for modules 1–30

- **Files:** `module-videos.ts` `lessonVideo`  
- **Evidence:** **Code inspection**  
- **Expected:** Saved operator URL used when set.  
- **Actual:** Hardcoded YouTube IDs always win.  
- **Impact:** Misleading editor UX.  
- **Fix:** Prefer stored URL when valid https; document override policy.

#### L3 — Quiz/exam input validation gaps (500s)

- **Files:** quiz/exam submit routes; `normalizeIds` in `engine.ts`  
- **Evidence:** **Code inspection**  
- **Expected:** 400 on malformed bodies.  
- **Actual:** Non-array `optionIds` / bad UUID attempt IDs can 500.  
- **Impact:** Stability / noise.  
- **Fix:** Zod validate request bodies.

#### L4 — Concurrent quiz start can collide on attemptNumber

- **Files:** `createQuizAttempt` in `service.ts`  
- **Evidence:** **Code inspection**  
- **Expected:** Idempotent open attempt under concurrency.  
- **Actual:** `count+1` race vs unique index → possible 500.  
- **Fix:** Retry on unique violation or upsert open attempt.

#### L5 — Typecheck / test runner broken by unrelated WhatsApp stubs + learning script types

- **Files:** `.next/types/validator.ts` (generated); `scripts/complete-learning-for-email.ts` ~39  
- **Evidence:** **Reproduced**  
- **Expected:** `npm test` / `typecheck` green for learning work.  
- **Actual:** Compile step fails before suite; learning unit tests still pass when invoked directly on existing `.cjs`.  
- **Impact:** CI/dev friction.  
- **Fix:** Align generated types with routes; narrow `completeLesson` result with `'error' in result`.

#### L6 — `decodeURIComponent` on verify code can throw

- **Files:** `src/app/learning/verify/[code]/page.tsx` lines 14, 24  
- **Evidence:** **Code inspection**  
- **Fix:** try/catch → notFound.

#### L7 — Learning error page copy inappropriate on auth failures

- **Files:** `src/app/e-learning/error.tsx`  
- **Evidence:** **Reproduced** on sign-in failure path  
- **Impact:** “Your progress is saved” on auth/config errors.  
- **Fix:** Route-group-specific error.tsx for `sign-in`/`sign-up`.

#### L8 — No rate limiting on learning routes

- **Evidence:** **Code inspection** (platform has `rate-limit.ts`; unused by learning)  
- **Impact:** Abuse of video, verify, quiz start.  
- **Fix:** Shared limiter on public/expensive endpoints.

---

### Informational / not bugs

| Item | Verdict |
|------|---------|
| Quiz/exam scores forged by client | **Not a bug** — server recomputes; attempt ownership enforced |
| `safeLearningPath` open redirect | **Not a bug** — prefix + `//` rejection |
| Lesson XSS via `dangerouslySetInnerHTML` | **Not a bug** for lesson text (React text); QR SVG is constructed, not user HTML |
| Duplicate enroll | **Not a bug** — unique index + `onConflictDoNothing` |
| localStorage section progress bypassing DB | **Not a bug** — server authoritative for completion |
| Payments | **N/A** — not implemented |
| Enroll without session | **Works as designed** — 401 API / redirect from `learnerPageContext` |

---

## Potential issues (need more evidence)

| ID | Issue | Why potential |
|----|--------|----------------|
| P1 | H3 operator email verification | Depends on Clerk instance settings |
| P2 | Prefetch-induced logout | Link present; prefetch behavior not timed in browser |
| P3 | Full sign-in → enroll → quiz → exam → cert path | Not completed with a clean test learner |
| P4 | Expired certificate still verifies | Need a real expired row to repro |
| P5 | Workspace vs learning cookie swap edge cases | Complex; needs dual-login scenarios |

---

## Testing gaps (manual / follow-up)

1. Fresh browser: Learning sign-up → session cookie → enroll → Module 1 sections → mark complete → quiz pass → unlock Module 2.  
2. Operator allowlisted account: manage settings persistence after reload (confirm H2 live).  
3. Cross-learner: submit another user’s `attemptId` → expect 404.  
4. Logout then immediate revisit of authenticated pages; confirm Clerk session cannot silently re-mint without consent.  
5. Mobile: portal sidebar, quiz fullscreen, keyboard-only quiz.  
6. Accessibility: focus order on lesson TOC, quiz options, certificate print.  
7. Load: `getCourseHome` with full 30-module progress under latency.  
8. Password reset / email verify flows (Clerk-hosted UI).  
9. Confirm whether Learning Clerk requires verified email before session (H3).

---

## Prioritized fix plan

| Priority | Action | Addresses |
|----------|--------|-----------|
| P0 | Auth-gate or remove `GET /api/learning/video/[moduleNumber]`; add rate limit | H1, L8 |
| P0 | Stop `loadOrSeedCatalog` from overwriting operator settings; align schema defaults with constants | H2 |
| P1 | Require verified email (or Clerk user id) for `LEARNING_OPERATOR_EMAILS` | H3 |
| P1 | POST logout + Clerk session revoke; disable Link prefetch | M2, M3 |
| P1 | Stabilize Learning `<ClerkProvider>` on sign-in/up; auth-specific error UI | M8, L7 |
| P2 | CSRF Origin check + CSP for learning routes | M1 |
| P2 | Specimen certificate labeling; enforce `validUntil` | M4, M5 |
| P2 | Quiz retake / answer reveal policy; separate exam bank | M6 |
| P3 | Safer content-version refresh; honor operator `videoUrl` | M7, L2 |
| P3 | Zod on quiz/exam bodies; unique-violation retry on quiz start | L3, L4 |
| P3 | Fix typecheck blockers (WhatsApp stubs / complete-learning script); clear lint setState-in-effect | L5, M9 |
| P4 | Server-side section progress or drop section gate | L1 |
| P4 | Rate-limit verify + demo code handling | M5, L6, L8 |

**Suggested regression tests (after fixes, not in this audit pass):**

- Unauthenticated `GET /api/learning/video/1` → 401/404.  
- After `updateCourseSettings`, subsequent `ensureCatalog` retains values.  
- Operator grant denied for unverified email fixture (if testable).  
- Existing `engine.test.cjs` / `catalog.test.cjs` remain green.

---

## Confirmed vs potential vs gaps (rollup)

- **Confirmed (code and/or reproduced):** H1, H2, M1, M2 (partial), M3, M4, M5 (expiry logic), M6, M7, M9, L1–L8  
- **Potential / conditional:** H3, M8 severity in prod, P1–P5  
- **Gaps:** Full authenticated learner journey, operator live settings check, a11y/mobile deep pass, Clerk email-verification policy

---

## Remediation log (2026-10-17)

Fixes applied against the findings above. Status legend: **fixed and verified** (runtime and/or automated test), **fixed but unverified** (code change only / env blocked HTML checks), **not reproducible**, **awaiting a decision**.

| ID | Status | Notes |
|----|--------|-------|
| H1 | **fixed and verified** | Video proxy requires learner session + enrollment + unlock; unauth `GET /api/learning/video/1` → **401**. Route kept for Drive fallback. Public YouTube embeds remain uncontrollable from the app. |
| H2 | **fixed and verified** (unit) | `loadOrSeedCatalog` / refresh no longer overwrite `passPercent` / `examPassPercent` / `examQuestionCount`. Scoring already reads course row. Covered by `catalog-ensure` tests. |
| H3 | **fixed and verified** (unit) | Operator role requires allowlist **and** `emailVerified` in signed session. Legacy cookies without the flag demote to Member until `/e-learning/session` re-establishes. |
| M1 (CSRF) | **fixed and verified** (unit + API) | `learningPass` enforces trusted-origin on mutations. Cross-origin POST rejected; same-origin logout POST → **307**. CSP **not** enforced (see decisions). |
| M2 | **fixed and verified** (API) | Logout is **POST** only (GET → **405**). UI uses `<form method="post">`. Clears `cg_learning` + Learning Clerk cookies, then restores stashed workspace Clerk session. Full Clerk `sessions.revoke` **awaiting decision** (M3). |
| M3 | **awaiting a decision** | Dedicated `LEARNING_SESSION_SECRET` + revocation — see below. |
| M4 | **fixed but unverified** | Specimen copy + watermark in verify UI / certificate document. Local HTML routes returned 500 (`globals.css` resolve) during retest; unit decode path covered. |
| M5 | **awaiting a decision** | Expiry/revocation policy not invented. |
| M6 | **awaiting a decision** | Answer disclosure / retake / exam bank policy not invented. |
| M7 | **fixed but unverified** | Refresh preserves operator lesson/video fields; never deletes questions (or option IDs) referenced by attempts/answers. |
| M8 / M9 / L1 / L5 / L7 | unchanged | Outside this fix pass (auth shell / lint / section gate / WhatsApp typecheck). |
| L2 | **fixed and verified** (unit) | `lessonVideo` prefers operator-stored URL before catalog YouTube. |
| L3 | **fixed and verified** (unit) | Zod-shaped answers; UUID attempt IDs; duplicate question entries rejected; size/content-type guards. |
| L4 | **fixed but unverified** | Quiz/exam start retries on unique `attemptNumber` collision and reuses open attempts. |
| L6 | **fixed and verified** (unit + partial API) | `safeDecodeCertificateCode`; malformed percent-encoding no longer throws (API returned 400 at edge for bad URL encoding). |
| L8 | **fixed and verified** (code + rate-limit util tests exist) | Learning mutations/video use `rateLimit` scopes. |

### Checks run

| Check | Outcome |
|-------|---------|
| `node --test` `engine` / `catalog` / `security-fixes` | **Pass** |
| ESLint on touched learning/proxy files | **Pass** |
| Unauth video GET | **401** (runtime) |
| GET `/api/learning/sign-out` | **405** (runtime) |
| POST sign-out with trusted Origin | **307** (runtime) |
| Full `npm test` / `npm run typecheck` / `npm run build` | **Not green overall** — pre-existing WhatsApp `.next/types` stubs and unrelated project errors remain |
| Specimen verify HTML | **Blocked** by local `globals.css` module resolution 500 on page renders |

### Decisions still required (not silently implemented)

1. **Session signing key + revocation (M3)**  
   - Introduce `LEARNING_SESSION_SECRET` (fallback to Clerk secret only in dev with warning).  
   - Migration: mint new cookies on next `/e-learning/session`; accept old HMAC for one TTL window or force re-login.  
   - Revocation: `sessionVersion` on `learning_learners` (or denylist `jti`) incremented on logout/ban; verify on every `getLearningSession`.  
   - Optional: Clerk `sessions.revokeSession` for Learning instance after clearing cookies.

2. **CSP (M1 remainder)**  
   - Must allow Learning Clerk, YouTube nocookie embeds, Drive (if proxy kept), fonts/images used by e-learning.  
   - Verify in staging with report-only header before enforce. Do not ship a guessed policy.

3. **Certificate expiry / revocation (M5)**  
   - Confirm whether `validUntil` fails verification, soft-warns, or is display-only; whether revoked codes exist.

4. **Assessment anti-harvest policy (M6)**  
   - Whether failed quizzes reveal full `correctOptionIds`; retake cooldowns; timed exams; separate exam question bank vs shared module bank.

### Configuration / migration notes

- Operators must complete a Learning sign-in after deploy so `emailVerified` is written into `cg_learning`; otherwise they stay Member.  
- No DB migration required for these code fixes.  
- No production data changes performed.

---

*End of audit report.*
