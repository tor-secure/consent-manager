# Application Performance Audit

Date: 15 September 2026.
Scope: Consent Guru (this repository). Read-only investigation. No production code was changed for this report.

Method:

- Source inspection of App Router layouts, bootstrap, Drizzle queries, indexes, API helpers, client boundaries, and Clerk middleware.
- Prior production measurements from 11 September 2026 (`next start` TTFB and First Load JS from `.next/diagnostics/route-bundle-stats.json`).
- Signed-in dashboard wall-clock TTFB was **not** captured in that pass (`/dashboard` returned Clerk `307` without a session). Those numbers are **not** used as dashboard layout time.
- `EXPLAIN (ANALYZE)` was not re-run for this document. Index conclusions come from schema vs query predicates, plus an earlier read-only plan on a similar `updated_at` filter.

Do not judge production speed from `next dev` first-compile times.

---

## 1. Executive Summary

**Overall score: 54/100 (Poor).**

Public HTML is fast in production (~12–22 ms TTFB). Almost every **signed-in dashboard** navigation is slow because shared infrastructure runs before any page can paint, then the browser hydrates a large Clerk + shell bundle. Database work on home and analytics is heavy and will get worse as `consent_records` grows.

### Top 5 performance problems

1. **Dashboard layout blocks every `/dashboard/*` route** on `auth()` + `bootstrapCurrentContext()` before `{children}` (and before `loading.tsx` can show).
2. **Home dashboard ~24 database round-trips** (bootstrap, setup checks, nine counts, analytics “home” mode, recent rows).
3. **Analytics period filter uses `updatedAt` with no matching index** (indexes cover `createdAt`).
4. **Duplicate tenant resolution:** 20 dashboard pages still `auth()` + org `SELECT`; ~57 APIs chain user → org → membership sequentially.
5. **~700 KB uncompressed First Load JS** on dashboard routes (Clerk widgets + client shell + sidebar on every page).

---

## 2. Architecture

| Layer | Evidence |
| --- | --- |
| Framework | Next.js **16.3.4** App Router only, React **19.2.8**, Turbopack, `reactCompiler: true` (`package.json`, `next.config.ts`) |
| Auth | Clerk `@clerk/nextjs` ^7.8 via `src/proxy.ts` (`clerkMiddleware`, `auth.protect` on non-public routes) |
| Database | Drizzle ORM + `postgres` driver; Neon/PgBouncer-style pooler (`prepare: false`; `max: 1` on Vercel, `10` otherwise) in `src/db/index.ts` |
| Hosting | Implied Vercel (`vercel.json` hourly `/api/cron/scans`). Local Postgres in `docker-compose.yml` |
| Data access | Server Components query Drizzle directly. **0** `"use server"` files. **107** `src/app/api/**/route.ts` files |
| Rendering | Dashboard and APIs are **dynamic** (Clerk cookies, `headers()` nonce). No `generateStaticParams` / route `revalidate` for tenant pages |

### Request lifecycle (dashboard)

```
Browser
  → src/proxy.ts (Clerk session + CSP + CSRF on mutations)
  → src/app/layout.tsx (headers() nonce, ClerkProvider dynamic, Google fonts)
  → src/app/dashboard/layout.tsx (auth + bootstrapCurrentContext — BLOCKS children)
  → Route page (more SQL)
  → HTML + ~700 KB JS
  → Hydrate DashboardShell, SidebarNav, Clerk OrganizationSwitcher/UserButton
```

### What runs on every dashboard navigation

1. Edge: `auth.protect()` (`src/proxy.ts` ~71–73).
2. Root layout: `headers()` for CSP nonce (`src/app/layout.tsx` ~26).
3. Dashboard layout: `auth()` then `bootstrapCurrentContext()` (`src/app/dashboard/layout.tsx` ~73–78).
4. Bootstrap hot path: **second** `auth()` + one users⋈orgs⋈memberships join (`src/lib/bootstrap-current-context.ts` ~63–88).
5. Client: `DashboardProviders` (`useOrganizationList({ infinite: true })`), `DashboardShell`, sidebar, search, Clerk header widgets.

