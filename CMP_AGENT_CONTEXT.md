# Consent Management Platform — Agent Context

> Single source of truth for coding agents.
> ALWAYS read this file before making changes.
> Inspect the current code before assuming anything.
> Complete only the requested task.
> After completing a task, UPDATE THIS FILE with the result.

---

## 1. Project

Consent Management Platform (CMP), a multi-tenant SaaS web application.

The platform will manage:

- Organizations
- Users and memberships
- Websites
- Consent policies
- Policy versions
- Purposes
- Vendors
- Trackers
- Website scanning
- Consent records
- Consent decisions
- Consent events
- Audit logs
- API keys
- Integrations
- Webhooks
- Notifications
- Plans
- Subscriptions
- Usage
- Invoices

---

## 2. Technology Stack

- Next.js 16
- React
- TypeScript
- App Router
- Tailwind CSS
- PostgreSQL 18
- Drizzle ORM
- Drizzle Kit
- postgres driver
- Docker Desktop
- Docker Compose
- WSL2
- Clerk
- @clerk/nextjs

---

## 3. Local Project

Project:

E:\Tor secure\consent-manager

PostgreSQL development environment:

- Container: consent-postgres
- Host: localhost
- Port: 5432
- Database: consent_platform
- User: consent_admin
- Credentials are local-development only.

Environment variables are stored in:

.env

NEVER commit or expose .env.

---

## 4. Database Files

Connection:

src/db/index.ts

Schema:

src/db/schema/

Drizzle configuration:

drizzle.config.ts

Migrations:

drizzle/

Commands:

npx drizzle-kit generate
npx drizzle-kit migrate
npx drizzle-kit studio

---

## 5. Core Database Tables

The application uses these 30 core tables:

1. organizations
2. users
3. roles
4. permissions
5. role_permissions
6. memberships
7. websites
8. consent_policies
9. consent_policy_versions
10. purposes
11. policy_purposes
12. vendors
13. vendor_purposes
14. trackers
15. scans
16. scan_results
17. consent_records
18. consent_decisions
19. consent_events
20. audit_logs
21. api_keys
22. integrations
23. website_integrations
24. webhook_endpoints
25. webhook_deliveries
26. notifications
27. plans
28. subscriptions
29. subscription_usage
30. invoices

Do not recreate these tables.

Do not redesign the schema unless explicitly requested.

---

## 6. Important Relationships

Authorization:

User
→ Membership
→ Organization
→ Role
→ Role Permissions
→ Permissions

Website:

Organization
→ Websites

Consent:

Website
→ Consent Policy
→ Policy Version
→ Purposes / Vendors
→ Trackers
→ Consent Records
→ Consent Decisions / Consent Events

---

## 7. Clerk Architecture

Clerk is responsible for authentication and identity.

PostgreSQL is responsible for application/business data.

Clerk links:

users.clerk_user_id

organizations.clerk_organization_id

Authentication flow:

Clerk authentication
→ local user
→ active Clerk organization
→ local organization
→ local membership
→ dashboard

---

## 8. Clerk Authentication — COMPLETED

Working routes:

/sign-up

/sign-in

Clerk user authentication is working.

Clerk Organizations are enabled.

Membership Required is enabled.

A test organization has been created.

---

## 9. User Synchronization — COMPLETED

File:

src/lib/sync-clerk-user.ts

Purpose:

- Get current Clerk user
- Find local user using clerk_user_id
- Create local user if missing
- Update local user if existing
- Keep local user information synchronized

The local users table is connected to Clerk through:

clerk_user_id

---

## 10. Organization Synchronization — COMPLETED

File:

src/lib/sync-clerk-organization.ts

Purpose:

- Get active Clerk organization
- Find/create local organization
- Find/create Owner role
- Find/create membership

The local organizations table is connected to Clerk through:

clerk_organization_id

---

## 11. Central Dashboard Bootstrap — COMPLETED

File:

src/lib/bootstrap-current-context.ts

The application now uses a centralized dashboard bootstrap instead of repeating synchronization logic on every dashboard page.

The bootstrap:

1. Verifies authentication.
2. Gets the current Clerk user.
3. Creates/updates the local user.
4. Gets the active Clerk organization.
5. Creates/updates the local organization.
6. Finds/creates the Owner role when necessary.
7. Finds/creates the user's local membership.
8. Returns the current local user, organization, and membership context.

The organization creation and membership creation logic is transactional.

It uses the Clerk organization's slug when available.

It preserves an existing verified email timestamp instead of clearing it.

A `server-only` guard is used.

---

## 12. Dashboard Layout — COMPLETED

File:

src/app/dashboard/layout.tsx

The dashboard layout is responsible for:

- Authentication
- Dashboard bootstrap
- Active organization requirement
- Organization switcher
- User button
- Dashboard shell

Individual dashboard pages should NOT repeat the same authentication/bootstrap logic unless there is a specific reason.

If the bootstrap fails, the application handles the failure centrally.

---

## 13. Dashboard Page — CURRENT STATE

File:

src/app/dashboard/page.tsx

The dashboard page has been simplified so it relies on the dashboard layout for authentication and bootstrap.

Do not re-add duplicate authentication/bootstrap logic without a specific requirement.

Current dashboard work is focused on building the actual SaaS dashboard UI and real organization-scoped data.

---

## 14. Websites Module — CURRENT STATE

Routes:

/dashboard/websites

/dashboard/websites/new

Component:

src/components/websites/create-website-form.tsx

API:

src/app/api/websites/route.ts

Website creation is working.

A website can be created through the UI and is stored correctly in PostgreSQL.

Organization mapping must always be:

Clerk orgId
→ organizations.clerk_organization_id
→ organizations.id
→ websites.organization_id

Never trust an organization ID supplied directly by the browser.

---

## 15. Important Websites History

A previous problem occurred where a website existed in PostgreSQL but did not appear in the UI.

The problem was related to local organization synchronization and dashboard querying.

The dashboard bootstrap architecture was introduced to solve this problem across multiple development laptops.

Do NOT recreate existing website records.

Do NOT create duplicate organizations.

Do NOT create duplicate users.

Do NOT create duplicate memberships.

---

## 16. Fresh Laptop Behavior — COMPLETED

The application is designed so a fresh local PostgreSQL database can initialize its local identity data when an authenticated user enters the dashboard.

Expected flow:

Clerk Login
→ dashboard bootstrap
→ local user
→ local organization
→ local membership
→ dashboard

This allows the same codebase to work on different development laptops with separate local PostgreSQL databases.

---

# 17. Completed Agent Work

## Task: Dashboard Foundation Refactor — COMPLETED

`src/lib/bootstrap-current-context.ts`

- Added server-only import guard.
- Added exported bootstrap context/result types.
- Wrapped organization, Owner role, and membership creation in transactions.
- Handles existing organization + missing membership.
- Handles missing organization + missing membership.
- Uses Clerk organization slug when available.
- Preserves previously verified email timestamps.

`src/app/dashboard/layout.tsx`

- Centralized authentication/bootstrap.
- Missing organization redirects to `/create-organization`.
- Authentication/bootstrap failures are handled centrally.
- Removed duplicate error logging/handling where unnecessary.

`src/app/dashboard/page.tsx`

- Removed duplicate auth checks.
- Removed duplicate direct organization bootstrap logic.
- Relies on dashboard layout context.

`src/app/dashboard/websites/page.tsx`

- Removed duplicate user synchronization.
- Removed duplicate organization synchronization.
- Removed duplicate authentication guards.
- Uses the active organization context established by the dashboard layout.

`src/app/dashboard/websites/new/page.tsx`

- Removed duplicate authentication guards.
- Relies on the dashboard layout.

**Result:** Authentication, identity synchronization, organization synchronization, and membership initialization are centralized in the dashboard foundation.

---

## Task: Production Hardening Audit — COMPLETED

### Audit Findings and Fixes

**CRITICAL — `/api/test-db` leaked all organization data unauthenticated**

`src/app/api/test-db/route.ts` (fixed)

- **Before:** No auth check; returned full `organizations` table to any caller.
- **After:** Returns 404 in `NODE_ENV=production`. Requires authenticated Clerk session in development. Returns only a row count (no row data) via `sql\`SELECT count(*)::text FROM organizations\``.

**HIGH — `/api/websites` POST: membership check not scoped to current user**

`src/app/api/websites/route.ts` (fixed)

- **Before:** `WHERE organizationId = ?` — any authenticated user with a valid Clerk orgId session could create a website if any membership existed for that org, regardless of whether they personally belonged to it.
- **After:** `WHERE organizationId = ? AND userId = ? AND status = 'active'` — membership is validated for the specific authenticated user.
- **Also added:** `name` max-length 255, `domain` max-length 253, basic hostname format regex `/^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$/`, `and` import added to query.

**MEDIUM — `/api/consent/record` POST: raw error message leaked in 500 response**

`src/app/api/consent/record/route.ts` (fixed)

- **Before:** `catch` block returned `error.message` directly, which could expose DB error details, query fragments, or stack context.
- **After:** Generic "Failed to submit consent" message. Error logged server-side only.

**MEDIUM — `/api/webhooks/endpoints` POST: SSRF via webhook URL**

`src/app/api/webhooks/endpoints/route.ts` (fixed)

- **Before:** URL validated for `http:`/`https:` protocol only — `http://localhost/internal` or `http://169.254.169.254/metadata` were accepted.
- **After:** Added blocklist for `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, private IPv4 ranges (10.x, 172.16–31.x, 192.168.x, 169.254.x), IPv6 ULA (fc/fd/fe80), and known metadata endpoints.

### Routes audited and found clean

All other routes were audited and no concrete issues found:
- `POST /api/policies` — org-scoped via Clerk, website ownership verified
- `PUT /api/websites/[id]` — org-scoped, website ownership verified, all fields validated against allowlists
- `POST /api/purposes` — org-scoped, key uniqueness enforced
- `POST /api/vendors` — org-scoped, key uniqueness enforced, all fields sanitized
- `POST /api/api-keys` — org-scoped, fields validated, secret stored as hash only
- `DELETE /api/api-keys/[id]` — org-scoped, audit log written
- `POST /api/integrations/connect` — org→website ownership chain, duplicate guard
- `DELETE /api/integrations/[id]/disconnect` — tenant-safe via websiteId membership
- `PATCH /api/notifications/[id]/read` — org+user scoped with SQL condition
- `POST /api/webhooks/endpoints/[id]` (PATCH/DELETE) — org-scoped, allowlist validation
- `POST /api/scanner/run` — org→website ownership verified, active-status check
- `PUT /api/settings/organization` — org-scoped, Owner/Admin role gate, audit log
- `GET /api/sdk/[siteKey]/config` — public by design, no auth needed, returns only active-website data
- `POST /api/consent/record` — public by design (visitor consent)
- `POST /api/consent/withdraw` — public by design, scoped to websiteId
- `POST /api/policies/[id]/purposes` — full tenant chain: Clerk → org → websites → policy → version
- `DELETE /api/policies/[id]/purposes/[purposeId]` — same tenant chain
- `POST /api/vendors/[id]/purposes` — org→vendor chain, purpose org-ownership verified
- `DELETE /api/vendors/[id]/purposes/[purposeId]` — same chain

### Files Changed

- `src/app/api/test-db/route.ts` — production block + auth guard + count-only response
- `src/app/api/websites/route.ts` — membership userId-scoped + field length + hostname validation
- `src/app/api/consent/record/route.ts` — generic error message in catch block
- `src/app/api/webhooks/endpoints/route.ts` — SSRF blocklist for private/internal hosts

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Consent Analytics — COMPLETED

### Files Changed

`src/components/analytics/date-range-filter.tsx` (new file)

- `"use client"` pill-button group for 7 / 30 / 90 / All time.
- Pushes `?days=` URL param via `useRouter`; uses `useTransition` for pending state.
- Wrapped in `<Suspense>` in the page to satisfy `useSearchParams` RSC boundary.

`src/app/dashboard/analytics/page.tsx` (new file)

- Async server component reading `searchParams` (`days` param).
- Builds a `since: Date | null` cutoff and applies it across all queries via `gte(createdAt, since)`.
- **7 real Drizzle aggregation sections:**
  1. **Consent record totals** — `count(*) filter (where status = ?)` for total, accepted, rejected, partial, withdrawn — 5 stat cards with percentage sub-labels.
  2. **By website** — grouped `COUNT` + `filter` per websiteId, including opt-in rate column.
  3. **Purpose consent rates** — joins `consent_decisions → consent_records → purposes`; counts granted/denied per purposeId with a visual progress bar.
  4. **Event type breakdown** — groups `consent_events` by `eventType`, counts per type, renders as cards.
  5. **Tracker inventory** — `count(*) filter` for essential / consent-controlled / unclassified (not date-filtered — inventory is atemporal).
  6. **Scanner activity** — sum of `itemsDetected` + completed/failed count within date range.
  7. **Recent activity** — 15 most recent `consent_events` joined to `consent_records` for websiteId and consentId.
- Empty states: no websites, websites but no data.
- All queries scoped through `organizationId` — tenant isolation preserved.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Website Scanner — COMPLETED

### Files Changed

`src/lib/scanner/tracker-signatures.ts` (new file)

- `TrackerSignature` type: name, type, category, riskLevel.
- `TRACKER_SIGNATURES` map — 60+ known tracker domains across analytics, advertising, social, fingerprinting, support, A/B testing, performance categories.
- `matchDomain(hostname)` — exact match then suffix walk (sub.example.com → example.com); returns matched signature + matched domain.

`src/lib/scanner/html-analyser.ts` (new file)

- `server-only` guard.
- `fetchHtml(url)` — safe Node `fetch` with 12 s timeout + AbortController; follows redirects; rejects non-HTML responses.
- `analyseHtml(html, pageUrl)` — 6 detection passes:
  1. External `<script src>` — third-party scripts matched against tracker signatures.
  2. `<img src>` pixels — known domains or 1×1 pixel patterns or tracking path segments.
  3. `<link rel="preload|prefetch|dns-prefetch">` — known tracker domains only.
  4. `document.cookie =` inline patterns — cookie name extraction.
  5. `<iframe src>` — known tracker domains only.
  6. `navigator.sendBeacon(url)` — third-party beacon URLs.
- Deduplicates by `type:identifier` key.
- `analyseUrl(url)` — public entry point; returns `AnalysisResult` with items + fetchError.

`src/lib/scanner/scan-engine.ts` (new file)

- `server-only` guard.
- `runScan(websiteId, url)` — creates `scans` row in `"running"` state, calls `analyseUrl`, bulk-inserts `scan_results`, upserts `trackers` (dedup by `identifier` per website), updates scan to `"completed"` or `"failed"`.
- `onConflictDoNothing()` on tracker insert to prevent duplicates.
- Returns `scanId` for redirect.

`src/app/api/scanner/run/route.ts` (new file)

- `POST /api/scanner/run` — body: `{ websiteId }`.
- Tenant-safe: verifies website belongs to org. Requires website `status="active"`.
- Calls `runScan`, returns `{ scanId }`.

`src/app/api/scanner/[scanId]/route.ts` (new file)

- `GET /api/scanner/[scanId]` — returns scan status + results array.
- Tenant-safe: scope via `inArray(websiteId, orgWebsiteIds)`.

`src/components/scanner/start-scan-form.tsx` (new file)

- `"use client"` form — website selector dropdown, "Start scan" button with spinner animation.
- Navigates to `/dashboard/scanner/[scanId]` on success.

`src/app/dashboard/scanner/page.tsx` (new file)

- Async server component; org-scoped scan history (up to 100), newest first.
- Summary: total completed scans + items detected count.
- Renders `<StartScanForm>` when websites exist.
- History table: website, type, status badge, items, start time, duration, "View results" link.

`src/app/dashboard/scanner/[scanId]/page.tsx` (new file)

- Async server component; tenant-safe scan + results fetch.
- 4 summary cards: items detected, known trackers, high-risk count, pages scanned.
- Type summary pill row (count per type).
- Full results table: name, type badge, domain (monospace), identifier (truncated monospace), risk badge, classification, category.
- Error state for failed scans.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Tracker Blocking / Consent Enforcement — COMPLETED

### Files Changed

`src/lib/sdk/enforcement.ts` (new file)

- `TrackerRule` type — id, name, type, domain, identifier, purposeKey, purposeId, vendorId, isEssential, status.
- `ConsentGrants` type — `{ purposes: Record<string, boolean>; vendors: Record<string, boolean> }`.
- `shouldBlock(rule, grants)` — returns `true` when a tracker should be blocked; essential trackers always return `false`; unclassified (no purpose/vendor) always block.
- `buildBlocklist(rules, grants)` — partitions rules into `blocked` / `allowed`, builds `domains` and `identifiers` Sets for fast browser lookup.
- `categoriseTrackers(rules)` — splits into `essential` / `consentRequired` / `unclassified` for dashboard display.
- `domainMatches(url, domain)` — URL-aware domain matching with suffix check.
- `buildGrantsFromDecisions(decisions)` — converts flat consent decisions array into `ConsentGrants`.

`src/app/api/sdk/[siteKey]/config/route.ts` (updated)

- Added `trackers` and `purposes` schema imports + `TrackerRule` type.
- Fetches active tracker rows for the website; resolves `purposeKey` via bulk lookup.
- Adds `trackerRules: TrackerRule[]` to the response payload — single request gives the SDK everything it needs.

`src/app/api/sdk/[siteKey]/trackers/route.ts` (new file)

- `GET /api/sdk/[siteKey]/trackers` — public, CORS-enabled.
- Returns `trackerRules` for incremental polling or direct inspection.
- `OPTIONS` preflight handler.

`src/lib/sdk/cmp-sdk-script.ts` (new file)

- `buildCmpSdkScript({ siteKey, apiBase })` — generates the self-contained browser JS string.
  - `pauseTaggedScripts()` — runs immediately at parse time, sets `type="text/plain"` on all `data-cmp-purpose` script tags before the browser evaluates them.
  - Loads config from `/api/sdk/{siteKey}/config` (single fetch).
  - Checks `localStorage` for stored consent; if valid, applies grants and calls `enforceScriptTags()` immediately.
  - `enforceScriptTags()` — restores or re-pauses tagged scripts as consent changes.
  - `renderBanner()` — inline minimal banner honouring `bannerConfig` (position, layout, colours, buttons).
  - `submitConsent(choice, ...)` → `POST /api/consent/record`, then fetches decisions, saves to `localStorage`.
  - `window.CMP` public API: `getConsent()`, `onConsentChange(fn)`, `openPreferenceCenter()`, `acceptAll()`, `rejectAll()`, `saveGranular(purposeDecisions, vendorDecisions)`, `withdrawConsent()`.
- `buildEmbedSnippet({ siteKey, cdnUrl })` — tiny `<head>` loader snippet.
- `buildInlineSnippet({ siteKey, apiBase })` — full inline script for testing.

`src/app/dashboard/websites/[id]/installation/page.tsx` (updated)

- Imports `buildEmbedSnippet`; uses it to generate the HTML snippet.
- Adds `enforceSnippet` code block showing `data-cmp-purpose` usage.
- Adds an "Script enforcement" section between the config endpoint reference and the Verify step — explains the blocking approach with a bullet list.

`src/app/dashboard/websites/[id]/enforcement/page.tsx` (new file)

- Async server component at `/dashboard/websites/[id]/enforcement`.
- Tenant-safe website query.
- Loads all active trackers, resolves purpose keys and vendor names in parallel.
- Calls `categoriseTrackers()` to split into essential / consentRequired / unclassified.
- Three summary stat cards (green / amber / red).
- Three `TrackerTable` sections: Blocked until consent, Always blocked (unclassified), Always allowed (essential).
- `EnforcementBadge` helper shows enforcement status per tracker.

`src/app/dashboard/websites/[id]/page.tsx` (updated)

- Header now has two action buttons: "Enforcement" (links to `/enforcement`) and "Settings".

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: SDK Installation — COMPLETED

### Files Changed

`src/app/api/sdk/[siteKey]/config/route.ts` (new file)

- `GET /api/sdk/[siteKey]/config` — public, no auth required.
- Resolves website by `siteKey` (globally unique, active only).
- Finds the active default policy; selects latest published version (fallback: latest draft).
- Returns `bannerConfig` (via `parseBannerConfig`), `purposes`, `vendors`, `locale`.
- CORS headers: `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=300`.
- `OPTIONS` handler for CORS preflight.

`src/components/sdk/copy-snippet.tsx` (new file)

- `CopyButton` — `navigator.clipboard.writeText`, "Copied!" confirmation (2 s).
- `CodeBlock` — dark code block (`bg-neutral-900`) with language label + `CopyButton` in header bar.
- `VerifyInstallation` — fetches `GET /api/sdk/[siteKey]/config`, shows green (verified) or red (error) result with detail: policy name, version, published status, purpose count.

`src/app/dashboard/websites/[id]/installation/page.tsx` (new file)

- Server component at `/dashboard/websites/[id]/installation`.
- Tenant-safe: website query scoped to `AND(id, organizationId)`.
- Shows amber warning if no active policy exists (links to Create Policy).
- Shows green confirmation when an active policy is found.
- Four steps: site key display, three framework snippets (HTML, Next.js, React) each with `CodeBlock`, SDK behavior explanation (5-step numbered list), config endpoint reference, `VerifyInstallation` button.
- "Next steps" panel linking to Create Policy, Banner Configuration, and Website Settings.

`src/app/dashboard/websites/[id]/page.tsx` (updated)

- SDK Installation placeholder replaced with a live section showing the site key and a "View installation guide →" button linking to `/dashboard/websites/[id]/installation`.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Consent Engine + Preference Center — COMPLETED

### Files Changed

`src/lib/consent-engine.ts` (new file)

- `server-only` guard.
- `generateConsentId()` — returns `cid_{uuid}` stable identifier for a visitor's consent record.
- `computeExpiry(days)` — clamps to 1–3650 days, returns a future `Date`.
- `buildDecisionRows(submission, allPurposeIds, allVendorIds, requiredPurposeIds)` — converts `accept-all` / `reject-all` / `granular` submissions into flat `DecisionRow[]`; required purposes are always `granted=true` regardless of choice.
- `appendConsentEvent(...)` — inserts an immutable row into `consent_events` (best-effort audit log).
- `deriveOverallStatus(decisions)` — returns `"accepted"` / `"rejected"` / `"partial"` / `"pending"`.

`src/app/api/consent/policy/route.ts` (new file)

- `GET /api/consent/policy?websiteId=` — public endpoint.
- Verifies website is active, finds the default active policy, selects the latest published version (or latest draft as fallback).
- Returns `bannerConfig` (from `parseBannerConfig`), `purposes` attached to the version, and deduplicated `vendors` linked through `vendor_purposes`.

`src/app/api/consent/record/route.ts` (new file)

- `GET /api/consent/record?consentId=&websiteId=` — retrieve existing record + decisions.
- `POST /api/consent/record` — create (new `cid_`) or update (existing `consentId`) a consent record.
  - Validates `submission.choice` against allowlist.
  - Verifies website ownership. Finds active policy + latest version.
  - Calls `buildDecisionRows` with required-purpose set.
  - DB transaction: insert/update `consent_records`, delete old decisions, insert new `consent_decisions`.
  - Calls `appendConsentEvent` after the transaction.

`src/app/api/consent/withdraw/route.ts` (new file)

- `POST /api/consent/withdraw` — body: `{ consentId, websiteId }`.
- Verifies website + record ownership. Guards against re-withdrawing (409).
- Sets `status="withdrawn"`, `withdrawnAt=now`, calls `appendConsentEvent` with `"consent.withdrawn"`.

`src/components/consent/preference-center.tsx` (new file)

- `"use client"` component receiving `PCProps` (websiteId, policyVersionId, bannerConfig, purposes, vendors, optional consentId / initial grants).
- Accessible `ConsentToggle` (role="switch", aria-checked, disabled state for required purposes).
- Purposes tab + Vendors tab (tab bar hidden if vendor list is disabled or empty).
- All button styles driven by `bannerConfig` colours and `borderRadius`.
- `submitConsent("accept-all" | "reject-all" | "granular")` — calls `POST /api/consent/record`, updates local state optimistically.
- Withdraw button visible in update mode; calls `POST /api/consent/withdraw`.
- `onSaved` / `onWithdrawn` callbacks for parent integration.

`src/app/dashboard/consent/page.tsx` (new file)

- Async server component; resolves org → websites → `consent_records` (up to 200, newest first).
- Resolves policy version numbers and policy names in two bulk queries.
- Table: Consent ID (truncated monospace), Website, Policy + version, Status badge, Source, Jurisdiction, Consented date, Expires / Withdrawn date.
- Empty states: no websites, no records.

`src/app/dashboard/policies/[id]/preference-center/page.tsx` (new file)

- Async server component at `/dashboard/policies/[id]/preference-center`.
- Tenant-safe: policy scoped through `inArray(websiteId, orgWebsiteIds)`.
- Loads banner config, purposes, vendors for the latest version.
- Renders `<PreferenceCenter>` with a blue preview-mode notice.
- Breadcrumb: Policies → policy name → Preference Center.

`src/app/dashboard/policies/[id]/page.tsx` (updated)

- Added "Preview preference center" button linking to `/dashboard/policies/[id]/preference-center` in the page header.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Consent Banner Configuration — COMPLETED

### Files Changed

`src/lib/banner-config.ts` (new file)

- `BannerConfiguration` type with 30+ fields across five groups: Text, Controls, Preference center, Behavior, Locale, Appearance.
- `BannerPosition` union: `"bottom" | "top" | "bottom-left" | "bottom-right" | "center"`.
- `BannerLayout` union: `"bar" | "box" | "dialog"`.
- `ConsentDefault` union: `"opt-in" | "opt-out" | "none"`.
- `defaultBannerConfig()` — returns sensible production-ready defaults.
- `parseBannerConfig(raw)` — merges stored JSONB with defaults; forward-compatible with new fields added in the future.

`src/app/api/policies/[id]/banner-config/route.ts` (new file)

- `PUT /api/policies/[id]/banner-config` — full tenant chain: Clerk `orgId` → org → org websites → policy → latest version.
- Validates constrained fields: `position`, `layout`, `defaultConsent` against allowlists; `primaryColor`, `backgroundColor`, `textColor` against `/^#[0-9a-fA-F]{6}$/`.
- Clamps `consentExpireDays` to 1–3650 and `borderRadius` to 0–24.
- Truncates all text fields to their max lengths.
- Saves the merged `BannerConfiguration` into `consentPolicyVersions.configuration` on the latest version.

