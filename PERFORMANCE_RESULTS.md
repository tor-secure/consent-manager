# Performance results

Measured 23 September 2026 against the project’s Neon database.

Dataset at measurement time: **5 consent records, 5 consent events, 1 website**. At that size the planner’s cost is about 1. The clock time is the round trip to Neon.

Browser Web Vitals and JavaScript bundle size were **not measured**. The dashboard is behind Clerk, and this change does not add client JavaScript.

| Metric | Before | After | Improvement |
| --- | ---: | ---: | ---: |
| Initial page load (browser) | Not measured | Not measured | — |
| Home inventory counts | 1,007–1,190 ms, 9 sequential statements (3 samples, two runs) | 113–136 ms, 1 statement (3 samples, two runs) | About 8–9× less time, ~0.9–1.0 s |
| Home chart aggregates | 1,117–1,441 ms, 10 sequential statements | 131–138 ms, 1 statement (3 samples) | About 8–10× less time, ~1.0–1.3 s |
| Home DB statements (layout + page) | 24 | 5 | 19 fewer statements |
| `EXPLAIN` for org + `updated_at` | Index `(organization_id, created_at)`, `updated_at` applied as a filter | New index `(organization_id, updated_at)` exists. On 5 rows the plan is still a sequential scan (cost ~1.07) | No latency change at this size. The index is for a larger table |
| JS bundle | Not measured | Not measured | No client bundle change |
| API payload | Not measured in bytes | Home chart statement no longer builds browser, policy-version, or event-type breakdowns | Those lists are omitted on the home path |
| Dashboard render (browser) | Not measured | Not measured | Server work above is what the render was waiting on |

The “before” chart timing re-ran the previous statement pattern (website list, status count, website group, purposes, event types, trends, country, device, browser, policy version) against the same database. It is not a production APM trace.

The “after” chart timing ran the single materialized statement the home page now uses (overview, websites, countries, devices, purposes, trends). It returned a payload.

Indexes created on that database during the measurement:

- `consent_records_org_updated_idx`
- `consent_events_org_occurred_idx`
- `consent_policies_website_idx`
- `notifications_org_unread_idx`

`npx tsc --noEmit` completed with exit code 0. `node --test src/lib/dashboard/home-performance.test.cjs` passed.

The signed-in dashboard was not clicked through in a browser. There is no session available in this environment to load `/dashboard`.