Already optimized (keep):

- React `cache()` on `bootstrapCurrentContext`, `loadHomeDashboardCounts`, `loadSetupComplete`, `loadConsentAnalytics`.
- Bootstrap hot path skips `currentUser()` and Clerk org APIs when local rows exist.
- Header setup badge is Suspense-isolated (`HeaderRightLoader`).
- Server Components do **not** `fetch` their own `/api` for dashboard data.

---

## 3. Global Performance Bottlenecks

These affect many or all signed-in routes.

| Issue | Where | Impact |
| --- | --- | --- |
| Layout bootstrap waterfall | `src/app/dashboard/layout.tsx:73-78` | Every dashboard page waits; `loading.tsx` cannot paint |
| Double `auth()` | layout + `bootstrapCurrentContext` | Extra Clerk work per request |
| Client chrome in shared layout | `dashboard-shell.tsx`, `sidebar-nav.tsx`, `dashboard-providers.tsx` | Hydration cost on every dashboard route |
| Clerk `infinite: true` memberships | `dashboard-providers.tsx:10-12` | Extra Clerk API pages after paint |
| Root `headers()` | `src/app/layout.tsx:26` | Forces dynamic rendering app-wide (needed for CSP nonce) |
| Google Geist via `next/font/google` | `src/app/layout.tsx:3-17` | Turbopack can fail to resolve `@vercel/turbopack-next/internal/font/google/font`; CSP `font-src 'self'` expects local fonts |
| Duplicate org SELECT on 20 pages | See §13 F-03 | Extra SQL after layout already has org |
| API auth chain | `src/lib/api-auth-helpers.ts` | 3 sequential DB lookups on most protected APIs |

Public marketing/auth HTML is **not** the global bottleneck (measured fast in production).

---

## 4. Route Performance Analysis

Classification uses code + prior production measurements. **FAST/SLOW for dashboard signed-in time is inferred from waterfalls, not signed-in TTFB.**

| Route | Strategy | Class | Evidence |
| --- | --- | --- | --- |
| `/` | SSR, public | **FAST** (prod HTML) | TTFB ~12–22 ms after warmup (11 Sep) |
| `/sign-in` | Clerk, public | **FAST** (prod HTML) | TTFB ~15–18 ms |
| `/sdk-demo` | Public | **FAST** (prod HTML) | TTFB ~11–22 ms |
| `/dashboard` (unsigned) | Middleware | n/a | `307` — not layout time |
| `/dashboard` home | Dynamic RSC | **SLOW** | Layout block + ~24 SQL (see §5, §8) |
| `/dashboard/analytics` | Dynamic RSC, Suspense split | **CRITICAL** at scale | ~16 query batches; `updatedAt` unindexed |
| `/dashboard/policies/[id]` | Dynamic RSC | **SLOW** | ~9 sequential SQL + duplicate org lookup |
| `/dashboard/policies/[id]/studio` | Dynamic RSC + large client | **SLOW** | ~5 sequential SQL; First Load JS ~759 KB |
| `/dashboard/policies`, `/consent`, `/websites` | Dynamic RSC | **ACCEPTABLE** | Use `requireDashboardContext()`; still share layout cost |
| `/api/sdk/[siteKey]/config` | Route handler | **SLOW** under load | 8–9 SQL + IAB/GVL + large JSON; SDK `cache: 'no-store'` |
| 33 of 61 dashboard pages | No `loading.tsx` | **ACCEPTABLE / SLOW UX** | 28 `loading.tsx` vs 61 `page.tsx` |

Home already streams stats/charts/recent behind Suspense (`src/app/dashboard/page.tsx`), but the **page itself still waits on layout bootstrap**.

---

## 5. PostgreSQL Analysis

