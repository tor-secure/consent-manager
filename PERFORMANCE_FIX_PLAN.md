# Performance Fix Plan

Companion to `PERFORMANCE_AUDIT.md` (15 September 2026).

**Status:** Proposal only. Do not apply these changes until this document is approved. Each item preserves behavior, tenant isolation, and Clerk authorization.

Rollback for code: revert the PR/commit. Rollback for indexes: `DROP INDEX IF EXISTS …`.

---

## Immediate

### 1. Stream dashboard children without skipping auth

1. **File(s):** `src/app/dashboard/layout.tsx`; optionally `src/components/dashboard/dashboard-skeletons.tsx` (chrome skeleton if missing).
2. **Existing problem:** `await auth()` and `await bootstrapCurrentContext()` run before `{children}`, so `loading.tsx` cannot paint (audit F-01).
3. **Exact modification:** Keep redirects (no user → `/sign-in`, no org → `/create-organization`). Split into a **sync** outer layout that renders `DashboardProviders` + `Suspense` fallback (sidebar/header/page skeleton) wrapping an **async** inner layout that runs bootstrap then `DashboardShell`. Wrap `{children}` in `Suspense` with `DashboardPageSkeleton`. Keep `HeaderRightLoader` in Suspense. Do not move `auth.protect()` out of `src/proxy.ts`.
4. **Why it improves performance:** First byte of UI can stream; perceived load drops even if bootstrap time is unchanged.
5. **Expected improvement:** Skeleton visible in well under 1s on a warm server; full data still depends on SQL.
6. **Risk:** MEDIUM — brief skeleton for signed-in users; must not leak dashboard chrome to anonymous users (Suspense fallback is only after middleware `auth.protect` for `/dashboard`).
7. **Testing:** Unsigned `/dashboard` still redirects. Signed-in user sees skeleton then content. Org-less user still goes to `/create-organization`. Navigate home → policies → settings.
8. **Rollback:** Restore current `DashboardLayout` async function body.

### 2. Replace leftover `auth()` + org SELECT with `requireDashboardContext()`

1. **File(s):**  
   `src/app/dashboard/policies/[id]/page.tsx`  
   `src/app/dashboard/policies/[id]/studio/page.tsx`  
   `src/app/dashboard/policies/[id]/preference-center/page.tsx`  
   `src/app/dashboard/policies/new/page.tsx`  
   `src/app/dashboard/purposes/page.tsx`  
   `src/app/dashboard/purposes/[id]/page.tsx`  
   `src/app/dashboard/vendors/page.tsx`  
   `src/app/dashboard/vendors/[id]/page.tsx`  
   `src/app/dashboard/trackers/page.tsx`  
   `src/app/dashboard/scanner/page.tsx`  
   `src/app/dashboard/scanner/[scanId]/page.tsx`  
   `src/app/dashboard/rights-requests/page.tsx`  
   `src/app/dashboard/rights-requests/[id]/page.tsx`  
   `src/app/dashboard/audit-logs/page.tsx`  
   `src/app/dashboard/notifications/page.tsx`  
   `src/app/dashboard/integrations/page.tsx`  
   `src/app/dashboard/developers/webhooks/page.tsx`  
   `src/app/dashboard/settings/organization/page.tsx`  
   `src/app/dashboard/settings/retention/page.tsx`  
   `src/app/dashboard/settings/team/page.tsx`  
   Optionally `src/lib/tenant-website.ts` if it still repeats auth+org.
2. **Existing problem:** Duplicate org lookup after layout bootstrap (F-03).
3. **Exact modification:** `const { organization, user } = await requireDashboardContext();` Use `organization.id` for tenant filters. For settings/preference-center extra columns, `SELECT` by `organizations.id` (PK), not Clerk id. Team invitations still use `organization.clerkOrganizationId` with `clerkClient`. Do not remove membership/role checks on settings pages.
4. **Why:** Drops one SQL + `auth()` per those navigations; uses request-cached bootstrap.
5. **Expected improvement:** Tens of ms per navigation (more if Clerk/DB is far).
6. **Risk:** LOW
7. **Testing:** Open each listed route with a non-owner member and an owner; confirm 404 for other-org IDs; team invite still works.
8. **Rollback:** Revert those page files.

### 3. Analytics `(organization_id, updated_at)` index

1. **File(s):** `src/db/schema/consent-records.ts`; new Drizzle SQL under `drizzle/` (e.g. `0056_consent_records_org_updated.sql`) + journal/snapshot via `drizzle-kit generate`.
2. **Existing problem:** Period filter on `updatedAt` with indexes on `createdAt` (F-04).
3. **Exact modification:** Add `index("consent_records_org_updated_idx").on(table.organizationId, table.updatedAt)`. SQL: `CREATE INDEX IF NOT EXISTS "consent_records_org_updated_idx" ON "consent_records" ("organization_id", "updated_at");` Do **not** change the filter column unless product confirms counts should use `created_at`.
4. **Why:** Planner can range-scan org + period instead of filtering the created_at index.
5. **Expected improvement:** Large-org analytics/home; small tables may still Seq Scan (OK).
6. **Risk:** MEDIUM — index build time/locks on big tables (`CONCURRENTLY` if operations allow; pooler may not).
7. **Testing:** `EXPLAIN (ANALYZE, BUFFERS)` on a representative org (no PII in logs). Compare before/after. Analytics numbers unchanged.
8. **Rollback:** `DROP INDEX IF EXISTS consent_records_org_updated_idx;` revert schema/migration files.

