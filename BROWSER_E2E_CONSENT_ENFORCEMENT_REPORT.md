# Browser E2E consent enforcement report

**Date:** 2026-09-16 (updated after config_hash fix)  
**Environment:** local Next.js on `http://localhost:3000`  
**Test website:** `public/e2e-customer-site.html` loading `/api/sdk/script?siteKey=…` only  
**Site key:** `site_8bff235da012a007a3996e2c02e1085d5a4cf0ffb5e7f7b4` (website “Test”)  
**Browser:** Cursor IDE browser + CDP (Performance resource timing + Runtime)  
**Regression:** `npm test` ✅ · `npx tsc --noEmit` ✅ · `npm run lint` ✅ · `npm run build` ✅

---

# Executive Summary

**Does the CMP actually block non-essential third-party tracking before consent in a real browser?**

## YES (with documented integration limits)

After applying the schema fix, the public config API returns **200**, the SDK initializes with a real published policy, and consent Accept / Reject / Granular / Withdraw / Persistence were proven in a real browser with network evidence.

### BEFORE → AFTER

| Item | BEFORE | AFTER |
| --- | --- | --- |
| `/api/sdk/{siteKey}/config` | **HTTP 500** | **HTTP 200** (~15.9 KB, ETag present) |
| Consent | `UNKNOWN`, empty `websiteId` | Initializes with `websiteId`; choice flows work |
| Accept All | FAIL (no record) | **PASS** — `GRANTED`, `consentId` recorded, analytics+ads reach network |
| Reject All | FAIL | **PASS** — `DENIED`, optional purposes false, all probes blocked, first-party essential OK |
| Granular | NOT VERIFIED | **PASS** — analytics ALLOW, advertising BLOCK (resource timing) |
| Withdraw | NOT VERIFIED | **PASS** — GRANTED→DENIED; analytics blocked after |
| Persistence | FAIL | **PASS** — reload keeps GRANTED, banner hidden |
| Policy version | NOT VERIFIED | **PASS** — SDK moved V1→V2 with new `configHash` |

**Remaining limits (honest):**

1. **Pre-SDK race:** fetch before the SDK script still appears in resource timing. Customer must load CMP first.
2. **Unknown cookies:** names not listed in tracker `cookieNames` (e.g. `ga_probe`) are still allowed by design (essential cookies must keep working). Named `_ga` / `_fbp` are blocked after the cookie-guard fix.
3. **GTM:** not exercised with a live container — Google Consent Mode remains an integration requirement when enabled.
4. **Unknown third-party hosts** stay blocked even after Accept All when `unknownTrackerBehavior=BLOCK` (expected). Only inventoried tracker domains become allowable.

---

# Root cause and fix

## Cause

`drizzle/0056_policy_lifecycle.sql` and `scripts/neon-ensure-schema.sql` both add:

```sql
ALTER TABLE "consent_policy_versions"
  ADD COLUMN IF NOT EXISTS "config_hash" varchar(64);
```

Drizzle schema + `/api/sdk/[siteKey]/config` SELECT `config_hash`. The live DB had **not** applied that migration, so Postgres failed the query → HTTP 500.

`config_hash` is a **deterministic SHA-256** of `{ versionId, configuration, processingSnapshot }` via `hashForPublishedVersion` / `hashPublishedConfig` (`src/lib/policy/lifecycle-core.ts`). Same published config → same hash. Not random, not a timestamp.

## Fix applied

```bash
npm run db:ensure-schema
```

Verified:

- Column `consent_policy_versions.config_hash` exists
- Related lifecycle columns present (`scheduled_publish_at`, `unpublished_at`, `processing_snapshot`, `live_version_id` on policies)
- Published versions all have non-null hashes (`null config_hash count: 0`)
- Unique index `consent_policy_versions_one_published` present
- Drizzle journal stamped (57 migrations)

## Additional product fix

Cookie guard previously only inspected `document` and one `getPrototypeOf(document)` level. In this Chromium/Electron browser, accessors live on `Document.prototype` (depth 2), so the guard never installed.

**Fixed** in `src/lib/sdk/cmp-sdk-script.ts`: walk the full prototype chain before wrapping `document.cookie`.

Browser re-test after fix:

| Cookie | Before consent | Result |
| --- | --- | --- |
| `_ga` | blocked (not in `document.cookie`) | **PASS** |
| `_fbp` | blocked | **PASS** |
| `ga_probe` (unknown) | allowed | expected (not fail-closed) |
| `essential_ok` | allowed | **PASS** |

---

# Config API verification

| Check | Result |
| --- | --- |
| Valid site key | **200**, `websiteId=f666c342-…`, policy version + `configHash` |
| Invalid site key | **404** `Website not found` |
| Other tenant site key | **200** with **different** `websiteId` (no cross-tenant config) |
| Secrets in body | **none** (`sk_live`, Stripe, DB URL, Clerk secret absent) |
| ETag / If-None-Match | **304** with matching hash; `Cache-Control: private, no-store, must-revalidate` |
| Published only | After publishing V2, API returns version **2**; archived V1 not returned |
| Draft | Pre-publish draft V2 was not served (API returned published V1) |

---

# Browser evidence (AFTER)

## First visit (clean CMP storage)