### Connection handling

`src/db/index.ts`: one module-level client; `prepare: false` (correct for transaction poolers); `max: 1` on Vercel means `Promise.all` queries **queue on one connection**.

No per-request `postgres()` factory. HMR in `next dev` can still leak pools if the module re-evaluates without a `globalThis` singleton (dev-only).

### Indexes vs query predicates

`consent_records` (`src/db/schema/consent-records.ts`):

- Has `(organizationId, createdAt)` as `consent_records_org_created_idx`.
- **Does not** have `(organizationId, updatedAt)`.
- Analytics period uses `gte/lte(consentRecords.updatedAt, …)` (`src/lib/analytics/queries.ts` ~94–95).

JSON analytics dimensions (`metadata #>> '{analytics,country}'` etc.) cannot use B-tree indexes efficiently.

Other gaps for `WHERE organizationId ORDER BY createdAt`:

- `audit_logs`: separate org and createdAt indexes, no composite (`src/db/schema/audit-logs.ts`).
- `notifications`: same (`src/db/schema/notifications.ts`).
- `scans`, `consent_policies`, `websites`: weak or no list indexes.

`users` / `organizations` look up by unique `clerk_*` columns (unique constraints, not extra btree). Fine for PK-style lookups.

### Home query volume (~24 round-trips, request-cached)

| Source | Queries |
| --- | --- |
| Bootstrap hot path | 1 join |
| `loadSetupComplete` | 3 `LIMIT 1` (Suspense, parallel) |
| `loadHomeDashboardCounts` | 9 parallel aggregations |
| `loadHomeChartAnalytics` → analytics `"home"` | websites + up to 9 aggregations |
| Recent records | 1 |

`loadSetupComplete` overlaps conceptually with home counts (website / published version / consent existence vs full counts).

### N+1 (writes)

- `src/lib/scanner/scan-engine.ts`: per tracker item insert/update.
- `src/lib/scanner/scan-schedule.ts`: per due schedule.
- `src/lib/monitoring/process-scan-drift.ts`: per finding.

Not on every navigation; they hurt scan/cron paths.

### Over-fetch / unbounded lists

- `src/app/api/scanner/[scanId]/route.ts`: all `scan_results` for a scan, no limit.
- Several dashboard pages load all org websites / vendors / purposes with no pagination (`websites/page.tsx`, `integrations/page.tsx`, processing dashboard queries).
- Policy detail loads all versions including configuration JSON, then all org vendors.

### Query plans

Not re-measured here. Earlier read-only `EXPLAIN` on an `organization_id` + `updated_at` range used `consent_records_org_created_idx` plus a **Filter on `updated_at`**, or Seq Scan at very small row counts. After adding `(organization_id, updated_at)`, small tables may still Seq Scan (planner cost); the index matters as volume grows.

---

## 6. Authentication Performance

Security is not the bug. Cost is **repetition**.

| Layer | Work | Deduped? |
| --- | --- | --- |
| `src/proxy.ts` | `auth.protect()` | Every non-public request |
| Dashboard layout | `auth()` | No |
| `bootstrapCurrentContext` | `auth()` again + DB join | React `cache()` per request for bootstrap |
| 20 pages | `auth()` + org by `clerkOrganizationId` | **No** — extra SQL |
| ~57 APIs | `auth()` + `resolveLocalUser` + `resolveLocalOrganization` + `resolveActiveMembership` | Sequential, not one join |
| `getTenantWebsite` | auth + org join again | Separate from bootstrap cache |

Do not remove `auth.protect()`, membership, or tenant filters. Deduplicate **lookups**, not **authorization**.

Cold bootstrap (no local rows) still calls `currentUser()` and may call Clerk org APIs — acceptable for first setup, expensive if the hot path misses (missing `orgId` on session).

---

## 7. Next.js Rendering Analysis

