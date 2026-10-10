# E-learning performance audit

Measured on 8 October 2026 against the local app and the Neon database. Signed-in click timings were not taken: the audit browser has no Clerk session, so end-to-end “click to useful UI” is not claimed.

## Executive summary

Opening a lesson is not slow because of a huge payload or a missing index. A published lesson body is about 5–6 KB. Warm database reads of the course, the 30 module summaries, one lesson, and an enrollment lookup are 50–150 ms. A cold database connection was 525–761 ms.

The click paths were slow because work was stacked:

- **Enroll** did a POST, then a second full page refresh. Each request paid for Clerk and the database.
- **Start / Continue / Open lesson** waited for Clerk and the membership lookup to finish before it even started reading the lesson row.
- The course page did not begin loading that lesson until the user clicked, except for Next.js link prefetch after the HTML arrived.

The useful UI is server-rendered. There is no `useEffect` fetch chain on these screens.

## Current performance

Database, one connection, `prepare: false` (same as the app):

| Query | Cold | Warm |
| --- | ---: | ---: |
| Course row by slug | 525 ms, then 761 ms on a later run | 50–67 ms |
| 30 module summaries | — | 105–139 ms |
| One lesson row, including unused text columns | — | 108–149 ms |
| Enrollment lookup that matches nothing | — | 101–144 ms |
| Largest `organizations.settings` value | — | 2 bytes |

Lesson text in `programme-modules.json`: 30 modules, min 3.5 KB, median 4.2 KB, max 5.7 KB. The database copy of module 1’s lesson is 5,647 bytes. The extra columns that the lesson screen does not render (concepts, example, case study, takeaways) were 2,513 bytes on that row.

Signed-out `GET /e-learning` only proves the dev server responds. It does not measure a signed-in enroll or lesson open.

## User flows tested

Code path for each action, plus the database timings above. The browser could not complete a signed-in click.

### Enroll

```text
Click Enroll
  → EnrollButton (client)
  → POST /api/learning/enroll
  → requireLearner (Clerk + user + organization + membership)
  → enrollInCourse (course row, enrollment insert, event)
  → JSON response
  → router.refresh()
  → GET the course page again
  → Clerk + bootstrap join + learner snapshot + module summaries
  → Enrolled course UI
```

### Start learning / Continue learning / Open a module

```text
Click the link (prefetch may already have started)
  → Next.js navigation
  → loading.tsx until the server finishes
  → Clerk auth + bootstrap join
  → then, and only then, enrollment snapshot and lesson row
  → Module title, steps, and lesson text
  → Previous/next links stream after that
```

Changing module is the same server path with a new slug. Back to the course is the course page path: Clerk, then one enrollment snapshot in parallel with the cached module list.

## Exact bottlenecks

1. Enroll was two full server round trips.
2. The lesson query waited behind sign-in even though the lesson text does not depend on the user.
3. The course page did not start that lesson query while the user was looking at Start / Continue.
4. The lesson query also read four text columns the screen never renders.

## Frontend problems

Issue: Enroll refreshed the whole route after the POST returned.
Location: `src/components/learning/enroll-button.tsx`
Root cause: `fetch` then `router.refresh()`.
Evidence: the handler awaited the POST before starting the refresh.
Impact: the enrolled UI could not appear until both requests finished.
Recommended fix: one server action that enrolls and revalidates the course page.
Risk: low. The enroll API route stays for any other caller.
Priority: P0

Issue: Module loading skeleton still reserved a full video frame.
Location: `src/app/e-learning/module/[moduleSlug]/loading.tsx`
Root cause: the skeleton was left from an older layout.
Evidence: the live module screen is a section list plus one pane.
Impact: the wait looked like a broken video, not the lesson.
Recommended fix: match the skeleton to the section layout.
Risk: none. It does not make the server faster.
Priority: P2

The course and module pages are Server Components. `EnrollButton`, `ModuleCards`, `ModuleReading`, and `VideoPlayer` are client components because they handle clicks, section selection, or playback. Video bytes are not requested until Play. There is no Redux or Zustand on this flow.

`HomeNavbar` is a client component on every learning page. It is real navigation, not a duplicate data fetch.

## API problems

Endpoint: `POST /api/learning/enroll`
Purpose: create the enrollment and the enrolled event.
Average response time: not measured signed-in. The handler is `requireLearner` plus `enrollInCourse`.
Database queries: course lookup (cached 60s), enrollment read, possible insert, event read, possible event insert.
Number of DB queries: about 2–5, then the refresh repeats auth and the course read.
Payload size: a few dozen bytes of JSON.
Potential bottleneck: the button waited for this response and then requested the page again.
Recommended fix: server action, one round trip.
Priority: P0

Endpoint: course page RSC `GET /e-learning`
Purpose: enrollment state and the 30 module cards.
Average response time: not measured signed-in. After auth, the warm snapshot and summary queries are about 100–140 ms and already run together. Summaries overlap auth via `warmLearningCatalog`.
Database queries: one bootstrap join, one enrollment snapshot, one summary select (memory after 60s).
Potential bottleneck: Clerk `auth()` plus a cold Neon connection (measured 525–761 ms before any query result).
Recommended fix: keep the single snapshot. Do not add another round trip.
Priority: P1 for cold start, which the app cannot remove.

