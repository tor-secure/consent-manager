# Banner Studio Functional Audit Report

**Date:** 2026-10-29  
**Scope:** Banner Studio UI (`/dashboard/policies/[id]/studio`), `PUT /api/policies/[id]/banner-config`, draft → publish → SDK `bannerConfig` path  
**Method:** Code inventory, static control→persistence mapping, targeted fixes, Node regression tests (`banner-studio-regression.test.cjs`). Authenticated Playwright UI E2E and live DB round-trip: **NOT TESTED** (no Studio auth fixture / production DB used).

---

## 1. Complete Feature Audit

| Feature | Control | Preview | Saving | Publishing | Result |
|---|---|---|---|---|---|
| Presets (20) + All/Layout/Look/Region filters | Pass | Pass (state→renderer) | Pass (merged into draft PUT) | Partial (draft only until policy publish) | **Pass** (static + unit) |
| Layout type / position / radius / overlay / block scroll | Pass | Pass | Pass | Partial | **Pass** |
| Width / height / typography / shadows / hover editors | Missing | Missing | Missing | Missing | **Missing** (not in schema) |
| Branding colors (primary / text as secondary / background) | Pass | Pass | Pass | Partial | **Pass** |
| Independent button color field | Missing | Missing | Missing | Missing | **Missing** |
| Text labels + preference center copy | Pass | Pass | Pass | Partial | **Pass** |
| Translation packs UI | Missing in Studio | Partial (locale switch in preview) | Pass (API accepts) | Partial | **Partial** |
| CCPA Do Not Sell/Share, GPC, Limit SPI | Pass (restored) | Pass (config fields) | Pass | Partial | **Pass** (fixed) |
| poweredByText / closeLabel | Pass (restored) | Pass | Pass | Partial | **Pass** (fixed) |
| Preview URL / iframe / mock fallback | Pass | Pass | N/A | N/A | **Pass** (static) |
| Banner ↔ Preferences surfaces | Pass | Pass | N/A | N/A | **Pass** |
| Desktop ↔ Mobile viewport | Pass | Pass | N/A | N/A | **Pass** |
| Customize → Preferences | Pass (wired) | Pass | N/A | N/A | **Pass** (fixed) |
| Accept / Reject / Close in preview | Pass (local dismiss) | Pass | N/A (no consent API) | N/A | **Pass** (fixed) |
| Save draft | Pass | N/A | Pass after `data.success` | Does not publish | **Pass** |
| Dirty leave warning | Pass | N/A | N/A | N/A | **Pass** (fixed) |
| In-studio Publish | Partial (link to policy) | N/A | N/A | Via policy lifecycle | **Partial** (by design) |
| Unsaved Publish bypass | N/A | N/A | N/A | Blocked by policy gates | **Pass** (static) |
| Live DB read-after-write | — | — | — | — | **NOT TESTED** |
| Authenticated Playwright Studio E2E | — | — | — | — | **NOT TESTED** |
| Publish → SDK config smoke (staging) | — | — | — | — | **NOT TESTED** |

### Preset inventory (Implemented)

`bottom-bar`, `top-bar`, `center-modal`, `bottom-sheet`, `floating-left`, `floating-right`, `navy-brand`, `teal-accent`, `dark-modal`, `high-contrast`, `soft-card`, `minimal-bar`, `compact-corner`, `gdpr-standard`, `us-opt-out`, `dpdp-dialog`, `uk-notice`, `cookie-wall`, `midnight-bar`, `sand-sheet`.

### Dead / unused

- [`src/components/policies/banner-config-form.tsx`](../src/components/policies/banner-config-form.tsx) — unused; CCPA toggles were only here before this audit restored them into Studio Inspector.

---

## 2. Button / Control Audit

| Metric | Count / note |
|---|---|
| Interactive Studio controls inventoried | ~70+ (tabs, presets, toggles, fields, links, preview actions) |
| Working (handler → state → preview) | All inventoried editable keys in Inspector + Templates |
| Broken then fixed | 4 groups (radius mismatch, Customize dead, CCPA/labels missing, no dirty guard) |
| Missing (wishlist not in schema) | Width/height, typography, shadows, translation pack editor |
| Untested in browser | All UI click paths (static/unit only) — **NOT TESTED** interactively |

---

## 3. Database Persistence

| Path | Result |
|---|---|
| PUT body → `parseBannerConfig` + validation | Pass (static source + tenant URL sanitize tests) |
| Draft write via `ensureDraftPolicyVersion` | Pass (static) |
| Org isolation via website IDs | Pass (static + tenant isolation suite) |
| `privacyPolicyUrl` / `cookiePolicyUrl` http(s) only | Pass (tenant isolation regression) |
| `borderRadius` UI max == API max (24) | Pass (fixed + regression) |
| Live DB round-trip per field | **NOT TESTED** |
| Concurrent edit / network timeout UX | **NOT TESTED** |

### Studio-editable keys (persist on Save draft)

`layout`, `position`, `borderRadius`, `overlayEnabled`, `blockPageUntilConsent`, `closeOnOverlayClick`, `showOnEveryVisit`, `showCloseButton`, `showPreferenceWidget`, `preferenceWidgetPosition`, `primaryColor`, `textColor`, `backgroundColor`, `title`, `description`, `acceptAllLabel`, `rejectAllLabel`, `customizeLabel`, `savePreferencesLabel`, `showAcceptAll`, `showRejectAll`, `showCustomize`, `showPoweredBy`, `poweredByText`, `closeLabel`, `showPurposeDescriptions`, `showVendorList`, `showLegalBasis`, `preferenceCenterTitle`, `preferenceCenterDescription`, `language`, `region`, `defaultConsent`, `consentExpireDays`, `respectDoNotTrack`, `privacyPolicyText`, `privacyPolicyUrl`, `cookiePolicyText`, `cookiePolicyUrl`, `doNotSellEnabled`, `doNotShareEnabled`, `gpcHonored`, `limitSensitivePiEnabled`.