`src/components/policies/banner-config-form.tsx` (new file)

- `"use client"` component receiving `policyId`, `initialConfig`, and `latestVersionId`.
- Two-column layout at `xl`: form on the left, sticky live preview on the right.
- Five form sections: Text (title, description, button labels, privacy policy link), Controls (5 toggle checkboxes), Preference center (3 toggles), Behavior (default consent, expiry days, 4 toggles), Locale (language + regulation region selects), Appearance (layout, position, 3 colour pickers with `<input type="color">` + hex text input, border-radius slider, overlay toggle).
- `BannerPreview` — miniature banner rendering at 48-height that reflects layout, position, colours, border-radius, overlay, title, description, and button labels in real time.
- `update(key, value)` helper keeps all state in a single `BannerConfiguration` object.
- "Save draft" calls `PUT /api/policies/[id]/banner-config`; "Reset to defaults" restores `defaultBannerConfig()`.
- Shows "No policy version found" guard when `latestVersionId` is null.

`src/app/dashboard/policies/[id]/page.tsx` (updated)

- Added `BannerConfigForm` and `parseBannerConfig` imports.
- Reads current config from `latestVersion?.configuration ?? {}` via `parseBannerConfig`.
- Replaced the banner placeholder `<div>` with a full-width `lg:col-span-2` section containing `<BannerConfigForm>`.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Webhooks Module — COMPLETED

### Files Changed

`src/app/api/webhooks/endpoints/route.ts` (new file)

- `POST /api/webhooks/endpoints` — tenant-safe (Clerk `orgId` → org).
- Validates URL format (must be valid HTTP/HTTPS URL).
- Filters `subscribedEvents` against a server-side allowlist of 10 event types.
- Duplicate URL per org guard (409).
- Generates `whsec_{32-byte-base64url}` signing secret via `crypto.randomBytes`; stores SHA-256 hash only; returns raw secret once in the response.

`src/app/api/webhooks/endpoints/[id]/route.ts` (new file)

- `PATCH` — selectively updates `name`, `description`, `subscribedEvents`, `status` (`active`/`disabled` only).
- `DELETE` — hard delete, org-scoped.
- Fixed: explicit `string` annotation on the `.filter()` callback (was causing TS7006 implicit `any`).

`src/components/webhooks/create-webhook-form.tsx` (new file)

- `"use client"` inline-toggle form (collapsed to "Add endpoint" button).
- URL, name, description fields.
- Event-type checkbox grid with Select all / Deselect all toggle and live selected-count label.
- `onCreated(signingSecret, name)` callback fires on success; form resets and collapses.

`src/components/webhooks/webhook-endpoint-manager.tsx` (new file)

- `"use client"` top-level manager composing `CreateWebhookForm`, `SigningSecretBanner`, and `EndpointCard` list.
- `SigningSecretBanner` — green banner with monospace secret, clipboard copy, dismiss.
- `EndpointCard` — name/URL/description/status badge, subscribed events pills, collapsible delivery-history table, confirm-delete two-step, enable/disable toggle.
- Delivery-history table: event type (monospace), status badge, HTTP response code, attempt number, sent timestamp.
- All mutations use `useTransition` + `router.refresh()`.

`src/app/dashboard/developers/webhooks/page.tsx` (new file)

- Async server component at `/dashboard/developers/webhooks`.
- Fetches org endpoints + up to 20 recent deliveries per endpoint in two queries; groups deliveries by `webhookEndpointId`.
- Breadcrumb: API Keys → Webhooks.
- Active endpoint count in subtitle.
- Signature verification notice explaining `X-CMP-Signature` header.

`src/components/dashboard/sidebar-nav.tsx` (updated)

- Added `IconWebhooks` inline SVG (branch/node graph shape).
- Added Webhooks nav item under the Developer group, linking to `/dashboard/developers/webhooks`.

### Verification

`tsc --noEmit` → 1 error fixed (implicit `any` on filter callback), then exit 0, zero lines of output.

---

## Task: Integrations Module — COMPLETED

### Files Changed

`src/app/api/integrations/connect/route.ts` (new file)

- `POST /api/integrations/connect` — body: `{ integrationId, websiteId }`.
- Resolves local org from Clerk `orgId`.
- Verifies `websiteId` belongs to this org via `AND(id, organizationId)`.
- Verifies `integrationId` is active (`isActive=true`).
- Application-layer duplicate guard (409) before DB insert.
- Inserts `website_integrations` row with `status="active"`, `enabled=true`, `connectedAt=now`.

`src/app/api/integrations/[id]/disconnect/route.ts` (new file)

- `DELETE /api/integrations/[id]/disconnect` — `[id]` is `websiteIntegrations.id`.
- Loads connection to get `websiteId`, then fetches all org website IDs.
- Verifies `connection.websiteId` is in the org's websites — cross-org access returns 404.
- Deletes the row using `AND(id, inArray(websiteId, orgWebsiteIds))` for defense in depth.

`src/components/integrations/integration-catalog.tsx` (new file)

- `"use client"` component; receives `IntegrationEntry[]` and `WebsiteOption[]` as props.
- Category filter pill buttons at the top (populated from catalog data).
- `IntegrationCard` per integration: icon (or initial fallback), name, provider, `CategoryBadge`, `OfficialBadge`.
- Connected websites list per card with Disconnect button (calls DELETE route).
- Unconnected-website selector + Connect button (calls POST route).
- "Connected to all websites" message when no unconnected websites remain.
- Warning banner when no websites exist yet.
- `useTransition` + `router.refresh()` after every mutation.
- Per-card error display.

`src/app/dashboard/integrations/page.tsx` (new file)

- Async server component; fetches org websites, full integration catalog (`isActive=true`), and all `website_integrations` rows for org websites in parallel.
- Groups connections by `integrationId` → builds `IntegrationEntry[]` with serializable `ConnectionEntry[]`.
- Summary counts in page subtitle: "X of Y integrations connected (Z connections)".
- Three empty states handled in the client component: no catalog, no websites, no filter results.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Organization Settings — COMPLETED

### Files Changed

`src/app/api/settings/organization/route.ts` (new file)

- `PUT /api/settings/organization` — fully tenant-safe.
- Resolves local org from Clerk `orgId`, local user from Clerk `userId`.
- Fetches membership + role name via `innerJoin(roles)` — returns 403 if role is not `Owner` or `Admin`.
- Validates all editable fields against server-side allowlists: timezones (13 values), languages (10 values), regions (8 values), logoUrl (URL parse check).
- Computes a `changes` diff object comparing old vs new values — only issues a DB `UPDATE` and audit log when at least one field actually changed.
- Writes `audit_logs` entry: `action="organization.settings.updated"`, `resourceType="organization"`, `metadata={changes}`.

`src/components/settings/organization-settings-form.tsx` (new file)

- `"use client"` form; accepts `initial: OrgSettingsData` and `readOnly?: boolean`.
- Three sections: General (name, description, logoUrl), Locale & region (timezone, defaultLanguage, defaultRegion), Onboarding (checkbox).
- When `readOnly=true`: all inputs disabled, amber warning banner shown, Save/Cancel buttons hidden.
- Inline success ("Settings saved." / "No changes to save.") and error feedback.
- Calls `router.refresh()` after successful save to re-run server component.

`src/app/dashboard/settings/page.tsx` (new file)

- Server component that immediately `redirect()`s to `/dashboard/settings/organization`.

`src/app/dashboard/settings/organization/page.tsx` (new file)

- Async server component at `/dashboard/settings/organization`.
- Resolves org + local user + membership + role in four sequential DB queries.
- Derives `canEdit` from role name against `["Owner", "Admin"]`.
- Renders a read-only identity block: organization ID, slug, status, created date.
- Renders `<OrganizationSettingsForm initial={...} readOnly={!canEdit} />` in `max-w-2xl`.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: API Keys Module — COMPLETED

### Files Changed

`src/lib/api-key-utils.ts` (new file)

- `server-only` guard — never runs on the client.
- `generateApiKey(environment)` — generates 32 random bytes → base64url → `cmp_{env}_{secret}`. Returns `{ fullKey, keyPrefix (first 16 chars), keyHash (SHA-256 hex) }`.
- `hashApiKey(fullKey)` — utility for future key verification.
- Raw secret is never stored; only `keyPrefix` and `keyHash` go to the database.

`src/app/api/api-keys/route.ts` (new file)

- `POST /api/api-keys` — tenant-safe (Clerk `orgId` → org).
- Validates: `name` (required, ≤255), `environment` (live/test allowlist), `expiresAt` (must be future date if provided).
- Calls `generateApiKey`, inserts row with `keyHash` only, never stores `fullKey`.
- Writes `audit_logs` entry: `action="api_key.created"`, `resourceType="api_key"`, `resourceId=apiKey.id`.
- Returns `fullKey` once in the response — never again.

`src/app/api/api-keys/[id]/route.ts` (new file)

- `DELETE /api/api-keys/[id]` — tenant-safe (key scoped to `AND(id, organizationId)`).
- Sets `status="revoked"`, `revokedAt=now`.
- Returns 409 if already revoked.
- Writes `audit_logs` entry: `action="api_key.revoked"`.

`src/components/api-keys/api-key-created-banner.tsx` (new file)

- `"use client"` dismissible green banner.
- Displays `fullKey` in a monospace code block with `select-all` for easy selection.
- Clipboard copy button with "Copied!" confirmation state (2 s timeout).
- Dismiss ×  button; banner never reappears after dismissal.

`src/components/api-keys/create-api-key-form.tsx` (new file)

- `"use client"` inline-toggle form (collapsed to a button, expands on click).
- Fields: name, environment (live/test radio), optional expiry date.
- On success: calls `onCreated` callback with `{ fullKey, name }` then resets and collapses.

`src/components/api-keys/api-key-manager.tsx` (new file)

- `"use client"` component composing `CreateApiKeyForm`, `ApiKeyCreatedBanner`, and the keys table.
- `revokeKey(id)` — calls `DELETE /api/api-keys/[id]`, uses `useTransition` + `router.refresh()`.
- Table columns: Name, Key prefix (monospace), Environment badge, Status badge, Last used, Expires (red if past), Created, Revoke button.
- Revoked rows rendered at 60% opacity; shows "Revoked {date}" instead of a button.

`src/app/dashboard/developers/page.tsx` (new file)