- No `force-dynamic` / `noStore()` exports found. Dynamism comes from Clerk, `cookies`/`headers()`, and per-request SQL.
- Root `headers()` for nonce is required for Clerk strict CSP; caching HTML globally would be **unsafe**.
- Tenant dashboard pages must stay dynamic. Safe cache targets are **public** SDK script/GVL (already have Cache-Control) and **read-mostly** SDK config (`private, max-age=15` already on config route; SDK client often sends `cache: 'no-store'`).
- Streaming: home and analytics use inner Suspense; **layout does not wrap `{children}`**. `loading.tsx` coverage is 28/61 dashboard pages.
- `ClerkProvider dynamic` is appropriate; it does not make public TTFB slow in production measurements.

**Do not** cache user/org/permission/consent records in a shared HTTP cache.

---

## 8. Request Waterfalls

### Current dashboard navigation (conceptual)

```
Request
  → Clerk protect (edge)
  → headers() nonce
  → auth()                          sequential
  → bootstrap auth() + SQL join     sequential (cannot start page)
  → page queries                    after layout
  → render + ~700 KB JS hydrate
```

Header setup checks run in parallel with children **only after** bootstrap returns.

### Home page after layout (partially parallel)

```
requireDashboardContext()     cached
  → Suspense: counts (9 parallel)
  → Suspense: analytics home (many parallel aggregations)
  → Suspense: recent (1 query)
```

Counts and analytics both touch `consent_records` (duplicate conceptual work, separate SQL).

### Policy detail (sequential)

`auth` → org SELECT → websites → policy → versions → purposes → vendors → vendor-purposes → trackers (`src/app/dashboard/policies/[id]/page.tsx`).

### Protected API (typical)

`auth()` → user SELECT → org SELECT → membership+role SELECT → handler queries.

Independent user+org lookups can be `Promise.all` or one join. Membership depends on both IDs.

---

## 9. API Performance

- **107** route handlers. Dashboard Server Components generally do **not** hop through `/api`.
- Client fetches: notification unread count (`cache: 'no-store'`), dashboard search, banner studio save, consent evidence page (client page).
- SDK config (`src/app/api/sdk/[siteKey]/config/route.ts`): batched `Promise.all` in places; published version still sequential after website context; large payload.
- Scanner GET scan: unbounded `scan_results`.
- Intelligence routes: some already `Promise.all` user+org (better than the 57 sequential helpers).

No Server Actions to audit.

---

## 10. Client Performance

- `"use client"` shell wraps all dashboard pages (`DashboardShell` ~205 lines; `SidebarNav` ~441 lines with inline SVGs).
- Clerk `OrganizationSwitcher`, `UserButton`, `useOrganizationList({ infinite: true })` on every dashboard mount.
- NotificationBell `useEffect` fetch after paint (not in server waterfall).
- Banner Studio is a separate route (good) but heaviest JS.
- Charts are inline SVG / server HTML, not Chart.js (bundle-positive, HTML-heavier).
- Consent detail page is `"use client"` and fetches `/api/consent/evidence/...` instead of a server query.

No justification for sprinkling `useMemo`/`useCallback` globally.

---

## 11. Bundle Analysis

Prior production First Load JS (uncompressed, 11 Sep 2026):

| Route | Bytes | KiB |
| --- | --- | --- |
| `/` | 658,775 | 643 |
| `/dashboard` | 713,656 | 697 |
| `/dashboard/policies/[id]` | 760,865 | 743 |
| `/dashboard/policies/[id]/studio` | 777,676 | 759 |

Shared dashboard graph is Clerk + shell. Studio adds editor/preview. No extra chart/editor npm libraries in `package.json` beyond Clerk, IAB, AWS Bedrock (server), toast.

`@aws-sdk/client-bedrock-runtime` should stay server-only (do not import from client layouts).

---

## 12. Network Performance

**Server latency (dashboard):** Clerk + bootstrap SQL + page SQL. Public HTML is not the problem.

