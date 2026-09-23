# Performance audit

Audit date: 23 September 2026. Measurements were taken against the connected Neon database. That database currently holds **5 consent records, 5 consent events, and 1 website**. At that size, query CPU is negligible. The time is network round trips from this machine to Neon, about **110–140 ms each** when statements run one after another.

Browser Web Vitals were not measured. The dashboard requires a Clerk session, so First Contentful Paint, Largest Contentful Paint, Time to Interactive, Total Blocking Time, and Cumulative Layout Shift are **not measured**.

## Stack

| Area | What the code uses |
| --- | --- |
| Framework | Next.js 16.3.4 (App Router), React 19.2.8, TypeScript |
| Frontend | Server Components for dashboard pages. Client islands for search, theme, notification bell, Clerk `OrganizationSwitcher` and `UserButton`. Tailwind CSS 4. React Compiler enabled in `next.config.ts`. |
| Backend | Next.js route handlers and server components. No separate API server. |
| Database | Postgres on Neon (`postgres` driver, Drizzle ORM 0.45) |
| Auth | Clerk (`@clerk/nextjs` 7). `src/proxy.ts` calls `auth.protect()` on dashboard routes. |
| API shape | REST route handlers under `src/app/api`. Dashboard home does not call those routes; it queries Postgres in the server render. |
| Hosting | `vercel.json` cron schedules. `src/db/index.ts` sets the pool to **1 connection** when `VERCEL` or `AWS_LAMBDA_FUNCTION_NAME` is set, otherwise 10. Prepared statements are off for the Neon transaction pooler. |
| External services | Clerk (session), Neon (data), AWS Bedrock (intelligence features), SMTP via nodemailer, Stripe billing, IAB Global Vendor List cron |
| Storage | Postgres JSON columns. No object-storage SDK on the dashboard path. |
| Caching | React `cache()` per request. IAB GVL has a database cache table. No shared cache (Redis) for dashboard aggregates. A 30-second process-local cache was added for home aggregates in this change. |
| Background work | Vercel crons: scans hourly, IAB GVL daily, policy schedule every 5 minutes. No general job queue. |
| Realtime | None. The notification bell fetches unread count once on mount. |
| Build | `next build`. `poweredByHeader` off. Security headers in `next.config.ts`. Compression is Next’s default gzip. |

## Where dashboard time goes

```
Browser
  → Clerk middleware (auth.protect)
  → Dashboard layout: auth() + one local user/org/membership join
  → Setup check (header) and page sections, sharing one DB connection on Vercel
  → Neon
  → RSC render (charts are server-rendered SVG, not a chart library)
  → Client: Clerk widgets + one unread-count request
```

On Vercel the pool size is 1, so `Promise.all` of many queries still runs **one statement at a time** on that instance. Nine small statements cost about nine round trips, not one.

### Measured statement time (Neon, this dataset)

| Work | Statements | Time |
| --- | ---: | ---: |
| Previous home inventory counts | 9, sequential | 1,007–1,190 ms |
| Combined home inventory counts | 1 | 113–136 ms |
| Previous home chart aggregates (including queries the home page does not render) | 10, sequential | 1,117–1,441 ms |
| Combined home chart statement | 1 | 131–138 ms |

Layout bootstrap (one join) and the recent-records query were not timed on their own. Each is a single round trip, so expect on the order of 110–140 ms on this path, not a multi-second scan.

### Home page statement count

| Step | Before | After |
| --- | ---: | ---: |
| Auth bootstrap | 1 | 1 |
| Setup badge | 3 | 1 |
| Inventory counts | 9 | 1 |
| Charts | 10 | 1 |
| Recent records | 1 | 1 |
| **Total DB statements** | **24** | **5** |

Those 24 statements were the loading delay. Skeletons were already in place (`Suspense` around stats, charts, and recent rows) and were not the bottleneck.

## Dashboard component map

| Component | API | DB query | Response size | Measured time | Problem | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| Layout auth | Clerk + server render | 1 join on user, organisation, membership | Small row | Not measured separately | Required. Returning users skip `currentUser()`. | Left as-is |
| Setup badge | Server render | Was 3 `EXISTS`-style lookups | Boolean | Not measured separately (~3 round trips) | Competed for the single production connection | One statement with three `EXISTS` clauses |
| Stat cards | Server render | Was 9 counts | A handful of integers | 1,007–1,190 ms | One round trip per count | One `jsonb_build_object` statement, 30 s org cache |
| Charts | Server render | Was a website list plus overview, website, purpose, event type, trend, country, device, browser, and policy aggregates | Aggregates. Browser, policy, and event-type lists were unused on the home page | 1,117–1,441 ms | Extra scans, and `updated_at` was not the indexed column | One materialized scan of the org’s recent records. Home skips browser, policy, and event-type queries |
| Recent records | Server render | `ORDER BY created_at LIMIT 4` | Was the full `metadata` JSON | Not measured | Extra payload | Selects `email` and `name` only |
| Notification bell | `GET /api/notifications/unread-count` | User, org, membership, then count | `{ count }` | Not measured | Three auth lookups in series | User and org load in parallel. Partial index on unread rows |
| Search | `GET /api/search` | 4 `ILIKE` queries, limit 5, already debounced 220 ms | Up to 20 hits | Not measured | Auth lookups in series. No rate limit | User and org in parallel. 60 requests / 10 s per user and IP |