### 4. Self-host Geist fonts

1. **File(s):** `src/app/layout.tsx`; `package.json` if adding `geist`; keep `--font-geist-sans` / `--font-geist-mono` in `globals.css`.
2. **Existing problem:** `next/font/google` + Turbopack missing module; CSP `font-src 'self'` (F-09).
3. **Exact modification:** Replace `Geist, Geist_Mono` from `next/font/google` with `geist/font/sans` and `geist/font/mono` (or `next/font/local` woff2). Apply `GeistSans.variable` / `GeistMono.variable` on `<html>`.
4. **Why:** No Google fetch at compile/runtime; matches CSP.
5. **Expected improvement:** Dev/build no longer die on font URL; slightly faster first paint.
6. **Risk:** LOW
7. **Testing:** `npm run build`; visual check of UI fonts; no console font 404s.
8. **Rollback:** Restore Google font imports.

---

## Short-term

### 5. Single `auth()` on dashboard bootstrap

1. **File(s):** `src/app/dashboard/layout.tsx`, `src/lib/bootstrap-current-context.ts`
2. **Existing problem:** F-02
3. **Exact modification:** Layout only calls `bootstrapCurrentContext()` / `requireDashboardContext()`; that function remains the only `auth()`. Redirects stay in layout from bootstrap result (`!user` should not happen if middleware protected; keep defensive checks).
4. **Why:** One Clerk session read per RSC request.
5. **Expected improvement:** Small Clerk RTT saved.
6. **Risk:** LOW
7. **Testing:** Sign-out, sign-in, org switch, create-organization redirect.
8. **Rollback:** Restore extra `auth()` guard in layout.

### 6. Slim home dashboard SQL

1. **File(s):** `src/lib/dashboard/home-queries.ts`, `src/components/dashboard/home-sections.tsx`, `src/lib/analytics/queries.ts`
2. **Existing problem:** ~24 round-trips; overlapping counts vs analytics (F-05).
3. **Exact modification:** `HomeLiveAndChartsSection` should call `loadConsentAnalytics(..., "charts")` or `"overview"` as needed, not full `"home"` if that duplicates `loadHomeDashboardCounts`. Keep React `cache()`. Do not change visible metrics without a before/after screenshot of the same org.
4. **Why:** Fewer aggregations on `consent_records`.
5. **Expected improvement:** Material cut in home DB time at scale.
6. **Risk:** MEDIUM — stat drift if modes differ.
7. **Testing:** Same org, last 30 days: stats cards, charts, recent list match pre-change.
8. **Rollback:** Restore previous loaders/modes.

### 7. Collapse API auth lookups

1. **File(s):** `src/lib/api-auth-helpers.ts`; call sites can stay `authorize*` wrappers.
2. **Existing problem:** Sequential user → org → membership (F-06).
3. **Exact modification:** Add `resolveDashboardAuth(userId, orgId)` that performs the same join as bootstrap hot path (users ⋈ organizations ⋈ memberships ⋈ roles) and returns the same `{ user, organization, membership, role }` shape. Keep 401/403 messages identical. Do not cache across requests. Do not skip role checks.
4. **Why:** 1 SQL instead of 3 on ~57 routes if wrappers switch to it.
5. **Expected improvement:** ~2 DB RTTs per API call.
6. **Risk:** LOW if predicates (`status = active`, clerk ids) stay identical.
7. **Testing:** Findings GET, policy publish, tracker PATCH, team invite as Member vs Admin vs unsigned.
8. **Rollback:** Restore three helper calls.

### 8. Clerk organization list: no infinite pages

1. **File(s):** `src/components/dashboard/dashboard-providers.tsx`
2. **Existing problem:** F-08
3. **Exact modification:** `useOrganizationList({ userMemberships: true })` or first page only. Keep `setActive` when `orgId` is missing.
4. **Why:** Fewer Clerk API pages after hydration.
5. **Expected improvement:** Faster dashboard interactivity for multi-org users.
6. **Risk:** LOW (users with many orgs still get first page; switcher can load more).
7. **Testing:** User with 0 orgs, 1 org, several orgs; landing without active org still activates one.
8. **Rollback:** Restore `{ infinite: true }`.

---

## Medium-term

### 9. Policy detail query batching

1. **File(s):** `src/app/dashboard/policies/[id]/page.tsx`, `src/app/dashboard/policies/[id]/studio/page.tsx`
2. **Existing problem:** F-07
3. **Exact modification:** After `requireDashboardContext()`, `Promise.all` websites + policy (policy still scoped to org website ids). Then `Promise.all` versions, purposes, vendors, trackers where independent. Select only needed columns (studio already selects a subset).
4. **Why:** Fewer sequential round-trips.
5. **Expected improvement:** Policy/studio TTFB down by multiple SQL RTTs.
6. **Risk:** LOW
7. **Testing:** Policy 404 for other org; studio loads config; publish checklist unchanged.
8. **Rollback:** Revert those pages.

