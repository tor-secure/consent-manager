# Database performance

The live database measured on 23 September 2026 has 5 consent records, 5 consent events, and 1 website. Plans below are from `EXPLAIN` (not `EXPLAIN ANALYZE`). With a handful of rows, Postgres prefers a sequential scan even when a useful index exists. That does not mean the index is unused at a larger size.

## What was slow

The home page issued many small statements. On this Neon path each statement cost about 110–140 ms of network time. Nine inventory counts measured **1,007–1,190 ms**. Ten chart statements measured **1,117–1,441 ms**. The SQL itself was cheap at this data size. The shape was the problem:

1. Counts that do not depend on each other were separate statements.
2. The home chart path also aggregated browsers, policy versions, and event types, which the home page does not render.
3. Analytics filtered `updated_at` while the composite index was `(organization_id, created_at)`. `EXPLAIN` showed `updated_at` as a **Filter**, not an index condition, while `organization_id` was the index condition on `consent_records_org_created_idx`.
4. Trend queries joined events through consent records and did not predicate `consent_events.organization_id`.
5. Unscoped analytics added `website_id IN (all of the org’s sites)` on top of `organization_id`. That list grows with sites and fights the organisation index.
6. `consent_policies.website_id` had no index. Postgres does not index the referencing side of a foreign key. Tracker lookups are covered by the unique `(website_id, identifier)` constraint. Policy lookups were not.
7. The notification badge counts unread rows with `organization_id`, `is_read = false`, and user-or-null. Existing indexes are single columns.

Connection pool: `src/db/index.ts` uses `max: 1` on Vercel or Lambda and `max: 10` otherwise, `prepare: false` for the Neon pooler. One connection per instance is why parallel queries still stack in production. The pool was not raised. More connections per instance multiply by the number of instances and exhaust Neon before they help.

## Indexes added

Applied on the connected database, and added to `src/db/schema` plus `scripts/neon-ensure-schema.sql`.

| Index | Query it serves | Why it helps | Tradeoff | Create it |
| --- | --- | --- | --- | --- |
| `consent_records_org_updated_idx` on `(organization_id, updated_at)` | Home bundle and analytics period filters | Turns the 30-day window into an index range per organisation. The created-at index cannot serve `updated_at` | Extra write cost on consent updates, which are the hot write path | Yes. On a large production table, create it with `CREATE INDEX CONCURRENTLY` outside a transaction |
| `consent_events_org_occurred_idx` on `(organization_id, occurred_at)` | Daily choice trends | `consent_events_org_consent_idx` is `(organization_id, consent_id, occurred_at)`. The consent id in the middle blocks an org-wide time range | Extra write cost on every consent event | Yes, same concurrent-create note |
| `consent_policies_website_idx` on `(website_id)` | Policy counts and joins from a site | Removes a sequential scan of all policies when counting an organisation’s sites | Small. Policies are few relative to consent records | Yes |
| `notifications_org_unread_idx` on `(organization_id, user_id) WHERE is_read = false` | Header unread count | Partial index stays small and matches the badge predicate, including org-wide rows (`user_id` null) stored in the index | Slightly more work on insert and on marking read (row leaves the index) | Yes |

Indexes that were considered and not added:

| Idea | Decision |
| --- | --- |
| Expression index on `metadata #>> '{analytics,country}'` | The home query groups by that expression after the org and time filter. The time index cuts the rows first. An expression index is wide, write-heavy, and duplicates a JSON path that can change. Not created |
| `(organization_id, status)` for status counts | `COUNT(*) FILTER (WHERE status = …)` still has to see every row in the org. The organisation index (or the updated-at composite for a window) is the right access path |
| Drop `consent_events_occurred_at_idx` (global `occurred_at`) | It can tempt a plan that starts from all tenants in a time range. Left in place so this change does not take a lock to drop it. Revisit once the org-time index is in use on a larger table |
| Index every foreign key | Only the columns on the measured dashboard path |

After `consent_records_org_updated_idx` existed, `EXPLAIN` on the 5-row table chose a **sequential scan**. Cost was about 1.07. That is the planner being right for a tiny table. Recheck with `EXPLAIN (ANALYZE, BUFFERS)` when an organisation has tens of thousands of rows. Expect an index range scan on `(organization_id, updated_at)` for the 30-day predicate.

## Query changes

- Home inventory counts are one statement. Subqueries are the same counts as before (websites, consent status, trackers, policies, purposes, published versions, vendors, first website, first policy without a published version).
- Home charts scan the organisation’s recent consent rows once (`WITH filtered AS MATERIALIZED`) and aggregate overview, website, country, device, purpose, and daily events from that set. Browser, policy-version, and event-type aggregates are not part of this statement.
- Analytics totals are the sum of the per-website group, so the duplicate ungrouped `count(*)` is gone.
- Consent records page groups by website once for the stat cards and still loads 50 rows ordered by `created_at` under `organization_id`, which matches `consent_records_org_created_idx`.

Pagination already in place: consent list 50, audit log offset pages, notifications 200, scanner runs 100. Offset pagination on audit logs will get expensive once an organisation has a large log. Cursor pagination is the follow-up, not a change made here, because the page is not the current delay.

`COUNT(*)` on consent records is still an index or heap walk of that organisation’s rows. At hundreds of thousands of rows per organisation, keep the 30-second aggregate cache and consider a daily rollup table. Do not `SELECT` the rows into the browser to count them.