Calls that are not duplicated on first paint: home counts are shared across the three sections with React `cache()`. Chart analytics run once. The bell is a separate HTTP request after hydration.

Critical data is the auth context and the stat cards. Charts and recent rows already stream behind `Suspense`. They no longer each wait on a long chain of statements.

## Frontend

- Home charts are server SVG components, not a client chart library. No virtualization is needed for four recent rows.
- React Compiler is on. Extra `useMemo` was not added.
- The notification bell’s effect cleans up its abort flag. Search aborts the in-flight request and clears its debounce timer.
- Consent records, audit logs, notifications, and scanner history are already limited (`50`, page size, `200`, `100`). The consent list was filtering with `website_id IN (...)` instead of `organization_id`, which cannot use `(organization_id, created_at)` for the sort.
- Large client bundles were **not measured**. This change does not add client JavaScript.
- Fonts are `next/font` (Geist, Geist Mono), self-hosted by the build. No separate font stylesheet.
- Third-party script on the dashboard is Clerk.

## API and database

Hot filters:

- Home and analytics period filters use `consent_records.organization_id` and `updated_at`. The existing composite index is `(organization_id, created_at)`, so `updated_at` was a filter on top of that index. `EXPLAIN` on the 5-row table showed that. A new `(organization_id, updated_at)` index is in the schema. On 5 rows Postgres still chooses a sequential scan, which is normal. The index is for when the table grows.
- Trend queries did not constrain `consent_events.organization_id`, so the planner could not use an organisation-plus-time index. They do now. Index: `(organization_id, occurred_at)`.
- Analytics no longer adds `website_id IN (every site in the org)` when the user did not pick a site. `organization_id` is the tenant key. A single chosen site is still applied as equality.
- The separate all-rows status count on analytics was the same scan as the per-website group. Totals are summed from that group.
- Consent records page used two full counts plus a limited list. The two counts are one `GROUP BY website_id`, filtered by `organization_id`.

`SELECT *` remains on some settings and editor pages. Those are single-row or small tenant tables, not the dashboard hot path.

## Caching

| Data | Key | TTL | User-specific | Stale OK | Invalidation |
| --- | --- | --- | --- | --- | --- |
| Home inventory counts | `home-counts:{organizationId}` | 30 s | No. Same figures for every member of the org | Yes | Time. Process memory only |
| Home chart bundle | `home-charts:{organizationId}` | 30 s | No | Yes | Time. Process memory only |

The map holds at most 200 entries. It does not cache sessions, permissions, or consent writes. Serverless instances do not share it. A shared cache is the step to take when many instances serve the same organisation. See `SCALABILITY_PLAN.md`.

Not cached: Clerk session checks, membership authorization, consent record writes, exports, rights-request actions.

## Auth

Returning dashboard requests already avoid Clerk’s `currentUser()` network call and use one local join (`bootstrapCurrentContext`). That path was kept.

Search and the unread-count route were doing user lookup, then organisation lookup, then membership. User and organisation are independent and now run together. Membership still runs after, because it needs both ids. Error messages are unchanged.

Tenant isolation stays on `organization_id`. Dropping the redundant “all website ids” list does not widen the tenant.

## Third parties

| Service | Role | Blocks first dashboard paint | Cache | If it is slow |
| --- | --- | --- | --- | --- |
| Clerk | Session and org switcher | Yes. Middleware and layout | Clerk’s own session | Page cannot render until the session is valid |
| Neon | All dashboard data | Yes | 30 s for home aggregates only | This was the measured delay |
| AWS Bedrock | Intelligence tools | No | Existing fingerprint cache in that feature | Not on the home path |
| SMTP | Mail | No | No | Sent inside the request that triggers mail. Not moved to a queue in this change |
| Stripe | Billing card | No. Client fetch on the billing card | No | Not on the home path |
| IAB GVL | Vendor list | No. Cron | `iab_gvl_cache` table | Not on the home path |

## What was not slow

- Missing skeletons. They already exist and stream.
- Client-side sorting of the full consent table. The list is limited to 50.
- A chart library in the browser bundle.
- WebSocket leaks. There are no dashboard sockets.

## Security notes on the changes

- Home cache keys are organisation ids, not user ids. The payload is the same aggregate the page already showed to every member.
- Consent and analytics queries still require the dashboard context and `organization_id`.
- Search is rate limited. Other public abuse limits (consent record, rights request, SDK) were already present.
- Indexes do not change which rows a query can see.