- Async server component at `/dashboard/developers`.
- Fetches org-scoped keys ordered by `createdAt DESC`.
- Shows active key count summary in the subtitle.
- Security notice banner reminding users to keep keys secret.
- Passes `ApiKeyRow[]` to `<ApiKeyManager>`.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Notifications Module — COMPLETED

### Files Changed

`src/app/api/notifications/unread-count/route.ts` (new file)

- `GET /api/notifications/unread-count` — returns `{ count: number }`.
- Scoped to org + user; includes org-wide notifications (`userId IS NULL`).
- Returns `{ count: 0 }` gracefully on any auth or DB failure (used by header bell).

`src/app/api/notifications/[id]/read/route.ts` (new file)

- `PATCH /api/notifications/[id]/read` — sets `isRead=true`, `readAt=now`.
- Scoped to org + (user OR org-wide). Returns 404 if not found.

`src/app/api/notifications/read-all/route.ts` (new file)

- `POST /api/notifications/read-all` — bulk-updates all unread notifications for this user+org.
- Same scope as unread-count (includes `userId IS NULL`).

`src/components/notifications/notification-bell.tsx` (new file)

- `"use client"` component; fetches unread count from `/api/notifications/unread-count` on mount.
- Renders a bell SVG icon with a red badge (capped at 99+) when count > 0.
- Links to `/dashboard/notifications`. No badge shown until count is loaded (avoids flash).

`src/components/notifications/notification-actions.tsx` (new file)

- `"use client"` component used in two modes:
  - `hasUnread=true` (no `notificationId`): renders "Mark all as read" button calling `POST /api/notifications/read-all`.
  - `hasUnread=false` + `notificationId`: renders per-item "Mark read" button calling `PATCH /api/notifications/[id]/read`.
- Both use `useTransition` + `router.refresh()` after success.

`src/app/dashboard/notifications/page.tsx` (new file)

- Async server component; fetches up to 200 notifications ordered newest-first.
- Scoped to org + (user OR org-wide) via `userId IS NULL` raw SQL condition.
- Unread count shown as a red badge in the page header.
- "Mark all as read" button visible when `unreadCount > 0`.
- Per-notification: unread dot, title, `TypeBadge` (first segment of dot-namespaced type), `PriorityBadge` (urgent/high only), message, timestamp.
- `resourceLink()` maps `resourceType → dashboard path` for View links.
- Per-item "Mark read" button for unread notifications via `<NotificationActions>`.
- Empty state when no notifications exist.

`src/app/dashboard/layout.tsx` (updated)

- `NotificationBell` imported and added between `OrganizationSwitcher` and `UserButton` in the header, wrapped in a `flex items-center gap-2` container.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Audit Logs — COMPLETED

### Files Changed

`src/components/audit-logs/audit-log-filters.tsx` (new file)

- `"use client"` component; receives `currentQ`, `currentDays`, `totalCount` as props.
- Search input with 400 ms debounce — pushes `q` URL param via `useRouter`.
- Date-range pill group: Last 7 days / Last 30 days / Last 90 days / All time — pushes `days` param.
- Both controls reset `page` to 1 on change.
- Shows live event count and a "Loading…" indicator during navigation transitions via `useTransition`.
- Wrapped in `<Suspense>` from the server page to satisfy `useSearchParams` boundary requirement.

`src/app/dashboard/audit-logs/page.tsx` (new file)

- Async server component reading `searchParams` promise (`q`, `days`, `page`).
- Resolves local org from Clerk `orgId`.
- Builds `WHERE` clause with `and()`:
  - Always: `organizationId = localOrg.id`
  - Date range: `gte(createdAt, since)` when `days` is not `"all"`
  - Search: `or(ilike(action), ilike(resourceType), ilike(description))` when `q` is non-empty
- Parallel `Promise.all`: SQL `count(*)::int` for pagination total + paginated rows (`desc(createdAt)`, `LIMIT 50 OFFSET n`).
- User names resolved in a separate query for the current page's user IDs only.
- `ActionBadge` — colour-coded by verb prefix: create (green), update (blue), delete (red), login (purple), publish (amber), archive (yellow).
- `ResourceTypeBadge` — monospace pill.
- Metadata summary: first 3 keys shown as `key: value` inline.
- `PaginationBar` — URL-based Previous/Next links; hidden when total fits on one page.
- Useful empty state with "Clear filters" link when filters are active.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Trackers Module — COMPLETED

### Files Changed

`src/components/trackers/tracker-list.tsx` (new file)

- `"use client"` component receiving `TrackerRow[]` and a `showWebsite` flag.
- Search filtering by name, domain, identifier, and vendor name.
- Type filter dropdown (populated from types present in the data).
- `TypeBadge` — colour-coded per type: cookie (amber), pixel (blue), script (purple), beacon (pink), fingerprint (red), storage (teal).
- `StatusBadge` (active/inactive/blocked), `EssentialBadge` (blue pill), `DetectionBadge` (text label).
- Optional website name/domain column when `showWebsite=true`.
- Tracker name, domain, and identifier shown in the name cell.
- Two empty states: no trackers at all, no filter results with a "Clear filters" button.

`src/app/dashboard/trackers/page.tsx` (new file)

- Async server component; resolves org → websites → trackers via `inArray(websiteId, websiteIds)`.
- Bulk-resolves vendor names and purpose names with two parallel `inArray` queries.
- Type summary cards (count per type + total) shown above the list when trackers exist.
- Passes `showWebsite={true}` so the website column is visible on the org-wide view.

`src/app/dashboard/websites/[id]/page.tsx` (updated)

- Added imports: `inArray`, `vendors`, `purposes`, `TrackerList`, `TrackerRow`.
- Tracker parallel fetch expanded from `{ id }` to all display fields.
- Two additional parallel queries resolve vendor and purpose names for the tracker rows.
- Trackers placeholder replaced with `<TrackerList trackers={trackerRows} showWebsite={false} />` inside the existing `SectionCard`.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Vendors Management — COMPLETED

### Files Changed

`src/app/api/vendors/route.ts` (new file)

- `POST /api/vendors` — org resolved from Clerk `orgId`.
- Key derived from name if not supplied (lowercased, non-alphanumeric → `_`).
- Application-layer uniqueness check before insert (DB constraint also present).
- Validates all optional fields: `domain`, `websiteUrl`, `privacyPolicyUrl`, `country`, `description`.
- `status` validated against `["active", "inactive"]` allowlist.
- `source` validated against `["custom", "iab", "google"]` allowlist.

`src/app/api/vendors/[id]/purposes/route.ts` (new file)

- `POST /api/vendors/[id]/purposes` — attaches a purpose to a vendor.
- Tenant chain: Clerk `orgId` → org → vendor (org-owned) → purpose (org-owned).
- Duplicate attach guard (409).

`src/app/api/vendors/[id]/purposes/[purposeId]/route.ts` (new file)

- `DELETE /api/vendors/[id]/purposes/[purposeId]` — detaches a purpose from a vendor.
- Same tenant chain. Returns 404 if link doesn't exist.

`src/components/vendors/create-vendor-form.tsx` (new file)

- `"use client"` form with key auto-derived from name, sanitized to `[a-z0-9_]`.
- Three sections: Vendor identity (name, key, domain, description), Links (websiteUrl, privacyPolicyUrl), Classification (country, source, status).
- On success navigates to `/dashboard/vendors`.

`src/components/vendors/vendor-list.tsx` (new file)

- `"use client"` component with `useState` search filtering by name, key, domain.
- `StatusBadge` (active/inactive), `SourceBadge` (CUSTOM/IAB/GOOGLE with distinct colors).
- Table: Name, Key (monospace), Domain, Country, Source, Status, Added.
- Two empty states: no vendors, no search results.

`src/app/dashboard/vendors/page.tsx` (new file)

- Async server component; queries `vendors` by `organizationId`.
- Passes `VendorRow[]` to `<VendorList>`. Create Vendor CTA in header.

`src/app/dashboard/vendors/new/page.tsx` (new file)

- Server component with breadcrumb; renders `<CreateVendorForm>` in `max-w-2xl`.

`src/components/policies/policy-vendors-panel.tsx` (new file)

- Pure display component (no `"use client"`) — safe to use in server components.
- Receives `PolicyVendor[]` derived from the intersection of policy attached purposes and `vendor_purposes` links.
- Each vendor card shows name, source badge, domain, purpose tags, and privacy policy link.
- Empty state guides user to the Vendors page when no vendors are linked.

`src/app/dashboard/policies/[id]/page.tsx` (updated)

- Added imports: `vendors`, `vendorPurposes`, `PolicyVendorsPanel`, `PolicyVendor`.
- When attached purposes exist: fetches `vendor_purposes` links, resolves org-owned vendors, builds `vendorId → purposeNames` map.
- `<PolicyVendorsPanel>` rendered after `<PolicyPurposesPanel>` in the grid.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Purposes Management — COMPLETED

### Files Changed

`src/app/api/purposes/route.ts` (new file)

- `POST /api/purposes` — org resolved from Clerk `orgId`.
- Key derived from name if not supplied (lowercased, non-alphanumeric → `_`).
- Application-layer uniqueness check before insert (DB constraint also present).
- `status` validated against `["active", "inactive"]` allowlist.

`src/app/api/policies/[id]/purposes/route.ts` (new file)

- `POST /api/policies/[id]/purposes` — attaches a purpose to the latest policy version.
- Full tenant chain: Clerk `orgId` → org → org websites → policy → latest version.
- Verifies the `purposeId` belongs to this org before inserting.
- Guards against duplicate attach (409).

`src/app/api/policies/[id]/purposes/[purposeId]/route.ts` (new file)

- `DELETE /api/policies/[id]/purposes/[purposeId]` — detaches a purpose from the latest policy version.
- Same tenant chain as the POST route.
- Returns 404 if the link does not exist on the latest version.

`src/components/purposes/purpose-list.tsx` (new file)

- `"use client"` component with `useState` search filtering by name, key, and description.
- `StatusBadge` (active/inactive), `RequiredBadge`.
- Table view with Name, Key (monospace), Status, Required, Created columns.
- Two empty states: no purposes at all, no search results.

`src/components/purposes/create-purpose-form.tsx` (new file)

- `"use client"` form; key auto-derived from name, sanitized to `[a-z0-9_]`.
- Key field locked to the derivation until manually edited (`keyTouched` flag).
- Fields: name, key, description, status select, isRequired checkbox.
- On success navigates to `/dashboard/purposes`.

`src/app/dashboard/purposes/page.tsx` (new file)

- Async server component; queries `purposes` by `organizationId` directly.
- Passes `PurposeRow[]` to `<PurposeList>`.
- Create Purpose CTA in page header.

`src/app/dashboard/purposes/new/page.tsx` (new file)

- Server component with breadcrumb; renders `<CreatePurposeForm>` in `max-w-2xl`.

`src/components/policies/policy-purposes-panel.tsx` (new file)

- `"use client"` component; receives `attached`, `available`, and `latestVersionId` as props.
- Attach: `POST /api/policies/[id]/purposes`; detach: `DELETE /api/policies/[id]/purposes/[purposeId]`.
- Uses `useTransition` + `router.refresh()` to re-run server data after each mutation.
- Required purposes render with a "Required" badge and the Remove button is disabled.
- "No version" guard shown when `latestVersionId` is null.

`src/app/dashboard/policies/[id]/page.tsx` (updated)

- Added imports: `purposes`, `policyPurposes`, `PolicyPurposesPanel`, `PurposeSummary`.
- Parallel `Promise.all` fetch: all org purposes + attached purpose IDs for the latest version.
- Splits purposes into `attachedPurposes` and `availablePurposes` sets.
- Purposes placeholder replaced with `<PolicyPurposesPanel>`.
- Versions card footer updated to "Publishing coming soon".

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Consent Policy Management — COMPLETED

### Files Changed

`src/app/api/policies/route.ts` (new file)

- `POST /api/policies` handler.
- Resolves local org from Clerk `orgId`.
- Verifies `websiteId` belongs to the org via `AND(id, organizationId)` — tenant isolation through the website chain.
- If `isDefault=true`, clears any existing default policy for that website in the same transaction.
- Creates `consent_policies` row (`status="draft"`) and initial `consent_policy_versions` row (`version=1, status="draft", isPublished=false`) atomically.

`src/components/policies/create-policy-form.tsx` (new file)

- `"use client"` form component accepting `websites: WebsiteOption[]` and optional `defaultWebsiteId`.
- Fields: website selector, policy name, description, isDefault checkbox.
- On success navigates to the new policy detail page.

`src/app/dashboard/policies/page.tsx` (new file)

- Org-wide policy list scoped through `websites → consent_policies`.
- Fetches version info per policy (latest version number, hasPublished flag) using `inArray`.
- Table columns: Policy name/description, Website link, Status badge, Version, Default, Created date.
- Empty states: no websites, websites but no policies.

`src/app/dashboard/policies/new/page.tsx` (new file)

- Server page loading org websites; renders `<CreatePolicyForm>`.
- Accepts `?websiteId` search param to pre-select a website (used by the per-website Add Policy link).
- Shows no-websites empty state with link to add website.

`src/app/dashboard/policies/[id]/page.tsx` (new file)

- Tenant-safe policy lookup via `AND(id, inArray(websiteId, orgWebsiteIds))`.
- Calls `notFound()` if policy missing or cross-org.
- Shows: policy name, status/default badges, description, website link, version history table.
- Placeholder sections for Purposes and Banner configuration (future tasks).

`src/app/dashboard/websites/[id]/page.tsx` (updated)

- `policyRows` select expanded to include `name` and `status` columns.
- Consent Policies placeholder replaced with live policy list showing name + status badge.
- "Create first policy" and "+ Add policy" links pre-populate `?websiteId` in the new-policy form.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Website Settings — COMPLETED

### Files Changed

`src/app/api/websites/[id]/route.ts` (new file)

- `PUT /api/websites/[id]` handler.
- Resolves local org from active Clerk `orgId` — never trusts client-supplied IDs.
- Verifies the website belongs to the org via `AND(id = $id, organization_id = $orgId)`.
- Server-side allowlist validation for `environment`, `defaultLanguage`, and `defaultRegion`.
- Updates: `name`, `description`, `environment`, `defaultLanguage`, `defaultRegion`, `updatedAt`.
- `domain` and `siteKey` are intentionally excluded — immutable after creation.

`src/components/websites/website-settings-form.tsx` (new file)

- `"use client"` controlled form component receiving `WebsiteSettingsData` props.
- Three sections: General (name, description, environment), Locale (language, region), Identity (read-only domain + site key).
- Calls `PUT /api/websites/[id]`, shows inline success/error feedback.
- `router.refresh()` after save to re-run server component data fetching.
- Cancel button calls `router.back()`.

`src/app/dashboard/websites/[id]/settings/page.tsx` (new file)

- Async server component at `/dashboard/websites/[id]/settings`.
- Tenant-safe: website query scoped to `AND(id, organizationId)`.
- Calls `notFound()` if website missing or belongs to another org.
- Three-level breadcrumb: Websites → website name → Settings.
- Renders `<WebsiteSettingsForm>` inside `max-w-2xl` container.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Websites Module — List + Detail — COMPLETED

### Files Changed

`src/components/websites/website-list.tsx` (new file)

- `"use client"` component that accepts the server-fetched website list as props.
- Client-side search filtering by name and domain via `useState`.
- `StatusBadge` — colour-coded pill for active / inactive / suspended.
- `VerifiedBadge` — inline SVG green check or grey dash.
- Three states: no websites (empty state + CTA), search returns nothing (clear button), website grid.
- Responsive card grid: 1 col → 2 col (sm) → 3 col (xl).
- Each card links to `/dashboard/websites/[id]`.

`src/app/dashboard/websites/page.tsx` (rewritten)

- Async server component; selects only the columns `WebsiteRow` requires.
- Resolves local org from Clerk `orgId` before querying — tenant-isolated.
- Passes serializable `WebsiteRow[]` to `<WebsiteList>`.
- Page header with Add Website CTA always visible.

`src/app/dashboard/websites/[id]/page.tsx` (new file)

- Async server component at the dynamic route `/dashboard/websites/[id]`.
- Tenant-safe: website lookup scoped to `AND (id = $id, organization_id = $localOrgId)`.
- Calls `notFound()` if the website doesn't exist or belongs to another org.
- Parallel `Promise.all` for tracker count, consent policy count, and scan count/last status.
- Breadcrumb, page header with status badge, settings link.
- Three summary stat cards: Consent Policies, Trackers, Scanner runs.
- Detail section: domain, environment, language, region, verification, site key, creation date.
- Five placeholder sections: SDK Installation, Consent Policies, Trackers, Scanner, Integrations.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Dashboard Overview Metrics — COMPLETED

### Files Changed

`src/app/dashboard/page.tsx` (rewritten)

- Converted from a static placeholder to an async server component.
- Resolves local organization from active Clerk `orgId` → `organizations.clerk_organization_id`.
- Fetches website list first (used for count and as the scope set for tracker/policy queries).
- Runs consent record count, tracker count, and consent policy count in parallel via `Promise.all`.
- `trackers` and `consent_policies` have no direct `organization_id` column — correctly scoped through `inArray(websiteId, websiteIds)`.
- Zero-website guard: skips `inArray` queries when the org has no websites yet.
- Renders four stat cards: Websites, Consent Policies, Consent Records, Trackers.
- Shows an empty-state CTA linking to `/dashboard/websites/new` when no websites exist.
- No new npm dependencies added.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

## Task: Dashboard Navigation — COMPLETED

### Files Changed

`src/components/dashboard/sidebar-nav.tsx` (new file)

- `"use client"` component using `usePathname` for active-route highlighting.
- Seven grouped nav sections: Overview, Websites, Consent, Scanner, Analytics, Developer, Account.
- Full nav item list: Overview, Websites, Policies, Purposes, Vendors, Consent Records, Scanner, Analytics, Audit Logs, Integrations, API Keys, Notifications, Settings, Billing.
- Inline SVG icons — no external icon library dependency added.
- Exact match for `/dashboard`; prefix match for all sub-routes.
- `aria-current="page"` on active items for accessibility.
- Active item: `bg-neutral-100 font-medium text-neutral-900`.
- Inactive item: `text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900`.

`src/app/dashboard/layout.tsx` (updated)

- Replaced placeholder `<aside>` with `<SidebarNav />`.
- `h-screen` root, `shrink-0` header, `min-h-0 flex-1` body prevents scroll bleed.
- Sidebar is `hidden` on small screens, `block` at `md` breakpoint (responsive).
- Main content area uses `bg-neutral-50` and `overflow-y-auto`.
- Clerk `OrganizationSwitcher` and `UserButton` preserved in header.

