# Performance audit

Measured 11 September 2026. Implementation targeted the shared dashboard layout waterfall, not the public HTML path.

## Method

- Production build: `npm run build` (Next.js 16.3.2 Turbopack). The CLI no longer prints a First Load JS table; sizes come from `.next/diagnostics/route-bundle-stats.json` (`firstLoadUncompressedJsBytes`).
- Public TTFB: `curl.exe` against `next start` on `127.0.0.1:3010` (three samples after the process was ready). First sample can include warmup.
- Dashboard layout timings: `/dashboard` is Clerk-gated (`307`) with no signed-in session in this environment. No `console.time` numbers were captured. Before/after for bootstrap + layout is from code, not wall-clock.
- Lighthouse / LCP / CLS: not recorded. In-editor browser was not used for this pass. Do not treat the tables below as lab scores.

## BEFORE

### Public TTFB (`next start`, production)

| Route | Sample 1 | Sample 2 | Sample 3 | Status |
| --- | --- | --- | --- | --- |
| `/` | 36.2 ms TTFB / 36.7 ms total | 16.5 / 16.7 | 17.8 / 18.2 | 200 |
| `/sign-in` | 16.2 / 16.7 | 18.6 / 19.3 | 14.8 / 15.0 | 200 |
| `/sdk-demo` | 36.8 / 37.5 | 12.5 / 12.7 | 17.0 / 17.3 | 200 |
| `/dashboard` | 52.2 / 52.3 | 14.8 / 14.9 | 15.0 / 15.2 | 307 |

Dev-server TTFB from the same day (compile-inflated, not used as truth): `/` 3173 / 950 / 330 ms; `/sign-in` 661 / 143 / 163 ms; `/sdk-demo` 412 / 139 / 102 ms.

Homepage production TTFB is already low. `ClerkProvider dynamic` was left unchanged.

### First Load JS (uncompressed, production build before page-level edits)

| Route | Bytes | KiB |
| --- | --- | --- |
| `/` | 658,775 | 643 |
| `/sign-in` | 661,510 | 646 |
| `/sdk-demo` | 666,542 | 651 |
| `/dashboard` | 713,656 | 697 |
| `/dashboard/policies` | 713,656 | 697 |
| `/dashboard/policies/[id]` | 760,865 | 743 |
| `/dashboard/policies/[id]/studio` | 777,676 | 759 |
| `/dashboard/developers` | 732,992 | 716 |
| `/dashboard/scanner` | 727,513 | 710 |
| `/dashboard/websites` | 723,333 | 706 |
| `/dashboard/settings/organization` | 736,040 | 719 |
| `/dashboard/autopilot` | 724,833 | 708 |
| `/dashboard/transfers` | 728,783 | 712 |

Heaviest routes were Banner Studio (778 KB) and policy detail (761 KB). Studio is its own route; it is not in the policy-detail First Load graph. No chart/editor libraries were added or removed.

### Dashboard bootstrap + layout (source, no session)

Every `/dashboard/*` navigation waited on the shared layout:

1. `auth()` then `currentUser()` then user `SELECT` then **user `UPDATE` (`lastLoginAt`) on every hit**.
2. Often `clerkClient().organizations.getOrganization()` even when a local org + membership already existed.
3. `loadHomeDashboardCounts` — nine queries, including `COUNT(*)` on `consent_records` — only to compute `setupMode`.
4. Page work started only after that. `dashboard/loading.tsx` cannot paint until the layout finishes.

Policies, developers, and transfers then repeated `auth()` + org-by-Clerk-id. Intelligence pages awaited quality → graph → plan/config in series. `getTenantWebsite` issued three sequential website `SELECT`s for optional columns.

## Changes shipped

1. **Bootstrap fast path** (`src/lib/bootstrap-current-context.ts`): `Promise.all(currentUser, user SELECT)`; skip `lastLoginAt` write unless profile fields changed or login is older than one hour; if `orgId` (or a membership org) already has a local org + membership, return without Clerk org APIs; Clerk `getOrganization` + create transaction only on first-time local org setup.
2. **Cheap setup flag** (`loadSetupComplete`): three parallel `LIMIT 1` existence checks (website, published version, any consent). Layout no longer runs the nine-query home loader. Home still uses `loadHomeDashboardCounts`.
3. **Dedupe + parallel page work**: policies / developers / transfers use `requireDashboardContext()`; policies select only list columns; autopilot / digital-twin / ROI `Promise.all` independent reads after `websiteId`; `getTenantWebsite` uses one full-column select, with a core-column fallback if an unmigrated DB rejects optional columns.
4. **`loading.tsx`** on developers, scanner, purposes, vendors, and settings/organization only, reusing `DashboardPageSkeleton`.

## AFTER

`npm run typecheck` passed. `npm run build` passed. `npm run lint` still fails on **pre-existing** issues outside this change set (`scripts/diagnose-publish-*.cjs` require() imports, unused Card imports on scanner/trackers/enforcement, and `Date.now()` purity in `HomeRecentSection`). None of the files edited for this pass appear in that lint output.

### Public TTFB (`next start` on `:3011`, rebuilt bundle)

| Route | Sample 1 | Sample 2 | Sample 3 | Status |
| --- | --- | --- | --- | --- |
| `/` | 21.8 ms TTFB / 22.3 ms total | 20.1 / 20.6 | 18.1 / 18.7 | 200 |
| `/sign-in` | 17.8 / 18.1 | 14.5 / 14.8 | 15.5 / 15.8 | 200 |
| `/sdk-demo` | 21.5 / 21.8 | 12.2 / 12.3 | 11.4 / 11.8 | 200 |
| `/dashboard` | 51.5 / 51.9 | 15.3 / 15.6 | 17.6 / 17.9 | 307 |

Public TTFB is unchanged within noise (still ~12–22 ms after warmup). `/dashboard` remains a Clerk middleware `307` without a session, so this is not layout time.

### First Load JS (uncompressed, same routes)

Identical to BEFORE on every listed route (home 658,775; dashboard 713,656; studio 777,676). Expected: this pass was server-query work, not client bundles. Banner Studio stays on its own route.

### Dashboard bootstrap + layout (source)

Hot path after first-time setup:

1. `auth()`
2. `Promise.all(currentUser, user SELECT)` — no `UPDATE` when profile is unchanged and `lastLoginAt` is fresh
3. Local org `SELECT` + membership `SELECT` — no `getOrganization()` / membership list
4. Three `LIMIT 1` existence checks instead of nine home counts

Page-specific work no longer re-resolves the org on policies / developers / transfers. Intelligence quality/graph/plan reads overlap. Website detail uses one tenant query on the happy path.

No signed-in session was available, so instrumented `console.time` around bootstrap was not recorded and was not left in the tree.

## Left alone (measurement did not justify a change)

- `ClerkProvider dynamic` — production homepage TTFB is 17–36 ms.
- Dynamic-import of Banner Studio — already a separate route; policy detail First Load does not include the studio chunk set.
- Notification unread-count client fetch — post-paint; not in the layout server waterfall.
- Redis, Clerk/Drizzle replacement, converting dashboard pages to client components.

## Verify

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Fail — pre-existing only (see AFTER) |
| `npm run build` | Pass |
| Public TTFB | Re-timed; 200 on `/`, `/sign-in`, `/sdk-demo`; 307 on `/dashboard` |
| First Load JS | Unchanged vs BEFORE |
| In-editor browser | Unavailable (MCP browser server did not register) |
| Signed-in dashboard path | Not run — no Clerk session. Needs: Dashboard → Websites → Policies → Policy → Install → Settings |
