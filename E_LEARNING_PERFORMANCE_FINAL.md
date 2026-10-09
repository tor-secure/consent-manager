# E-learning performance final report

Date: 8 October 2026.

Signed-in click times were not recorded. The audit browser has no Clerk session, so this report does not say the 1 second target passed.

## Before vs after

Database pieces were measured. The click-to-screen times were not, because that needs a signed-in session.

| Flow | Before | After | Improvement |
| --- | --- | --- | --- |
| Enroll | Two requests: POST `/api/learning/enroll`, then `router.refresh()` of the whole course page. Each paid for Clerk and the database. | One server action. The enrolled page is the refresh that action already performs. The button still shows “Enrolling…” immediately. | One HTTP round trip removed. Seconds not measured signed-in. |
| Start learning | Lesson query started only after Clerk and the membership join. Warm lesson read was 108–149 ms, added on top of auth. | The course page starts that read while it renders. The module page starts it again before auth returns. A click inside 60 seconds uses the in-process lesson cache. | About one warm database round trip (108–149 ms) moved off the critical path when the cache hits. Click time not measured signed-in. |
| Continue learning | Same as Start learning. | Same as Start learning. | Same. |
| Open lesson | Same module server path. The query also loaded concepts, example, case study, and takeaways (2,513 extra bytes on module 1). | Those columns are not selected. The lesson body (5,647 bytes on module 1) still is. | Small. The round-trip overlap is the real change. |

Warm database reference, unchanged by an index:

| Query | Time |
| --- | ---: |
| Cold connection, course row | 525 ms and 761 ms |
| Course row, warm | 50–67 ms |
| 30 module summaries | 105–139 ms |
| One lesson row | 108–149 ms |
| Empty enrollment lookup | 101–144 ms |

A cold Neon connection alone can spend most of a 1 second budget before the lesson query starts. That is still true.

## Files changed

- `src/lib/learning/enroll-action.ts` — new server action
- `src/components/learning/enroll-button.tsx` — calls the action instead of POST plus refresh
- `src/lib/learning/service.ts` — `warmModuleLesson`; lesson query no longer reads unused text columns
- `src/app/e-learning/page.tsx` — warms the current lesson while the course page renders
- `src/app/e-learning/module/[moduleSlug]/page.tsx` — starts the lesson read before sign-in returns
- `src/app/e-learning/module/[moduleSlug]/loading.tsx` — skeleton matches the section list and reading pane
- `E_LEARNING_PERFORMANCE_AUDIT.md`
- `E_LEARNING_PERFORMANCE_PLAN.md`

`POST /api/learning/enroll` is unchanged and still available. The button does not call it.

## Database changes

None. No migration and no new index. The measured time is the network round trip, not a scan of the 30 modules.

## API changes

Enroll from the course page is a server action, `enrollInDpdpCourse`, which revalidates `/e-learning`.

`getModuleForLearner` no longer returns concepts, example, case study, or takeaways. The module page never rendered them. The editor still loads the full row through `moduleBySlug`.

## Frontend changes

The course and module pages stay Server Components. Nothing new is fetched from `useEffect`.

Start / Continue still uses Next.js prefetch on the link. The lesson row is also warmed on the server so that prefetch and the click can skip the lesson query for 60 seconds.

The video file is still not requested until Play.

## Caching changes

No new cache. The existing 60 second in-process cache for course content is what the warmer fills. Enrollment and progress are still read from the database on each page.

## Remaining bottlenecks

- Clerk `auth()` on every navigation. Not timed in a signed-in session.
- First query after an idle database: 525–761 ms before the row comes back.
- The enrollment snapshot still waits for the user id, so it cannot overlap the whole of sign-in. Warm time was 101–144 ms.
- The marketing navbar still hydrates on the learning pages.
- Signed-in click-to-paint was not measured, so the 1 second target is not verified.

## Checks

- `npx tsc --noEmit`: passed.
- `npm test`: failed in `src/lib/consent-manager-e2e-regression.test.cjs` on banner copy (`Updated privacy policy` vs `Privacy choices`). That assertion is not on the enroll or lesson path.
- `npm run build`: passed (exit 0).
- Lint of the edited files: passed (`eslint`, exit 0).

## Final status

```text
<1 second target: FAIL (not measured signed-in; cold database alone was 525–761 ms)
Functional tests: FAIL (unrelated consent banner assertion)
Build: PASS
Performance regression: not measured end to end
Production readiness: the enroll and lesson-read changes are safe to ship; do not treat the 1 second goal as done
```