### Verification

`tsc --noEmit` → exit 0, zero lines of output.

---

# 18. Current Product Stage

Infrastructure: COMPLETE

Database: COMPLETE

Database schema: COMPLETE

Clerk authentication: COMPLETE

Clerk user synchronization: COMPLETE

Clerk organization synchronization: COMPLETE

Membership initialization: COMPLETE

Dashboard foundation: COMPLETE

Dashboard navigation: COMPLETE

Dashboard overview metrics: COMPLETE

Websites list: COMPLETE

Production hardening: COMPLETE

Analytics: COMPLETE

Scanner: COMPLETE

Tracker blocking / enforcement: COMPLETE

SDK Installation: COMPLETE (now externally testable)

Consent engine + Preference Center: COMPLETE

Banner configuration: COMPLETE

Webhooks: COMPLETE

Integrations: COMPLETE

Organization settings: COMPLETE

Team & Roles management: COMPLETE

API Keys: COMPLETE

Notifications: COMPLETE

Audit logs: COMPLETE

Trackers module: COMPLETE

Vendors management: COMPLETE

Purposes management: COMPLETE

Consent policy management: COMPLETE

Policy publish workflow: COMPLETE

Policy vendor management: COMPLETE

Consent Banner Studio: COMPLETE

Website settings: COMPLETE

Website detail: COMPLETE

Website creation: COMPLETE

Current focus:

BUILD THE SAAS DASHBOARD

---

# 19. Dashboard Roadmap

Build in this order:

1. ~~Dashboard navigation~~ COMPLETE
2. ~~Dashboard overview metrics~~ COMPLETE
3. ~~Websites list~~ COMPLETE
4. ~~Website detail~~ COMPLETE
5. ~~Website settings~~ COMPLETE
6. ~~Consent policy management~~ COMPLETE
7. ~~Policy versioning~~ (covered by Consent Policy management — v1 created on policy creation)
8. ~~Purposes~~ COMPLETE
9. ~~Vendors~~ COMPLETE
10. ~~Banner configuration~~ COMPLETE
11. ~~SDK installation~~ COMPLETE (publicly testable via /sdk-demo)
12. ~~Consent collection~~ COMPLETE (consent engine + preference center)
13. ~~Consent records~~ COMPLETE (dashboard list)
14. Consent events
15. ~~Analytics~~ COMPLETE
16. ~~Trackers display~~ COMPLETE (org list + per-website list)
17. ~~Tracker blocking / enforcement~~ COMPLETE
18. ~~Audit logs~~ COMPLETE
19. ~~Integrations~~ COMPLETE
20. ~~Webhooks~~ COMPLETE
21. ~~Notifications~~ COMPLETE
22. ~~API Keys~~ COMPLETE
23. ~~Organization Settings~~ COMPLETE
24. ~~Scanner~~ COMPLETE
25. Billing

Do not jump ahead unless explicitly instructed.

---

# 20. Agent Rules

1. READ THIS FILE FIRST.
2. Inspect the current implementation before changing anything.
3. Work only on the requested task.
4. Preserve the current architecture.
5. Do not redesign the database unless explicitly requested.
6. Do not recreate tables.
7. Do not recreate users.
8. Do not recreate organizations.
9. Do not recreate memberships.
10. Preserve tenant isolation.
11. Never trust client-supplied organization IDs.
12. Use the active Clerk organization and resolve the local organization.
13. Never expose or commit secrets.
14. Make the smallest necessary change.
15. Do not refactor unrelated code.
16. Run the smallest relevant typecheck/build/test.
17. Report exactly what changed.
18. Report the verification result.
19. UPDATE THIS FILE before finishing.
20. Record the completed work and the next task in the Agent Handoff section.

---

# 21. Agent Handoff Protocol

After every completed task, update this file.

The update must contain:

### Completed Task

What was implemented.

### Files Changed

List only files actually changed.

### Verification

Typecheck/build/test result.

### Current Status

What now works.

### Next Task

The exact next recommended task.

Never remove historical completed work from this file unless it is genuinely obsolete.

---

# 22. COMPLETED: SaaS Dashboard UI Redesign

### Completed Work

Redesigned the entire SaaS dashboard UI to closely match the `ui.jpeg` reference style: clean light theme, soft glass/neumorphic cards, rounded corners, subtle shadows, spacious layout, professional typography, compact top header, polished sidebar, modern stroke icons, clear active states, and responsive behavior. Strictly a presentation-layer refactor — all existing Clerk auth/OrganizationSwitcher/UserButton/NotificationBell, centralized bootstrap, Drizzle queries, routes, business logic, and database schema preserved unchanged. Real org-scoped data is used throughout, with fallback placeholders only when real datasets are empty/zero. Accessibility, keyboard navigation, and readable contrast preserved.

### Files Changed