- Config: **200** in ~545 ms, transfer ~15900  
- Consent: `websiteId` set, `state: UNKNOWN`, banner Accept / Reject / Customize  
- Pre-consent probes: analytics/ads/marketing fetch+XHR+beacon **CMP blocked**; blocked URLs **absent** from resource timing  
- Pre-init fetch: still in resource timing (`blockedByCmp: false`) — integration limit

## Accept All

- `consentId: cid_cb1a4664-…`, `state: GRANTED`, all purposes true, `policyVersionId` stored  
- Resource timing after probes: `cmp-e2e-analytics.test` + `cmp-e2e-ads.test` (fetch/XHR/beacon) **present**  
- Unknown marketing/social hosts still **CMP blocked** (`unknownTrackerBehavior: BLOCK`)

## Reject All

- `state: DENIED`, necessary true, analytics/advertising/functional false  
- All category probes blocked; resource list empty for trackers  
- First-party `HEAD /api/sdk/script` → **200**, not CMP-blocked

## Granular (analytics ON, advertising OFF)

- Decisions match  
- Analytics fetch/XHR in resource timing; advertising `CMP blocked fetch`

## Withdraw

- Before: analytics allowed  
- After: `withdrawnAt` set, `state: DENIED`, all probes blocked, banner returns

## Persistence

- Reload after Accept: same `consentId`, `GRANTED`, banner hidden, analytics still allowed  
- Clearing `cmp_*` / `__cmp*` storage: banner returns

## Policy V1 → V2

- Published Test policy V2 with new deterministic hash `0767415c…`  
- SDK local config cache: `version: 2`, matching `configHash`  
- Consent evidence previously tied to V1 `versionId`; after clear+reload visitor sees V2 config (no silent V1 UI with V2-only backend)

---

# REQUIRED TABLE

| Test | Expected | Actual | Evidence | Status |
| --- | --- | --- | --- | --- |
| First visit | Banner | Banner + config 200 | snapshot + resource timing | **PASS** |
| No-consent analytics | Block | CMP blocked; no resource entry | probes | **PASS** |
| No-consent advertising | Block | CMP blocked | probes | **PASS** |
| Fetch | Block | `TypeError: CMP blocked fetch` | probes | **PASS** |
| XHR | Block | aborted `__cmpBlocked` | probes | **PASS** |
| Beacon | Block | `sendBeacon` false | probes | **PASS** |
| Third-party script | Controlled after CMP | Prior audit: `text/plain` quarantine | DOM (prior) | **PARTIAL** (pre-CMP race remains) |
| GTM | Controlled | No container in harness | — | **NOT VERIFIED** |
| Accept All | Allow configured | Analytics+ads in resource timing | CDP | **PASS** |
| Reject All | Block non-essential | All probes blocked; essential OK | CDP | **PASS** |
| Granular | Category-specific | Analytics allow / ads block | CDP | **PASS** |
| Withdraw | Future tracking blocked | Probes blocked after withdraw | CDP | **PASS** |
| Persistence | Persist | Reload keeps GRANTED | CDP | **PASS** |
| Policy update | Correct version | SDK V2 + new hash | API + localStorage | **PASS** |
| GPC | Correct behavior | Not re-run this session | — | **NOT VERIFIED** |
| Jurisdiction | Correct rules | Config returns jurisdiction; multi-geo not re-proven | API fields only | **PARTIAL** |
| API failure | Fail safe | Config healthy; prior fail-closed still valid | — | **PASS** (historical) |
| SDK failure | Fail safe | Page lives | — | **PASS** |
| Named cookies `_ga`/`_fbp` | Block pre-consent | Blocked after prototype-chain fix | CDP | **PASS** |
| Unknown cookie `ga_probe` | Allow (not fail-closed) | Allowed | CDP | **PASS** (by design) |

---

# Architectural limitations

## Browser limitation

- HttpOnly cookies cannot be controlled from JS  
- Cannot undo scripts that already executed  
- Server-side / CNAME tracking out of band

## Integration requirement

- Load CMP SDK **before** marketing tags  
- Inventory tracker domains + `cookieNames` for named cookie blocking  
- Enable Google Consent Mode + configure GTM tags if using GTM  
- Keep `unknownTrackerBehavior` intentional (BLOCK keeps unknown hosts blocked after Accept)

## Product gap

- No first-party Playwright suite in CI yet  
- Unknown cookie names are not fail-closed (intentional tradeoff for essential cookies)

## Bug (fixed this pass)

- Missing `config_hash` column → config 500  
- Cookie guard skipped when accessors are on `Document.prototype`

---

# Customer installation note

```text
CMP SDK in <head> (early)
        ↓
Config loads / fail-closed network guard active
        ↓
Visitor sees banner / consent state
        ↓
Only then initialize analytics/ads tags
```

Tags that fire before the SDK are **not** blocked. That is not claimed as CMP enforcement.

---

# FINAL VERDICT

## 🟡 PARTIAL

Core customer journey is **browser-proven** after the schema fix:

config 200 → SDK config → Accept / Reject / Granular / Withdraw / Persistence / Policy V2 / post-SDK tracker allow-block.

Not 🟢 PRODUCTION VERIFIED because:

- GPC and multi-jurisdiction browser paths were not fully re-proven this pass  
- GTM container enforcement still **NOT VERIFIED**  
- Pre-SDK tracker race remains an integration requirement  
- No automated Playwright job yet

The previous **🟠 NEEDS FIXES** status for “config 500 / consent UNKNOWN” is **resolved**.
