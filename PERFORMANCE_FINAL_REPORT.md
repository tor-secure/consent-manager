# Performance final report

## 1. Executive summary

The dashboard was slow because opening it ran about **24 Postgres statements**, and on Vercel those statements share **one connection**. Against Neon, each statement on the current database costs roughly **110–140 ms** of network time even when the query only counts a few rows. Nine inventory counts measured **1.0–1.2 s**. Ten chart statements measured **1.1–1.4 s**. The page already had skeletons; the wait was the database round trips, not a missing spinner.

Home inventory counts are now **one statement (113–136 ms)**. Home charts are **one statement (131–138 ms)**. The setup badge is one statement instead of three. The production pool size was left at 1 so serverless instances do not multiply Neon connections.

## 2. Top bottlenecks

1. **Many sequential round trips** for counts and charts. This was the measured delay.
2. **Home charts computed browser, policy-version, and event-type breakdowns** the home page never renders.
3. **`updated_at` filters did not match the composite index**, which is on `created_at`. Harmless at 5 rows, wrong at large volume.
4. **Trend queries did not filter `consent_events.organization_id`**, so an organisation-and-time index could not be used.
5. **Pool size 1 on Vercel** makes `Promise.all` serial. Fixed by fewer statements, not a larger pool.
6. **Clerk** still runs before any of this. That hop was not removed.

## 3. Fixes implemented

- `src/lib/dashboard/home-queries.ts` — inventory counts and the setup check are each one SQL statement. Counts and charts are cached 30 seconds per organisation in process memory (200 entry cap).
- `src/lib/analytics/home-bundle.ts` — one materialized read for the home charts.
- `src/lib/analytics/queries.ts` — home mode uses that statement. Analytics no longer counts every row twice, no longer filters `website_id IN (all sites)` unless one site is selected, and trends include `consent_events.organization_id`.
- `src/lib/ttl-cache.ts` — bounded in-process TTL map.
- `src/app/dashboard/consent/page.tsx` — one grouped count by website, filtered by `organization_id`, list still limited to 50 and ordered by `created_at`.
- `src/components/dashboard/home-sections.tsx` — recent rows read email and name, not the whole metadata document.
- `src/app/api/search/route.ts` — user and organisation lookups in parallel. 60 requests per 10 seconds per user and IP.
- `src/app/api/notifications/unread-count/route.ts` — user and organisation lookups in parallel.
- Indexes in schema and `scripts/neon-ensure-schema.sql`, and created on the connected database: `consent_records_org_updated_idx`, `consent_events_org_occurred_idx`, `consent_policies_website_idx`, `notifications_org_unread_idx`.

Business copy, stat definitions, and the streamed skeleton layout are unchanged. Home chart numbers are the same aggregates as before, without the unused breakdowns.

## 4. Database improvements

See `DATABASE_PERFORMANCE.md`. Short version: fewer statements, organisation-scoped filters, and four indexes that match those filters. The 5-row `EXPLAIN` still sequential-scans, which is expected. Re-check the plan when an organisation has a real history.

## 5. Frontend improvements

No new client bundle and no new loading animation. The home page already streams stats, charts, and recent rows independently. Each of those sections now waits on one statement (or the 30-second cache) instead of a chain. Recent rows transfer two metadata fields. Search was already debounced and aborted on cleanup.

## 6. Backend improvements

Dashboard home reads are aggregate SQL, not “load rows and count in the client”. Independent auth lookups on search and the notification badge overlap. The single-connection production pool is respected by reducing statement count. A 30-second org-level cache absorbs repeat opens of the home page on the same instance.

## 7. Scalability architecture

```
Visitors and staff
        │
        ▼
   CDN / platform edge  (static assets, Next.js)
        │
        ▼
   Clerk session check
        │
        ▼
   Next.js server (pool size 1 per instance)
        │
        ├── process cache, 30 s, org aggregates
        │         (shared cache when instance count grows)
        ▼
   Neon pooler  →  Postgres
        │
        ├── crons: scans, IAB GVL, scheduled publish
        ▼
   Clerk, Bedrock, SMTP, Stripe
   (only the feature that needs them)
```

Detail, rate limits, and the four load-test steps are in `SCALABILITY_PLAN.md`. Capacity by stage is in `CAPACITY_PLAN.md`.

## 8. Load testing plan

Do not load-test the 5-row database and treat it as capacity. Use staging data with a realistic consent history. Run 100, then 500, then 1,000, then 5,000 concurrent users, five minutes each. Record p50/p95/p99, error rate, Neon CPU, and connections. Stop when p95 of the dashboard document exceeds 2 seconds, errors exceed 1%, or the pooler is out of connections. Full steps are in `SCALABILITY_PLAN.md`.

## 9. Monitoring

| Signal | Where to look |
| --- | --- |
| Dashboard server time | Platform request logs for `/dashboard`, p95 |
| Statement time | Neon query insights for the home aggregate and `consent_records` inserts |
| Errors | Application logs (existing logger) and platform 5xx |
| Request rate | Platform metrics, split dashboard vs `/api/consent/record` |
| CPU and memory | Platform instance metrics |
| Database connections | Neon pooler |
| Cache hit rate | Not emitted yet. Log hits on `readTtlCache` before the 1,000-user test |
| Queue length | Not applicable until a worker exists. Cron failure is the current signal |
| Web Vitals | Add platform or browser RUM on `/dashboard` when a signed-in session can be measured |
| Failed Clerk or Neon calls | Existing error paths in bootstrap and the health ready route |

## 10. Remaining risks

- **Clerk latency** is still on the critical path and was not measured here.
- **In-process cache** misses whenever a different serverless instance handles the next request. Share it when you run more than one warm instance.
- **Analytics page** still runs several aggregate statements (overview and breakdowns are separate, on purpose, so the page can stream). They are fewer than before, and they use the new filters, but they are not one statement.
- **Five-row plans** do not prove the new indexes are chosen. Confirm with `EXPLAIN (ANALYZE, BUFFERS)` after real volume.
- **Audit log offset pagination** will degrade on large histories. The page is already limited; cursor pagination is future work.
- **Mail, exports, and Bedrock** still run inside the request that triggers them.
- **Global `consent_events.occurred_at` index** can still attract a bad plan. It was not dropped.
- **Browser timings** (FCP, LCP, INP, bundle KB) were not collected. Server statement time was.