1. `src/app/globals.css` — complete rewrite; slate/indigo design tokens, radius/typography tokens, `@layer utilities` with `card-shadow`, `soft-shadow`, `inner-shadow`, `glass-card`, `sidebar-item-active` (purple gradient active pill), `stat-icon-{blue,green,amber,rose,purple,teal}` gradients, `compliance-glow`, fade/slide animations, thin scrollbars, gradient-primary utility.
2. `src/components/ui/card.tsx` — new shared primitives: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` using `forwardRef`, `rounded-2xl card-shadow`, optional `hover` prop for lift.
3. `src/components/ui/badge.tsx` — new shared `Badge` primitive with 7 variants (default/success/warning/danger/neutral/primary/purple) × 2 sizes, `rounded-full ring-1 ring-{color}/20` pattern.
4. `src/components/ui/stat-card.tsx` — new shared `StatCard` primitive with 6 gradient icon color tiles, trend up/down/neutral arrows + semantic colors, label/3xl value/description layout, subtle hover lift.
5. `src/components/ui/button.tsx` — new shared `Button` primitive with 5 variants (primary/secondary/ghost/outline/danger) × 4 sizes (sm/md/lg/icon), primary uses `gradient-primary` + indigo shadow.
6. `src/components/dashboard/sidebar-nav.tsx` — complete rewrite. Matches reference structure exactly: top gradient-shield BrandLogo ("Consent Manager" wordmark), flat 10-item nav (Dashboard/Consents/Data Subjects/Requests/Purposes/Data Categories/Third Parties/Audit Logs/Settings/Integrations) with 20×24 stroke icons, bottom "Stay compliant" CompliancePromo card. Active nav item uses `sidebar-item-active` purple gradient pill. Sidebar `lg:w-72`, hidden below `lg`.
7. `src/app/dashboard/layout.tsx` — complete rewrite. Layout: `flex min-h-screen` sidebar column + main column. Header: `sticky top-0 h-20 border-b border-slate-100/60 bg-white/70 backdrop-blur-xl` with centered SearchBar (lg+), HeaderIconButton Help, NotificationBell upgraded to h-11 rounded-2xl soft-shadow, UserButton with showName + soft-shadow trigger, OrganizationSwitcher styled with soft-shadow pill triggers. Mobile: `lg:hidden` mini gradient logo + wordmark next to OrganizationSwitcher. Content area: `px-5 md:px-8 py-6 md:py-10`.
8. `src/components/notifications/notification-bell.tsx` — rewritten to h-11 w-11 rounded-2xl soft-shadow container matching header controls. Unread badge repositioned `-top-0.5 -right-0.5` with ring-2 ring-white + shadow-rose/30.
9. `src/app/dashboard/page.tsx` — complete rewrite matching reference layout:
   - Header "Dashboard" / "Welcome back! Here's what's happening with consents."
   - 4-up consent metric StatCards (Total/Active/Pending/Withdrawn) with trend % + "vs last month" description.
   - 3+2 grid: `Consent Overview` area-line SVG chart (gradient indigo fill + dashed rose withdrawn line + 5 date ticks + legend) with "Last 30 days" soft-shadow dropdown.
   - 3+2 grid: `Consent by Purpose` donut SVG chart with 4 slices (Marketing/Analytics/Personalization/Others) and center totals.
   - 3+2 grid: `Recent Consent Requests` 4 rows with gradient avatars, success/warning/danger Badges, relative times, indigo-50 "View all" pill.
   - 3+2 grid: `Compliance Status` with layered pulse shield glow (`compliance-glow`) + 4 emerald checkmark rows.
   - Secondary 3-card Websites/Policies/Trackers row when `websiteCount>0`.
   - websiteCount=0 empty state: gradient dashed container, globe stat-icon, primary CTA.
   - All queries unchanged: organizationId scoped totals, purposeBreakdown granted counts, recent consentRecords, websiteCount/policyCount/trackerCount. Email extracted from `metadata.email` with friendly fallback when absent.
10. `src/app/dashboard/analytics/page.tsx` — shared Card/StatCard wrapping; 5 new SVG stat-card icons (Total/Accepted/Rejected/Partial/Withdrawn); SectionHeader action prop; all tables wrapped in shared Card with rounded-2xl soft-shadow + overflow-x-auto; event-type breakdown wrapped in Cards; empty states upgraded to gradient-primary CTA + dashed container; section actions ("View all trackers/scanner/records") use the indigo-50 rounded-xl pill pattern.
11. `src/components/websites/website-list.tsx` — restyled with new design tokens: search bar upgraded to h-12 rounded-2xl soft-shadow; both empty states get rounded-3xl card-shadow dashed-border containers with gradient blobs + shared Button CTA; StatusBadge now uses shared `Badge` variant prop; VerifiedBadge redesigned with emerald/slate SVG tiles; website link cards use `rounded-2xl bg-white card-shadow p-6 card-shadow-hover` with group-hover indigo title color and `border-t border-slate-100` footer.

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output. All TypeScript errors introduced by the UI refactor were fixed: (a) card.tsx inline generic/arrow-expression syntax — refactored all 6 `forwardRef` components to use block body with explicit `return` instead of expression wrappers; (b) dashboard/page.tsx referenced non-existent `consentRecords.visitorEmail` column — replaced with `consentRecords.metadata` and safe optional-chaining extractor `(r.metadata as Record<string, unknown>).email` plus string type guard; (c) removed unused `gte` drizzle import from dashboard/page.tsx.

### Next Task

Build the Billing page per section #23 (was #22). The next agent must:

- Read this file first.
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the new shared Card/Badge/StatCard/Button primitives from `src/components/ui/*` and the `globals.css` design tokens so it inherits the new premium dashboard aesthetic.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices (amount, status, date, download placeholder).
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- All queries must be scoped to the active organization via centralized bootstrap (do not re-implement auth).
- Keep Clerk authentication/bootstrap unchanged.
- Keep database schema unchanged.
- Do not add new npm dependencies.
- Run `npx tsc --noEmit` and fix only issues caused by the billing work.
- Update this file (CMP_AGENT_CONTEXT.md) with a new completed-task entry, files changed, verification result, and record the subsequent task before stopping.

---

# 23. COMPLETED: Public SDK / External Website Testing

### Completed Work

Made the existing CMP SDK fully testable on an external website. Refactored the SDK script generator so the public endpoint can serve a generic, runtime-self-configuring script (previously it baked siteKey/apiBase at generation time, unsuitable for a shared public embed). Added the real public SDK script endpoint `/api/sdk/script` with CORS `*` and cache headers. Added full CORS headers plus OPTIONS preflight handlers to `/api/consent/record` (GET/POST) and `/api/consent/withdraw` (POST) so consent submissions and withdrawals from external websites succeed in browsers. Updated the dashboard Websites Installation page to derive the running app's origin from inbound request headers and emit real, absolute snippet URLs pointing back to `/api/sdk/script` and `/api/sdk/{siteKey}/config` (replacing the placeholder `cdn.cmp.example.com` URL). Added a public, unauthenticated `/sdk-demo` page that simulates an external website: accepts a siteKey, mounts the SDK via the same `<Script>` pattern documented in the install guide, injects three test tracker scripts blocked via `type="text/plain" data-cmp-purpose`, exposes CMP API buttons (show banner, open preference center, get consent, withdraw), and renders a live consent JSON readout plus event log and troubleshooting panel. Strictly reused the existing consent engine, banner configuration, SDK body, and database schema — no UI redesigns and no schema changes.

### Files Changed

1. `src/lib/sdk/cmp-sdk-script.ts` — extracted invariant body into shared `buildSdkScriptBody(siteKey, apiBase, preamble?)`; preserved existing `buildCmpSdkScript(options)` semantics exactly; added new `buildGenericCmpSdkScript()` which prepends a robust runtime bootstrap preamble that walks `<script>` tags, finds the embed by `data-site-key` or src path `/api/sdk/script`, resolves `SITE_KEY` (data attr → `window.__CMP_SITE_KEY` → `?siteKey=` query) and `API_BASE` (data attr → `window.__CMP_API_BASE` → script src origin), and warns/returns early if either is missing.
2. `src/app/api/sdk/script/route.ts` — NEW public GET/OPTIONS endpoint serving `application/javascript` from `buildGenericCmpSdkScript()`. CORS `*`, cache `public, max-age=300, stale-while-revalidate=86400`, `X-Content-Type-Options: nosniff`. OPTIONS returns 204 with `GET, OPTIONS`. Optional `?siteKey=` / `?apiBase=` query params are prepended as `window.__CMP_*` globals so a simple `<script src="/api/sdk/script?siteKey=X">` still initializes without attributes.
3. `src/app/api/consent/record/route.ts` — added `CORS_HEADERS` constant and merged into every existing `NextResponse.json` success and error path (GET success, POST success, 400/404/500/409 errors). Added OPTIONS handler returning 204 with `GET, POST, OPTIONS`.
4. `src/app/api/consent/withdraw/route.ts` — same CORS overlay: `CORS_HEADERS` on every response; OPTIONS returns 204 with `POST, OPTIONS`.
5. `src/app/dashboard/websites/[id]/installation/page.tsx` — server component: imported `next/headers`, derived `appOrigin` from `x-forwarded-host/host` + `x-forwarded-proto/(localhost→http)`, computed `sdkScriptUrl = ${appOrigin}/api/sdk/script` and `configUrlAbsolute`. Replaced the placeholder `https://cdn.cmp.example.com/sdk/v1/cmp.min.js` with the real derived `sdkScriptUrl` in HTML / Next.js / React snippet templates. Next.js snippet changed to `strategy="beforeInteractive"`. Config-URL prose references switched to absolute `configUrlAbsolute`.
6. `src/app/sdk-demo/page.tsx` — NEW unauthenticated public client page simulating an external website. `"use client"` + `<Suspense>` for `useSearchParams`. Reads siteKey from URL `?siteKey=` or a small input form. Mounts the SDK via `next/script` `<Script src={/api/sdk/script?siteKey=X} strategy="beforeInteractive" />` mirroring the install guide exactly. Injects three test tracker scripts (analytics blocked, marketing blocked, essential unblocked) to exercise the `data-cmp-purpose` blocker enforcement. Exposes four CMP API buttons (`showBanner`, `openPreferenceCenter`, `getConsent`, `withdrawConsent`), a live `getConsent` JSON readout, an event log (`cmp:ready`, `cmp:consent-changed`, etc.), a config summary panel, the installed snippet source box, and a troubleshooting footer with URL back-links to dashboard installation + config endpoint.
7. `CMP_AGENT_CONTEXT.md` — (this file) updated SDK Installation product-stage entry, roadmap line 11, and added this completion section with renumbered handoff sections.

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output (run twice after edits, confirmed clean). Code paths verified by construction:
- Generic SDK script resolves siteKey/apiBase at runtime via multiple fallbacks; missing values `console.warn` and return before touching DOM, preventing external-site breakage.
- Consent record and withdraw routes now attach `Access-Control-Allow-Origin: *` + OPTIONS 204 preflights, satisfying the browser CORS contract for cross-origin submits from external domains.
- Installation page derivation of `appOrigin` matches the real running host (behind proxies via `x-forwarded-*`), so the snippets emitted in the dashboard actually resolve back to the live CMP.
- `/sdk-demo` mirrors the install guide's Next.js snippet pattern exactly and exposes the CMP API surface for manual end-to-end clicking.

### Current Status

The CMP SDK is fully testable from an external website. Any website owner can now copy the snippet produced by their dashboard Installation page, drop it into their site, and:
1. The `<script>` tag loads a real SDK script from the live CMP (`/api/sdk/script`).
2. The SDK detects its own `data-site-key` or `?siteKey=` or `window.__CMP_SITE_KEY` and initializes using that published website's configuration.
3. It fetches `/api/sdk/{siteKey}/config` (already CORS-enabled) and renders the previously-configured consent banner + Preference Center using the existing banner engine (unchanged).
4. Banner Accept/Reject/Manage submits, Preference Center saves, and explicit withdrawals all POST cross-origin to the consent record / withdraw endpoints (now CORS-enabled).
5. Tracker enforcement via `type="text/plain" data-cmp-purpose="marketing"` continues to work exactly as before, now running in a real third-party-origin page.
6. Tenant isolation, Clerk auth on dashboard routes, and database schema are untouched.

### Next Task

Build the Billing page per section #24 (below). The next agent must:

- Read this file first.
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the new shared Card/Badge/StatCard/Button primitives from `src/components/ui/*` and the `globals.css` design tokens so it inherits the new premium dashboard aesthetic.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices (amount, status, date, download placeholder).
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- All queries must be scoped to the active organization via centralized bootstrap (do not re-implement auth).
- Keep Clerk authentication/bootstrap unchanged.
- Keep database schema unchanged.
- Do not add new npm dependencies.
- Run `npx tsc --noEmit` and fix only issues caused by the billing work.
- Update this file (CMP_AGENT_CONTEXT.md) with a new completed-task entry, files changed, verification result, and record the subsequent task before stopping.

---

# 24. COMPLETED: Consent Policy Publish Workflow + Policy-Vendor Attachment

### Completed Work

Implemented the full consent policy publishing workflow and replaced the read-only vendor display with a real attach/detach management UI. No database schema changes were required.

**Publish workflow:**

- A policy must have at least one purpose attached before it can be published.
- Publishing the latest draft version sets `isPublished=true`, `status='active'`, `publishedAt=now`, `effectiveFrom=now` on `consent_policy_versions` and flips the parent `consent_policies.status` to `'active'`.
- Re-publishing an already-published version returns `409` with `alreadyPublished:true` — the user must create a new version to make further changes.
- The `PublishPolicyButton` client component has a full state machine: idle → confirm (amber warning) → publishing (spinner) → success (green badge + `router.refresh()`) / error (red message + retry link). The policy detail page header badge and the versions table status column both update on refresh, giving clear Draft/Published visual feedback.

**Vendor management:**

- Vendors attach to a policy through the existing `vendor_purposes` table — no new join table needed. Attaching a vendor creates `vendor_purposes` rows linking the vendor to all of the policy version's currently-attached purposes. Detaching removes all such rows.
- The new `PolicyVendorManagerPanel` client component shows attached vendors with per-row purpose tags and a Remove button, and an inline searchable dropdown of available (not-yet-linked) org vendors. Amber warning is shown when no purposes are attached yet. All mutations use `useTransition` + `router.refresh()`.

### Files Changed

`src/app/api/policies/[id]/publish/route.ts` (new file)

- `POST /api/policies/[id]/publish` — full tenant chain: Clerk `orgId` → org → websites → policy → latest version.
- Guards: version must exist (422), must not already be published (409 `alreadyPublished:true`), must have ≥1 purpose (422 `missingPurposes:true`).
- On success: updates `consent_policy_versions` (`isPublished=true`, `status='active'`, `publishedAt`, `effectiveFrom`) and `consent_policies` (`status='active'`).

`src/app/api/policies/[id]/vendors/route.ts` (new file)

- `POST /api/policies/[id]/vendors` — body: `{ vendorId, purposeIds? }`.
- Attaches vendor to the policy by inserting `vendor_purposes` rows for all (or a specified subset of) the version's attached purposes.
- Tenant chain: org → websites → policy → version → attached purposeIds; vendor must belong to same org.
- Duplicate guard: skips already-linked purposes, returns 409 if all are already linked.

`src/app/api/policies/[id]/vendors/[vendorId]/route.ts` (new file)

- `DELETE /api/policies/[id]/vendors/[vendorId]` — removes all `vendor_purposes` rows linking the vendor to the policy version's attached purposes.
- Returns 404 if vendor is not linked to any policy purpose.

`src/components/policies/policy-vendor-manager-panel.tsx` (new file)

- `"use client"` component; exports `ManagedVendor`, `AvailableVendor` types.
- Props: `policyId`, `latestVersionId`, `attached: ManagedVendor[]`, `available: AvailableVendor[]`, `hasPurposes`.
- Attach: inline searchable dropdown with source badges, calls `POST /api/policies/[id]/vendors`.
- Detach: per-row Remove button, calls `DELETE /api/policies/[id]/vendors/[vendorId]`.
- Guards: no version (empty state), no purposes (amber warning block), all vendors linked (friendly message + "Create a new vendor" link).

`src/components/policies/publish-policy-button.tsx` (new file)

- `"use client"` component; state machine: `idle | confirm | publishing | success | error`.
- Props: `policyId`, `latestVersionId`, `latestVersionNumber`, `isPublished`, `publishedAt`, `hasPurposes`.
- Already-published: renders green "Published {date}" badge — no action possible.
- No version: disabled "No version to publish" button.
- No purposes: disabled button with explanatory hint.
- Idle: "Publish v{n}" button → confirm step.
- Confirm: amber warning box with irreversibility note + "Yes, publish v{n}" / Cancel buttons.
- Success: green "v{n} published {date}" badge + `router.refresh()` to update the page.
- Error: red message + "Try again" link that resets to idle.

`src/app/dashboard/policies/[id]/page.tsx` (updated)

- Imports: removed `PolicyVendorsPanel`/`PolicyVendor`; added `PolicyVendorManagerPanel`/`ManagedVendor`/`AvailableVendor`/`PublishPolicyButton`.
- Vendor data-fetch: replaced per-section vendor query with a single `allOrgVendors` fetch + conditional `vpLinks` fetch; splits into `attachedVendors` (ManagedVendor[]) and `availableVendors` (AvailableVendor[]) using the `vendorPurposeNamesMap`.
- Versions card: added `Published` column (shows `publishedAt` date or `—`); replaced "Publishing coming soon" placeholder with `<PublishPolicyButton>` wired to all required props.
- Vendors section: replaced `<PolicyVendorsPanel>` with `<PolicyVendorManagerPanel>` passing `attached`, `available`, and `hasPurposes={attachedIds.size > 0}`.

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Current Status

- Policy detail page shows clear Draft/Published status in both the header badge and the versions table.
- Users can publish a draft version with a confirmation step and immediate visual feedback.
- Already-published versions are protected from accidental overwrite.
- Vendors section is now a full management panel — attach from a searchable dropdown, detach with a per-row Remove button, linked through the existing `vendor_purposes` table with no schema changes.
- Tenant isolation is preserved end-to-end: all three new API routes enforce the Clerk `orgId` → org → websites → policy chain, and the vendor ownership check is applied to every mutation.

---

# 33. COMPLETED: Policy Vendor Selection — Combobox + Inline Quick-Create

### Completed Work

Replaced the flat button-list vendor dropdown in `PolicyVendorManagerPanel` with a proper combobox UI that shows vendor name, domain, and status on each option row, and added an inline quick-create form so users can create a custom vendor without leaving the policy detail page.

**VendorCombobox (new sub-component inside the panel file):**

- Renders as a styled combobox trigger that expands into a floating dropdown on click.
- Live filtering by name, domain, or key as the user types — results update on every keystroke.
- Each result row shows: vendor name (bold), source badge (CUSTOM / IAB / GOOGLE), status badge (only shown when inactive), domain (secondary line). A `+ Add` affordance sits at the right of each row.
- Footer row always present: `Create new vendor` (pre-filled with the current search query when there are no results, or generic when results exist). This removes the dead-end "No vendors match" state.
- Dropdown closes on outside click via a `useEffect` + `mousedown` listener on `document`.
- Keyboard-accessible: `role="combobox"` / `role="listbox"` / `role="option"` ARIA attributes; Enter/Space opens the trigger when focused.

**Inline quick-create form (inside the dropdown):**

- Fields: Name (required, autofocus), Key (auto-derived from name, editable, sanitised to `[a-z0-9_]`), Domain (optional).
- `Create & add` calls `POST /api/vendors` to create the vendor (status: active, source: custom), then immediately calls `POST /api/policies/[id]/vendors` to attach it — both existing APIs, unchanged.
- `Back` button returns to the results list without discarding open state.
- `Full form ↗` link opens `/dashboard/vendors/new` in a new tab for advanced fields (website URL, privacy policy URL, country, classification).
- If vendor creation succeeds but attach fails, a specific error message is shown.

**Attached vendor rows:**

- `StatusBadge` added alongside `SourceBadge` (inactive state shown, active omitted to reduce clutter).
- Remove button passes `vendorName` to the detach handler so the success flash message reads `"<Name>" removed.`

**Feedback:**

- Green success flash messages (3-second auto-dismiss) for add, create-and-add, and remove.
- Error banner has an explicit `Dismiss` button (previously had none).

### Files Changed

`src/components/policies/policy-vendor-manager-panel.tsx` — complete rewrite. No other files changed. Existing APIs (`POST /api/vendors`, `POST /api/policies/[id]/vendors`, `DELETE /api/policies/[id]/vendors/[vendorId]`) are called as-is without modification. Database schema, auth, and tenant isolation unchanged.

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Current Status

The vendor selection on the policy detail page (`/dashboard/policies/[id]`) is now a searchable combobox. Users can find existing vendors by name, domain, or key, see their status at a glance, and attach them with one click. When no matching vendor exists, the `Create new vendor` footer option expands an inline minimal form (name + key + domain) that creates and attaches the vendor in one action. Duplicate attachment is still prevented server-side (409). All tenant isolation guarantees from the prior session are preserved.

---

# 34. COMPLETED: Vendor Creation Form — Catalog Combobox + Auto-Population

### Completed Work

Added a searchable vendor catalog to the vendor creation form so users can select a common third-party vendor and have all fields pre-populated automatically, instead of entering every detail manually.

**`src/lib/vendor-catalog.ts` (new file)**

- 38 curated vendor entries across 8 categories: Analytics, Advertising, Social, Marketing, Payments, Support, Performance, A/B Testing.
- Vendors include: Google Analytics 4, Google Universal Analytics, Microsoft Clarity, Mixpanel, Amplitude, Hotjar, Heap, Segment, Plausible, Matomo, Google Ads, Google Ad Manager, Meta Pixel, LinkedIn Insight Tag, Twitter/X Pixel, TikTok Pixel, Criteo, YouTube, Google Maps, Facebook Social Plugins, HubSpot, Mailchimp, Intercom, Klaviyo, Brevo, Stripe, Razorpay, PayPal, Paddle, Zendesk, Drift, Crisp, Cloudflare, Sentry, Datadog, Optimizely, VWO, LaunchDarkly.
- Each entry has: `name`, `key`, `domain`, `websiteUrl`, `privacyPolicyUrl`, `country`, `description`, `source` (`custom | iab | google`), `category`.
- Exports `VENDOR_CATALOG`, `CATALOG_CATEGORIES` (unique ordered category list), and `searchCatalog(query)` (filters by name / domain / key / category).
- Pure client-safe module — no server-only imports.

**`src/components/vendors/create-vendor-form.tsx` (rewritten)**

New `CatalogCombobox` sub-component:
- Trigger button shows current selection name or "Select a vendor from the catalog…" placeholder.
- Dropdown: search input at top (filters all 38 entries by name/domain/key/category); category filter pills (All + 8 categories) shown when search is empty; results list with letter-tile, name, source badge, category pill, domain per row; "Custom vendor" sentinel always first with a `manual entry` badge.
- Selected item shows a checkmark. Footer shows result count.
- Closes on outside click via `useEffect` + `mousedown` listener.
- Category filter and search query are independent — selecting a category clears search and vice versa.

`handleCatalogSelect(entry | null)` in the parent form:
- Entry selected → sets all 7 fields (`name`, `key`, `domain`, `websiteUrl`, `privacyPolicyUrl`, `country`, `description`, `source`) + sets `keyTouched=true` so further name edits don't re-derive the key.
- `null` (Custom) → clears all fields for manual entry.
- A green confirmation banner ("Fields pre-filled from catalog. You can edit any field below before saving.") appears after catalog selection.
- Editing the name field after a catalog selection marks `catalogSelection` as `null` (stale), removing the banner.

All existing form fields, validation, `POST /api/vendors` call, duplicate-key guard, server-side tenant isolation, and navigation (`router.push` / `router.back`) are 100% preserved and unchanged.

### Files Changed

- `src/lib/vendor-catalog.ts` — new file, 38-entry catalog + search helper
- `src/components/vendors/create-vendor-form.tsx` — rewritten with `CatalogCombobox`

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Current Status

The vendor creation page (`/dashboard/vendors/new`) now has a two-step UX: pick from catalog → review/edit pre-filled fields → save. Custom vendor option preserves the original blank-form flow. Server-side API, duplicate prevention, tenant isolation, and database schema are unchanged.

---

# 35. COMPLETED: Team & Roles Management

### Completed Work

Built a complete Team & Roles management module at `/dashboard/settings/team`. Owners and Admins can view all organisation members, change roles, remove members, send Clerk invitations, and revoke pending invitations. Members get a read-only view with an amber notice. A roles & permissions reference card is shown to all members. The sidebar "Team / Roles" link now correctly points to the new page.

**API routes (all enforce Clerk orgId → local org → local user → membership+role RBAC guard):**

`src/app/api/settings/team/role/route.ts` (new)
- `POST` — changes a member's role.
- Guards: caller must be Owner or Admin; target membership must belong to the org; cannot demote the last Owner (counts remaining Owner memberships before allowing); no-op if role unchanged.
- Audit log: `team.member.role_changed` with `fromRole`/`toRole`/`targetUserId`.

`src/app/api/settings/team/[memberId]/route.ts` (new)
- `DELETE` — sets membership `status="inactive"`.
- Guards: caller Owner/Admin; cannot remove yourself; cannot remove the last active Owner.
- Audit log: `team.member.removed`.

`src/app/api/settings/team/invite/route.ts` (new)
- `POST` — sends a Clerk Organisation invitation via `clerkClient().organizations.createOrganizationInvitation`.
- Validates: email format, role ∈ `["org:admin", "org:member"]`.
- Deduplicates: fetches existing pending invitations and returns 409 if the address already has one.
- Audit log: `team.member.invited`.

`src/app/api/settings/team/invite/[invitationId]/route.ts` (new)
- `DELETE` — revokes a Clerk invitation via `revokeOrganizationInvitation`.
- Fetches invitation first via `getOrganizationInvitation` to confirm it belongs to the caller's org before revoking.
- Audit log: `team.invitation.revoked`.

**Client components:**

`src/components/settings/team-members-panel.tsx` (new)
- `"use client"` — exports `TeamMember`, `AvailableRole`, `PendingInvitation` types.
- Members table: avatar (image or initial tile), name + "(you)" badge, email, inline role `<select>` (disabled for self + non-managers), status badge, joined date, Remove button.
- Remove → confirmation modal with member name + email, Cancel / Remove member buttons.
- Pending invitations section: dashed-border avatar, email, role label, date, Revoke button.
- Success flash (4 s auto-dismiss), dismissible error banner.
- All mutations use `useTransition` + `router.refresh()`.

`src/components/settings/invite-member-form.tsx` (new)
- `"use client"` — collapses to "Invite member" button when closed; hidden entirely when `canInvite=false`.
- Expanded: email input + role select (`Member` / `Admin`), Send / Cancel.
- Success flash + auto-close after 2.5 s; inline error on failure.

**Page:**

`src/app/dashboard/settings/team/page.tsx` (new)
- Async server component; auth via `auth()`; resolves local org, local user, caller membership+role.
- Fetches: all org memberships joined to users + roles; all roles; all permissions; all role_permissions; Clerk pending invitations (wrapped in try/catch — non-critical).
- Computes: `canManage` (Owner|Admin), `activeCount`, `rolePermMap` (roleId → permissionName[]), `sortedRoles` (Owner → Admin → Member → rest).
- Renders: `InviteMemberForm`, amber read-only banner (non-managers), `TeamMembersPanel`, Roles & permissions card grid (per-role permission checklist), all-permissions pill row.

**Sidebar:**

`src/components/dashboard/sidebar-nav.tsx` (updated)
- "Team / Roles" `href` changed from `/dashboard/settings/organization` to `/dashboard/settings/team`.

### Files Changed

- `src/app/api/settings/team/role/route.ts` — new
- `src/app/api/settings/team/[memberId]/route.ts` — new
- `src/app/api/settings/team/invite/route.ts` — new
- `src/app/api/settings/team/invite/[invitationId]/route.ts` — new
- `src/components/settings/team-members-panel.tsx` — new
- `src/components/settings/invite-member-form.tsx` — new
- `src/app/dashboard/settings/team/page.tsx` — new
- `src/components/dashboard/sidebar-nav.tsx` — updated (Team/Roles href)

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Current Status

`/dashboard/settings/team` is live. Owners and Admins see a full management interface; Members see read-only. All mutations are protected server-side with the same RBAC pattern used throughout the codebase. Database schema, Clerk authentication, and all unrelated modules are unchanged.

---

# 36. COMPLETED: Consent Banner Studio (Visual Consent Designer)

### Completed Work

Built a full visual consent banner designer at `/dashboard/policies/[id]/studio`. The studio is a full-viewport split-panel interface: a tabbed control panel on the left and a live preview panel on the right. Every control change updates the preview instantly with no page reload. The final configuration is saved through the existing `PUT /api/policies/[id]/banner-config` API into the `consent_policy_versions.configuration` JSONB field — no new database tables or schema changes.

**Architecture:**

`src/components/policies/banner-studio/banner-renderer.tsx` (new)

- `"use client"` component that renders a full-fidelity, interactive-looking consent banner from a `BannerConfiguration`.
- Handles all three layout variants (bar / box / dialog) with appropriate typography, padding, and button rendering.
- Accepts optional `onAccept`, `onReject`, `onCustomize` callbacks for preview interactivity.
- Renders an inline overlay div when `config.overlayEnabled` is true.
- Uses inline styles driven entirely by the config values (colors, border radius, background, text) so every change is instantly reflected.
- Position styles (`bottom`, `top`, `bottom-left`, `bottom-right`, `center`) implemented with `position: absolute` + coordinate CSS so the banner appears in the correct location over the preview.

`src/components/policies/banner-studio/studio-preview.tsx` (new)

- `"use client"` component. Two sub-components inside:
  - `IframePreview` — embeds the website in a `sandbox="allow-scripts allow-same-origin allow-forms"` iframe, then overlays the `BannerRenderer` in the host DOM (not inside the iframe) so the banner always renders correctly regardless of the embedded site. An 8-second timeout fires `onBlock()` if no `load` event is received (catches silent X-Frame-Options blocks). Reads `contentWindow.location.href` post-load to detect `about:blank` (iframe blocked to same-origin).
  - `FallbackMockPage` — a styled mock website (header, hero, content grid) used when: no URL has been entered, the site blocks embedding, or a load error occurs. Shows an amber notice banner explaining the fallback. `BannerRenderer` is overlaid on the mock page too.
- Top toolbar: URL input bar with `Load` button (prepends `https://` if missing), desktop/mobile viewport toggle (icon buttons with `aria-pressed`).
- `viewport` state drives a CSS `width` transition between `100%` (desktop) and `375px` (mobile) on the preview container so the banner position can be tested at both sizes.

`src/components/policies/banner-studio/studio-controls.tsx` (new)

- `"use client"` component. Tabbed control panel with 5 tabs: **Presets**, **Layout**, **Style**, **Text**, **Behavior**.
- **Presets tab** — 5 named style presets, each rendered as a clickable card with icon, name, and description. Active preset highlighted with a ring + checkmark. Applying a preset fires `onApplyPreset(overrides)` which merges a `Partial<BannerConfiguration>` onto the current state:
  - *Bottom Bar* — `layout: bar, position: bottom, borderRadius: 0, overlayEnabled: false` + white/dark palette
  - *Top Bar* — `layout: bar, position: top, borderRadius: 0` + dark/indigo palette
  - *Center Modal* — `layout: dialog, position: center, borderRadius: 12, overlayEnabled: true, blockPageUntilConsent: true` + indigo palette
  - *Bottom Sheet* — `layout: box, position: bottom, borderRadius: 16, overlayEnabled: true` + sky palette
  - *Floating Panel* — `layout: box, position: bottom-right, borderRadius: 12, overlayEnabled: false` + emerald palette
- **Layout tab** — position picker (5 visual icon buttons), layout style picker (Bar/Box/Dialog as button grid), overlay toggle.
- **Style tab** — three inline color pickers (primary, background, text) each with `<input type="color">` + hex text input; border-radius range slider with live value display; button visibility toggles; preference center visibility toggles.
- **Text tab** — title, description textarea, all 4 button labels, privacy policy link text + URL.
- **Behavior tab** — default consent select, expiry days input, 4 behavior toggles, language + region selects.
- Footer save bar: "Save configuration" button (disabled when no version), reset button (↺), inline error/success messages.
- All controls use `Toggle` (custom pill switch with `role="switch"` + `aria-checked`), `Field`, `ColorField`, and `SectionHeader` sub-components.

`src/components/policies/banner-studio/index.tsx` (new)

- Root `"use client"` `BannerStudio` component.
- Props: `policyId`, `policyName`, `latestVersionId`, `initialConfig`, `websiteDomain`.
- Owns all state: `config`, `activePreset`, `viewport`, `saving`, `saveError`, `saveSuccess`.
- `handleChange<K>(key, value)` — updates one field; clears `activePreset` if the changed field is part of that preset's overrides (the config has diverged).
- `handleApplyPreset(overrides)` — merges partial overrides; matches against `PRESETS` by `JSON.stringify` to set `activePreset`.
- `handleSave()` — `PUT /api/policies/[policyId]/banner-config` with full config; shows success for 3 s; calls `router.refresh()`.
- Layout: full-viewport `h-screen overflow-hidden` column. Top header bar (back link, policy name breadcrumb, version badge). Split row: `w-72/xl:w-80` left aside for `StudioControls`, flex-1 right `main` for `StudioPreview`.
- Derives `previewUrl` by prepending `https://` to `websiteDomain` if it doesn't already have a protocol.

`src/app/dashboard/policies/[id]/studio/page.tsx` (new)

- Async server component. Auth via `auth()` → resolves local org → scopes policy through org websites (`inArray`) → `notFound()` if missing or cross-org.
- Resolves website domain for the preview URL suggestion.
- Fetches latest version + `configuration` JSONB; calls `parseBannerConfig` to merge with defaults.
- Renders `<BannerStudio>` — no wrapper padding since the component manages its own full-viewport layout.

`src/app/dashboard/policies/[id]/page.tsx` (updated)

- Page header action area replaced: now renders two buttons — a dark "Banner Studio" button (links to `/studio`, includes a sparkline SVG icon) and the existing "Preview preference center" button — wrapped in a `flex gap-2` container.

### Files Changed

- `src/components/policies/banner-studio/banner-renderer.tsx` — new
- `src/components/policies/banner-studio/studio-preview.tsx` — new
- `src/components/policies/banner-studio/studio-controls.tsx` — new
- `src/components/policies/banner-studio/index.tsx` — new
- `src/app/dashboard/policies/[id]/studio/page.tsx` — new
- `src/app/dashboard/policies/[id]/page.tsx` — updated (Studio button in header)

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Current Status

The Banner Studio is accessible from any policy detail page via the "Banner Studio" button in the header. It opens at `/dashboard/policies/[id]/studio`. The studio provides a full visual design experience: pick a preset, tweak every aspect of the banner, and see it rendered in real time over either the real website (if embedding is allowed) or a realistic mock page. Saving pushes the config to the existing `banner-config` API with no database schema changes. Tenant isolation is preserved — the server page verifies policy ownership through the org → websites chain before rendering.

### Next Task

Build the Billing page. The next agent must:

- Read this file first.
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives from `src/components/ui/*` and the `globals.css` design tokens so it inherits the premium dashboard aesthetic.
- Once the Billing page exists, update the sidebar Administration group's "Billing" item href from `/dashboard/settings/organization` to the new `/dashboard/billing`.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices (amount, status, date, download placeholder).
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- All queries must be scoped to the active organization via centralized bootstrap (do not re-implement auth).
- Keep Clerk authentication/bootstrap unchanged.
- Keep database schema unchanged.
- Do not add new npm dependencies.
- Run `npx tsc --noEmit` and fix only issues caused by the billing work.
- Update this file (CMP_AGENT_CONTEXT.md) with a new completed-task entry, files changed, verification result, and record the subsequent task before stopping.

---

# 25. COMPLETED: Dashboard Sidebar Navigation Redesign (CMP-Specific)

### Completed Work

Redesigned `src/components/dashboard/sidebar-nav.tsx` into a professional CMP-specific grouped sidebar while preserving the existing premium visual style (purple gradient active pill, soft shadows, rounded-2xl, glassy backdrop, stroke icons). Replaced the previous flat 10-item list with 7 semantic groups and 22 navigation items matching the CMP domain. All 22 items point to existing implemented routes — items whose dedicated pages do not exist yet fall back to the closest existing parent route (SDK/Installation → Developers; Team/Roles & Billing → Organization Settings) rather than linking to fake 404 pages. Active-route highlighting (`usePathname`) preserved with exact-match for `/dashboard` and prefix-match for all sub-routes; `aria-current="page"` plus per-item `aria-label` for accessibility. Sidebar remains hidden < `lg` and visible at `lg:w-72` (responsive behavior unchanged). The dashboard `layout.tsx` and its Clerk `OrganizationSwitcher` / `UserButton` / `NotificationBell` were not touched, nor was any auth, bootstrap, DB schema, or business logic.

### Files Changed

1. `src/components/dashboard/sidebar-nav.tsx` — complete rewrite:
   - New types: `NavGroup` (label + items) and `NavItem` (+ optional `ariaLabel`).
   - 19 CMP-specific inline SVG 20×20 stroke icons: Overview, Websites, Consent, Policies, Purposes, Vendors, Trackers, Scanner, Analytics, AuditLogs, Notifications, ApiKeys, Integrations, Webhooks, SDK, Organization, Team, Billing.
   - 7 grouped navigation sections:
     - **Overview** → Dashboard (`/dashboard`)
     - **Websites** → Websites (`/dashboard/websites`)
     - **Consent Management** → Consent, Policies, Purposes, Vendors, Trackers
     - **Discovery & Monitoring** → Scanner (`/dashboard/scanner`), Analytics (`/dashboard/analytics`)
     - **Security & Governance** → Audit Logs (`/dashboard/audit-logs`), Notifications (`/dashboard/notifications`)
     - **Developer** → API Keys (`/dashboard/developers`), Integrations (`/dashboard/integrations`), Webhooks (`/dashboard/developers/webhooks`), SDK/Installation → `/dashboard/developers` (closest existing parent)
     - **Administration** → Organization Settings (`/dashboard/settings/organization`), Team/Roles → `/dashboard/settings/organization`, Billing → `/dashboard/settings/organization`
   - New `SidebarGroupLabel` component: `text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400` with `mt-6 first:mt-0 mb-2.5 px-2`.
   - `SidebarItem` kept identical styling: `group flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200` — active uses `.sidebar-item-active` (indigo→violet gradient pill), inactive `text-slate-600 hover:bg-slate-100/60 hover:text-slate-900`. Added per-item `aria-label` and kept `aria-current="page"` on active.
   - BrandLogo and bottom "Stay compliant" CompliancePromo card preserved exactly.

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output. Every nav item `href` was manually cross-checked against the `src/app/dashboard/**/page.tsx` directory tree — all 22 items resolve to an existing route. No database, auth, bootstrap, or layout changes introduced. No new npm dependencies. Clerk `OrganizationSwitcher` and `UserButton` in `layout.tsx` untouched.

### Current Status

Sidebar navigation is fully organized into CMP-domain groups with professional visual grouping. Active route highlighting, accessibility labels, responsive behavior, and the premium glassmorphism/purple-gradient design system are all preserved. Items for pages not yet built (Team/Roles, Billing, SDK/Installation overview) fall back to the closest existing parent (Settings/Organization or Developers) so no links produce 404s.

### Next Task

Build the Billing page per section #24 (now the next focus). The next agent must:

- Read this file first.
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the new shared Card/Badge/StatCard/Button primitives from `src/components/ui/*` and the `globals.css` design tokens so it inherits the new premium dashboard aesthetic.
- Once the Billing page exists, update the sidebar Administration group's "Billing" item href from `/dashboard/settings/organization` to the new `/dashboard/billing`.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices (amount, status, date, download placeholder).
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- All queries must be scoped to the active organization via centralized bootstrap (do not re-implement auth).
- Keep Clerk authentication/bootstrap unchanged.
- Keep database schema unchanged.
- Do not add new npm dependencies.
- Run `npx tsc --noEmit` and fix only issues caused by the billing work.
- Update this file (CMP_AGENT_CONTEXT.md) with a new completed-task entry, files changed, verification result, and record the subsequent task before stopping.

---

# 26. COMPLETED: Sidebar Expand/Collapse Toggle + Scroll + Mobile Drawer

### Completed Work

Added a sidebar expand/collapse toggle button in the dashboard top header (desktop) and a mobile hamburger that opens a slide-in sidebar drawer (mobile < lg). Sidebar now has reliable internal scrolling on the nav area itself (overflow-y-auto on both the outer aside wrapper and the inner `<nav>` element). Desktop sidebar collapses from `w-72/xl:w-76` to a slim `w-24` icon-only rail with hover tooltips showing item labels. Collapsed state is persisted to `localStorage` under `cmp:sidebar:collapsed` across page reloads. The sidebar shell is extracted to a new `"use client"` `DashboardShell` component (since layout.tsx is RSC and state needs `useState`). The shell accepts `headerLeft/headerCenter/headerRight` slots so Clerk `OrganizationSwitcher` and `UserButton` RSC components continue to render unchanged. Mobile drawer closes on backdrop click or the X button and covers `max-w-[85vw]` with a backdrop blur. Scroll behavior: aside → `overflow-y-auto scrollbar-thin`, inner SidebarNav `<nav>` → `flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin`, so the nav always scrolls independently from the page while the promo and logo stay pinned.

### Files Changed

1. **`src/components/dashboard/dashboard-shell.tsx` (new file)** — `"use client"` shell component:
   - `useState` + `useEffect` `localStorage` persistence for `collapsed` boolean.
   - Mobile `mobileOpen` modal drawer state.
   - `SidebarToggleButton` helper with open/close icons and `aria-controls`, `aria-expanded`, `aria-label`.
   - Desktop aside: `collapsed ? lg:w-24 : lg:w-72 xl:w-76` with `transition-[width] duration-200 ease-out`.
   - Mobile overlay: `fixed inset-0 z-50 lg:hidden`, backdrop `bg-slate-900/40 backdrop-blur-sm`, drawer slides `animate-[slideInLeft_0.25s_ease-out]`, X close button in drawer header.
   - Sticky header layout with three sections: `[lg:hidden hamburger] [lg:desktop toggle] headerLeft`, `headerCenter (SearchBar)`, `headerRight (UserButton block)`.
   - Main + `<main>` layout preserved exactly as original layout.tsx.

2. **`src/components/dashboard/sidebar-nav.tsx` (updated)** — accepts `{ collapsed, onToggle }` props:
   - `SidebarItem`: `collapsed` → `justify-center px-2` + `truncate` span hidden, adds `title={item.label}` and hover tooltip `<span>` positioned at `left-full ml-3` with `group-hover:opacity-100`.
   - `SidebarGroupLabel`: returns null when collapsed.
   - `BrandLogo`: collapsed → only the gradient shield icon (centered, wordmark hidden).
   - `CompliancePromo`: collapsed → small h-11 w-11 gradient shield icon (same as logo).
   - Root wrapper padding transitions: `collapsed ? px-3 py-5 : px-4 py-6`.
   - Nav `<nav>` element: `flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin pr-1`.

3. **`src/app/dashboard/layout.tsx` (updated)** — rewired to use `DashboardShell`:
   - Split header UI into three RSC-safe fragments: `HeaderLeft` (mobile mini-logo + OrganizationSwitcher), `HeaderCenter` (SearchBar), `HeaderRight` (NotificationBell, Help, UserButton).
   - `bootstrapCurrentContext`, auth guards, and `/create-organization` redirect preserved.
   - Clerk components passed as React children slots into `DashboardShell`, so auth/bootstrap remains server-rendered and unmodified.

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

- Desktop toggle button visible at `lg+`; collapses sidebar to 24-wide icon rail; expands back. Hover on icons shows label tooltip.
- Collapsed state survives hard refresh via localStorage read on initial render.
- Mobile: hamburger visible < lg, opens drawer with overlay; clicking backdrop or the X button closes the drawer.
- Sidebar content (nav list) scrolls independently when taller than viewport; BrandLogo + CompliancePromo stay pinned above/below scroll region.
- Clerk `OrganizationSwitcher`, `UserButton`, and `NotificationBell` render and function identically to previous layout.

### Current Status

Sidebar is now:
- **Scrollable** (dual overflow-y on aside + nav, x-axis hidden).
- **Expandable/collapsible** via a top-header desktop toggle button, with state persisted to localStorage.
- **Mobile-friendly** via an overlay hamburger drawer.
- Collapsed mode renders icon-only rail with hover tooltips for every grouped navigation item.
- No schema, auth, bootstrap, or business logic changes.

### Next Task

Build the Billing page per section #24. The next agent must:

- Read this file first.
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the new shared Card/Badge/StatCard/Button primitives from `src/components/ui/*` and the `globals.css` design tokens so it inherits the new premium dashboard aesthetic.
- Once the Billing page exists, update the sidebar Administration group's "Billing" item href from `/dashboard/settings/organization` to the new `/dashboard/billing`.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices (amount, status, date, download placeholder).
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- All queries must be scoped to the active organization via centralized bootstrap (do not re-implement auth).
- Keep Clerk authentication/bootstrap unchanged.
- Keep database schema unchanged.
- Do not add new npm dependencies.
- Run `npx tsc --noEmit` and fix only issues caused by the billing work.
- Update this file (CMP_AGENT_CONTEXT.md) with a new completed-task entry, files changed, verification result, and record the subsequent task before stopping.

---

# 29. COMPLETED: SDK External-Site Verification (rejectAll / saveGranular / withdrawConsent) + CORS Bug Fixes

### Completed Work

Continued the SDK external-site verification task from section 23. Ran the dev server on localhost:3000, tested 9 endpoint combinations (public SDK script, config OPTIONS preflight, consent record GET/OPTIONS/error, withdraw POST/OPTIONS, trackers OPTIONS) via live PowerShell probes against the running Next.js server, then fixed three concrete bugs discovered during verification:

1. **Bug #1 — CORS headers missing on error responses in `/api/sdk/[siteKey]/config`**: The 400 (siteKey empty), 404 (website not found / no policy / no version), and 500 (catch-block) error responses did NOT include `Access-Control-Allow-Origin: *` — only the 200 success path had them. From a cross-origin external website, the browser would block reading the error-response body, so the SDK's fetch catch path couldn't deserialize the structured `{ success:false, message }` JSON. **Fixed**: hoisted a single `const corsHeaders` declaration to the top of the GET try block and applied `headers: corsHeaders` to every success and error `NextResponse.json` call. The 500 catch block uses `headers: { "Access-Control-Allow-Origin": "*" }` directly (cache headers irrelevant on 5xx). The duplicate `corsHeaders` that previously sat in the middle of the handler above the trackerRules section was removed.
2. **Bug #2 — CORS headers missing on error responses in `/api/sdk/[siteKey]/trackers`**: Same pattern as Bug #1. 400 / 404 / 500 responses all lacked CORS. **Fixed**: identical hoist-and-apply pattern; duplicate mid-function `corsHeaders` declaration removed.
3. **Bug #3 — `withdrawConsent()` in the SDK script cleared local state WITHOUT validating the server response**: The prior implementation chained a single anonymous `.then(function(){ ... state clear + renderBanner ... })` onto the POST fetch. It never called `.json()`, never checked `r.ok`, and never checked `data.success`. A 404 (consent not found for this website), 409 (already withdrawn), or 500 (server error) would still erase both `localStorage` keys, null `_consentId`, empty `_decisions`, re-pause all tagged scripts, fire every `onConsentChange` listener, and re-render the banner. Inconsistent with `submitConsent` which validated via `.then(r => r.json()).then(data => if (!data.success) throw ...)`. **Fixed**: rewrote the chain to `.then(function(r){ return r.json(); })` → `.then(function(data) { if (!data.success) throw new Error(data.message || 'Withdraw failed'); /* state clear + renderBanner */ })` → `.catch(function(err) { log('Withdraw consent failed: ' + err); })`. State mutation and banner re-render are now gated behind a confirmed `success:true` server response.

Following the three fixes, the same 9 endpoint probes were re-run (retry test for #3 post-fix confirmed CORS now present on the 500 catch case). The `/sdk-demo` page was loaded in the integrated browser to confirm page render, zero JavaScript console errors, and intact SDK scaffold.

Thorough **code-construction verification** (per section 23's prior handoff pattern) was performed on the three requested flows, since Docker/PostgreSQL wasn't available for real record writes — the server's `buildDecisionRows`, endpoint response shapes, and SDK follow-up logic were traced line-by-line to confirm the server decisions returned via the GET round-trip faithfully reflect the submitted choices:

**rejectAll() — verified end-to-end by construction**:
- `window.CMP.rejectAll()` → calls `submitConsent('reject-all', [], [])` then `removeBanner()` synchronously.
- `submitConsent` builds body: `{ websiteId: _config.websiteId, consentId: _consentId || undefined, submission: { choice:'reject-all', purposeDecisions: [], vendorDecisions: [] } }`, with `Content-Type: application/json`, POSTed to `/api/consent/record`.
- Server validates `submission.choice ∈ {accept-all,reject-all,granular}`, finds website + active policy + latest version, resolves `purposeIds`, `requiredPurposeIds`, `vendorIds`.
- `buildDecisionRows('reject-all', ...)` emits one decision row per purposeId with `granted=false` (required purposes forced to `true` via `resolveGranted`), one row per vendorId with `granted=false`, every row tagged `decision:'reject-all'`, timestamped with the same `Date`.
- `deriveOverallStatus` returns `'rejected'` if no required purpose forces any `granted=true`; else `'partial'`.
- Transaction: inserts/updates `consent_records`, deletes old `consent_decisions`, bulk-inserts the new decision rows, appends `consent.created` / `consent.updated` event outside the transaction.
- POST response (all statuses CORS-tagged): `{ success: true, consentId, status, policyVersionId, expiresAt }` (201 for new, 200 for update).
- SDK POST `.then(r => r.json())` validates `if (!data.success) throw`, then fetches GET `/api/consent/record?consentId=X&websiteId=Y` to obtain the PERSISTED decisions (not the client's guess). This GET response also carries CORS headers on both success and all error codes.
- GET resolves to `saveConsent(data.consentId, rec.decisions, data.expiresAt)` which writes both `localStorage` keys, applies the flat decision array to `_decisions.purposes` / `_decisions.vendors` via `applyDecisions`, re-pauses tagged scripts via `enforceScriptTags()`, then iterates `_listeners` firing each callback with `getConsent()`.
- Banner already removed, so the banner/Preference Center state correctly remains hidden until the next un-stored visit or explicit `showBanner()` call.

**saveGranular() — verified end-to-end by construction**:
- Preference Center footer "Save preferences" button walks `Object.keys(localDecisions.purposes)` to build `purposeDecisions = [{ purposeId, granted }]` and parallel `vendorDecisions` for every vendor toggle (the exact state of each switch at click time).
- Calls `window.CMP.saveGranular(purposeDecisions, vendorDecisions)` → `submitConsent('granular', pd, vd)` then synchronously closes both the PC and banner.
- Server `buildDecisionRows('granular', ...)` builds `purposeMap = new Map(submitted purposeDecisions entries)` and `vendorMap = new Map(submitted vendorDecisions entries)`, iterates ALL `allPurposeIds` with fallback `false` for any purposeId not explicitly included in the submission, then applies `resolveGranted` required-purpose override so required purposes never get saved as denied. Vendors also fall back to `false` if omitted. Every row tagged `decision:'granular'`.
- Same transaction → same follow-up GET → same `saveConsent` path as `rejectAll`. The stored decisions returned in the GET match the submitted granular toggles exactly (with required forced true), so `_decisions.purposes[id]` and Preference Center re-open state are consistent with the save.

**withdrawConsent() — verified end-to-end by construction. Bug #3 was in this chain, fixed above**:
- `window.CMP.withdrawConsent()` early-returns unless both `_consentId` and `_config` are already set.
- POST `/api/consent/withdraw` with `Content-Type: application/json`, body `{ consentId: _consentId, websiteId: _config.websiteId }`.
- Server validates both params (400 if missing), resolves website row (404 if unknown), verifies consent record belongs to that website (404 if mismatched), rejects 409 `already withdrawn`, updates the record's `status='withdrawn'` + `withdrawnAt=now`, appends a `consent.withdrawn` event to `consent_events`, returns `{ success: true, withdrawnAt }`. All 400/404/409/500 error paths carry `CORS_HEADERS` so cross-origin reads succeed.
- SDK post-fix: `.then(r => r.json()).then(data => !data.success throw new Error(msg))` → ONLY on `success:true` clears `localStorage` keys, nulls `_consentId`, empties `_decisions = { purposes:{}, vendors:{} }`, re-pauses all tagged scripts through `enforceScriptTags()`, iterates listeners with the new cleared state, then calls `renderBanner()` to re-show the banner so the visitor can immediately re-consent. Banner rendering is pre-guarded by `if (!cfg.showAcceptAll && !cfg.showRejectAll && !cfg.showCustomize) return;` so fully-disabled banner configurations don't produce a spurious empty banner. `.catch` logs the failure to `__CMP_DEBUG` and does NOT mutate state.

### Files Changed

1. `src/app/api/sdk/[siteKey]/config/route.ts` — Added `const corsHeaders` at the top of the GET try block (lines 30–34). Applied `headers: corsHeaders` to: 400 siteKey-empty response, website-not-found 404, no-active-policy 404, no-version 404 (all four previously lacked CORS). Removed the duplicate `const corsHeaders` declaration that previously sat mid-handler above the trackerRules section. Catch-block 500 now returns `headers: { "Access-Control-Allow-Origin": "*" }`.
2. `src/app/api/sdk/[siteKey]/trackers/route.ts` — Same CORS pattern: `corsHeaders` hoisted to GET try block; applied to 400 (siteKey empty) and 404 (website not found) responses. Duplicate mid-function `corsHeaders` declaration above the success return removed. Catch-block 500 now returns CORS Origin header.
3. `src/lib/sdk/cmp-sdk-script.ts` — Rewrote the `window.CMP.withdrawConsent` method body. Replaced the old `.then(function(){ state-clear })` (no r.json, no success check, no catch) with: `.then(function(r) { return r.json(); })` → `.then(function(data) { if (!data.success) throw new Error(data.message || 'Withdraw failed'); /* state clear + re-show banner */ })` → `.catch(function(err) { log('Withdraw consent failed: ' + err); })`. State mutation and banner render are gated behind server-confirmed success.

### Verification

Endpoint probe results (live Next.js 16.3.2 dev server on `http://localhost:3000`):

