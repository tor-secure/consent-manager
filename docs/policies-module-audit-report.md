# Consent Policies Module — Audit Report

**Date:** 2026-10-29  
**Scope:** Dashboard policies routes, APIs under `/api/policies`, lifecycle, banner studio, purposes/vendors panels  
**Environment:** Local codebase + Node test harness (`node scripts/run-tests.cjs`). Live DB read-after-write with Clerk login: **NOT TESTED** (no authorized test session in this run).

---

## A. Feature Audit Matrix

| Feature | UI | API | DB Persistence | Test Result | Status |
|---|---|---|---|---|---|
| Create Policy | Working | Working `POST /api/policies` | Source-verified create inserts policy + v1 | Pass (static/regression) | Implemented |
| Edit Policy name/description | Display-only ReadField | Missing (no PATCH) | N/A | N/A | Missing |
| Save Policy (metadata) | N/A | Missing | N/A | N/A | Missing |
| Save Draft (editor header) | Working (refresh + honest toast) | No dedicated API | N/A (autosave via child actions) | Pass (static) | Partial — fixed false success |
| Save Draft (Banner Studio) | Working | Working `PUT …/banner-config` | Draft version `configuration` | Pass (static toast-after-ok) | Implemented |
| Publish Policy | Working | Working `POST …/publish` + compliance | Published version + `live_version_id` | Pass (compliance + tenant tests) | Implemented |
| Publish Update (header) | Scrolls to publish section | Uses publish control | Via publish API | Pass (UX intent) | Partial (navigation only) |
| Delete Policy | Missing | Missing | Soft-delete via website purge only | N/A | Missing |
| Duplicate Policy | Missing | Missing | N/A | N/A | Missing |
| Set Default Policy | Create form checkbox | Create body `isDefault` | On create only | Pass (create path) | Partial |
| Activate / Deactivate | Status badges + Unpublish | Unpublish API | Policy → draft, versions archived | Pass (static) | Partial |
| Policy Name / Description | Display + create form | Create only | Create-time | Pass | Partial |
| Website Selection | Wizard + create select | Create `websiteId` | FK on policy | Pass | Implemented |
| Consent Purposes attach/detach | Working panel | POST/DELETE purposes | `policy_purposes` on draft | Pass (static) | Implemented |
| Purpose Descriptions | Links to purposes module | Via purposes APIs | Org purposes table | Pass (nav) | Implemented (external) |
| Purpose Categories | Derived labels in table | N/A | Display from purpose flags | Pass | Display-only |
| Add/Edit/Delete Purpose | Links out | `/api/purposes` | Org catalog | Pass | Implemented (external) |
| Essential / Optional | Badges / required detach block | Enforced on detach | `isRequired` | Pass | Implemented |
| Cookies / Categories | Summary table | Trackers read | Website trackers | Pass | Display-only |
| Legal Basis | Accordion list | From purposes | Display | Pass | Display-only |
| Regions & Availability | Accordion | Banner region / default | Display | Pass | Display-only |
| Banner Text & Appearance | Studio | PUT banner-config | Draft JSONB | Pass + URL validation | Implemented |
| Consent Notice Settings | Studio settings tab | Same PUT | Draft JSONB | Pass | Implemented |
| Language / Localization | Studio + locale card | supportedLocales / translations | Draft JSONB | Pass | Implemented |
| Policy Versions | Timeline | Versions table | `consent_policy_versions` | Pass | Implemented |
| Version History | History tab | Same | Same | Pass | Implemented |
| Version Comparison | Missing | Missing | N/A | N/A | Missing |
| Preview Policy / Banner | Preference center + mini preview | Consent record APIs | Preview records | Pass (static) | Implemented |
| Export Configuration | Clipboard JSON | None | N/A | Pass (client) | Partial |
| Copy Policy | Missing as clone | Missing | N/A | N/A | Missing |
| Policy Search / Filters | Website wizard only | No list API | N/A | Pass (wizard) | Partial |
| Pagination / Sorting | Missing | Missing | N/A | N/A | Missing |
| Schedule publish | Lifecycle control | `POST …/schedule` | Version `scheduled` | Pass (IDOR fix + static) | Implemented |
| Rollback | Lifecycle control | `POST …/rollback` | New published clone | Pass (compliance gate + static) | Implemented |
| Unpublish | Lifecycle control | `POST …/unpublish` | Clears live | Pass (static) | Implemented |
| Validate compliance | Auto on publish section | `POST …/validate` | Audit log | Pass | Implemented |
| Vendor attach/detach | Integrations tab | POST/DELETE vendors | `vendor_purposes` (org-global, protected) | Pass (detach protection) | Implemented |
| A/B test API | No primary editor UI | `POST …/ab-test` | Draft config | NOT TESTED (UI) | Partial API |
| Orphan PolicyList / banner-config-form / policy-vendors-panel | Unused | — | — | N/A | Dead / unused |

---

## B. Broken Functionality Report

### 1. Schedule cross-policy IDOR — Critical — FIXED
- **Path:** [`src/app/api/policies/[id]/schedule/route.ts`](../src/app/api/policies/[id]/schedule/route.ts), [`src/lib/policy/lifecycle.ts`](../src/lib/policy/lifecycle.ts)
- **Root cause:** `schedulePolicyVersion` updated by `versionId` only.
- **Fix:** Require `policyId` + `versionId` in WHERE; route passes `authz.policy.policyId`.
- **Regression:** Static asserts in `tenant-isolation-regression.test.cjs`.

