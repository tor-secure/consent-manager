# Capacity plan

Figures are for dashboard and SDK traffic on the current Next.js + Neon + Clerk design. They are planning numbers, not a benchmark of 100,000 users. The only measured load is the statement timing in `PERFORMANCE_RESULTS.md` (5 consent records).

“Expected load” is a burst if that many people open the dashboard together, not a sustained average. Most of the time, concurrent users are a small slice of registered users.

| Users | Expected load | Infrastructure | Database | Cache | Queue |
| --- | --- | --- | --- | --- | --- |
| 100 concurrent | Short burst under ~50 requests/s, then idle | One app deployment (Vercel or a single Node process). Pool size 1 per serverless instance | Neon pooler, current size. Home page is 5 statements, two of them cached 30 s | In-process 30 s aggregate cache | None. Existing crons cover scans, GVL, and scheduled publish |
| 1,000 concurrent | Burst of a few hundred requests/s | Same app, more instances. Still pool size 1 so connections ≈ instances | Neon pooler one tier up only if connection count or CPU says so. Watch `consent_records` writes from the SDK, not the home read | Shared cache (one small Redis or the platform KV) for the two home keys. Same 30 s TTL | Still crons. Add a Postgres job table only if mail or exports show up in request traces |
| 10,000 concurrent | Sustained hundreds of requests/s plus SDK writes | Platform autoscaling and the default CDN for static assets | Neon (or equivalent) sized from the load test, not from this table. Daily rollup if a single org’s raw `COUNT` is slow | Shared cache required. Do not rely on per-instance memory | Worker for exports, mail, and Bedrock. Scans stay on cron |
| 100,000 registered | Concurrent dashboard users far below 100,000. SDK consent posts dominate | Horizontally scaled app. No dedicated shard until one tenant’s write rate requires it | Retention and monthly archive for `consent_events` if storage grows. Read replicas only after the shared cache is in place and database CPU is still high | Shared cache for aggregates. No cache for consent writes | Workers for exports and notifications. Consent capture stays synchronous so the visitor gets a receipt |

Do not start at the 100,000-user row. The application can serve the current team on one deployment. Move down the table when a load test or production metric hits the limit named in `SCALABILITY_PLAN.md`.