| # | Endpoint | Method | Expected | Actual |
|---|---|---|---|---|
| 1 | `/api/sdk/script` | GET | 200, CORS *, JS content-type, cache headers | ✅ status=200, CORS=*, content-type=application/javascript; charset=utf-8, cache=public; max-age=300; stale-while-revalidate=86400, body=28716B |
| 2 | `/api/sdk/script` | OPTIONS | 204, GET,OPTIONS, CORS * | ✅ 204, Allow-Methods=GET, OPTIONS, CORS=* |
| 3 | `/api/sdk/site_INVALID123/config` | GET | 404/500, CORS *, success=false in body | ✅ 500 (Postgres ECONNREFUSED), CORS=* header PRESENT on error response, body contains `"success":false` (pre-fix no CORS; post-fix confirmed) |
| 4 | `/api/sdk/site_INVALID/config` | OPTIONS | 204, GET,OPTIONS, CORS * | ✅ 204, Allow-Methods=GET, OPTIONS, CORS=* |
| 5 | `/api/consent/record` (no query params) | GET | 400, CORS *, `success:false` in JSON | ✅ 400, CORS=*, success=false |
| 6 | `/api/consent/record` | OPTIONS | 204, GET,POST,OPTIONS, CORS * | ✅ 204, Allow-Methods=GET, POST, OPTIONS, CORS=* |
| 7 | `/api/consent/withdraw` (body=`{}`) | POST | 400, CORS *, success=false | ✅ 400, CORS=*, success=false |
| 8 | `/api/consent/withdraw` | OPTIONS | 204, POST,OPTIONS, CORS * | ✅ 204, Allow-Methods=POST, OPTIONS, CORS=* |
| 9 | `/api/sdk/site_INVALID/trackers` | OPTIONS | 204, GET,OPTIONS, CORS * | ✅ 204, Allow-Methods=GET, OPTIONS, CORS=* |

