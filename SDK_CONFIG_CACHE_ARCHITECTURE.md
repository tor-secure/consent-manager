# SDK configuration cache

## 1. Current problem

`GET /api/sdk/[siteKey]/config` rebuilt the public consent configuration from PostgreSQL on every request. The response was `Cache-Control: private, no-store`, and the browser SDK fetched it with `cache: "no-store"`. A warm serverless isolate and a repeat page view both paid for the full policy, purpose, vendor, and tracker reads.

## 2. Previous request flow

```text
Customer website
  → Consent SDK
  → GET /api/sdk/{siteKey}/config
  → PostgreSQL (website, policy, published version, purposes, vendors, trackers, org, GVL)
  → JSON response (no-store)
```

The handler lived in `src/app/api/sdk/[siteKey]/config/route.ts`. It already ignored draft versions: only `consent_policy_versions.is_published = true` was eligible, and the highest version number for the selected policy was used. Policy-context HMAC tokens were minted inside that same request (`issuePolicyContext`, 30 minute TTL, new `contextId` each call). There was no Redis client and no `unstable_cache` on this route. The only process cache (`src/lib/ttl-cache.ts`) was for dashboard aggregates, not SDK config.

## 3. New request flow

```text
Customer website
  → Consent SDK (fetch cache: "no-cache", revalidate with the server)
  → GET /api/sdk/{siteKey}/config
  → in-process admission limit
  → published-config cache
       hit  → origin check → JSON (no PostgreSQL)
       miss → PostgreSQL rate-limit + published config build → store → origin check → JSON
```

Draft rows are not written to the cache. A cache entry is accepted only when `published === true` and the body policy says `isPublished: true`.

## 4. Cache technology

There is still no Redis in this application. `next.config.ts` does not set `cacheHandlers` or `incrementalCacheHandlerPath`. `vercel.json` only declares cron paths.

Two layers are used:

| Layer | Where | Role |
| --- | --- | --- |
| Next.js `unstable_cache` | `src/lib/sdk/config-cache-next.ts` | Request-scoped incremental cache when Next.js provides one. Tag `sdk-config:{siteKey}`, revalidate 60 seconds |
| Process memory | `memorySdkConfigStore` in `src/lib/sdk/config-cache.ts` | Used when that cache throws. Also the store the unit tests exercise |

`unstable_cache` reads `workStore.incrementalCache`, or `globalThis.__incrementalCache`. Next 16.3.4 (`node_modules/next/dist/server/lib/incremental-cache/index.js`) uses a platform `FetchCache` only when `globalThis[Symbol.for('@next/cache-handlers')].FetchCache` is already installed. This repository never installs that handler. Otherwise it uses the filesystem cache when a server directory exists. The Next 16 caching guide says the default runtime store is per-instance memory and that serverless entries typically do not persist across requests or instances (`node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`, `cacheHandlers.md`).

What this deployment can guarantee:

1. Inside one Node process, a cache hit does not call the loader, and concurrent misses for one key share one loader.
2. `revalidateTag(tag, { expire: 0 })` is queued on the current Next.js request store. The publish, rollback, unpublish, and scheduled-promote paths await that call before they return. Next.js documents `{ expire: 0 }` as "the next request is a blocking revalidate" (`revalidateTag.md`). The call itself only records `pendingRevalidatedTags`; it does not reach other machines by itself.
3. A cold isolate with no incremental cache throws from `unstable_cache`. The route treats that throw as a cache failure, builds once from PostgreSQL, and keeps the result in that process for 60 seconds.
4. Nothing in this repo makes two Vercel isolates share one cache entry or one single-flight lock. Several isolates can each query PostgreSQL for the same key at the same time.

That cross-instance gap is a remaining limitation. Redis was not added in this task.

`CDN-Cache-Control: no-store` is set on the response. A public CDN cache is not safe: the origin allowlist must run on every request, and country/region often come from request headers rather than the URL. A shared edge entry would mix tenants' visitors or skip the origin check.

Browser `Cache-Control` is `private, no-cache`. The browser must revalidate. The server can answer that revalidation from the published-config cache. The SDK was not switched to `force-cache`, because a publish has to be visible on the next request that reaches the origin.