### 10. Lighter dashboard client shell

1. **File(s):** `src/components/dashboard/dashboard-shell.tsx`, `src/components/dashboard/sidebar-nav.tsx`, `src/app/dashboard/layout.tsx`
2. **Existing problem:** F-10
3. **Exact modification:** Server wrapper for static chrome; client islands for collapse/mobile and active path. Optional `next/dynamic` for Clerk header widgets with identical appearance. Do not remove OrganizationSwitcher/UserButton.
4. **Why:** Smaller main dashboard chunk / less hydration.
5. **Expected improvement:** Lower First Load JS and INP; measure via `.next/diagnostics/route-bundle-stats.json`.
6. **Risk:** MEDIUM (layout/a11y)
7. **Testing:** Sidebar collapse persist, mobile overlay, keyboard skip link, org switch, theme toggle.
8. **Rollback:** Restore current client shell.

### 11. Bound large lists

1. **File(s):** `src/app/api/scanner/[scanId]/route.ts`; dashboard pages that `select` all websites/vendors/purposes without limit where tables can grow.
2. **Existing problem:** F-11
3. **Exact modification:** Cap scan_results (page or high limit + total count). Document UI if truncated. Do not drop tenant `WHERE`.
4. **Why:** Avoid huge JSON/HTML.
5. **Expected improvement:** Scanner detail and APIs stay bounded.
6. **Risk:** MEDIUM if UI assumed full lists
7. **Testing:** Scan with many results; empty scan; org with many websites.
8. **Rollback:** Remove limits.

### 12. Batch scanner / drift writes

1. **File(s):** `src/lib/scanner/scan-engine.ts`, `src/lib/monitoring/process-scan-drift.ts`
2. **Existing problem:** F-12
3. **Exact modification:** Batch insert/update trackers and findings (Drizzle multi-row insert or transaction with fewer round-trips). Preserve per-item uniqueness and org/website scope.
4. **Why:** Scan jobs finish faster.
5. **Expected improvement:** Cron/scan duration, not click navigation.
6. **Risk:** MEDIUM
7. **Testing:** Run scanner against a fixture site; drift findings count unchanged.
8. **Rollback:** Restore loops.

### 13. `loading.tsx` coverage

1. **File(s):** new `loading.tsx` under high-traffic routes missing them (trackers, team, integrations, rights-requests, vendors list already has one — fill gaps from audit §4).
2. **Existing problem:** F-14
3. **Exact modification:** Re-export `DashboardPageSkeleton`.
4. **Why:** Better UX on client navigations once layout streams.
5. **Expected improvement:** Perceived speed
6. **Risk:** LOW
7. **Testing:** Click through those nav items.
8. **Rollback:** Delete added files.

---

## Architectural / measurement

### 14. Serverless pool size

1. **File(s):** `src/db/index.ts`
2. **Existing problem:** F-13 `max: 1` serializes parallel queries on Vercel.
3. **Exact modification:** After measuring Neon `max_connections` / pooler size, try `max: 3` (not 10) on serverless. Keep `prepare: false`. Optional `globalThis` singleton for `next dev` HMR.
4. **Why:** Parallel `Promise.all` can use more than one connection.
5. **Expected improvement:** Home/analytics on Vercel
6. **Risk:** MEDIUM (too many connections)
7. **Testing:** Staging load; watch Neon connection metrics.
8. **Rollback:** Restore `max: 1` / `10` split.

### 15. Temporary signed-in instrumentation

1. **File(s):** `src/lib/bootstrap-current-context.ts`, `src/app/dashboard/layout.tsx`, `src/lib/analytics/queries.ts` — behind `process.env.PERF_LOG === "1"`
2. **Existing problem:** F-15
3. **Exact modification:** `performance.now()` logs like `[PERF] bootstrap: 42ms` with **no** user ids, emails, SQL params, or tokens. Remove after a measurement window.
4. **Why:** Evidence for signed-in TTFB.
5. **Expected improvement:** Measurement only
6. **Risk:** LOW if gated and redacted
7. **Testing:** Confirm logs have no PII; `PERF_LOG` off by default.
8. **Rollback:** Delete timers.

---

## Suggested implementation order

1. Fonts (unblocks broken Turbopack)  
2. Layout streaming  
3. `requireDashboardContext()` pages  
4. Analytics index  
5. API auth join  
6. Clerk infinite flag  
7. Home query slim  
8. Remainder as capacity allows  

Do not combine a schema migration with a large UI refactor in the same PR.

---

## Out of scope (do not do)

- Removing Clerk `auth.protect()` or membership checks  
- Caching tenant dashboard HTML or consent records in a shared CDN  
- Replacing Drizzle/Postgres or Clerk  
- Optimizing only `next dev` compile times and calling that production-ready  
- Changing analytics metric definitions without product sign-off  