**Client latency:** download/hydrate ~700 KB; Clerk org list; notification count.

**Third parties:** Clerk FAPI on session routes; Google Fonts fetch during Turbopack/`next/font/google` (build or first compile). CSP extra directives set `font-src` to `'self'` and `data:` (`src/lib/security-headers.ts`) — Google-hosted font files are a mismatch if the browser ever requests fonts.gstatic.com.

SDK embed: multiple `cache: 'no-store'` fetches in `src/lib/sdk/cmp-sdk-script.ts` (by design for consent freshness).

---

## 13. Findings

### F-01 — Layout blocks all dashboard children

- **ISSUE:** Shared layout awaits bootstrap before `{children}`.
- **FILE:** `src/app/dashboard/layout.tsx`
- **FUNCTION:** `DashboardLayout`
- **LINE/AREA:** 68–96 (`auth` 73–76, `bootstrapCurrentContext` 78–82; children 95).
- **CURRENT BEHAVIOR:** No page RSC work and no segment `loading.tsx` until bootstrap returns. Only header-right is in Suspense.
- **EVIDENCE:** Source; Next.js App Router: `loading.js` wraps the page, not an async parent layout.
- **IMPACT:** HIGH — every dashboard route.
- **ROOT CAUSE:** Auth/org redirect implemented as blocking layout awaits.
- **RECOMMENDED FIX:** Keep redirects, wrap authed shell or `{children}` so a chrome/page skeleton can stream; do not skip auth.
- **RISK:** MEDIUM (redirect timing / flash). Must still redirect unsigned users and org-less users.
- **EXPECTED IMPROVEMENT:** Perceived load under ~1s (skeleton); TTFB of full HTML may stay similar.

### F-02 — Duplicate `auth()` on dashboard requests

- **FILE:** `src/app/dashboard/layout.tsx:73`, `src/lib/bootstrap-current-context.ts:63`
- **EVIDENCE:** Two `auth()` calls per navigation; bootstrap is `cache()`’d but layout still calls `auth()` first.
- **IMPACT:** MEDIUM
- **FIX:** Single `auth()` inside cached bootstrap; layout uses bootstrap result for redirect.
- **RISK:** LOW if redirects stay equivalent.

### F-03 — Twenty pages re-resolve org via Clerk id

- **FILES:** `policies/[id]/page.tsx` (~54–61), `studio/page.tsx` (~27–35), `preference-center/page.tsx`, `policies/new`, `purposes`, `purposes/[id]`, `vendors`, `vendors/[id]`, `trackers`, `scanner`, `scanner/[scanId]`, `rights-requests`, `rights-requests/[id]`, `audit-logs`, `notifications`, `integrations`, `developers/webhooks`, `settings/organization`, `settings/retention`, `settings/team`.
- **CURRENT:** `auth()` + `SELECT organizations WHERE clerkOrganizationId`.
- **EVIDENCE:** Grep vs pages that already use `requireDashboardContext()`.
- **IMPACT:** HIGH (many routes) / LOW–MEDIUM per query
- **FIX:** `requireDashboardContext()` (already cached). Extra DPDP columns: select by `organization.id`.
- **RISK:** LOW (same tenant scope).

### F-04 — Analytics `updatedAt` without index

- **FILE:** `src/lib/analytics/queries.ts` ~94–95; schema `src/db/schema/consent-records.ts` ~110–117.
- **EVIDENCE:** Predicate vs indexes; prior EXPLAIN used `created_at` index + Filter.
- **IMPACT:** HIGH as data grows
- **FIX:** `(organization_id, updated_at)` index **or** filter `createdAt` if product-correct.
- **RISK:** MEDIUM (migration lock; wrong column changes metrics). Prefer index if `updatedAt` is the product definition.
- **EXPECTED:** Index range scans instead of filter/seq scan at scale.

### F-05 — Home page query volume