## 5. Cache key

```text
sdkcfg ␟ v1 ␟ {siteKey} ␟ {locale} ␟ {country} ␟ {region} ␟ {gpc}
```

`␟` is the ASCII unit separator. Each text part is URL-encoded.

| Part | Source |
| --- | --- |
| siteKey | Path. Globally unique. Implies one website and one organization |
| locale | `lang` query, otherwise the first `Accept-Language` tag |
| country | `country` query, otherwise the geo country header |
| region | `region` query, otherwise the geo region header |
| gpc | `Sec-GPC`: `absent`, `valid_1`, or `invalid` |

A/B variant is not a key dimension. The published payload already contains every variant, and the browser assigns one. The stored entry also keeps `organizationId`, `websiteId`, and `policyVersionId`. A read is discarded if the entry's `siteKey` does not match the request.

The published policy version is not part of the lookup key. It is unknown until the database is read. Publish deletes the site's entries, so the next miss rebuilds version N+1 under the same visitor key.

## 6. TTL

60 seconds (`SDK_CONFIG_CACHE_TTL_MS` and the Next.js `revalidate: 60`).

Publishing is the activation boundary for policy content. Purpose links are written onto a draft version (`ensureDraftPolicyVersion`). The public loader reads only `isPublished = true`. A scheduled version stays unpublished until `promoteDueScheduledPolicies` calls `markVersionPublished`. Scheduling itself does not invalidate the cache. Activation does.

These fields are read live and are not frozen inside the published version snapshot, so they are invalidated when they are written, rather than waiting 60 seconds:

- active tracker rows (create, update, archive, map, classify, scan completion, autopilot apply/restore, digital-twin restore)
- organization grievance and DPO fields
- negotiation offers
- website language, region, consent integrations, IAB registration, child-protection config, and domain verification
- purpose and vendor rows, and vendor-purpose links
- the official GVL, after the daily cron or a manual sync (every website tag, because the catalog is global)

Policy-context and age-context tokens inside a cached body are minted when the entry is built. `publicChildSnapshot` is called without a consent id, and `loadLatestSession` returns null in that case, so the cached age view is the site default rather than one visitor's session. Token lifetime is 30 minutes, so a 60 second cache does not serve an already expired token. Visitors who receive that entry share its `contextId` until the entry expires or the site is invalidated. Those tokens are not single-use.

## 7. Invalidation strategy

Targeted by site key, not a global flush, except the GVL sync which touches every website because the vendor list is global.

`markVersionPublished` and `unpublishPolicy` await `invalidateSdkConfigCache`. That covers:

- `POST /api/policies/[id]/publish`
- `POST /api/policies/[id]/rollback` (it publishes the cloned version through `markVersionPublished`)
- `POST /api/policies/[id]/unpublish`
- the scheduled-policy cron (`promoteDueScheduledPolicies` calls `markVersionPublished` only for versions whose `scheduledPublishAt` is due)

`schedulePolicyVersion` does not invalidate. The previously published version stays in cache until it expires or a publish/rollback/unpublish runs.

Invalidation clears the process map for that site, drops the cached reader, and calls `revalidateTag("sdk-config:{siteKey}", { expire: 0 })` on the current request store. The next request on a store that honors that tag is a miss and loads the new published version. A draft is never inserted. A 404 for an unpublished site is not stored, so the following request asks PostgreSQL again.

Live writes call `invalidateSdkConfigForWebsite` or `invalidateSdkConfigForOrganization` in `src/lib/sdk/invalidate-site-config.ts` after the database update succeeds. A failure to purge the cache is logged and does not fail the admin write.

## 8. Failure behavior

If the shared cache read or write throws, the request does not retry the cache. The handler builds from PostgreSQL once for that key, stores the result in process memory, and later requests on that isolate reuse the memory entry while the shared cache is still failing. Concurrent misses for the same key share one build (single-flight). There is no retry loop.

A build that returns 404 (unknown site, or no published version) is not cached.

## 9. Security and tenant isolation