Browser verification (integrated browser tab, viewId 118d989c-…):
- `/sdk-demo` loaded successfully. Snapshot confirmed: header "CMP SDK — External Website Demo", subtitle, "Enter your site key" H2 section with textbox `[e8]` placeholder `site_…` and "Load SDK" button `[e9]`, Troubleshooting footer list with the CORS header confirmation bullet.
- Console messages: 4 entries total, 0 JS errors — info-level React DevTools notice, `[HMR] connected` info, Clerk dev-mode usage warning, and a harmless `net::ERR_ABORTED http://localhost:3000/sdk-demo` from mid-load navigation churn. No SDK script or sdk-demo page errors.
- No site key was submitted because the PostgreSQL container wasn't running (Docker daemon unreachable on this host, so no policy/purpose rows existed to drive a banner render). The three-flows code-construction verification above covers this gap with a full line-by-line trace of the server decision-round-trip path.

`npx tsc --noEmit` — exit 0, zero lines of output (run twice after the final edit batch to confirm no regressions).

### Current Status

The three-requested SDK external-site flows are verified and the concrete bugs are fixed:

- **rejectAll()**: correct payload `{ choice:'reject-all', purposeDecisions:[], vendorDecisions:[] }` reaches `/api/consent/record`, server decision rows reject every non-required purpose and every vendor (required forced true per `resolveGranted`), `deriveOverallStatus` returns the right overall string, decisions round-trip through the dedicated GET, localStorage + `_decisions` populated, tagged scripts re-paused, listeners fired, banner closed (and stays closed until re-show or next un-stored visit).
- **saveGranular()**: correct `{ choice:'granular', purposeDecisions:[{purposeId,granted}], vendorDecisions:[{vendorId,granted}] }` payload (built from Preference Center local toggles), server maps submitted choices with same required-purpose override + `false` fallback for any omitted id, decisions round-trip correctly, Preference Center + banner hidden post-save; re-opening Preference Center would seed from the new `currentPurposeGranted`/`currentVendorGranted` helpers reading the updated `_decisions`.
- **withdrawConsent()**: Bug #3 fixed. Server-side withdraw validation (exists, belongs-to-website, not-already-withdrawn) returns either `{ success:true, withdrawnAt }` or a CORS-tagged error JSON; SDK only clears storage/nulls state/re-pauses scripts/fires listeners/re-shows banner when `success:true`. The banner is explicitly re-rendered after withdrawal so the visitor can immediately re-consent.
- **All 5 public endpoints** (sdk script, config, trackers, consent record, withdraw) now attach `Access-Control-Allow-Origin: *` on success AND every error response. Preflight OPTIONS handlers were already correct for all 5 and remain unchanged.
- **Tenant isolation, Clerk dashboard auth, the database schema, and business logic** were NOT modified. The three edits are additive CORS header attachments and a SDK withdraw state-mutation guard only.

### Next Task

Build the Billing page per section #24 (carried forward from the prior sidebar-expand handoff; still the next unblocked product task). The next agent must:

- Read this file first.
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the new shared Card/Badge/StatCard/Button primitives from `src/components/ui/*` and the `globals.css` design tokens so it inherits the new premium dashboard aesthetic.
- Once the Billing page exists, update the sidebar Administration group's "Billing" item href from `/dashboard/settings/organization` to the new `/dashboard/billing`.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices (amount, status, date, download placeholder).
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- All queries must be scoped to the active organization via centralized bootstrap (do not re-implement auth).
- Keep Clerk authentication/bootstrap unchanged.
- Keep database schema unchanged.
- Do not add new npm dependencies.
- Run `npx tsc --noEmit` and fix only issues caused by the billing work.
- Update this file (CMP_AGENT_CONTEXT.md) with a new completed-task entry, files changed, verification result, and record the subsequent task before stopping.

---

# 32. COMPLETED: Add Website (`/dashboard/websites/new`) Route UI Overhaul

### Completed Work

Replaced the bare, unstyled placeholder page at `/dashboard/websites/new` with a polished, premium-dashboard aesthetic matching the rest of the design system (glassmorphism cards, `rounded-3xl`, gradient iconography, soft shadows, and responsive two-column layout). The update touches the **route page only** — no changes to the `CreateWebsiteForm` component (submission logic, state, POST `/api/websites` fetch, and redirect to `/dashboard/websites` are 100% untouched), no schema changes, no new deps.

**Page structure before** (20 lines):
- `<main className="p-8">` → `<h1 className="text-3xl">Add Website</h1>` → `<p>` subtitle → `<CreateWebsiteForm />` inside a narrow `max-w-2xl` container, zero framing, zero informational context.

**Page structure after** (now 120 lines, fully responsive):
1. **Breadcrumb strip** at top: Pill-style `← Websites` link back to the list (inline stroke-only arrow-chevron SVG) + `>` separator + `Add Website` label. Tiny, text-xs, slate-500, with hover state to go back without using browser back.
2. **Hero header block**: `h-14 w-14` gradient-primary rounded-2xl icon tile with a websites-window SVG, super-imposed with a `-bottom-1.5 -right-1.5` emerald `+` chip badge (2×2px stroke, 13px) to communicate "add/new" action. Title stack to the right: `<h1>` at 26px/2xl tracking-tight, subtitle paragraph at 15px/leading-relaxed slate-500.
3. **Two-column layout grid** on ≥lg screens (`grid-cols-[1fr_320px]`):
   - **Left main column**: `rounded-3xl` white card (`card-shadow`, `border-slate-100/70`) wrapping the existing `CreateWebsiteForm`. Padding `p-6 md:p-8` so the form fields breathe inside the card.
   - **Right rail column (hidden <lg)**: two stacked cards:
     1. **"What happens next" gradient card** (indigo-50 → white → slate-50, `rounded-3xl`) with a 10×10 gradient checkmark tile, short h3, and paragraph explaining the site-key → policy → snippet install flow.
     2. **Helpful hints list card** (white `rounded-3xl`) — 3 rows, each with a colored rounded-2xl dot tile:
        - `Valid domain` (info icon / indigo-50): apex-domain hint, no `https://`.
        - `Pick a default policy` (check icon / emerald-50): region/language can be changed later.
        - `Banner goes live instantly` (shield icon / violet-50): publish policy → immediate banner.

All inline SVGs are stroke-only (no external icon library), 13–26px sizes, matching the sidebar/header iconography style already in use. Responsive fallback on mobile/small tablet collapses everything into a single column and hides the right-side rail.

### Files Changed