- **FILES:** `src/lib/dashboard/home-queries.ts`, `src/components/dashboard/home-sections.tsx`, `src/lib/analytics/queries.ts` mode `"home"`.
- **EVIDENCE:** 9 counts + analytics home aggregations + recent; overlap with setup existence checks.
- **IMPACT:** HIGH on landing
- **FIX:** Use analytics `"charts"` for charts; drop duplicate consent totals; keep Suspense.
- **RISK:** MEDIUM (dashboard numbers must stay consistent).

### F-06 — API sequential auth helpers

- **FILE:** `src/lib/api-auth-helpers.ts` (`resolveLocalUser`, `resolveLocalOrganization`, `resolveActiveMembership`).
- **EVIDENCE:** ~57 routes call them in series (e.g. `src/app/api/monitoring/findings/route.ts` ~18–44).
- **IMPACT:** HIGH for API-heavy UI
- **FIX:** One join (same as bootstrap hot path) or `Promise.all` user+org then membership.
- **RISK:** LOW if membership/role checks unchanged.

### F-07 — Policy detail sequential queries

- **FILE:** `src/app/dashboard/policies/[id]/page.tsx` ~54–177
- **IMPACT:** MEDIUM
- **FIX:** Bootstrap org id; `Promise.all` independent selects; narrower columns.
- **RISK:** LOW

### F-08 — Clerk infinite organization list

- **FILE:** `src/components/dashboard/dashboard-providers.tsx:10-12`
- **IMPACT:** MEDIUM (network after paint)
- **FIX:** First page of memberships only; still `setActive` first org.
- **RISK:** LOW unless users have huge org lists (infinite was fetching all pages).

### F-09 — Google fonts + Turbopack / CSP

- **FILE:** `src/app/layout.tsx:3-17`
- **EVIDENCE:** Runtime/build error `Can't resolve '@vercel/turbopack-next/internal/font/google/font'`; `font-src 'self'`.
- **IMPACT:** HIGH when it fails (app does not boot); MEDIUM for extra fetch
- **FIX:** `next/font/local` or `geist` package.
- **RISK:** LOW (same CSS variables `--font-geist-sans` / `--font-geist-mono`).

### F-10 — Large shared client JS

- **FILES:** `dashboard-shell.tsx`, `sidebar-nav.tsx`, Clerk header in layout
- **EVIDENCE:** First Load JS ~697–759 KB uncompressed
- **IMPACT:** HIGH for INP/hydration
- **FIX:** Server chrome + client islands; dynamic Clerk/sidebar chunks. Do not change behavior of nav/org switcher.
- **RISK:** MEDIUM (layout/hydration)

### F-11 — Unbounded scan_results / org lists

- **FILE:** `src/app/api/scanner/[scanId]/route.ts`; several dashboard list pages
- **IMPACT:** MEDIUM at scale
- **FIX:** Limits / pagination
- **RISK:** MEDIUM (UI may expect full lists for small orgs)

### F-12 — Scanner/monitoring N+1 writes

- **FILES:** `scan-engine.ts`, `scan-schedule.ts`, `process-scan-drift.ts`
- **IMPACT:** MEDIUM on those jobs, not every navigation
- **FIX:** Batch inserts/updates
- **RISK:** MEDIUM (correctness of scan results)

### F-13 — Serverless `max: 1`

- **FILE:** `src/db/index.ts`
- **IMPACT:** MEDIUM on Vercel (parallel SQL becomes serial)
- **FIX:** Modest `max` (e.g. 3–5) within Neon pooler limits; measure connections
- **RISK:** MEDIUM (connection exhaustion)

### F-14 — Missing `loading.tsx`

- **EVIDENCE:** 28 loaders / 61 pages
- **IMPACT:** LOW–MEDIUM UX
- **FIX:** Shared `DashboardPageSkeleton` on high-traffic routes
- **RISK:** LOW

### F-15 — No signed-in production timings