Endpoint: module page RSC `GET /e-learning/module/[slug]`
Purpose: lock check plus the lesson.
Average response time: not measured signed-in. Warm lesson read 108–149 ms, snapshot 101–144 ms. They run together, but only after auth.
Database queries: bootstrap join, snapshot, lesson row. Previous/next reuses the same request cache.
Payload size: lesson text about 4–6 KB, plus the four unread columns (about 2.5 KB on module 1).
Potential bottleneck: lesson read started only after auth.
Recommended fix: start the lesson read immediately, and drop the unread columns.
Priority: P0

No client `useEffect` calls these APIs on load.

## Database problems

The hot queries use the unique enrollment key `(organization_id, user_id, course_id)`, the unique Clerk ids on `users` and `organizations`, and `learning_modules.course_id`. `learning_events` already has `(organization_id, user_id, course_id, action)`.

A slug index on `learning_modules (course_id, slug)` would not change a 100 ms network round trip for 30 rows. It is not recommended as a P0.

`organizations.settings` is not a large column here (largest value 2 bytes). Narrowing the bootstrap select would not move the click time.

No `SELECT *` on the lesson open path except the internal editor lookup `moduleBySlug`, which the learner page does not use.

## Bundle problems

The learning screens do not pull a chart library, a PDF library, or a video library. Playback is a native `<video>` whose source is same-origin and starts on Play. The marketing navbar is the largest client island on the page. Splitting it out of the learning layout would change the site chrome, so it was left in place.

## Image and video problems

Lesson text is small. The video file is not downloaded when the module opens. Module 1’s file is about 62 MB and is loaded only after Play, through `/api/learning/video/[moduleNumber]`, which requires a signed-in session.

## Caching problems

Public course and module rows are cached in process for 60 seconds. That cache is not shared across server instances and is empty after a cold start.

Enrollment and progress are not cached. That is correct: they change when the learner enrolls or passes a quiz.

React `cache()` already collapses the snapshot and the lesson read inside one request.

## Architecture problems

The shape is already server-rendered data, not client fetch-on-mount. The remaining architecture issue is ordering: independent reads waited for sign-in, and Enroll did not reuse the page render that the server action can return.

## Root cause

Two sequential server entries for Enroll, and a lesson query that sat idle during Clerk and the membership join.

## Recommended fixes

See `E_LEARNING_PERFORMANCE_PLAN.md`. The P0 items are the enroll action, starting the lesson read before sign-in finishes, warming that read from the course page, and not selecting unused lesson columns.

## Priority matrix

### P0

Enroll’s second request. Lesson query blocked on auth. Course page did not warm the next lesson.

### P1

Cold Neon connection before the first query (525–761 ms). Clerk `auth()` on every navigation. Neither is removed by an index.

### P2

Module loading skeleton did not match the lesson layout. Unused lesson columns (about 2.5 KB on module 1).

### P3

`learning_modules (course_id, slug)` index. Thirty rows do not scan long enough for the index to beat the network.

Issue: Enroll double round trip
Location: `src/components/learning/enroll-button.tsx`, `src/app/api/learning/enroll/route.ts`
Root cause: POST, then `router.refresh()`.
Evidence: the click handler awaited `fetch` before `startRefresh`.
Impact: enrolled UI waits on two Clerk and database passes.
Recommended fix: server action plus `revalidatePath("/e-learning")`.
Risk: low.
Priority: P0

Issue: Lesson read starts too late
Location: `src/app/e-learning/module/[moduleSlug]/page.tsx`, `getModuleForLearner`
Root cause: the page awaited `learnerPageContext()` before any module read.
Evidence: warm lesson query 108–149 ms, and it did not overlap auth.
Impact: that 100–150 ms sits on the critical path of every module open.
Recommended fix: `warmModuleLesson(slug)` at the start of the request.
Risk: low. The row is published course content. Lock checks still run after auth.
Priority: P0

Issue: Next lesson is cold until click
Location: `src/app/e-learning/page.tsx`
Root cause: only the link prefetch started the module render, after HTML arrived.
Evidence: `warmModuleLesson` did not exist on the course page.
Impact: the first Start / Continue click often misses the 60s lesson cache.
Recommended fix: start `warmModuleLesson` for the current module while rendering the course page.
Risk: one extra lesson read when the learner does not click. The row is cached for 60 seconds.
Priority: P0

Issue: Unread columns on the lesson query
Location: `learnerModuleBySlug` in `src/lib/learning/service.ts`
Root cause: concepts, example, case study, and takeaways were selected and returned, and the module page never renders them.
Evidence: 2,513 extra bytes on module 1.
Impact: small next to the network round trip. Still wasted work on every open.
Recommended fix: stop selecting them for the learner page.
Risk: low. The editor path uses `moduleBySlug`, which still reads the full row.
Priority: P2
