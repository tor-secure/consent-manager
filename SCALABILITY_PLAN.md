# Scalability plan

Registered users are not concurrent users. Plan for the request rate of people who are actually in the dashboard or calling the SDK, plus consent writes from visitors’ browsers.

The expensive dashboard path is now a handful of aggregate statements per organisation, with a 30-second in-process cache. Consent **writes** (`POST /api/consent/record`) stay on the request path and will be the first production limit, not the home page read.

## Load shape

Assume a dashboard session hits about 6 requests in the first few seconds (document, a few RSC payloads, unread count) and then is mostly idle. SDK consent posts are the steady write load and scale with visitor traffic, not with staff sitting in the dashboard.

| Stage | Concurrent dashboard users | Order of magnitude | First limit to watch |
| --- | ---: | --- | --- |
| 1 | 100 | Low tens of requests/s if they all load at once, then quiet | Neon round trip and Clerk |
| 2 | 1,000 | Bursts of low hundreds of requests/s | Neon pooler connections (instances × pool size 1) |
| 3 | 10,000 | Needs more than one app instance and a shared cache | Write rate on `consent_records` / `consent_events`, pooler limits |
| 4 | 100,000 registered | Concurrent dashboard users still a fraction. SDK traffic dominates | Write throughput, storage, aggregate rollups |

Do not buy a larger database for the current 5-row dataset. The measured problem was round trips, which the query merge addresses.

## How to scale each stage

**100 concurrent.** One Vercel (or single Node) instance and the Neon pooler, pool size 1 per serverless instance. Home aggregates are one statement plus the 30-second cache. This is enough.

**1,000 concurrent.** More than one instance. The in-process cache does not coordinate them, so a cold instance still hits Neon. Add a shared cache (Neon is not a cache) for `home-counts` and `home-charts` with the same 30-second TTL and the same organisation key. Keep pool size 1 per instance so connection count tracks instance count, not instance count × a large pool.

**10,000 concurrent.** Put the app behind the host’s load balancer (Vercel already does this). Serve static assets from the platform CDN. Cache only the aggregate keys above. Move mail, large exports, and scan work fully off the request (scans and policy publish scheduling are already crons). Add a rollup table for daily consent counts per organisation if a single organisation’s `COUNT` over raw rows exceeds a few hundred milliseconds in `EXPLAIN ANALYZE`.

**100,000 registered.** Partition or range-archive `consent_events` by month if storage or vacuum becomes the issue. Keep reads on aggregates. SDK writes stay tenant-scoped and rate limited. Horizontal app instances, one writer pooler, read replicas only if aggregate reads show up in database CPU after the cache is shared.

## Rate limits

Already present on consent record, withdraw, SDK config, rights requests, and several mutation routes. Added for dashboard search: **60 requests per 10 seconds** per Clerk user and client IP. That sits above the 220 ms debounce (a person typing stays under it) and stops a scripted `ILIKE` loop.

Suggested limits that are not all implemented as new code (public auth routes are Clerk-hosted):

| Endpoint | Limit | Reason |
| --- | --- | --- |
| Clerk sign-in / sign-up | Clerk’s own controls | Do not reimplement login |
| `GET /api/search` | 60 / 10 s per user + IP | Implemented |
| `GET /api/analytics/consent` and export | Already limited in those routes | Expensive aggregates |
| `POST /api/consent/record` | Already limited per IP | Visitor write path |
| Scanner run, intelligence, Bedrock | Already limited | External latency and cost |
| Rights-request and OTP-style verify routes | Already limited | Abuse |

## Background work

Keep these off the dashboard request, as they already are when invoked by cron:

- Website scans (`/api/cron/scans`)
- IAB vendor-list refresh (`/api/cron/iab-gvl`)
- Scheduled policy publish (`/api/cron/policies`)

Still inside the user request, and the right candidates for a queue once volume justifies a worker (no new queue dependency was added):

- SMTP sends
- Rights-request exports and PDF generation
- Bedrock intelligence runs
- Large analytics CSV exports

A Postgres-backed queue is enough at stage 2. A separate worker service is justified when those jobs make request latency or Neon CPU spike. Do not add Redis only for email at the current size.

## Load tests

Run these against a staging database that has been copied up in size, not against the 5-row production-shaped database. The 5-row numbers only measure round trips.

Tooling: any HTTP load generator that can hold a Clerk session cookie or a test bypass you already trust in staging. Do not disable auth in production to make the test easier.

| Test | Concurrent users | Hold |
| --- | ---: | --- |
| 1 | 100 | 5 minutes, mix of `GET /dashboard` and idle |
| 2 | 500 | 5 minutes |
| 3 | 1,000 | 5 minutes |
| 4 | 5,000 | 5 minutes, only after tests 1–3 stay within the error budget |

Record requests/s, average, p50, p95, p99, HTTP error rate, Neon CPU, Neon connections, app CPU, memory, and home-cache hit rate (log it before the 1,000-user test; the process-local cache will show a low hit rate once many instances are cold).

Stop at the first of: p95 dashboard document over 2 s, error rate over 1%, or Neon connections at the pooler cap. That resource is the bottleneck to fix before the next test. Expect connections or Clerk, not JavaScript bundle size, to show up first.

## Security while scaling

- Cache only org-level aggregates. Do not cache membership or consent payloads in a shared cache without the organisation id in the key.
- Keep `organization_id` on every read and write. The removed `IN (all website ids)` clause was not the tenant boundary.
- Rate limits stay in front of search and public write APIs.
- Do not turn off Clerk middleware to save a hop.