- **EVIDENCE:** 11 Sep audit explicitly had no session
- **IMPACT:** Measurement gap
- **FIX:** Temporary `[PERF]` timers around bootstrap/page queries (no PII); `next start` with a test user
- **RISK:** LOW if logs stay free of emails/tokens

---

## 14. Performance Score

| Area | Score | Explanation |
| --- | --- | --- |
| Server response | 11/20 | Public TTFB excellent; dashboard HTML blocked on auth+DB; APIs extra sequential lookups |
| Database | 10/20 | Pooler-safe client; analytics index mismatch; home query fan-out; some unbounded lists |
| Next.js rendering/caching | 8/15 | Correctly dynamic for tenants; incomplete streaming; `headers()` global (justified) |
| Client rendering | 8/15 | Clerk + full client shell hydrates every dashboard route |
| Bundle efficiency | 5/10 | ~700 KB uncompressed First Load on dashboard |
| Network efficiency | 6/10 | Clerk every request; post-paint notification fetch; SDK no-store |
| Asset optimization | 3/5 | Google fonts vs self-host/CSP; large `globals.css` |
| Production architecture | 3/5 | Vercel+pooler OK; no signed-in dashboard SLO/timings |
| **Total** | **54/100** | **Poor (40–59)** |

Excellent 90–100 · Good 75–89 · Needs Improvement 60–74 · Poor 40–59 · Critical &lt;40

---

## 15. Optimization Plan

Functionality, tenant isolation, and Clerk protection must stay the same. See `PERFORMANCE_FIX_PLAN.md` for file-level steps. Do not implement until that plan is approved.

### Immediate (P0 / high impact, bounded risk)

- Stream dashboard children (skeleton) without removing auth/bootstrap redirects.
- `requireDashboardContext()` on the 20 legacy pages.
- `(organization_id, updated_at)` index **or** align analytics to `created_at` after product confirmation.
- Self-host Geist (`next/font/local` / `geist` package).

### Short-term (P1)

- Collapse API auth to one join or `Promise.all`.
- Slim home: fewer overlapping aggregations.
- Drop Clerk `userMemberships: { infinite: true }`.
- Parallelize policy detail independent queries.

### Medium-term (P2)

- Server shell + client islands; dynamic Clerk/sidebar.
- `loading.tsx` on remaining high-traffic routes.
- Pagination on scan results and large org lists.
- Batch scanner/drift writes.

### Architectural (P3)

- Revisit serverless pool size with Neon limits.
- Optional request-scoped auth context for APIs (still per-request, not global cache).
- Signed-in RUM / `[PERF]` timers then remove them.

### Priority matrix

| ID | Priority | Impact | Effort | Risk |
| --- | --- | --- | --- | --- |
| F-01 Layout stream | P0 | HIGH | MEDIUM | MEDIUM |
| F-03 Page org dedupe | P0 | HIGH | LOW | LOW |
| F-04 Analytics index | P0 | HIGH | LOW | MEDIUM |
| F-09 Local fonts | P0 | HIGH (when broken) | LOW | LOW |
| F-02 Double auth | P1 | MEDIUM | LOW | LOW |
| F-05 Home queries | P1 | HIGH | MEDIUM | MEDIUM |
| F-06 API auth join | P1 | HIGH | MEDIUM | LOW |
| F-08 Clerk infinite | P1 | MEDIUM | LOW | LOW |
| F-07 Policy detail | P2 | MEDIUM | MEDIUM | LOW |
| F-10 Shell JS | P2 | HIGH | HIGH | MEDIUM |
| F-11 Unbounded lists | P2 | MEDIUM | MEDIUM | MEDIUM |
| F-12 N+1 writes | P2 | MEDIUM | MEDIUM | MEDIUM |
| F-13 Pool max | P2 | MEDIUM | LOW | MEDIUM |
| F-14 loading.tsx | P3 | LOW | LOW | LOW |
| F-15 Measure signed-in | P3 | LOW | LOW | LOW |