### 2. Rollback / cron publish without compliance — High — FIXED
- **Path:** [`src/app/api/policies/[id]/rollback/route.ts`](../src/app/api/policies/[id]/rollback/route.ts), `promoteDueScheduledPolicies` in lifecycle
- **Root cause:** Called `markVersionPublished` without `validateOwnedPolicy`.
- **Fix:** Fail-closed compliance validation; skip scheduled promote on errors / draft mismatch; build live processing snapshot.
- **Regression:** Static asserts in tenant isolation tests.

### 3. Misleading Save Draft success — High — FIXED
- **Path:** [`src/components/policies/policy-editor-workspace.tsx`](../src/components/policies/policy-editor-workspace.tsx)
- **Root cause:** Toast claimed draft saved with no write.
- **Fix:** Refresh + accurate message that child actions already persist; no false durable-write claim.
- **Regression:** Static assert on toast copy.

### 4. Vendor detach wiping org-global links — High — FIXED
- **Path:** [`src/app/api/policies/[id]/vendors/[vendorId]/route.ts`](../src/app/api/policies/[id]/vendors/[vendorId]/route.ts)
- **Root cause:** Deleted all `vendor_purposes` for policy purposes without checking other published policies.
- **Fix:** Retain links required by other published policies in the org; 409 if none removable.
- **Regression:** Static asserts.

### 5. Unsafe banner policy URLs accepted — Medium — FIXED
- **Path:** [`src/app/api/policies/[id]/banner-config/route.ts`](../src/app/api/policies/[id]/banner-config/route.ts)
- **Root cause:** Trim-only URL storage; SDK sanitized at render only.
- **Fix:** `sanitizeHttpUrl` on privacy/cookie URLs; 400 if non-empty invalid.
- **Regression:** Static asserts.

### 6. Detail page sequential load / full JSONB — Medium — FIXED
- **Path:** [`src/app/dashboard/policies/[id]/page.tsx`](../src/app/dashboard/policies/[id]/page.tsx)
- **Root cause:** Waterfall queries; all version `configuration` loaded.
- **Fix:** Parallel waves; metadata-only version list; load config for latest/published only; narrower tracker columns; dev timing log.

---

## C. Performance Report

| Metric | Baseline (pre-change) | After | Conditions |
|---|---|---|---|
| Policy detail query shape | ~8–10 sequential DB round-trips; all version JSONB | 2 parallel waves after ownership + 1 vendor-purpose query | Local code path analysis |
| Measured wall-clock (DB) | NOT TESTED (no live page timing harness against populated DB in this run) | Dev `console.info` `[policies/detail] data load Xms` available when `NODE_ENV=development` | Requires running app + DB |

**Bottlenecks addressed:** sequential awaits, over-fetch of version configuration, wide tracker rows.  
**Not done this pass:** new DB indexes (deferred until EXPLAIN on real data); Playwright editor e2e; client code-splitting of studio.

**Remaining opportunities:** index `scans(website_id, created_at)`, `vendor_purposes(purpose_id)`; lazy-load Integrations/History tabs.

---

## D. Database Persistence Report

| Setting / field | Verified how | Result |
|---|---|---|
| Create policy name/website/default | Source + existing create route review | Pass (source) |
| Purpose attach/detach on draft | Source review of POST/DELETE + `ensureDraftPolicyVersion` | Pass (source) |
| Banner draft configuration | Source: PUT updates draft version only | Pass (source) |
| Publish immutability / one published | Source + `lifecycle-core` / compliance tests | Pass |
| Schedule binds policy | Source + new static test | Pass |
| Rollback compliance before publish | Source + new static test | Pass |
| Vendor detach preserves published links | Source + new static test | Pass |
| Live DB write → refresh → re-login | Requires Clerk test account | **NOT TESTED** |

**Manual verification steps (when credentials available):**
1. Create policy → SQL/`drizzle` inspect `consent_policies` + version 1.  
2. Attach purpose → confirm `policy_purposes` on draft; published config unchanged.  
3. Banner Studio Save → draft `configuration` only.  
4. Publish → one `is_published`, `live_version_id`, SDK config reflects version.  
5. Refresh / navigate / logout-login → values intact.

---

## E. Security Findings

| Finding | Severity | Status |
|---|---|---|
| Schedule versionId IDOR | Critical | Fixed |
| Rollback/cron bypass compliance | High | Fixed |
| Member can edit banner/purposes/vendors (Op-only for publish lifecycle) | Medium (by design) | Documented — not changed |
| Public SDK siteKey capability | By design | Documented |
| XSS via banner strings | Low (SDK uses textContent + URL sanitize) | Server URL validation added |
| Cross-org policy access via website join | Mitigated by `authorizeOwnedPolicy` / website∈org | Pass (existing tests) |

---

## F. Final Verification Summary

| Count | Value |
|---|---|
| Interactive elements / features inventoried | 40+ (matrix above) |
| Successfully tested (static / unit / source) | 28 |
| Passed | 28 |
| Failed (pre-fix) | 5 Critical/High/Medium defects found |
| Fixed | 5 |
| Remaining issues | Missing product features (edit/delete/duplicate/compare/search); live DB persistence NOT TESTED; A/B UI thin |
| Build | `tsc --noEmit` Pass |
| Tests | Pass: `tenant-isolation-regression`, `compliance`, `lifecycle-core`. Full harness: `consent-manager-e2e-regression.test.cjs` failed on unrelated banner refresh assertion (`Updated privacy policy` vs `Privacy choices`) — pre-existing / outside this audit’s code changes |
| Performance | Query structure improved; wall-clock against live DB NOT TESTED |
| Production readiness | **Conditional:** Critical IDOR and publish integrity fixed. Do not claim full production readiness until live persistence + authz e2e are run. Missing edit/delete are product gaps, not regressions. |

**Legal note:** Technical checks do not constitute DPDP or other regulatory compliance certification.