- The cache key starts with the site key. Two sites never share an entry. The entry records `organizationId` and `websiteId` from the database row, not from the client.
- `sdkOriginGuard` runs on every response, including cache hits, using the cached domain and verification flag. A hit does not skip the origin check.
- Only a published version is stored. The loader filters `isPublished = true` and then keeps the highest version for the selected policy.
- Locale, country, region, and GPC are part of the key, so one visitor's jurisdiction or GPC signal is not served to another.
- The cached JSON is the same public payload the handler already returned. It is passed through `JSON.stringify` before it is stored.

## 10. Testing

`src/lib/sdk/config-cache.test.cjs` covers:

- hit: second load does not call the loader
- miss: first load calls the loader once and stores the entry
- site and organization separation
- locale, country, region, and GPC keys differ
- unpublished payloads are rejected
- publish v1, cache v1, publish v2 after invalidation returns v2
- a not-yet-activated scheduled version leaves the cached published version in place
- rollback invalidation returns the replacement version
- unpublish returns 404 and does not cache that 404
- an entry whose site key does not match the request is not served
- an organization change for the same site key is invisible until that site is invalidated, then the new organization is loaded
- A/B variants both remain in the cached body; the cache key has no variant dimension
- the config route calls `sdkOriginGuard` after `loadSdkConfig`
- 25 and 100 concurrent misses call the loader once
- 100 concurrent hits call the loader zero times
- a store that throws falls back to one database build, including 100 concurrent callers, then serves memory

`src/lib/consent-manager-e2e-regression.test.cjs` `testPublishedPolicyRefresh` fails on the current tree and on `HEAD`'s SDK script. See the validation report. The harness fetch ignores the `cache` option, and the only SDK script diff versus `HEAD` is `no-store` to `no-cache` plus removal of the `Pragma` request header. The refresh branch that repaints an open banner is the same on both versions.

## 11. Performance measurements

### Cache behavior benchmark

Measured by `src/lib/sdk/config-cache.test.cjs` on this machine (Node, Windows). The stand-in for a database build is `setTimeout(8)`. That is not PostgreSQL and not a production requests/sec figure. The log line is `SDK_CONFIG_CACHE_BEHAVIOR_BENCH`.

The latest run of that stand-in, on this Windows machine, recorded:

| Path | Samples | P50 | P95 | P99 | Loader calls |
| --- | --- | --- | --- | --- | --- |
| Uncached simulated build | 40 | 15.530 ms | 17.439 ms | 18.413 ms | 1 per request |
| Cache miss (one simulated build) | 1 | 15.292 ms | — | — | 1 |
| Cache hit | 100 | 0.0033 ms | 0.0096 ms | 0.0292 ms | 0 |

Hit ratio for that 101-request run (1 miss + 100 hits): **0.9901**. The Windows timer resolved `setTimeout(8)` at about 15–18 ms.

The same file also ran:

- 100 concurrent hits after one fill: loader calls stayed at 1 (the fill). The 100 hits added 0.
- 100 concurrent requests on a cold key: 1 loader call, max in-flight builds 1.
- 100 concurrent requests while the store throws, then 20 more: 1 loader call. Later requests used process memory.

### Real production performance

Not tested. No Neon timing, no Vercel concurrency, and no requests/sec capacity was measured.

## 12. Remaining limitations

- Next.js `unstable_cache` is not a cross-instance store in this repo. Two serverless isolates can both miss and both query PostgreSQL. Single-flight is per process.
- `revalidateTag` only records tags on the current request store. An invalidate that runs without that store clears process memory and still depends on the 60 second TTL for any other isolate.
- Cached policy-context tokens are reused for up to 60 seconds.
- The website PATCH route does not change `domain` or `siteKey`. Verification changes invalidate the site. There is no website-deactivation write in the routes that were inspected; a status change added later would need the same invalidation.
- Hit-path admission control is the existing in-process limiter. The PostgreSQL rate-limit upsert runs only when the config itself is built. Distributed rate limiting was intentionally left alone.
- Public CDN caching is intentionally off.
- The cache behavior benchmark does not measure Neon latency or Vercel concurrency.