### Config keys not editable in Studio UI

`translations`, `supportedLocales`, `purposesHeading`, `vendorsHeading`, `requiredLabel` (API can still store them).

---

## 4. Preview Audit

| Setting change | Updates preview | Evidence |
|---|---|---|
| Colors / text / layout / toggles | Yes (same React `config` prop) | Code path |
| Preset apply | Yes | `handleApplyPreset` → `parseBannerConfig` |
| Customize | Switches to Preferences | Fixed: `onCustomize` → `setSurface("preferences")` |
| Accept / Reject / Close | Local dismiss only | Fixed: `onDismiss`; no `fetch` / consent API |
| Preference center purposes | Fixture list `PREVIEW_PURPOSES` | Static; not live policy purposes |
| Iframe blocked sites | Mock + warning chip | Existing |
| Iframe remount on color edit | Avoided | Fixed: effect keyed on `url` only |

---

## 5. Publishing Audit

| Check | Result |
|---|---|
| Draft Save updates published row | No — updates draft version only (static) |
| SDK loader requires `isPublished` | Yes (static on `load-published-config.ts`) |
| Studio `liveIsBehind` when latest unpublished | Yes (static on studio page) |
| Publish control in Studio | Link to policy `#policy-publish` (Partial) |
| End-to-end Publish → SDK config | **NOT TESTED** in this pass |
| Existing CMP e2e | Harness fails on unrelated `testPublishedPolicyRefresh` (pre-existing; see §8) |

---

## 6. Performance Audit

| Item | Finding |
|---|---|
| Browser profiler timings | **NOT TESTED** (no interactive session) |
| Identified bottleneck | Iframe load timer previously depended on `loaded` + `url`; config edits risked churn |
| Fix applied | Iframe `key={url}`; block timer deps `[url, onBlock]`; stable `handleIframeBlock` |
| Preview updates | Kept synchronous (no debounce on visual edits) |
| Fabricated ms numbers | None |

---

## 7. Bug Fix Summary

| Issue | Severity | Root cause | Fix | Tests |
|---|---|---|---|---|
| Radius UI 0–32 vs API clamp 0–24 | P0 | Divergent max | Shared `BANNER_BORDER_RADIUS_MAX = 24` in `banner-config.ts`, API, inspector | `banner-studio-regression` radius contract |
| Customize / Accept / Reject inert | P0 | No handlers passed to `BannerRenderer` | Wire Customize→Preferences; Accept/Reject/Close local dismiss | preview isolation tests |
| CCPA / GPC / Limit SPI missing from Studio | P1 | Dead form only | Compliance toggles in inspector | compliance UI tests |
| poweredByText / closeLabel not editable | P1 | Omitted from redesign | Fields beside show toggles | compliance UI tests |
| No unsaved leave warning | P1 | Missing | `beforeunload` + dirty snapshot after successful save | unsaved leave test |
| Iframe remount risk on config edit | Perf | Effect deps | URL-keyed iframe + stable onBlock | remount assertion |

### Files touched

- `src/lib/banner-config.ts`
- `src/app/api/policies/[id]/banner-config/route.ts`
- `src/components/policies/banner-studio/index.tsx`
- `src/components/policies/banner-studio/studio-inspector.tsx`
- `src/components/policies/banner-studio/studio-preview.tsx`
- `src/components/policies/banner-studio/banner-renderer.tsx`
- `src/lib/banner-studio-regression.test.cjs` (new)
- `docs/banner-studio-audit-report.md` (this file)

---

## 8. Gates Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **Pass** |
| `node --test src/lib/banner-studio-regression.test.cjs` | **Pass** (14 tests) |
| `node --test …tenant-isolation-regression.test.cjs` | **Pass** (includes banner URL sanitize) |
| Full `npm test` | **Fail** — pre-existing `consent-manager-e2e-regression.test.cjs` (`testPublishedPolicyRefresh` expects open banner to keep title `Privacy choices` after config title update to `Updated privacy policy`). Not modified by this audit. |
| `dashboard-ux.test.cjs` | **Fail** — unrelated Suspense expectation on website settings page. Not modified by this audit. |

---

## 9. Security & CMP Notes

- Studio page and PUT both scope policies through org websites (static verified).
- Preview does not call consent APIs (static verified).
- Banner text rendered as text nodes (no `dangerouslySetInnerHTML` in Studio renderer).
- Iframe sandbox retained; CSP not weakened.
- CCPA toggles restored for operator control; not auto-enabled.
- Legal sufficiency of DPDP/GDPR copy: **flagged for human review**, not rewritten in this pass.
- Translation pack editing remains Partial (API-only).

---

## 10. Production Readiness

**Conditionally Ready**

**Ready for:** draft editing, preset application, preview isolation, save validation contracts, org-scoped API, CCPA field control in Studio.

**Blockers / risks before Fully Ready:**

1. Live DB read-after-write for every editable field — **NOT TESTED**
2. Authenticated Playwright Studio workflows — **NOT TESTED**
3. Staging Publish → SDK config verification — **NOT TESTED**
4. Full `npm test` red due to unrelated CMP e2e + dashboard-ux failures (outside Studio diff)

---

## Persistence map (summary)

```
Studio control
  → BannerStudio state (handleChange / handleApplyPreset)
  → PUT /api/policies/:id/banner-config
  → ensureDraftPolicyVersion → consent_policy_versions.configuration (draft)
  → Policy Publish (separate) sets isPublished
  → GET /api/sdk/:siteKey/config ← load-published-config (published only)
  → CMP script bannerConfig
```