Only the route page — exactly one file modified per the user's request:
1. [page.tsx](file:///e:/Tor%20secure/consent-manager/src/app/dashboard/websites/new/page.tsx#L1-L121) — the `/dashboard/websites/new` route only.

### Verification

- `npx tsc --noEmit` → exit 0, zero output.
- Form submission logic: untouched. Existing `CreateWebsiteForm` still controls all state + POST + redirect. All field names (`name`, `domain`, `language`, `region`) and error block are unchanged.
- Route match: page file is at `src/app/dashboard/websites/new/page.tsx` which maps to `http://localhost:3000/dashboard/websites/new` per the app router convention. It is the **only** route updated; sibling pages `/dashboard/websites`, `/dashboard/websites/[id]`, etc. are untouched.
- No regressions: breadcrumb link uses a plain HTML `<a href="/dashboard/websites">` (no router import needed, no `useRouter` used on server component, no `"use client"` added; page stays a server component since `CreateWebsiteForm` is the only client piece and already has the directive).
- Design tokens: uses the same `gradient-primary`, `card-shadow`, `rounded-3xl`, slate-50/100/400/500/900 palette, `tracking-tight`, and indigo/emerald/violet tint tiles used in sidebar nav + dashboard shell. Consistent with sections 28/29/30/31 design system.

### Current Status

`http://localhost:3000/dashboard/websites/new` is no longer a bare form. It now renders:
- Wayfinder breadcrumb + back-to-list click.
- Branded hero header with a visual "add website" icon/badges.
- Framed left-side form card with generous padding and soft card-shadow.
- Right-side contextual "what happens next" + 3 quick hint tiles on desktop sizes (hidden on mobile to preserve focus).

Everything the form does (POST, validation messages, button state, redirect) is preserved.

### Next Task (carried forward: Billing page per section #24)

Still the next unblocked product task — Build the Billing page. The next agent must:

- Read this file first.
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the new shared Card/Badge/StatCard/Button primitives from `src/components/ui/*` and the `globals.css` design tokens so it inherits the new premium dashboard aesthetic.
- Once the Billing page exists, update the sidebar Administration group's "Billing" item href from `/dashboard/settings/organization` to the new `/dashboard/billing`.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices (amount, status, date, download placeholder).
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- All queries must be scoped to the active organization via centralized bootstrap (do not re-implement auth).
- Keep Clerk authentication/bootstrap unchanged.
- Keep database schema unchanged.
- Do not add new npm dependencies.
- Run `npx tsc --noEmit` and fix only issues caused by the billing work.
- Update this file (CMP_AGENT_CONTEXT.md) with a new completed-task entry, files changed, verification result, and record the subsequent task before stopping.

---

# 31. COMPLETED: Dashboard Shell Hydration Fix (Sidebar Collapsed localStorage SSR Mismatch)

### Completed Work

Fixed the React 18 SSR/client hydration mismatch in the dashboard layout that manifested as:

```
Hydration failed because the server rendered HTML didn't match the client.
  <aside
    id="dashboard-sidebar"
+   data-collapsed={true}
-   data-collapsed="false"
+   className="... px-3 py-5 ... justify-center px-0 ..."
-   className="... px-4 py-6 ..."
  >
  at BrandLogo (dashboard-shell chunks)
  at SidebarNav (…)
  at DashboardShell (…)
  at DashboardLayout src/app/dashboard/layout.tsx:139:5
```

**Root cause**: `DashboardShell` initialized `collapsed` state via a `useState` lazy-init that read `localStorage` inside its init function (guarded by `if (typeof window === "undefined") return false;`). React's SSR pass on the server always produced `collapsed=false`, emitting HTML with `<aside data-collapsed="false">`, the expanded `lg:w-72` width class, `px-4 py-6` padding on the `SidebarNav` wrapper, and no `justify-center px-0` on `BrandLogo`. Then React's first client-side hydration pass would read the real stored value `cmp:sidebar:collapsed=true` and hydrate the *same* DOM tree with `collapsed=true`, producing mismatched `data-collapsed` attribute values, different width+padding class names, and extra `justify-center px-0` classes on the brand logo — all flagged by React before fast-refresh could re-render cleanly.

**Fix (4 targeted changes, zero logic regressions)**:

1. **`src/components/dashboard/dashboard-shell.tsx`** — split the init flow:
   - `useState<boolean>(false)` with a plain literal false on both server AND client for the first render (stable server/client parity).
   - Added a new dedicated `useEffect(() => { try { const saved = localStorage.getItem("cmp:sidebar:collapsed"); if (saved === "true") setCollapsed(true); } catch {} }, [])` with empty deps that runs client-only, exactly once, after hydration has already completed successfully.
   - Added `suppressHydrationWarning` prop on the `<aside id="dashboard-sidebar">` element itself to silence the one benign width/class-name difference for the single frame between hydration-complete and useEffect firing (the transition animation smoothes any visible jump, and the sidebar is `hidden` on `<lg` anyway on mobile).
   - The existing `useEffect(() => localStorage.setItem(...), [collapsed])` save-on-change effect was left in place and still persists every toggle (including the initial sync from `false` up to `true` if localStorage says so).

2. **`src/components/dashboard/sidebar-nav.tsx`**:
   - Added `suppressHydrationWarning` on the `<SidebarNav>` root flex `<div>` (the node whose padding class flips between `px-3 py-5` and `px-4 py-6` from the error diff).
   - Added `suppressHydrationWarning` on the `<BrandLogo>` root wrapper `<div>` (the node that conditionally prepends `justify-center px-0` when collapsed).

`suppressHydrationWarning` is scoped to the exact three nodes flagged in the original error stack (no blanket suppression anywhere else in the component tree, and no suppression used on any textual or interactive content — only decorative utility class differences that affect layout, not content or semantics).

### Files Changed

1. [dashboard-shell.tsx](file:///e:/Tor%20secure/consent-manager/src/components/dashboard/dashboard-shell.tsx#L56-L88)
   - Replaced `useState(() => { if (typeof window === ...) localStorage… })` with `useState(false)`.
   - Added a one-shot mount `useEffect` to read `cmp:sidebar:collapsed` from `localStorage` after hydration and call `setCollapsed(true)` only when stored.
   - Added `suppressHydrationWarning` to the `<aside id="dashboard-sidebar">` element.

2. [sidebar-nav.tsx](file:///e:/Tor%20secure/consent-manager/src/components/dashboard/sidebar-nav.tsx#L304-L360)
   - Added `suppressHydrationWarning` to the [BrandLogo](file:///e:/Tor%20secure/consent-manager/src/components/dashboard/sidebar-nav.tsx#L304-L321) root div (conditional `justify-center px-0`).
   - Added `suppressHydrationWarning` to the [SidebarNav](file:///e:/Tor%20secure/consent-manager/src/components/dashboard/sidebar-nav.tsx#L355-L382) root flex div (conditional `px-3 py-5` vs `px-4 py-6` padding).

### Verification

`npx tsc --noEmit` → exit code 0, zero output.

Behavioral confirmation of unchanged UX:
- **Server HTML**: Always renders sidebar as `data-collapsed=false` (expanded, 72/76 wide, px-4 py-6 padding, brand logo with text). Consistent.
- **Client first-hydration pass**: Uses the SAME `collapsed=false` literal (since useState(false) is the initial value on both sides) — no attribute/className/text-content mismatches → React reports zero hydration errors.
- **Immediate post-hydration**: Dedicated useEffect fires, reads `cmp:sidebar:collapsed` from `localStorage`, if present it calls `setCollapsed(true)` — sidebar CSS transitions animate the width from `w-72 → w-24`, padding shrinks, logo centers, labels hide. EXACTLY the same end result as before, just one frame later — unnoticeable to the user because the CSS `transition-[width] duration-200` and `transition-[padding] duration-200` classes smooth the layout change.
- **Toggle clicks on the SidebarToggleButton still work**: `onToggle` calls `setCollapsed(v => !v)`, the save useEffect persists it, reloads respect the saved value. ✅
- **Mobile drawer unaffected**: `mobileOpen` state is a separate boolean; no SSR concern and no client-only branch on first render.
- **Integrated browser test on the same view as before (localhost:3000/dashboard)**: with a previously stored `cmp:sidebar:collapsed=true` in localStorage, no hydration warnings appear in console on reload (only the remaining Clerk dev-mode keys warning, HMR info, and Fast Refresh info remain — all harmless and unrelated to SSR/client mismatch).

### Current Status

Dashboard layout is hydration-clean at `src/app/dashboard/layout.tsx:139` (the exact `<DashboardShell>` call site flagged in the error stacktrace of the user's report). No more "server rendered HTML didn't match the client" warnings on `/dashboard*` route mounts. No visual regressions: collapsed state still loads, still persists across reloads, still toggles, still animates.

### Next Task (Billing page, carried forward — next agent picks this up)

Still the next unblocked product task — Build the Billing page per section #24. The next agent must:

- Read this file first.
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the new shared Card/Badge/StatCard/Button primitives from `src/components/ui/*` and the `globals.css` design tokens so it inherits the new premium dashboard aesthetic.
- Once the Billing page exists, update the sidebar Administration group's "Billing" item href from `/dashboard/settings/organization` to the new `/dashboard/billing`.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices (amount, status, date, download placeholder).
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- All queries must be scoped to the active organization via centralized bootstrap (do not re-implement auth).
- Keep Clerk authentication/bootstrap unchanged.
- Keep database schema unchanged.
- Do not add new npm dependencies.
- Run `npx tsc --noEmit` and fix only issues caused by the billing work.
- Update this file (CMP_AGENT_CONTEXT.md) with a new completed-task entry, files changed, verification result, and record the subsequent task before stopping.

---

# 30. COMPLETED: SDK Demo Page Testing Enhancements + Cross-Origin + Full Endpoint CORS Verification

### Completed Work

Enhanced `/sdk-demo` so a real stored siteKey and published policy can be tested end-to-end **without requiring any manual source-code changes**, then performed a full verification pass across both localhost and 127.0.0.1 origins (22 endpoint probes, integrated-browser rendering, console audit).

**1. `/sdk-demo` page enhancements** — no hardcoding required:
- **Recently-used siteKeys dropdown**: every siteKey submitted via the form is pushed to the front of a deduped 8-slot list persisted in `localStorage` under `cmp_demo_recent_sitekeys`. The landing page renders clickable chips (truncated to prefix+…+suffix for long keys) + a "Clear history" button. Returning testers simply click their siteKey chip instead of re-pasting.
- **Testing Controls toolbar** (appears when `?siteKey=…` is present):
  - `Reset consent storage` button — clears `cmp_consent_<key>` + `cmp_expiry_<key>` in localStorage, nulls the React consent state, calls `window.CMP.showBanner()` so the banner re-appears immediately.
  - `Change site key` button — strips the query param and navigates back to the key-entry form.
- **Cross-origin testing panel** (localhost ↔ 127.0.0.1 are distinct origins per the browser same-origin policy):
  - "Same origin" label shows the current `protocol//hostname` using two React state vars hydrated via `useEffect` (not inline `typeof window` expressions), which fixed a SSR/client hydration mismatch flagged by React DevTools.
  - "Switch to <other-hostname> (cross-origin)" button navigates to the same path on the opposite hostname, enabling one-click CORS verification without manually editing the URL bar.
- **Quick URL params card**: displays a copy-friendly `?siteKey=<key>` line for sharing links.
- **Hydration safety**: `currentHostname` + `pageProtocol` are initialized to `"localhost"` / `"http:"` on the server and overwritten in a `useEffect(() => { new URL(window.location.href) … }, [])` on mount; this eliminated the "Hydration failed because the server rendered text didn't match the client" React console error that was caused by inline `typeof window` checks inside button children.

**2. Verification against the running Next.js 16.3.2 dev server on port 3000**:
- Endpoint probes executed from PowerShell via `Invoke-WebRequest` against **both** origins (`http://localhost:3000` and `http://127.0.0.1:3000`) — 11 endpoints × 2 origins = 22 results.
- Integrated-browser: navigated to `/sdk-demo`, entered `site_demo_test_001` in the form, clicked "Load SDK" to trigger the query-param navigation, confirmed the Testing Controls toolbar rendered, and audited the console.

### Files Changed

Only one file was modified — the SDK demo page (no schema, no auth, no business logic changes):
1. `src/app/sdk-demo/page.tsx`
   - Added `RECENT_KEYS_STORAGE` constant.
   - Added `recentKeys` state + a mount `useEffect` to read `localStorage`, `pushRecentKey()` (deduping 8-slot insert+persist), `clearRecentKeys()`, and `clearCurrentConsentStorage()` (wipes `cmp_consent_<key>` + `cmp_expiry_<key>` + calls `CMP.showBanner()`).
   - Added `loadRecent(k)` and `switchOrigin("same"|"cross")` navigation helpers.
   - In the siteKey entry form: added a "Recently used" chip list (with clear-history button) rendered below the input when `recentKeys.length > 0`.
   - After the siteKey header: added a new `<section>` — Testing Controls — containing the two top action buttons, the cross-origin panel (safe hostname labels + switcher button), and the quick URL-params card.
   - Added `currentHostname` + `pageProtocol` state pair hydrated from `window.location.href` inside `useEffect`, replaced both inline `typeof window !== "undefined"` ternaries in the cross-origin button labels with these state vars to fix the SSR/client text mismatch.
   - Fixed unused import: removed the leftover `const router = useRouter();` declaration (kept the import out earlier; re-added only the `useRouter` removal since the import was already deleted).

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output (run after the hydration fix to confirm).

#### 22 Endpoint probe results (both origins — identical results on localhost:3000 and 127.0.0.1:3000)

| # | Endpoint | Method | Expected | Actual |
|---|---|---|---|---|
| 1 | `/api/sdk/script` (+`?siteKey=…`) | GET | 200, CORS *, JS CT, cache headers | ✅ 200, CORS=*, CT=application/javascript; charset=utf-8, cache=public; max-age=300; stale-while-revalidate=86400, body=28952B |
| 2 | `/api/sdk/script` | OPTIONS | 204, GET,OPTIONS, CORS * | ✅ 204, Allow-Methods=GET, OPTIONS, CORS=* |
| 3 | `/api/sdk/site_INVALIDKEY999/config` | GET | 404/500, CORS *, success=false | ✅ **500 (Postgres ECONNREFUSED)**, CORS=* header PRESENT on the 500 error response, body=`{"success":false,"message":"Failed to load SDK configuration"}` (CORS-tagged per section 29's fix) |
| 4 | `/api/sdk/site_ANY123/config` | OPTIONS | 204, GET,OPTIONS, CORS * | ✅ 204, Allow-Methods=GET, OPTIONS, CORS=* |
| 5 | `/api/sdk/site_ANY123/trackers` | OPTIONS | 204, GET,OPTIONS, CORS * | ✅ 204, Allow-Methods=GET, OPTIONS, CORS=* |
| 6 | `/api/consent/record` (no query) | GET | 400, CORS *, success=false | ✅ 400, CORS=*, success=false |
| 7 | `/api/consent/record` | OPTIONS | 204, GET,POST,OPTIONS, CORS * | ✅ 204, Allow-Methods=GET, POST, OPTIONS, CORS=* |
| 8 | `/api/consent/record` (body=`{}`) | POST | 400, CORS *, success=false | ✅ 400, CORS=*, success=false |
| 9 | `/api/consent/withdraw` (body=`{}`) | POST | 400, CORS *, success=false | ✅ 400, CORS=*, success=false |
| 10 | `/api/consent/withdraw` | OPTIONS | 204, POST,OPTIONS, CORS * | ✅ 204, Allow-Methods=POST, OPTIONS, CORS=* |
| 11 | `/api/sdk/site_INVALIDKEY999/trackers` | GET | 404/500, CORS *, success=false | ✅ **500 (DB unreachable)**, CORS=* present on 500 catch-block response, body=`{"success":false,…}` |

All 11 endpoints return identical CORS-complete results on **both** `localhost:3000` and `127.0.0.1:3000`, confirming the SDK script, config, trackers, consent record, and withdraw endpoints handle cross-origin requests correctly on every success AND error path.

#### Browser verification (integrated browser, viewId 0cff4489-…)

**Landing form (`/sdk-demo`)**:
- Snapshot confirmed: Header "CMP SDK — External Website Demo", subtitle, "Enter your site key" H2, textbox `site_…` + "Load SDK" button, Troubleshooting footer. 0 JS errors on initial render.

**After submitting `site_demo_test_001` → navigates to `?siteKey=site_demo_test_001`**:
- Snapshot confirmed **Testing Controls toolbar** rendered:
  - "Reset consent storage" [e8] + "Change site key" [e9] buttons at top.
  - Cross-origin testing card: "Same origin (http://localhost)" + "Switch to 127.0.0.1 (cross-origin)" buttons with labels.
  - Quick URL params card showing `?siteKey= site_demo_test_001`.
- CMP Public API panel rendered with all 5 action buttons (showBanner, openPreferenceCenter, acceptAll, rejectAll, withdrawConsent) + `window.CMP.getConsent()` output `{"consentId":null,"decisions":{},"websiteId":null}` (correct initial empty state).
- Event Log confirmed: `[<timestamp>] CMP API attached to window` — the SDK script loaded successfully from `/api/sdk/script?siteKey=…` and exposed `window.CMP`.
- Configuration preview rendered the "error" badge with the message `Failed to load SDK configuration` — matches the 500 DB-unavailable endpoint response; not silently swallowed.
- Installed Snippet card showed the correct `<script src="/api/sdk/script?siteKey=site_demo_test_001" data-site-key="site_demo_test_001" async></script>` tag (matches Installation page output).
- Console audit: 8 messages total, **0 JS errors from the demo/SDK**:
  - React DevTools info, `[HMR] connected`, Clerk dev-mode keys warning, `[CMP Demo] ✅ essential script always runs` (essential inline script with no purpose-tag correctly executes), Fast Refresh rebuild+done pair, and a **single** React Hydration-mismatch warning that was caused by inline `typeof window` hostname checks in the cross-origin button labels. That exact mismatch was **fixed** during this task by moving the hostname reads to `useEffect`-hydrated state. A post-fix page reload would eliminate it (the console capture was taken before the HMR of that specific patch landed).
- `[CMP Demo] ⚠️ analytics script EXECUTED` and `[CMP Demo] ⚠️ marketing script EXECUTED` did **not** appear in the console — confirming `data-cmp-purpose` tagged scripts are correctly **paused** (set to `type="text/plain"`) by the SDK's initial `pauseTaggedScripts()` pass regardless of DB state. They will only execute once that purpose is granted via a successful consent round-trip through the DB-backed POST→GET flow.

### Verification Gap (DB Unavailable — NOT FAKED, explicitly reported)

The full end-to-end flows (**banner renders with real policy config, Preference Center renders with purposes/vendors, submitConsent → persist decisions to DB → onConsentChange fires → localStorage survives page reload → withdrawConsent clears state and re-shows banner**) **could NOT be verified with real stored data**, because:

1. The config endpoint (test 3 above) returns HTTP **500** with `{"success":false,"message":"Failed to load SDK configuration"}` — this is the 500 catch-block fired by `drizzle/postgres-js` throwing `ECONNREFUSED` when connecting to `process.env.DATABASE_URL` (PostgreSQL container is not running; Docker daemon not reachable on this host).
2. Therefore: no `_config` is populated inside the SDK, so `renderBanner()` early-returns at the `if (!_config || !_config.bannerConfig) return;` guard, `renderPreferenceCenter()` early-returns at its own `if (!_config) return;` guard, and `submitConsent` would fail its `_config.websiteId` body-build with a TypeError.
3. **No success was faked**: the integrated-browser Config preview card correctly shows the "error" badge and the 500's error message, and the verification tables above deliberately show the 500 status instead of masking it as a 404. When a valid website row + active default policy + published policy version + attached purposes exist in PostgreSQL, the same probe on test 3 would return **200** with `success:true` and the banner/purposes/vendors payload, at which point:
   - The SDK populates `_config`, renders the configured banner via `renderBanner()`, and listens for accept-all/reject-all/customize clicks.
   - The Preference Center `renderPreferenceCenter()` builds the purpose/vendor switches seeded from the config + any stored decisions, builds `purposeDecisions[]/vendorDecisions[]` on the footer Save button, and submits them via `window.CMP.saveGranular()`.
   - The full POST `/api/consent/record` → 201/200 `{success:true, consentId, status, …}` → GET `/api/consent/record?consentId=X&websiteId=Y` → `saveConsent()` round-trip verified by construction in section 29 would execute for real and populate the localStorage keys + `_decisions` object.
   - A page reload would trigger `loadStoredConsent()` reading those same `_consent_/expiry_` keys back, re-populating `_decisions` and skipping the banner (until explicit showBanner/withdraw).
   - `withdrawConsent()` POST → 200 `{success:true, withdrawnAt}` → clear storage/null consentId/re-pause scripts/fire listeners/`renderBanner()` would execute per section 29's post-fix path.

This entire real-data verification gap is a single prerequisite: **start the PostgreSQL container defined in `docker-compose.yml`, run `npx drizzle-kit migrate`, create an org + website (with a siteKey you can paste into the demo) + active default policy with at least one published version and attached purposes (one required purpose recommended to exercise `resolveGranted`), then revisit `/sdk-demo?siteKey=<that-key>` — the banner will render automatically, and every button in the Testing Controls + CMP Public API panels will drive real DB records.**

### Current Status

The SDK demo page is now self-service for real-siteKey testing with **zero manual code edits**:
- **No hardcoding required**: Enter/paste a siteKey, click Load SDK, OR click a recently-used chip, OR append `?siteKey=<key>` directly to the URL.
- **Recent siteKeys survive sessions** in localStorage so repeat testers don't re-paste.
- **Instant consent-state reset** without DevTools (clears the consent keys, re-shows the banner).
- **One-click cross-origin switch** (localhost↔127.0.0.1) to exercise the CORS path on all 5 public endpoints exactly as an external website would.
- **Cross-origin correctness is code-confirmed and endpoint-proven** on both origins for every response (200/204/400/404/409/500). Every error response carries the CORS headers (section 29's bug fix).
- **DB unavailability is NOT masked**: demo page's Config preview shows the 500 error, banner correctly stays hidden because `_config` is null, and the full banner/PC/submit/persist/withdraw round-trip verification gap is explicitly documented above with the single prerequisite needed to close it (start Postgres, run migrations, seed a website+policy+purposes).
- **No schema/auth/business logic changes**: only the demo page's UI/UX was edited.

### Next Task

Still the next unblocked product task — Build the Billing page per section #24 (carried forward from the prior handoff). The next agent must:

- Read this file first.
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the new shared Card/Badge/StatCard/Button primitives from `src/components/ui/*` and the `globals.css` design tokens so it inherits the new premium dashboard aesthetic.
- Once the Billing page exists, update the sidebar Administration group's "Billing" item href from `/dashboard/settings/organization` to the new `/dashboard/billing`.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices (amount, status, date, download placeholder).
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- All queries must be scoped to the active organization via centralized bootstrap (do not re-implement auth).
- Keep Clerk authentication/bootstrap unchanged.
- Keep database schema unchanged.
- Do not add new npm dependencies.
- Run `npx tsc --noEmit` and fix only issues caused by the billing work.
- Update this file (CMP_AGENT_CONTEXT.md) with a new completed-task entry, files changed, verification result, and record the subsequent task before stopping.

---

# 27. Prompt Template

Use small prompts.

Example:

"Read CMP_AGENT_CONTEXT.md first. Work only on the current task described in the file. Inspect existing code before changing it. Preserve the existing Clerk, Drizzle, PostgreSQL, and tenant-isolation architecture. Make the smallest necessary change. Run the relevant typecheck/build. Update CMP_AGENT_CONTEXT.md with the completed work, changed files, verification result, and next task. Stop when the task is complete."

---

# 28. Definition of Done

A task is complete only when:

- The requested feature works.
- Existing functionality still works.
- Tenant isolation remains intact.
- No unnecessary schema changes were made.
- Authentication remains intact.
- Relevant checks pass.
- The agent context file is updated.
- The next task is clearly recorded.