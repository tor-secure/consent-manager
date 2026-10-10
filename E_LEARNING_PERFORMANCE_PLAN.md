# E-learning performance plan

The audit measurements are in `E_LEARNING_PERFORMANCE_AUDIT.md`. This plan only covers the bottlenecks that showed up there. It does not add a cache of enrollment or progress.

## Phase 1 — Critical bottlenecks

Task: Replace Enroll’s POST-plus-refresh with one server action.
Files affected: `src/lib/learning/enroll-action.ts`, `src/components/learning/enroll-button.tsx`
Expected improvement: the enrolled course UI is the response of one request instead of a POST followed by a second page load. Button text still switches to “Enrolling…” on the click.
Dependencies: none.
Risk: the POST route stays. A failed action still shows the existing error.
Verification method: the button calls `enrollInDpdpCourse` and does not call `router.refresh`. Typecheck.

Task: Start the lesson read before sign-in returns.
Files affected: `src/lib/learning/service.ts` (`warmModuleLesson`), `src/app/e-learning/module/[moduleSlug]/page.tsx`
Expected improvement: the 108–149 ms warm lesson query overlaps Clerk and the membership join instead of following them.
Dependencies: published module content does not depend on the learner. The lock check still uses the snapshot after auth.
Risk: a bad slug still returns not found after auth. The floating promise is caught so a failure is not an unhandled rejection.
Verification method: the page calls `warmModuleLesson` before `learnerPageContext`.

Task: Warm the current lesson while the course page renders.
Files affected: `src/app/e-learning/page.tsx`
Expected improvement: Start / Continue within the 60 second cache hits memory for the lesson row.
Dependencies: phase 1 `warmModuleLesson`.
Risk: one extra read if the learner does not open the module.
Verification method: the enrolled branch calls `warmModuleLesson(current.slug)`.

## Phase 2 — API optimization

The enroll button stops using `POST /api/learning/enroll`. The route remains for any other caller. No response shape change.

The module RSC stops returning concepts, example, case study, and takeaways. Callers of `getModuleForLearner` are only the module page, which never read those fields.

## Phase 3 — Database optimization

No new index. The hot lookups already use unique keys, and the measured time is the round trip (about 50–150 ms warm, 525–761 ms on a cold connection). An index on `(course_id, slug)` would not remove that.

No migration.

## Phase 4 — Next.js rendering

Keep the course and module pages as Server Components. Do not move enrollment into `useEffect`.

`loading.tsx` for a module should match the section list and the reading pane so the wait is the real layout. That does not shorten the server work.

## Phase 5 — Client bundle

No new dependency. No dynamic import of the navbar. The video player stays on the page and still does not set a video `src` until Play.

## Phase 6 — Caching and prefetch

Keep the 60 second in-process cache for course, summaries, and lesson text. Do not cache the enrollment snapshot.

The Start / Continue link already uses Next.js prefetch. Warming the lesson row makes that prefetch, and the later click, skip the lesson query when the cache is warm.

## Phase 7 — Loading UX

The Enroll button stays disabled and reads “Enrolling…” until the action’s refreshed page arrives. That is the server action’s pending state, not a fake enrolled screen.

## Phase 8 — Testing

`npx tsc --noEmit` on the project. Lint the touched files. A full `npm test` and `npm run build` are run if they finish; failures that already existed are called out and not treated as this change.

## Phase 9 — Production verification

A signed-in click was not available in this session. Do not mark the 1 second target as passed until someone with a session records:

- Enroll: click to “Enrolling…”, click to the enrolled course screen
- Start / Continue: click to the module title and lesson text

Cold Neon (measured 525–761 ms before the first row) can put a single request over 1 second even after these fixes. Say so in the final report.
