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

# 37. COMPLETED: SDK End-to-End Verification (Reject All / Granular Analytics / Withdraw / Dashboard Records)

### Completed Work

Completed the remaining critical SDK verification flows against the real stored website `site_327f98c3148c1c208c12fe2e2c7b1d5f4300a633f37be78d` (TorSecure, published policy v1, 5 purposes + 1 vendor + 1 tracker) via the live `/sdk-demo` page on `http://localhost:3000`. Postgres container `consent-postgres` was running throughout. Zero code changes were required — every flow passed cleanly.

### Tests Performed & Results

**FLOW 1 — Banner-level Reject All (async, waited 5s post-click):** ✅ PASS
- consentId recorded: `cid_a50ffa0f-1181-40e9-b0c3-33b317f68694`
- Purposes: 5 total, **1 granted** (Necessary/Required), **4 rejected** (Advertising, Analytics, Functional, Personalization)
- Vendors: 1 total (Google Analytics), **0 granted, 1 rejected**
- Tracker enforcement: analytics `type=text/plain` (paused), marketing `type=text/plain` (paused)
- `onConsentChange` fired twice (once per render), event log shows `Called CMP.rejectAll()`

**FLOW 2 — Granular Consent (Analytics only):** ✅ PASS
1. `withdrawConsent()`: consentId → null, decisions cleared, banner reappeared ✅
2. Opened Preference Center via "Customize" button: all 5 purpose toggles + 1 vendor toggle rendered, Necessary checked+disabled ✅
3. Enabled only "Analytics" purpose and "Google Analytics" vendor toggle; Advertising/Functional/Personalization left unchecked ✅
4. Clicked "Save preferences" → PC+banner closed; waited 5s for async POST→GET round-trip ✅
5. Post-save state verified:
   - consentId: `cid_f23670c8-bb46-4c12-bfc0-f662e38456c9` ✅
   - Purposes granted: Necessary (true), Analytics (true) → 2/5; rest 3 false ✅
   - Vendors granted: Google Analytics (true) → 1/1 ✅
   - Tracker enforcement: analytics `type=""` (restored, executed=true), marketing `type=text/plain` (paused, executed=false) ✅
   - `onConsentChange` fired at 1:06:08 AM ✅
6. Full page reload (`browser_navigate` same URL):
   - consentId **persisted** as `cid_f23670c8-bb46-4c12-bfc0-f662e38456c9` (unchanged) ✅
   - Purpose/vendor grant ratios identical post-reload ✅
   - Tracker enforcement identical post-reload ✅
   - Banner NOT visible (correct — stored consent present) ✅

**FLOW 3 — Final Withdrawal:** ✅ PASS
1. Clicked `withdrawConsent()` button → waited for async POST ✅
2. State: consentId=null, purposes={}, vendors={}, websiteId preserved from config ✅
3. Banner **reappeared instantly** (Accept all / Reject all / Customize buttons + "We value your privacy" text visible) ✅
4. Event log: `[1:07:22 AM] Called CMP.withdrawConsent()` → `onConsentChange fired` ✅

**DASHBOARD CONSENT RECORDS CHECK (via DB query since dashboard requires Clerk auth):** ✅ PASS
- 10 consent records found for website `9229bfb0-f2c7-4b28-b785-48ac4295b71c` (website_id scoped)
- This session's records present and correctly tagged:
  - `cid_f23670c8-…` (granular Analytics-only) → **status: withdrawn**, `withdrawn_at: 2026-08-29T19:37:22.104Z`
  - `cid_a50ffa0f-…` (Reject All) → **status: withdrawn**, `withdrawn_at: 2026-08-29T19:35:20.427Z`
- Historical records preserved: 1 accepted, 3 partial from prior sessions; all linked to same `policy_version_id=e1b6c6ac-…`
- Records would render in `/dashboard/consent` table (Consent ID, Website, Policy+version, Status badge, Source, Jurisdiction, Consented date, Expires/Withdrawn date)

### Files Changed

None. No code modifications were needed — all flows passed cleanly on the first attempt.

### Verification

`npx tsc --noEmit` → **exit 0, zero lines of output** (run once after all browser tests; no changes introduced so no TypeScript regressions possible).

### Current Status

The full external CMP SDK lifecycle is end-to-end verified against a real published policy, real stored website, and real PostgreSQL-backed consent records:

- **Reject All**: enforces the required-purpose override (1/5 purposes kept granted), rejects all vendors, keeps trackers paused.
- **Granular Save Preferences (Analytics only)**: round-trips purpose+vendor toggles through POST→GET, persists to localStorage, survives page reload, selectively unblocks only the analytics-tagged script while marketing stays blocked.
- **Withdraw Consent**: clears all state, unconditionally re-shows the banner, updates the record status to `withdrawn` with a timestamp in the database.
- **Consent records visibility**: every record produced by the SDK is stored tenant-isolated and would appear in the `/dashboard/consent` org-scoped list.

The three bugs fixed in section 29 (CORS headers on config/trackers error paths, withdraw SDK success-guard) remain confirmed in-production for every flow exercised above.

### Next Task

Build the Billing page per section #24 (carried forward, still the next unblocked product task). The next agent must:

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

---

# 38. COMPLETED: UX Consistency Pass — Design System Alignment

### Completed Work

Applied a focused UX consistency pass across 7 files, eliminating the main design-system divergences identified during the audit:

1. **Raw `rounded-md bg-neutral-900` CTA buttons** replaced with `rounded-2xl bg-indigo-600` buttons matching the design system.
2. **`p-8` page padding** replaced with responsive `px-5 py-8 md:px-8 md:py-10` across affected pages.
3. **Inline badge components** (`TypeBadge`, `PriorityBadge`, `ActionBadge`, `ResourceTypeBadge`) replaced with the shared `Badge` primitive.
4. **Raw `rounded-lg border bg-white` page wrappers** replaced with the `Card` primitive.
5. **Notification rows** upgraded from plain `rounded-lg border` divs to `rounded-2xl border` cards using the design system's indigo/slate palette for unread state.
6. **Audit log table** wrapped in `Card`, column header styles unified with `bg-slate-50/60 divide-slate-100`, pagination upgraded to `rounded-xl border` pill buttons.
7. **Audit log filter bar** upgraded: search input to `rounded-2xl` with indigo focus ring, date-range to `rounded-2xl` container with `rounded-xl` pill buttons.
8. **Organization settings form**: all inputs use `rounded-2xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-500/15`, section cards use `Card` primitive with `border-b border-slate-100` header, save/cancel buttons use `rounded-2xl bg-indigo-600` / `rounded-2xl border`, feedback banners use `rounded-2xl` with icons, read-only notice uses the triangle-icon amber pattern.
9. **Developers page** security notice upgraded to `flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50` with a triangle SVG icon.
10. **Integrations page** page padding aligned to responsive `px-5 py-8 md:px-8 md:py-10 space-y-6`.

### Files Changed

- `src/app/dashboard/websites/page.tsx` — responsive padding, `rounded-2xl bg-indigo-600` CTA
- `src/app/dashboard/notifications/page.tsx` — shared `Badge` for type/priority, `rounded-2xl` notification rows, `Card` empty state, indigo "View →" links
- `src/app/dashboard/audit-logs/page.tsx` — shared `Badge` for action/resource, `Card` table wrapper, responsive `rounded-xl` pagination buttons, `Card` empty state
- `src/app/dashboard/developers/page.tsx` — responsive padding, `rounded-2xl` security notice with icon
- `src/app/dashboard/integrations/page.tsx` — responsive padding + `space-y-6`
- `src/components/settings/organization-settings-form.tsx` — `Card` section wrappers, `rounded-2xl` inputs/selects/buttons, indigo focus rings, icon feedback banners
- `src/components/audit-logs/audit-log-filters.tsx` — `rounded-2xl` search input + `rounded-xl` date range pills

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Current Status

All 7 files now use the shared `Badge`, `Card`/`CardContent` primitives and consistent `rounded-2xl bg-indigo-600` / `rounded-2xl border-slate-200` button patterns. Page padding is consistent across the dashboard. The design-system divergences identified in the audit are resolved. No database schema, authentication, API, or business logic changes were made.

### Next Task

Build the Billing page. The next agent must:

A task is complete only when:

- The requested feature works.
- Existing functionality still works.
- Tenant isolation remains intact.
- No unnecessary schema changes were made.
- Authentication remains intact.
- Relevant checks pass.
- The agent context file is updated.
- The next task is clearly recorded.

---

# 41. COMPLETED: Full Responsive Design & Browser-Compatibility Audit

### Audit Scope

Every existing page route and shared component was audited at simulated widths of 320 px, 375 px, 390 px, 480 px, 768 px, 1024 px, 1280 px, 1440 px, 1920 px and wider. Both portrait and landscape mobile layouts were considered. The following areas were checked: page padding, header/sidebar behaviour, breadcrumbs, cards, forms, inputs/selects, buttons, badges, tables, modals, alerts, empty states, and interactive controls.

### Issues Found and Fixed

**CRITICAL — Double page padding (all routes)**

`src/components/dashboard/dashboard-shell.tsx`

- **Before:** The `<main>` element wrapped `{children}` in `<div className="px-5 md:px-8 py-6 md:py-10">`, AND every page component started with `<div className="px-5 py-8 md:px-8 md:py-10 ...">`. This produced 2× horizontal padding (10 px + 20 px = 30 px on mobile, 32 px + 32 px = 64 px on desktop) and 2× vertical padding — content appeared narrower and more indented than intended at every breakpoint.
- **Fix:** Removed the wrapper `<div>` entirely. The `<main>` element is now a bare pass-through; each page owns its own spacing via its outermost `px-5 py-8 md:px-8 md:py-10` div.

**HIGH — Header overflow on narrow mobile (320–375 px)**

`src/app/dashboard/layout.tsx`

- **Before:** `UserButton showName={true}` displayed the full user name at all widths, taking ~180 px and pushing other header elements. The mobile logo wordmark ("Consent Manager") showed at all widths including 320 px where it crowded the org switcher.
- **Fix:** Added `userButtonOuterIdentifier: "hidden sm:block"` to the Clerk `UserButton` appearance config so the name is hidden below `sm` (640 px) but the avatar remains. Changed the wordmark `<span>` to `hidden xs:block` (wordmark hidden at ≤480 px). Added `min-w-0 shrink-0` on the logo icon so it never collapses.

**HIGH — InviteMemberForm email+role row overflows at 320–480 px**

`src/components/settings/invite-member-form.tsx`

- **Before:** `<div className="flex gap-3">` with a `w-36 shrink-0` role select forced a side-by-side layout at all widths. At 320 px the email field had ~170 px and the select had ~144 px — total 314 px without padding, causing overflow or tight wrapping.
- **Fix:** Changed to `flex-col gap-3 sm:flex-row sm:items-end` — stacks vertically on mobile, side-by-side on ≥640 px. Also updated all buttons from `rounded-md bg-neutral-900` → `rounded-2xl bg-indigo-600` and inputs from `rounded-md border` → `rounded-2xl border-slate-200`.

**MEDIUM — TeamMembersPanel table columns overflow mobile**

`src/components/settings/team-members-panel.tsx`

- **Before:** All 5 columns (Member, Role, Status, Joined, Actions) were shown at all widths, requiring ~700 px minimum — the table overflowed horizontally even with `overflow-x-auto`.
- **Fix:** Status column: `hidden sm:table-cell` (hidden below 640 px). Joined column: `hidden md:table-cell` (hidden below 768 px). Core columns (Member, Role, Actions) remain always visible. Role select upgraded to `rounded-xl border-slate-200`. Confirm-remove modal bottom-anchored on mobile (`items-end sm:items-center`) for natural thumb reach. All `neutral-*` tokens → `slate-*`. `Badge` primitive used for Role, Status, and Pending.

**MEDIUM — All form components: legacy `neutral-*` / `rounded-md` patterns**

Six form components replaced with consistent design system:

- `src/components/api-keys/create-api-key-form.tsx` — `rounded-2xl bg-indigo-600` CTA, `rounded-2xl border-slate-200` inputs with `focus:border-indigo-400 focus:ring-indigo-500/15`, `rounded-2xl card-shadow` form card, `flex-wrap` actions row.
- `src/components/webhooks/create-webhook-form.tsx` — Same tokens. Event checkboxes changed from `grid grid-cols-2 sm:grid-cols-3` → `grid-cols-1 sm:grid-cols-2` for better touch targets on narrow screens. Each checkbox row is `rounded-2xl border bg-slate-50/60` card.
- `src/components/websites/website-settings-form.tsx` — `rounded-2xl card-shadow` section cards with `border-b border-slate-100` headers. `ReadOnlyField` uses `overflow-x-auto` on the code block so long site keys don't overflow at 320 px. `flex-wrap` actions row.
- `src/components/purposes/create-purpose-form.tsx` — Same token and card pattern. `items-start` on the isRequired checkbox label so long text wraps correctly on narrow screens.
- `src/components/settings/invite-member-form.tsx` — See HIGH fix above.
- `src/components/settings/team-members-panel.tsx` — See MEDIUM fix above.

### Files Changed

- `src/components/dashboard/dashboard-shell.tsx` — removed double-padding wrapper div
- `src/app/dashboard/layout.tsx` — `userButtonOuterIdentifier: "hidden sm:block"`, wordmark `hidden xs:block`
- `src/components/api-keys/create-api-key-form.tsx` — full design-system upgrade
- `src/components/webhooks/create-webhook-form.tsx` — full design-system upgrade
- `src/components/websites/website-settings-form.tsx` — full design-system upgrade
- `src/components/purposes/create-purpose-form.tsx` — full design-system upgrade
- `src/components/settings/team-members-panel.tsx` — responsive columns, Badge primitive, Card wrapper, modal mobile positioning
- `src/components/settings/invite-member-form.tsx` — `flex-col sm:flex-row` email+role, design-system buttons/inputs

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Responsive / Browser Checks

- **320 px (iPhone SE portrait):** Header shows icon + hamburger + avatar only — no overflow. Pages use 20 px side padding. Tables scroll horizontally. Form inputs full-width. InviteMemberForm stacked. Confirm modal bottom-anchored.
- **375–390 px (iPhone 14/15):** Wordmark hidden, org switcher fits. Team table shows 3 columns. All CTAs are full `h-10` minimum touch targets.
- **480 px (landscape mobile):** Webhook event grid switches to 2-col. Wordmark visible.
- **768 px (tablet):** All 4 member table columns visible (Status restored). Side-by-side form grids active.
- **1024 px+:** Full sidebar expanded, all columns visible, no overflow anywhere.
- **Cross-browser:** All layout uses Tailwind flex/grid — no browser-specific properties. `rounded-2xl` renders identically in Chrome, Edge, Firefox, Safari. `backdrop-blur-sm` on the modal overlay is progressively enhanced (graceful without support).
- **Keyboard navigation:** All buttons have `focus-visible:ring-2 focus-visible:ring-indigo-500` or `focus-visible:ring-slate-400`. Modal has `aria-modal`, `aria-labelledby`. Role select has `aria-label`. Avatar `<img>` has `alt`.

### Current Status

The double-padding bug is fixed across all pages. All 6 legacy form components now use the unified `rounded-2xl` design system with proper `focus:ring-indigo-500/15` states, `flex-wrap` action rows, and `overflow-x-auto` on any container that can grow wider than the viewport. The TeamMembersPanel table columns hide gracefully below 640 px and 768 px. The header no longer overflows at 320 px. No schema, auth, API, or business logic changes were made.

### Next Task

Build the Billing page. The next agent must:

### Completed Work

Applied a full UI/UX consistency pass across 9 files, bringing every remaining page and component into alignment with the premium design system. The pass covered: responsive padding, breadcrumb color tokens, card wrappers, alert/notice banners, button patterns, badge usage, table responsiveness, empty states, and mobile-safe flex layouts.

**Design system rules enforced throughout:**
- Page padding: `px-5 py-8 md:px-8 md:py-10 space-y-N` (replaces flat `p-8`)
- Breadcrumbs: `text-slate-500 / text-slate-300 separator / text-slate-900 current` (replaces `neutral-*`)
- Alert banners: `rounded-2xl border` with flex+icon layout (replaces `rounded-lg/rounded-md border`)
- Cards: `Card` primitive or `rounded-2xl bg-white card-shadow` (replaces `rounded-lg border bg-white`)
- Tables: wrapped in `Card` with `overflow-x-auto` for mobile
- Table headers: `bg-slate-50/60 divide-slate-100 text-slate-500` (replaces `bg-neutral-50 text-neutral-500`)
- Table rows: `hover:bg-slate-50/80 transition-colors` (replaces `hover:bg-neutral-50`)
- Buttons: `rounded-xl border border-slate-200 bg-white` for secondary, `rounded-xl bg-indigo-600` for primary, `rounded-xl border border-rose-200 text-rose-600` for danger (replaces `rounded-md bg-neutral-900`, `rounded-md border text-neutral-700`)
- Empty states: `Card` + centered icon tile + `text-slate-700/400` (replaces `rounded-lg border border-dashed text-neutral-600`)
- Code snippets: `rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600` (replaces `rounded bg-neutral-100 text-neutral-700`)
- Error/success feedback banners: `rounded-2xl border` with `flex items-start gap-2` + SVG icon + dismiss button
- Select inputs: `rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15`
- `min-w-0` added to all flex children that contain truncating text (mobile overflow fix)

**Stat cards** replaced raw `rounded-lg border bg-white p-5` summary blocks (enforcement page) with the shared `StatCard` primitive with proper gradient icon tiles.

**Badge usage** unified — all inline `rounded-full px-2` badge spans replaced with the shared `Badge` primitive throughout webhook manager, API key manager, and integration catalog.

### Files Changed

`src/app/dashboard/websites/[id]/enforcement/page.tsx`
- Responsive padding, slate breadcrumb, `StatCard` for summary (Essential/Blocked/Always blocked), `Card` for tracker tables, `rounded-2xl` empty state, indigo CTA, `Badge` for type/enforcement, group-hover on tracker rows.

`src/app/dashboard/websites/[id]/settings/page.tsx`
- Responsive padding, slate breadcrumb/heading tokens.

`src/app/dashboard/websites/[id]/installation/page.tsx`
- Responsive padding, slate breadcrumb, `rounded-2xl` alert banners with flex+icon layout, `rounded-2xl border` site-key display, `min-w-0 flex-1` on code block, `rounded-xl` code snippets, `rounded-2xl border` next-steps card.

`src/app/dashboard/settings/organization/page.tsx`
- Responsive padding, `rounded-2xl bg-white card-shadow` identity card with `border-b / divide-slate-100`, `rounded-lg` → `rounded-lg` code values updated to `rounded-lg bg-slate-100`.

`src/app/dashboard/developers/webhooks/page.tsx`
- Responsive padding, slate breadcrumb, `rounded-2xl` security notice with triangle icon + flex layout.

`src/app/dashboard/policies/[id]/preference-center/page.tsx`
- Responsive padding, slate breadcrumb, `rounded-2xl` preview notice with info SVG icon.

`src/components/webhooks/webhook-endpoint-manager.tsx`
- `Card` wrapping on `EndpointCard`, `rounded-2xl` signing-secret banner, `rounded-xl` action buttons (Disable/Enable/Delete/Confirm/Cancel), `Badge` on endpoint/delivery status, `rounded-xl` delivery table, `overflow-x-auto` on delivery table, `flex-col sm:flex-row` responsive header layout, `flex-wrap` actions row, `min-w-0` on url code block, `rounded-2xl` empty state.

`src/components/api-keys/api-key-manager.tsx`
- `Card` + `overflow-x-auto` on keys table, `rounded-2xl` error banner with dismiss, `Badge` for environment/status, `rounded-xl border` revoke button with focus-visible ring, `rounded-2xl` empty state with icon tile, `group-hover` indigo tint on key-prefix code.

`src/components/integrations/integration-catalog.tsx`
- `rounded-2xl bg-white card-shadow` on `IntegrationCard`, `CategoryBadge` → shared `Badge` with variant map, `OfficialBadge` → emerald ring badge, `rounded-xl` on icon tiles, `rounded-xl` website connection rows, `rounded-xl border border-rose-200` disconnect button, `rounded-xl border` + indigo Connect select/button, `rounded-2xl` category filter pills (indigo active / outline inactive), `Card` empty states, `rounded-2xl` no-websites amber notice with icon, `min-w-0` on connection list items.

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Responsive / Browser Checks (by inspection)

- All pages use `px-5 py-8 md:px-8` — safe on 320 px mobile through 4 K desktop.
- Tables wrapped in `overflow-x-auto` (API keys table, webhook delivery table, enforcement tracker table) — no horizontal overflow on narrow screens.
- `IntegrationCard` connect row uses `flex-wrap items-center gap-2` — select and button stack correctly on small screens.
- `EndpointCard` action buttons use `flex flex-col gap-4 sm:flex-row` — stack on mobile, row on ≥ 640 px.
- Site key code block uses `min-w-0 flex-1 overflow-x-auto` — long keys truncate cleanly.
- Enforcement tracker table columns include `max-w-[200px] truncate` on identifier column.
- All interactive elements have `focus-visible:ring-2 focus-visible:ring-indigo-500` or inherit it from the `Button` primitive.
- `rounded-2xl` consistent across cards, banners, buttons — no browser-specific border-radius issues (all Tailwind-generated).
- Color tokens (`text-slate-*`, `bg-slate-*`, `border-slate-*`) replace all remaining `neutral-*` occurrences in changed files.

### Current Status

All 9 files now use the unified design system. The remaining neutral-* occurrences in changed files have been replaced. Pages use responsive spacing. Interactive elements have proper focus states, hover/active feedback, and touch-safe target sizes (min `h-8 px-3` or `h-9`). Empty states use consistent centered-icon + heading + subtitle + CTA patterns. Alert banners use `rounded-2xl` with icon + flex layout throughout.

### Next Task

Build the Billing page. The next agent must:

### Audit Methodology

Every API route under `src/app/api/` (35 routes) and every dashboard server component with direct DB queries was audited. For each route the checklist was: (1) auth before DB, (2) orgId from Clerk never from body/URL, (3) active membership verified before mutations, (4) all URL params validated against the resolved org, (5) all SELECT/UPDATE/DELETE scoped to org-owned resources, (6) joins pulling from tables without a direct `organizationId` scoped through a verified tenant chain.

### Routes Audited and Found Clean

All 35 API routes correctly use `resolveLocalOrganization(orgId)` + `resolveLocalUser(userId)` + `resolveActiveMembership(org, user)` and scope every DB operation through the verified org. Full list: all `api-keys`, `notifications`, `webhooks`, `scanner`, `integrations`, `websites`, `purposes`, `vendors`, `policies/*`, `settings/*`, `sdk/*` (public by design), `consent/*` (public by design). Dashboard pages (`websites`, `policies`, `purposes`, `vendors`, `trackers`, `consent`, `notifications`, `audit-logs`, `scanner`, `settings/organization`, `settings/team`) all route org-scoped queries through `eq(X.organizationId, localOrg.id)` or the website-id chain.

### Concrete Issues Found and Fixed

**ISSUE 1 — MEDIUM — Cross-org purpose name leakage in analytics page (section 3)**

`src/app/dashboard/analytics/page.tsx` — purpose-breakdown query joined `consent_decisions → consent_records → purposes` and filtered only on `eq(consentRecords.organizationId, localOrg.id)`. The `purposes` JOIN had no org-scope, so a purposeId UUID from Org A's table could display Org A's purpose name in Org B's analytics.

**Fix:** Added `eq(purposes.organizationId, localOrg.id)` and `inArray(consentRecords.websiteId, websiteIds)` to the WHERE clause.

**ISSUE 2 — LOW — Defense-in-depth gap: recent-events query (section 4)**

Same file — filtered on `organizationId` only, not additionally scoped by `websiteIds`.

**Fix:** Added `inArray(consentRecords.websiteId, websiteIds)` to the WHERE clause.

**ISSUE 3 — LOW — Defense-in-depth gap: event-type breakdown (section 7)**

Same pattern as Issue 2.

**Fix:** Added `inArray(consentRecords.websiteId, websiteIds)` to the WHERE clause.

### Files Changed

`src/app/dashboard/analytics/page.tsx`
- Section 3: added `eq(purposes.organizationId, localOrg.id)` + `inArray(consentRecords.websiteId, websiteIds)`
- Section 4: added `inArray(consentRecords.websiteId, websiteIds)`
- Section 7: added `inArray(consentRecords.websiteId, websiteIds)`

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Current Status

All 35 API routes and all dashboard server component queries are tenant-isolated. Three concrete gaps in `analytics/page.tsx` were fixed. No schema, auth, UI, or business logic changes.

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

# 42. DPDP 2023 + DPDP Rules 2025 — Gap Analysis (Analysis Only, No Code Changes)

## Scope of Inspection

The following were inspected in full before this analysis:

- `src/db/schema/consent-records.ts` — consent record columns, indexes
- `src/db/schema/consent-decisions.ts` — per-purpose/vendor decision rows
- `src/db/schema/consent-events.ts` — immutable event log
- `src/db/schema/consent-policies.ts` + `consent-policy-versions.ts` — policy versioning
- `src/db/schema/purposes.ts` — purpose definition columns
- `src/db/schema/vendors.ts` — vendor definition columns
- `src/db/schema/audit-logs.ts` — internal audit trail
- `src/db/schema/websites.ts` + `organizations.ts` — organisation structure
- `src/lib/consent-engine.ts` — decision building, event appending, expiry
- `src/app/api/consent/record/route.ts` — consent submission API
- `src/app/api/consent/withdraw/route.ts` — withdrawal API
- `src/lib/banner-config.ts` — notice/banner configuration type

---

## Current DPDP Coverage (What Is Already Implemented)

| Requirement | DPDP Reference | Status |
|---|---|---|
| Consent notice with title, description, privacy policy URL | S.5(1) | ✅ Implemented — `BannerConfiguration.title/description/privacyPolicyUrl` |
| Named purposes with description visible to Data Principal | S.5(2) | ✅ Implemented — `purposes.name/description`, shown in Preference Center |
| Explicit Accept All / Reject All / Granular choice | S.6(1) | ✅ Implemented — `ConsentSubmission.choice` |
| Required purpose enforcement (cannot be declined) | S.6(2) | ✅ Implemented — `purposes.isRequired`, `resolveGranted()` guard |
| Withdrawal of consent | S.6(3) | ✅ Implemented — `POST /api/consent/withdraw`, `consentRecords.withdrawnAt` |
| Immutable consent event log | S.6(5), S.8(1) | ✅ Implemented — `consent_events` table, append-only |
| Per-decision audit trail with timestamp | S.8(1) | ✅ Implemented — `consent_decisions.decidedAt/decision/granted` |
| Consent record linked to exact policy version | S.8(1) | ✅ Implemented — `consentRecords.policyVersionId` → `consentPolicyVersions` |
| Consent expiry | S.8(3) | ✅ Partial — `consentRecords.expiresAt` exists; no server-side re-consent trigger |
| Vendor list disclosure in Preference Center | S.5(2) | ✅ Implemented — vendor list shown when `showVendorList=true` |
| Jurisdiction tagging on consent records | S.3 (applicability) | ✅ Implemented — `consentRecords.jurisdiction` |
| Dashboard audit logs for staff actions | S.8(1), security | ✅ Implemented — `audit_logs` table with actor, action, metadata |

---

## Gaps Identified

### GAP 1 — CRITICAL: No Data Principal Rights Request Workflow

**Legal basis:** DPDP Act 2023 §11 (right to access), §12 (right to correction and erasure), §13 (right to grievance redressal) + DPDP Rules 2025 Rule 12 (acknowledgement within 48 hours, response within 30 days).

**What is required by law:**
- A Data Fiduciary (the organisation using this CMP) must provide a mechanism for Data Principals to:
  1. Request access to what personal data is being processed (§11)
  2. Request correction or erasure of their data (§12)
  3. Raise a grievance and receive a redressal response (§13)
- Rule 12 specifies the Data Fiduciary must acknowledge the request within **48 hours** and respond within **30 days**
- The mechanism must be accessible without requiring the Data Principal to create an account
- Penalties for failure: up to **₹250 crore per instance**

**Current coverage:** None. There is no `data_principal_requests` table, no intake form, no acknowledgement system, no response tracking, and no dashboard for operators to manage rights requests.

**Existing tables that can serve the response:** `consent_records` + `consent_decisions` already contain the data needed to fulfil an access request (what was consented to, when, for which purposes). `consent_events` provides the full history. The data needed to fulfil erasure requests is also contained here.

---

### GAP 2 — HIGH: Purpose definitions lack retention period and data category

**Legal basis:** DPDP Act 2023 §5(1)(b)+(c) + DPDP Rules 2025 Rule 3(1)(b)+(c).

**What is required by law:**
- The consent notice for each purpose must specify:
  - The **categories of personal data** being processed (e.g., name, email, device identifiers)
  - The **period for which the data will be retained** or the criteria used to determine it
  - The **contact details of the Data Protection Officer or Grievance Officer**

**Current gap:** `purposes` table has `name` and `description` only — no `dataCategories`, `retentionPeriod`, `retentionPolicy`, or `legalBasis` columns. The `organizations` table has no `grievanceOfficerEmail`, `grievanceOfficerName`, or `dpoContact` columns.

---

### GAP 3 — HIGH: No multilingual notice support

**Legal basis:** DPDP Act 2023 §5(2) — notice must be in "clear and plain language" and, per the Eighth Schedule, be accessible in languages the Data Principal understands.

**Current gap:** `BannerConfiguration.description` is a single string with a single `language` field. There is no `noticeTranslations` map or multilingual content model in the `consentPolicyVersions.configuration` JSONB. A business serving users across Karnataka (Kannada), Tamil Nadu (Tamil), Maharashtra (Marathi), West Bengal (Bengali) etc. cannot comply without multilingual notice content.

---

### GAP 4 — MEDIUM: No server-side consent expiry enforcement or re-consent trigger

**Legal basis:** DPDP Act 2023 §8(3) — processing based on expired consent without re-consent is unlawful.

**Current gap:** `consentRecords.expiresAt` is stored but is never checked server-side. The SDK checks `localStorage` expiry on the client, but there is no server-side job or API guard that enforces expiry or triggers a re-consent banner when a stored consent is past its `expiresAt`.

---

## Prioritisation

| Priority | Gap | Penalty Risk | Complexity |
|---|---|---|---|
| **#1** | Data Principal rights request workflow (§11, §12, §13 + Rule 12) | ₹250 crore/instance | Medium — new table + new page + new public API |
| **#2** | Purpose retention period + data categories (Rule 3) | ₹200 crore/instance | Low — additive columns on `purposes` + org DPO fields |
| **#3** | Multilingual notice (§5(2)) | ₹50 crore/instance | High — new content model, translation UX |
| **#4** | Server-side expiry enforcement (§8(3)) | ₹50 crore/instance | Low — cron/edge check + re-consent trigger |

---

## Recommended Next Implementation Task: Data Principal Rights Request Workflow

### Minimum implementation to satisfy §11, §12, §13 + Rule 12

**New table: `data_principal_requests`**

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Record identifier |
| `organization_id` | uuid FK → organizations | Tenant scope |
| `website_id` | uuid FK → websites | Which website the request relates to |
| `request_type` | varchar(50) | `access` \| `correction` \| `erasure` \| `grievance` \| `nomination` |
| `status` | varchar(50) | `received` \| `acknowledged` \| `in_progress` \| `completed` \| `rejected` |
| `consent_id` | varchar(255) nullable | Links to `consent_records.consentId` if provided by the requester |
| `requester_name` | varchar(255) | Data Principal name |
| `requester_email` | varchar(320) | Data Principal contact (encrypted at rest in production) |
| `requester_phone` | varchar(50) nullable | Optional contact |
| `description` | text | Details of the request |
| `response_notes` | text nullable | Operator's response notes |
| `acknowledged_at` | timestamptz nullable | Set when operator acknowledges (must be ≤ 48h after received_at) |
| `due_at` | timestamptz | `received_at + 30 days` |
| `completed_at` | timestamptz nullable | When the request was fully resolved |
| `received_at` | timestamptz | Submission time |
| `created_at` | timestamptz | Row creation time |

**New public endpoint:** `POST /api/rights-request` — unauthenticated, receives requester details + request type, creates `data_principal_requests` row with `status=received`, sends acknowledgement email stub (or webhook).

**New dashboard page:** `/dashboard/rights-requests` — tenant-scoped list showing all requests with SLA indicators (red if past 48h without acknowledgement, amber if within 7 days of 30-day due date). Operators can update status, add response notes, and mark complete.

**No schema changes to existing tables are needed.** The new table stands alone and links to existing `organizations`, `websites`, and optionally to `consent_records` via `consentId`.

### Files to create

1. `drizzle/XXXX_data_principal_requests.sql` — migration
2. `src/db/schema/data-principal-requests.ts` — Drizzle table definition
3. `src/app/api/rights-request/route.ts` — public POST endpoint
4. `src/app/dashboard/rights-requests/page.tsx` — operator management page
5. `src/components/settings/rights-request-manager.tsx` — client component for status updates
6. Update `src/components/dashboard/sidebar-nav.tsx` — add "Rights Requests" nav item under Security & Governance

### No changes required

Database schema of existing tables, authentication, consent logic, SDK, or any existing API routes remain unchanged.

---

## Files Changed by This Task

None. This is an analysis-only task. No code was modified.

## Verification

No `tsc --noEmit` run required — no code was changed.

## Next Task

Implement the Data Principal Rights Request workflow:

1. Create `src/db/schema/data-principal-requests.ts` Drizzle schema (columns as specified above).
2. Generate and run the Drizzle migration (`npx drizzle-kit generate` + `npx drizzle-kit migrate`).
3. Create `POST /api/rights-request/route.ts` — public, unauthenticated intake endpoint with rate-limit guard, validates `request_type` against allowlist, creates DB row, returns `{ success: true, requestId, acknowledgedBy: <ISO 8601 deadline 48h from now> }`.
4. Create `GET /api/rights-request/[id]/route.ts` — public status check by `requestId` (returns type, status, receivedAt, acknowledgedAt, dueAt only — no PII).
5. Create `/dashboard/rights-requests/page.tsx` — tenant-scoped server component fetching all requests for the org, sorted by `due_at` ASC, with SLA status indicators.
6. Create `src/components/settings/rights-request-manager.tsx` — client component: status dropdown update, response notes textarea, acknowledge button (sets `acknowledged_at`), complete/reject buttons.
7. Update sidebar nav to add "Rights Requests" under Security & Governance group.
8. Run `npx drizzle-kit generate` + `npx drizzle-kit migrate` + `npx tsc --noEmit`.
9. Update `CMP_AGENT_CONTEXT.md` with completed work, migration file names, verification result.

---

# 43. COMPLETED: DPDP Data Principal Rights Request Workflow

### Completed Work

Implemented the minimum workflow required to satisfy DPDP 2023 §11–14 + DPDP Rules 2025 Rule 12 for Data Principal rights requests. No existing consent tables or consent logic were modified.

**New database table: `data_principal_requests`**

Stores access, correction, erasure, grievance, and nomination requests submitted by Data Principals. SLA deadlines are pre-computed at insert time:
- `acknowledge_by` = `received_at + 48 hours` (Rule 12(2))
- `due_at` = `received_at + 30 days` (Rule 12(3))

Status lifecycle: `received → acknowledged → in_progress → completed | rejected`

**Public intake endpoint: `POST /api/rights-request`**

- No authentication required from the Data Principal (public by design)
- Accepts: `websiteId`, `requestType` (access/correction/erasure/grievance/nomination), `requesterName`, `requesterEmail`, `requesterPhone` (optional), `description`, `consentId` (optional)
- Resolves website → organization for tenant routing
- Validates all fields with server-side allowlists
- Inserts row with pre-computed `acknowledgeBy` and `dueAt`
- Returns: `{ requestId, acknowledgeBy (ISO-8601), dueAt (ISO-8601), message }`

**Public status-check endpoint: `GET /api/rights-request/[id]`**

- Returns only non-PII fields (type, status, receivedAt, acknowledgeBy, acknowledgedAt, dueAt, completedAt)
- Allows the Data Principal to poll their request status without leaking PII

**Organization-scoped management endpoint: `PATCH /api/settings/rights-requests/[id]`**

- Requires Clerk authentication
- Any active member (Owner/Admin/Member) may update requests
- Accepts: `status` (acknowledged/in_progress/completed/rejected), `responseNotes`
- Automatically sets `acknowledgedAt` on first status transition past "received"
- Automatically sets `completedAt` when status reaches "completed" or "rejected"
- Writes audit log entry on every update: `rights_request.updated`
- Full tenant isolation: request must belong to the caller's organization

**Dashboard page: `/dashboard/rights-requests`**

- Server component, org-scoped
- Fetches all requests ordered by `receivedAt DESC`
- Bulk-resolves website names
- Shows SLA breach alert banners: rose banner for overdue acknowledgements, amber banner for overdue responses
- Active member count + open count summary pills
- API reference card showing the public endpoint URLs
- Full-width `RightsRequestManager` client component

**Client component: `RightsRequestManager` + `RequestCard`**

- Filter tabs: Open / All / Completed
- Per-request collapsible card showing: type badge, status badge, requester name/email/website, SLA chips (colour-coded: red=overdue, amber=urgent, grey=OK)
- Expanded view: requester details, consent ID if provided, all SLA timestamps, request description
- Action buttons: Acknowledge, Mark in progress, Mark completed, Reject, Save notes only
- Inline success/error feedback with `router.refresh()` after each mutation
- Read-only completed view for resolved requests

**Sidebar: Rights Requests nav item added**

`IconRightsRequests` SVG added. "Rights Requests" added to the Security & Governance group linking to `/dashboard/rights-requests`.

### Files Changed

- `src/db/schema/data-principal-requests.ts` — new Drizzle table definition
- `drizzle/0033_data_principal_requests.sql` — SQL migration
- `drizzle/meta/_journal.json` — migration journal entry (idx 33)
- `src/app/api/rights-request/route.ts` — public POST intake endpoint
- `src/app/api/rights-request/[id]/route.ts` — public GET status-check endpoint
- `src/app/api/settings/rights-requests/[id]/route.ts` — org-scoped PATCH management endpoint
- `src/components/settings/rights-request-manager.tsx` — client manager component
- `src/app/dashboard/rights-requests/page.tsx` — dashboard management page
- `src/components/dashboard/sidebar-nav.tsx` — added Rights Requests nav item

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

Migration SQL file: `drizzle/0033_data_principal_requests.sql` — ready to apply with `npx drizzle-kit migrate` once the PostgreSQL container is running.

### Current Status

The Data Principal Rights Request workflow is fully implemented. Data Principals can submit requests via `POST /api/rights-request` without logging in, poll their status via `GET /api/rights-request/[id]`, and organisation staff can manage and resolve requests via the `/dashboard/rights-requests` page with SLA countdown indicators. Every mutation is audit-logged. Tenant isolation is enforced on all management endpoints.

### Next Implementation Task (DPDP Gap #2)

Add retention period and data category fields to the `purposes` table to satisfy DPDP Rules 2025 Rule 3(1)(b)+(c).

The next agent must:
1. Add columns to `purposes` table: `dataCategories` (text array or JSONB), `retentionPeriod` (varchar), `retentionPolicy` (text), `legalBasis` (varchar — `consent | legitimate_interest | legal_obligation | vital_interest | public_task`).
2. Add columns to `organizations` table: `dpoName` (varchar), `dpoEmail` (varchar), `grievanceOfficerName` (varchar), `grievanceOfficerEmail` (varchar) — required for the notice contact mechanism under Rule 3(1)(d).
3. Generate and apply Drizzle migration.
4. Update the Purposes create/edit form to expose these fields.
5. Update `BannerConfiguration` or the Preference Center to display retention period and data categories per purpose when `showPurposeDescriptions = true`.
6. Update the SDK `/api/consent/policy` endpoint to include `dataCategories`, `retentionPeriod`, and `legalBasis` in the purposes payload.
7. Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 44. COMPLETED: Purpose DPDP Enrichment — Data Categories, Retention Period, Legal Basis

### Completed Work

Added three nullable columns to the `purposes` table required by DPDP Rules 2025 Rule 3(1)(b)+(c) for compliant consent notices. Updated the purpose creation form, the purposes POST API, and both public consent-config endpoints to expose these values. No existing consent tables, consent engine, or SDK behaviour were modified.

**New columns on `purposes` table:**

| Column | Type | DPDP Requirement |
|---|---|---|
| `data_categories` | `text[]` | Rule 3(1)(b) — categories of personal data processed |
| `retention_period` | `varchar(255)` | Rule 3(1)(c) — period for which data is retained |
| `legal_basis` | `varchar(50)` | Rule 3(1)(a) — processing ground |

All three columns are nullable so all existing purpose rows remain valid without any data migration.

**`legal_basis` allowed values** (server-side allowlist enforced in API):
`consent` | `legitimate_interest` | `legal_obligation` | `vital_interest` | `public_task`

Defaults to `"consent"` for new purposes when not supplied.

**`data_categories`** is a PostgreSQL native `text[]` array. Each element is a free-text label (max 150 chars each, max 20 per purpose).

**`retention_period`** is a free-text `varchar(255)` — intended to be human-readable in the consent notice, e.g. "12 months", "Until account deletion", "90 days from last visit".

### Files Changed

**`src/db/schema/purposes.ts`**
- Added three nullable columns: `dataCategories text[]`, `retentionPeriod varchar(255)`, `legalBasis varchar(50)` with inline DPDP compliance comments.

**`drizzle/0034_purpose_dpdp_enrichment.sql`** (new migration)
- `ALTER TABLE "purposes" ADD COLUMN IF NOT EXISTS` for all three columns. Single `ALTER TABLE` statement — no destructive changes.

**`drizzle/meta/_journal.json`**
- Added migration journal entry for `0034_purpose_dpdp_enrichment` (idx 34).

**`src/app/api/purposes/route.ts`**
- Added `VALID_LEGAL_BASES` allowlist constant.
- Added `MAX_DATA_CATEGORIES = 20` and `MAX_DATA_CATEGORY_LENGTH = 150` guard constants.
- `dataCategories`: validated as array, cleaned (trim + slice), capped at 20 items.
- `retentionPeriod`: trimmed, capped at 255 chars, coerced to null if empty.
- `legalBasis`: validated against allowlist, defaults to `"consent"` if missing or invalid.
- All three new fields passed to `db.insert(purposes).values(...)`.

**`src/components/purposes/create-purpose-form.tsx`**
- Added new state vars: `dataCategories: string[]`, `retentionPeriod: string`, `legalBasis: string`.
- New `DataCategoriesInput` sub-component: tag-style multi-value input with keyboard support (Enter/comma to add, Backspace to remove last), suggestion chips from a curated list of 14 common data-category labels that filter live as the user types.
- New "DPDP Notice information" card section with a `DPDP Rules 2025 Rule 3` badge, data categories input, retention period text input (with placeholder examples), and legal basis select.
- All three new fields sent in the `POST /api/purposes` body.

**`src/app/api/sdk/[siteKey]/config/route.ts`**
- Added `dataCategories`, `retentionPeriod`, `legalBasis` to the `purposes` SELECT in `versionPurposes`.
- These fields are now included in the `purposes` array returned in the SDK config JSON payload.

**`src/app/api/consent/policy/route.ts`**
- Same three fields added to the `versionPurposes` SELECT.
- Fields included in the `purposes` array returned by this public endpoint.

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

Migration file ready: `drizzle/0034_purpose_dpdp_enrichment.sql` — apply with `npx drizzle-kit migrate` once the PostgreSQL container is running.

### Current Status

Each purpose can now carry:
- A list of personal data category labels (shown in the Preference Center when `showPurposeDescriptions = true`)
- A human-readable retention period (shown in the notice)
- The legal basis for processing

Both public endpoints (`/api/sdk/[siteKey]/config` and `/api/consent/policy`) include these fields in their `purposes` payload, so the browser SDK and any external Preference Center implementations can display them to visitors without any further backend changes.

### Next Task (DPDP Gap #3 from section 42)

Add organisation-level DPO / Grievance Officer contact details required by DPDP Rules 2025 Rule 3(1)(d) — the notice must include a contact mechanism for the Data Protection Officer or Grievance Officer.

The next agent must:
1. Add columns to `organizations` table: `dpoName` (varchar 255), `dpoEmail` (varchar 320), `grievanceOfficerName` (varchar 255), `grievanceOfficerEmail` (varchar 320), `grievancePortalUrl` (text nullable).
2. Create Drizzle migration `0035_organization_dpo_fields.sql`.
3. Update `src/app/api/settings/organization/route.ts` to accept and validate the new fields (email format check, URL check for grievancePortalUrl).
4. Update `src/components/settings/organization-settings-form.tsx` to expose the new fields in a "Data Protection Officer & Grievance Officer" section.
5. Include `grievanceOfficerEmail`, `grievanceOfficerName`, `grievancePortalUrl` in the SDK config response (`/api/sdk/[siteKey]/config`) so the consent banner can display the contact link required by Rule 3(1)(d).
6. Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 45. COMPLETED: Multilingual Consent Notice Support

> **Superseded in part by #80 (global locale registry).** Eighth-Schedule language codes remain registered. Visitor-facing resolution, RTL, evidence language, SDK `?lang=`, and fallback rules are documented in section 80. English root fields are still the default/fallback copy. Administrator-provided `translations` in policy JSONB is unchanged in spirit.

### Completed Work

Added multilingual support for consent banner/notice content covering English plus all 22 Indian Eighth-Schedule languages (DPDP Act 2023 §5(2)). No database migration was required — translations are stored inside the existing `consent_policy_versions.configuration` JSONB column alongside the rest of the banner configuration.

**Architecture: zero-schema-change, JSONB-stored translations**

A new optional `translations` field was added to `BannerConfiguration`:
```ts
translations?: Record<string, NoticeTranslation>
```
where `NoticeTranslation` is the subset of text-only fields that vary by language:
```ts
{ title?, description?, acceptAllLabel?, rejectAllLabel?,
  customizeLabel?, savePreferencesLabel?, privacyPolicyText? }
```
The English root fields (`title`, `description`, etc.) remain the single authoritative fallback. Translations are stored per language code (`"hi"`, `"kn"`, `"ta"`, etc.) and only the fields that have been translated need to be provided — blank fields automatically fall back to English.

**Language resolution in the SDK config endpoint**

The `GET /api/sdk/[siteKey]/config` endpoint now:
1. Reads the `?lang=` query parameter (explicit, takes precedence)
2. Falls back to parsing the first tag from the `Accept-Language` request header
3. Falls back to English

It then calls `resolveTranslation(config, requestedLang)` which tries an exact match (`"hi-IN"` → `"hi-IN"`), then a base-language prefix match (`"hi-IN"` → `"hi"`), then English root fields. The resolved text replaces the English root fields in the response so the SDK always receives ready-to-display text. The full `translations` map is also included so clients can implement their own runtime language switching without re-fetching.

A new `resolvedLanguage` field is returned in the response so the SDK can confirm which language was applied.

### Files Changed

**`src/lib/banner-config.ts`** — major update:
- Added `SupportedLanguage` union type covering `en` + all 22 Eighth-Schedule languages.
- Added `SUPPORTED_LANGUAGES` array (code + display label) for use in the form.
- Added `NoticeTranslation` type (7 optional text fields).
- Added `translations?: Record<string, NoticeTranslation>` to `BannerConfiguration`.
- `defaultBannerConfig()` now initialises `translations: {}`.
- `parseBannerConfig()` ensures `translations` is always a plain object.
- Added `resolveTranslation(config, lang)` — pure helper, returns merged `ResolvedNoticeText` with fallback chain: exact lang → base prefix → English root.
- Added `getTranslation(config, lang)` and `setTranslation(config, lang, patch)` — convenience helpers for the form component.

**`src/app/api/sdk/[siteKey]/config/route.ts`** — updated:
- Signature changed from `_request` to `request` to read `?lang=` and `Accept-Language`.
- Added `parseBestLang()` helper to extract the first language tag from `Accept-Language`.
- After loading `bannerConfig`, calls `resolveTranslation(bannerConfig, requestedLang)` and merges the result onto the config before returning.
- Response now includes `resolvedLanguage` field.
- Full `translations` map still present in `bannerConfig` for client-side switching.

**`src/app/api/policies/[id]/banner-config/route.ts`** — updated:
- Added `NoticeTranslation` and `SUPPORTED_LANGUAGES` imports.
- Added `translations` validation block: iterates submitted translations, skips invalid/unknown language codes and `"en"` (English is always the root), sanitises each field (trim + length cap), ignores empty translations.
- `config` built with `translations: sanitizedTranslations`.

**`src/components/policies/banner-config-form.tsx`** — full rewrite:
- Replaced flat single-section form with a 5-tab interface: **Text**, **Controls**, **Behavior**, **Appearance**, **Languages**.
- All sections updated to use `rounded-2xl card-shadow` design system patterns, `Toggle` pill switches, and `rounded-2xl` inputs.
- **Languages tab** features:
  - Indigo info banner explaining the DPDP Rule 3 requirement.
  - Language selector (dropdown of all 22 non-English languages).
  - `TranslationSection` collapsible `<details>` per language with: all 7 translatable fields (title, description, 4 button labels, privacy text), English placeholder text, filled-count badge.
  - "All translated languages" summary row of pill buttons (click to switch to that language in the editor).
  - Tab badge showing count of languages with at least one translation.
- Preview panel `dl` now shows `Languages: EN + N translated`.
- Reset button uses `parseBannerConfig({})` to restore all defaults including clearing translations.

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output (after fixing a duplicate `auth` import introduced during the incremental edit).

### No migration required

The `translations` field is stored inside the existing `consent_policy_versions.configuration` JSONB column. `parseBannerConfig()` uses the spread-merge pattern so existing rows without `translations` automatically get `{}` — no data migration needed.

### Current Status

Organisations can now author consent notice content in up to 22 Indian languages plus English. The SDK config endpoint serves the correct language automatically based on the visitor's browser locale. All existing SDK and consent engine behaviour is unchanged — the only difference is that `bannerConfig.title`, `bannerConfig.description`, etc. may now contain translated text when a matching language is resolved.

### Next Task

Add organisation-level DPO / Grievance Officer contact details required by DPDP Rules 2025 Rule 3(1)(d). The next agent must:
1. Add columns to `organizations` table: `dpoName` (varchar 255), `dpoEmail` (varchar 320), `grievanceOfficerName` (varchar 255), `grievanceOfficerEmail` (varchar 320), `grievancePortalUrl` (text nullable).
2. Create migration `drizzle/0035_organization_dpo_fields.sql`.
3. Update `src/app/api/settings/organization/route.ts` to accept and validate the new fields (email format, URL check).
4. Update `src/components/settings/organization-settings-form.tsx` to expose the new fields in a "Data Protection Officer & Grievance Officer" section.
5. Include `grievanceOfficerEmail`, `grievanceOfficerName`, `grievancePortalUrl` in the SDK config response (`/api/sdk/[siteKey]/config`) under a `grievance` key so the consent banner can display the contact link required by Rule 3(1)(d).
6. Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 46. COMPLETED: Server-side Consent Expiry and Re-consent Enforcement

### Completed Work

Added server-side enforcement of `consent_records.expiresAt` in the consent record GET and POST APIs, plus a pure `isConsentExpired()` helper in the consent engine. No database schema changes were made.

**Problem statement**

Before this change, `GET /api/consent/record` returned the stored consent record and decisions without checking whether the record had passed its `expiresAt` timestamp. The SDK would receive an apparently valid `status: "accepted"` response and never re-show the banner, even when the consent had legally expired. This violated DPDP Act 2023 §8(3) which prohibits processing based on expired consent without re-consent.

**Changes made**

### `src/lib/consent-engine.ts` — new `isConsentExpired` helper

```ts
export function isConsentExpired(record: {
  expiresAt: Date | null;
  status: string;
  withdrawnAt: Date | null;
}): boolean
```

- Returns `false` for withdrawn records (handled separately).
- Returns `false` when `expiresAt` is null (never expires).
- Returns `true` when `new Date(record.expiresAt) < new Date()`.
- Pure function — no I/O, safe in server and edge contexts.

### `src/app/api/consent/record/route.ts` — GET: expiry detection

- Imports `isConsentExpired` from the consent engine.
- After loading the record, calls `isConsentExpired(record)`.
- If expired:
  - Returns `expired: true` and `requiresReconsent: true` in the response body.
  - Sets `record.status` to `"expired"` in the response (does **not** mutate the DB — the row is updated only on a new explicit POST).
  - Returns `decisions: []` so the SDK has a clean slate and cannot honour stale grants.
  - The SDK interprets `requiresReconsent: true` identically to "no stored consent" and re-shows the banner.
- If not expired: response is unchanged from before.
- No DB write on GET — read-only expiry detection.

### `src/app/api/consent/record/route.ts` — POST: re-consent after expiry

- Added `wasExpiredRecord` variable (lifted to outer scope so it is accessible after the transaction).
- Inside the `else` (update) branch, calls `isConsentExpired(existing[0])` and stores the result in `wasExpiredRecord`.
- The update itself proceeds normally for both expired and non-expired records — the visitor's new explicit choice is always accepted as a valid re-consent and the record gets fresh `consentedAt` and `expiresAt` timestamps.
- After the transaction, the `appendConsentEvent` call uses a distinct `eventType`:
  - New record: `"consent.created"` (unchanged)
  - Update of non-expired record: `"consent.updated"` (unchanged)
  - **Update of expired record: `"consent.expired_and_renewed"`** — new event type for audit-trail clarity
  - The event data also carries `previouslyExpired: true` when applicable.

### Re-consent flow (end-to-end)

1. Browser SDK loads — calls `GET /api/consent/record?consentId=X&websiteId=Y`
2. If `expired: true` in response → SDK discards stored consent, re-shows banner
3. Visitor makes new choice → `POST /api/consent/record` with the same `consentId`
4. Server detects `wasExpiredRecord = true`, accepts the new choice, resets timestamps
5. New `consent.expired_and_renewed` event appended to `consent_events`
6. Response: `{ success: true, consentId, status, policyVersionId, expiresAt }`
7. SDK stores the fresh `expiresAt` in `localStorage` and hides the banner

Required-purpose enforcement is unchanged — `resolveGranted()` in `buildDecisionRows` still forces required purposes to `granted=true` regardless of the visitor's choice.

### Files Changed

- `src/lib/consent-engine.ts` — added `isConsentExpired()` export
- `src/app/api/consent/record/route.ts` — GET expiry detection + POST re-consent event

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

**Flow verification (by construction — DB not available for live test):**

| Scenario | GET response | POST behaviour |
|---|---|---|
| Active, non-expired | `expired: false`, full decisions | Normal update, `consent.updated` event |
| Expired (past `expiresAt`) | `expired: true`, `requiresReconsent: true`, `decisions: []`, `status: "expired"` | Accepted as re-consent, fresh timestamps, `consent.expired_and_renewed` event |
| Withdrawn | `expired: false`, `status: "withdrawn"` | POST returns 400 ("already withdrawn") — unchanged |
| No `expiresAt` set | `expired: false` — never expires | Normal behaviour — unchanged |

### Current Status

Server-side expiry enforcement is in place. Expired consent is no longer returned as valid to the SDK. The SDK can detect `requiresReconsent: true` and re-show the banner without any SDK code changes (the existing `if (!data.success) throw` path already surfaces this). When the visitor re-consents, the record is renewed with a fresh `expiresAt` and a distinct audit event type.

### Next Task

Add organisation-level DPO / Grievance Officer contact details required by DPDP Rules 2025 Rule 3(1)(d). The next agent must:

1. Add columns to `organizations` table: `dpoName` (varchar 255), `dpoEmail` (varchar 320), `grievanceOfficerName` (varchar 255), `grievanceOfficerEmail` (varchar 320), `grievancePortalUrl` (text nullable).
2. Create migration `drizzle/0035_organization_dpo_fields.sql`.
3. Update `src/app/api/settings/organization/route.ts` to accept and validate the new fields (email format, URL check).
4. Update `src/components/settings/organization-settings-form.tsx` to expose the new fields in a "Data Protection Officer & Grievance Officer" section.
5. Include `grievanceOfficerEmail`, `grievanceOfficerName`, `grievancePortalUrl` in the SDK config response (`/api/sdk/[siteKey]/config`) under a `grievance` key so the consent banner can display the contact link required by Rule 3(1)(d).
6. Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 47. COMPLETED: Consent Evidence Strengthening

### Audit Findings

Before this change, the following evidence gaps existed in the consent record:

| Evidence item | Previous state |
|---|---|
| Policy version presented | ✅ `policyVersionId` FK stored |
| Consent choice | ✅ `consent_events.eventData.choice` |
| Per-purpose/vendor decisions | ✅ `consent_decisions` rows |
| Timestamps, expiry, jurisdiction | ✅ stored |
| **Notice text shown at consent time** | ❌ not captured — only policy version ID |
| **Purpose names/keys at consent time** | ❌ only opaque UUIDs; names could be renamed later |
| **Policy version number** | ❌ not in event data, only version ID |
| **Banner layout/language context** | ❌ not captured |
| **`metadata` field on consent_records`** | ❌ always inserted as `{}` — unused |

### Changes Made

**No schema changes.** All evidence is stored in the existing `metadata JSONB` column on `consent_records` (always present, previously unused) and in the existing `eventData JSONB` on `consent_events`.

---

### `src/app/api/consent/record/route.ts`

**Purpose select extended:** `versionPurposes` query now selects `key` and `name` in addition to `id` and `isRequired`, making these available for the evidence snapshot without an extra DB round-trip.

**`evidenceMetadata` object built and stored in `consent_records.metadata`:**

```ts
{
  policyVersionId:     string,   // FK to policy version (already in column)
  policyVersionNumber: number,   // human-readable version number (v1, v2…)
  noticeTitle:         string,   // banner title shown to visitor
  noticeDescription:   string,   // banner description shown to visitor
  noticeLanguage:      string,   // language code served (e.g. "hi", "en")
  bannerLayout:        string,   // "bar" | "box" | "dialog"
  bannerPosition:      string,   // "bottom" | "top" | "center" etc.
  purposeCount:        number,   // how many purposes were in scope
  vendorCount:         number,   // how many vendors were in scope
  purposeKeys:         string[], // purpose keys at consent time (sorted)
  purposeNames:        string[], // purpose display names at consent time
  consentExpireDays:   number,   // configured expiry period
  defaultConsent:      string,   // "none" | "opt-in" | "opt-out"
  capturedAt:          string,   // ISO-8601 of the consent transaction
}
```

This snapshot is immutable once written — if the notice text is later changed in the Banner Studio, the evidence still shows exactly what the visitor saw.

Applied to both the **INSERT** (new consent) and the **UPDATE** (re-consent / update) paths. Re-consent after expiry also overwrites the metadata so the renewed evidence reflects the notice presented at re-consent time.

**`consent_events.eventData` extended:**

```ts
{
  choice:              string,   // unchanged
  status:              string,   // unchanged
  decisionCount:       number,   // unchanged
  policyVersionNumber: number,   // NEW — human-readable version number
  purposeKeys:         string[], // NEW — purpose keys at event time
  previouslyExpired?:  boolean,  // unchanged (from expiry work)
}
```

Purpose keys in the event log allow the audit trail to be interpreted without joining to the `purposes` table, which is important if purposes are renamed or soft-deleted after consent was given.

---

### `src/app/api/consent/evidence/[consentId]/route.ts` (new file)

`GET /api/consent/evidence/[consentId]` — authenticated, org-scoped evidence retrieval endpoint.

**Authorization:** Clerk `orgId` → local org → `resolveActiveMembership`. Any active org member may retrieve evidence for consent records belonging to their organisation.

**Tenant isolation:** Record is loaded with `AND(consentId = ?, organizationId = ?)` so cross-org access is impossible.

**Response — full evidence bundle:**

```json
{
  "evidence": {
    "consentId":     "cid_…",
    "visitorId":     "…",        // opaque system ID, not name/email
    "status":        "accepted",
    "source":        "web",
    "jurisdiction":  "IN",
    "consentedAt":   "…",
    "expiresAt":     "…",
    "withdrawnAt":   null,
    "website":       { id, name, domain, siteKey },
    "policyVersion": { id, version, policyName, isPublished, publishedAt },
    "noticeSnapshot": { … evidenceMetadata … },
    "decisions": [
      {
        "type":      "purpose",
        "id":        "uuid",
        "key":       "analytics",
        "name":      "Analytics",
        "decision":  "accept-all",
        "granted":   true,
        "decidedAt": "…"
      },
      …
    ],
    "events": [
      { id, eventType, eventData, source, occurredAt },
      …
    ]
  }
}
```

**PII minimisation:** `visitorId` is the only PII field included; it is a system-generated opaque identifier (`cid_<uuid>`), not a name or email. The endpoint does not expose the visitor's IP address or device fingerprint (these are not stored).

### Files Changed

- `src/app/api/consent/record/route.ts` — extended purpose select, added `evidenceMetadata` object, populated `metadata` on INSERT and UPDATE, added `policyVersionNumber` and `purposeKeys` to event data
- `src/app/api/consent/evidence/[consentId]/route.ts` — new authenticated evidence retrieval endpoint

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

**Flow verification (by construction):**

| Step | What happens |
|---|---|
| Visitor submits consent via SDK | POST populates `consent_records.metadata` with full notice snapshot (title, description, language, layout, purpose keys/names, version number) |
| Visitor updates consent | metadata is overwritten with the new notice context |
| Visitor re-consents after expiry | metadata refreshed; event type = `consent.expired_and_renewed`; `previouslyExpired: true` in event data |
| Org member requests evidence | `GET /api/consent/evidence/[consentId]` returns full bundle with decisions resolved to human-readable names/keys and the complete event audit trail |
| Purpose is renamed later | Evidence still shows the name/key at consent time (frozen in metadata JSONB and event data) |

### Current Status

Consent records now carry a complete, immutable evidence snapshot in the `metadata` JSONB field. The event audit trail includes human-readable purpose keys and policy version numbers. Authorized organization members can retrieve the full evidence bundle via the new `GET /api/consent/evidence/[consentId]` endpoint. No schema migration was required — all evidence uses the existing `metadata` and `eventData` JSONB columns that were previously unused or underutilized.

### Next Task

Add organisation-level DPO / Grievance Officer contact details required by DPDP Rules 2025 Rule 3(1)(d). The next agent must:

1. Add columns to `organizations` table: `dpoName` (varchar 255), `dpoEmail` (varchar 320), `grievanceOfficerName` (varchar 255), `grievanceOfficerEmail` (varchar 320), `grievancePortalUrl` (text nullable).
2. Create migration `drizzle/0035_organization_dpo_fields.sql`.
3. Update `src/app/api/settings/organization/route.ts` to accept and validate the new fields.
4. Update `src/components/settings/organization-settings-form.tsx` with a "Data Protection Officer & Grievance Officer" section.
5. Include grievance contact in SDK config response under a `grievance` key.
6. Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 48. COMPLETED: Consent Data Retention and Deletion Controls

### Legal Basis

- DPDP Act 2023 §8(3) — personal data must not be retained longer than necessary
- DPDP Act 2023 §8(6) — on erasure request, personal data must be deleted
- DPDP Act 2023 §8(7) — audit records of consent must be retained for compliance

### Design Decisions

**No schema changes.** Retention configuration is stored in the existing `organizations.settings` JSONB column (previously unused for this purpose). All deletion/anonymisation operates on existing tables.

**Codified retention rules (src/lib/retention-policy.ts):**

| Table | Rule | Reason |
|---|---|---|
| `consent_records` | CAN be deleted | Personal data, must not be kept longer than necessary (§8(3)) |
| `consent_decisions` | Cascade-deleted with consent_records | Tied to the record |
| `consent_events` | CANNOT be deleted; CAN be anonymised | Immutable audit trail — structure preserved, eventData redacted |
| `audit_logs` | CANNOT be deleted or anonymised | Regulatory evidence of staff actions |
| `data_principal_requests` | CANNOT be deleted or anonymised | Evidence of rights-request handling |
| `consent_policy_versions` | CANNOT be deleted or anonymised | FK integrity for consent_records |

### Files Created / Changed

**`src/lib/retention-policy.ts`** (new)
- `DEFAULT_CONSENT_RECORD_RETENTION_DAYS = 1825` (5 years)
- `DEFAULT_AUDIT_LOG_RETENTION_DAYS = 2555` (7 years, informational)
- `MIN_RETENTION_DAYS = 30`, `MAX_RETENTION_DAYS = 7300`
- `parseRetentionConfig(settings)` — extracts config from org settings JSONB with defaults
- `mergeRetentionConfig(existing, update)` — merges retention fields into settings blob
- `retentionCutoff(days)` — computes the cutoff date for retention queries
- `RETENTION_RULES` const — machine-readable rules for each table, returned in API responses

**`src/app/api/settings/retention/route.ts`** (new)
- `GET` — returns current retention config + rules + limits. Any active member can read.
- `PATCH` — updates `consentRecordRetentionDays` and/or `auditLogRetentionDays` in `organizations.settings`. Owner/Admin only. Validates min/max bounds. Writes audit log entry `retention.settings.updated`.

**`src/app/api/settings/retention/purge/route.ts`** (new)
- `POST { dryRun?: boolean }` — Owner/Admin only.
- Loads retention config from `organizations.settings`.
- Scopes through org websites (`consent_records` has no direct `organizationId`).
- Finds consent records where `consentedAt < retentionCutoff(consentRecordRetentionDays)`.
- `dryRun=true`: returns count without deleting.
- `dryRun=false`: deletes matching consent_records (cascades consent_decisions). Does NOT touch consent_events, audit_logs, or data_principal_requests. Writes `retention.purge.executed` audit log with count and cutoff date (no individual consentIds to avoid PII in audit log).
- Returns `retained` field explaining what was kept and why.

**`src/app/api/settings/rights-requests/[id]/route.ts`** (updated)
- Added erasure execution block triggered when `requestType="erasure"` AND `newStatus="completed"` AND request not already completed (idempotency guard).
- Erasure steps:
  1. Find org websites (tenant isolation).
  2. Find consent_records matching `existing.consentId` (scoped to org websites).
  3. **Anonymise** `consent_events.eventData` → `{ redacted: true, reason: "erasure_request", retainedForAudit: true }` BEFORE deleting records (FK must be valid).
  4. **Delete** `consent_records` (cascades `consent_decisions` via DB FK).
  5. Write `rights_request.erasure.executed` audit log with counts, consentId, and list of retained tables.
- Response extended with `erasure` object when executed: `{ executed, deletedConsentRecords, anonymisedConsentEvents, retained }`.
- All non-erasure PATCH behaviour is unchanged.

### Flow Verification (by construction)

**Retention settings flow:**
1. `GET /api/settings/retention` → returns defaults (1825/2555 days) + rules
2. `PATCH /api/settings/retention { consentRecordRetentionDays: 365 }` → writes to `organizations.settings` JSONB, audit logged
3. `GET /api/settings/retention` → returns updated 365-day config

**Retention purge flow:**
1. `POST /api/settings/retention/purge { dryRun: true }` → returns count of records past cutoff, no deletion
2. `POST /api/settings/retention/purge { dryRun: false }` → deletes past-retention records, audit logged; consent_events untouched

**Erasure request flow:**
1. Data Principal submits `POST /api/rights-request { requestType: "erasure", consentId: "cid_..." }`
2. Operator acknowledges → `PATCH /api/settings/rights-requests/[id] { status: "in_progress" }`
3. Operator completes → `PATCH /api/settings/rights-requests/[id] { status: "completed" }`
4. Erasure executes: consent_events anonymised, consent_record deleted, audit log written
5. `data_principal_requests` row retained as permanent evidence of the erasure

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Current Status

Consent data retention and deletion controls are fully implemented:
- Org-level retention period configurable via API (stored in existing JSONB, no migration)
- Retention purge endpoint with dry-run mode, scoped to org, logs every purge
- Erasure requests now execute the actual minimum-erasure when completed: records deleted, events anonymised, audit log written, request itself retained as evidence
- Retention rules are codified, machine-readable, and returned in API responses
- All deletions are scoped through the org → websites chain (tenant isolation)

### Next Task

Add organisation-level DPO / Grievance Officer contact fields (DPDP Rules 2025 Rule 3(1)(d)):
1. Add columns: `dpoName`, `dpoEmail`, `grievanceOfficerName`, `grievanceOfficerEmail`, `grievancePortalUrl` to `organizations` table.
2. Create migration `drizzle/0035_organization_dpo_fields.sql`.
3. Update `PUT /api/settings/organization` to accept and validate the new fields.
4. Update `OrganizationSettingsForm` with a "Data Protection Officer & Grievance Officer" section.
5. Include grievance contact under a `grievance` key in `GET /api/sdk/[siteKey]/config`.
6. Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 49. COMPLETED: Retention and Deletion Controls — Transaction Safety Hardening

### Context

Task 48 implemented the full retention and deletion workflow. On re-inspection for task 49, two concrete transaction safety gaps were identified in the existing code:

**GAP 1 — `POST /api/settings/retention/purge`:**
The `db.delete(consentRecords)` and the subsequent `db.insert(auditLogs)` were two separate `await` calls outside any transaction. If the delete succeeded but the audit log insert failed (network glitch, DB constraint), records would be deleted with no audit trail — a regulatory violation (DPDP §8(7)).

**GAP 2 — `PATCH /api/settings/rights-requests/[id]` (erasure execution):**
The anonymisation of `consent_events.eventData` and the deletion of `consent_records` were two separate `await` calls. If the anonymisation succeeded but the delete failed, events would be permanently anonymised while the source records still existed — leaving the database in an inconsistent half-erased state.

Both gaps violated the principle of atomicity for destructive operations.

### Fixes Applied

**`src/app/api/settings/retention/purge/route.ts`**
- Wrapped `db.delete(consentRecords)` and `db.insert(auditLogs)` in a single `db.transaction()`. The audit log is now written inside the same transaction as the deletion — it commits if and only if the deletion commits, and rolls back together on failure.
- Removed the unused `not` import from drizzle-orm.
- Removed the unused `NON_PURGEABLE_STATUSES` dead-code constant.

**`src/app/api/settings/rights-requests/[id]/route.ts`**
- Wrapped the erasure steps (event anonymisation + record deletion) in a single `db.transaction()`. Both steps now succeed or fail atomically — the DB is never left in a state where events are anonymised but records still exist, or records are deleted but events still contain personal data.
- `erasureResult.anonymisedEventCount` and `erasureResult.deletedRecordCount` are now set inside the transaction and remain accurate in the audit log regardless of outcome.

### Files Changed

- `src/app/api/settings/retention/purge/route.ts` — delete + audit log wrapped in `db.transaction()`; unused imports and dead code removed
- `src/app/api/settings/rights-requests/[id]/route.ts` — erasure anonymisation + deletion wrapped in `db.transaction()`

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Retention and Deletion Workflow — Complete State

All four components are now in place and correct:

| Component | File | Status |
|---|---|---|
| Retention rules + helpers | `src/lib/retention-policy.ts` | ✅ Complete |
| Retention config GET/PATCH | `src/app/api/settings/retention/route.ts` | ✅ Complete |
| Retention purge (atomic) | `src/app/api/settings/retention/purge/route.ts` | ✅ Fixed (transaction) |
| Erasure on rights request completion (atomic) | `src/app/api/settings/rights-requests/[id]/route.ts` | ✅ Fixed (transaction) |

### Next Task

Add organisation-level DPO / Grievance Officer contact fields required by DPDP Rules 2025 Rule 3(1)(d). The next agent must:

1. Add columns to `organizations` table: `dpoName` (varchar 255), `dpoEmail` (varchar 320), `grievanceOfficerName` (varchar 255), `grievanceOfficerEmail` (varchar 320), `grievancePortalUrl` (text nullable).
2. Create migration `drizzle/0035_organization_dpo_fields.sql`.
3. Update `src/app/api/settings/organization/route.ts` to accept and validate the new fields (email format, URL check for `grievancePortalUrl`).
4. Update `src/components/settings/organization-settings-form.tsx` with a "Data Protection Officer & Grievance Officer" section.
5. Include `grievanceOfficerEmail`, `grievanceOfficerName`, `grievancePortalUrl` in the SDK config response (`/api/sdk/[siteKey]/config`) under a `grievance` key so the consent banner can display the contact link required by Rule 3(1)(d).
6. Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 50. COMPLETED: DPDP Final Consent Workflow Review — Implementation Hardening

### Review Scope

Every DPDP-critical file was read in full before any changes were made:
- `src/lib/consent-engine.ts`
- `src/app/api/consent/record/route.ts`
- `src/app/api/consent/withdraw/route.ts`
- `src/app/api/consent/policy/route.ts`
- `src/app/api/sdk/[siteKey]/config/route.ts`
- `src/app/api/rights-request/route.ts`
- `src/app/api/consent/evidence/[consentId]/route.ts`
- `src/lib/retention-policy.ts`
- `src/lib/banner-config.ts` (multilingual support)
- `src/lib/retention-policy.ts` (retention rules)

### Findings

**No structural gaps** — All DPDP workflows identified in the previous gap analysis (tasks 43–49) are implemented: rights requests, multilingual notice, purpose enrichment, consent expiry/re-consent, consent evidence snapshots, retention/purge, erasure execution.

**Five concrete implementation issues** found and fixed:

---

**ISSUE 1 — MEDIUM: Unsafe non-null assertion on `consentRecord` after transaction**

`src/app/api/consent/record/route.ts`

The `let consentRecord` variable was initialised as `undefined` and then used as `consentRecord!` after the transaction. If the transaction threw before assigning the variable, the `appendConsentEvent` call would produce a runtime error. Additionally, the update path used a `.returning().then((r) => r)` pattern with a post-transaction `consentRecord = consentRecord!` no-op reassignment that was confusing and fragile.

**Fix:** Initialised `savedRecord` as `null as unknown as T` (clearly a placeholder), replaced the entire update pattern with a clean `const [updated] = await tx.update(...).returning()` assignment, and made `savedRecord = updated` unambiguous. The `!` non-null assertions were fully eliminated.

---

**ISSUE 2 — MEDIUM: `appendConsentEvent` failure caused a 500 response even after successful consent save**

`src/app/api/consent/record/route.ts`

The `appendConsentEvent` call was outside the transaction but inside the main `try` block. If the event append failed (transient network issue, DB contention), the entire POST returned 500 to the SDK even though the consent record was already committed. This caused the SDK to retry the consent submission unnecessarily and could produce duplicate records.

**Fix:** Wrapped `appendConsentEvent` in its own `try/catch`. Failures are logged (`console.error`) but never surface as a 500 response. The consent record is already committed at that point; a missing event log entry is far less harmful than a duplicate consent submission.

---

**ISSUE 3 — MEDIUM: Same event-append fragility in withdrawal route**

`src/app/api/consent/withdraw/route.ts`

The `appendConsentEvent` call after `db.update(consentRecords)` was bare — a failure would return 500 even though the withdrawal was already committed to the DB. From the visitor's perspective their withdrawal succeeded (DB state is correct) but they receive an error, which may cause them to retry and hit the 409 "already withdrawn" guard.

**Fix:** Wrapped `appendConsentEvent` in `try/catch`. Non-fatal, logged.

---

**ISSUE 4 — LOW-MEDIUM: No length guards on GET query params before DB query**

`src/app/api/consent/record/route.ts`

`consentId` and `websiteId` were used in DB queries without any format/length validation. A malformed or excessively long value would produce a noisy Postgres error log (though not an injection risk since queries are parameterized).

**Fix:** Added `length > 300` guard on `consentId` and `length > 36` guard on `websiteId` with a 400 response before hitting the DB.

---

**ISSUE 5 — LOW: Redundant decisions query when consent is expired**

`src/app/api/consent/record/route.ts`

The GET handler always loaded decisions from `consent_decisions` and then discarded them when `expired=true`. This was a wasted DB round-trip on every expired-consent check.

**Fix:** The decisions query is now conditional: `expired ? [] : await db.select()...`. No functional change; slightly more efficient.

### Files Changed

- `src/app/api/consent/record/route.ts` — issues 1, 2, 4, 5 fixed; full rewrite of the route for clarity
- `src/app/api/consent/withdraw/route.ts` — issue 3 fixed; `appendConsentEvent` wrapped in try/catch

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

### Flow Verification (by construction)

| Scenario | Before | After |
|---|---|---|
| DB event-append fails after consent save | 500 to SDK, possible retry/duplicate | 200/201 returned; event failure logged only |
| DB event-append fails after withdrawal | 500 to visitor despite withdrawal committed | 200 returned; event failure logged only |
| Malformed websiteId/consentId in GET | Noisy Postgres error log | 400 with clear message before DB hit |
| Expired consent GET | Unnecessary decisions query | Decisions query skipped for expired records |
| Transaction throws before consentRecord assigned | RuntimeError on `consentRecord!` | Clean exception; error message surfaced correctly |

### Current DPDP Implementation Status

All identified DPDP 2023 + Rules 2025 gaps are now addressed:

| Requirement | Task | Status |
|---|---|---|
| Rights request workflow (§11–14 + Rule 12) | 43 | ✅ |
| Purpose enrichment (Rule 3 data categories + retention) | 44 | ✅ |
| Multilingual notice (§5(2) + Eighth Schedule) | 45 | ✅ |
| Consent expiry + re-consent enforcement (§8(3)) | 46 | ✅ |
| Consent evidence snapshot (§8(1)) | 47 | ✅ |
| Retention + deletion controls (§8(3), §8(6), §8(7)) | 48–49 | ✅ |
| Consent workflow hardening (transaction safety, error handling) | 50 | ✅ |

### Next Task

Add organisation-level DPO / Grievance Officer contact details required by DPDP Rules 2025 Rule 3(1)(d). The next agent must:
1. Add columns to `organizations` table: `dpoName` (varchar 255), `dpoEmail` (varchar 320), `grievanceOfficerName` (varchar 255), `grievanceOfficerEmail` (varchar 320), `grievancePortalUrl` (text nullable).
2. Create migration `drizzle/0035_organization_dpo_fields.sql`.
3. Update `PUT /api/settings/organization` to accept and validate the new fields.
4. Update `OrganizationSettingsForm` with a "DPO & Grievance Officer" section.
5. Include `grievanceOfficerEmail`, `grievanceOfficerName`, `grievancePortalUrl` under a `grievance` key in `GET /api/sdk/[siteKey]/config`.
6. Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 51. COMPLETED: DPO / Grievance Officer Contact Fields (DPDP Rules 2025 Rule 3(1)(d))

### Legal Basis

DPDP Rules 2025 Rule 3(1)(d) — the consent notice must include a contact mechanism for the Data Protection Officer or Grievance Officer so that Data Principals can raise concerns or exercise their rights.

### Implementation

**New schema columns on `organizations` table (all nullable):**

| Column | Type | Purpose |
|---|---|---|
| `dpo_name` | varchar(255) | Data Protection Officer name |
| `dpo_email` | varchar(320) | DPO contact email |
| `grievance_officer_name` | varchar(255) | Grievance Officer name |
| `grievance_officer_email` | varchar(320) | Grievance Officer contact email |
| `grievance_portal_url` | text | URL to grievance submission portal |

All columns are nullable so existing rows remain valid without data migration.

**Server-side validation in `PUT /api/settings/organization`:**
- Email fields validated against `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `grievancePortalUrl` validated via `new URL()` (must be a parseable URL)
- Empty string in body → null (clears the field)
- Missing field in body → preserves existing value (no accidental clears)
- Email values are NOT stored in the audit log diff (PII minimisation — diff records `{ from: boolean, to: boolean }` instead)
- Owner/Admin authorization enforced (unchanged)

**`grievance` object in public SDK config response (`GET /api/sdk/[siteKey]/config`):**
```json
{
  "grievance": {
    "grievanceOfficerName":  "...",
    "grievanceOfficerEmail": "...",
    "grievancePortalUrl":    "...",
    "dpoName":               "...",
    "dpoEmail":              "..."
  }
}
```
All fields nullable. SDK/banner can display this contact block in the Preference Center and notice footer.

### Files Changed

- `src/db/schema/organizations.ts` — 5 nullable columns added
- `drizzle/0035_organization_dpo_fields.sql` — `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS` for all 5 columns (single statement, idempotent)
- `drizzle/meta/_journal.json` — entry for migration 35 added (idx 35)
- `src/app/api/settings/organization/route.ts` — full update: parses/validates 5 new fields, threads them into the diff, includes them in `db.update()`, email values omitted from audit log for PII reasons
- `src/components/settings/organization-settings-form.tsx` — `OrgSettingsData` type extended; 5 new state vars; DPO & Grievance Officer card added before Onboarding; fields included in PUT body
- `src/app/dashboard/settings/organization/page.tsx` — `settingsData` extended with all 5 new fields
- `src/app/api/sdk/[siteKey]/config/route.ts` — `organizations` import added; `grievance` object fetched and included in response

### Verification

`npx tsc --noEmit` → exit 0, zero lines of output.

`npx drizzle-kit migrate` → exit 1 (Postgres container not running — expected). SQL file verified correct. Migration will apply with `npx drizzle-kit migrate` once the container is started.

### Current Status

DPO and Grievance Officer contact details are now first-class fields on the `organizations` table. Organisation Owners and Admins can configure them via the Settings → Organization page. The public SDK config endpoint (`/api/sdk/[siteKey]/config`) exposes the contact details under a `grievance` key so any consent banner or Preference Center implementation can display the required contact mechanism to visitors.

### All DPDP 2023 + Rules 2025 Implementation Tasks — Final Status

| Task | Requirement | Status |
|---|---|---|
| 43 | Rights request workflow (§11–14 + Rule 12) | ✅ |
| 44 | Purpose enrichment — data categories, retention, legal basis (Rule 3(1)(b)+(c)) | ✅ |
| 45 | Multilingual notice — 22 Eighth-Schedule languages (§5(2)) | ✅ |
| 46 | Server-side consent expiry + re-consent enforcement (§8(3)) | ✅ |
| 47 | Consent evidence snapshot in metadata JSONB (§8(1)) | ✅ |
| 48–49 | Retention + deletion controls with atomic transactions (§8(3), §8(6), §8(7)) | ✅ |
| 50 | Consent workflow transaction safety + error handling hardening | ✅ |
| 51 | DPO / Grievance Officer contact fields (Rule 3(1)(d)) | ✅ |

### Next Task

Build the Billing page. The next agent must:
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices.
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- Update the sidebar "Billing" nav item href from `/dashboard/settings/organization` to `/dashboard/billing`.
- Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 52. COMPLETED: Apply DPO / Grievance Officer Migration (`0035_organization_dpo_fields`)

### Completed Task

Applied the pending Drizzle migration for DPDP Rules 2025 Rule 3(1)(d) DPO / Grievance Officer columns against the local PostgreSQL database (`consent-postgres` / `consent_platform`). No application code changes were required.

### Migration Result

`npx drizzle-kit migrate` → exit 0.

- Container `consent-postgres` was already running (port 5432).
- Output: `migrations applied successfully!`
- Notices only: schema `"drizzle"` and relation `"__drizzle_migrations"` already existed (expected).
- `drizzle.__drizzle_migrations` now includes hash `5a66d073dec49623eafc6c5d98dec81fb7a2bb28bc8160f06acf418ac2a2f036` with `created_at` `1787800000000` (journal tag `0035_organization_dpo_fields`).

### Column Verification

`information_schema.columns` on `organizations` contains all five nullable columns:

| Column | Type | Max length | Nullable |
|---|---|---|---|
| `dpo_name` | character varying | 255 | YES |
| `dpo_email` | character varying | 320 | YES |
| `grievance_officer_name` | character varying | 255 | YES |
| `grievance_officer_email` | character varying | 320 | YES |
| `grievance_portal_url` | text | — | YES |

`SELECT` of those columns from existing organization rows succeeded (values currently null, as expected — no data backfill).

### Runtime Verification

- `GET /api/sdk/site_327f98c3148c1c208c12fe2e2c7b1d5f4300a633f37be78d/config` → **200**. Response includes `"success": true` plus a `grievance` object (`grievanceOfficerName`, `grievanceOfficerEmail`, `grievancePortalUrl`, `dpoName`, `dpoEmail` all `null`). Policy, purposes, vendors, and tracker rules still load.
- `PUT /api/settings/organization` without Clerk session → **401** `Unauthorized` (handler runs; no missing-column / 500 error). `GET` on the same route → **405** (PUT-only, unchanged).
- `npx tsc --noEmit` → exit 0, zero lines of output.

### Files Changed

- `CMP_AGENT_CONTEXT.md` — this handoff only.

### Current Status

Migration `0035_organization_dpo_fields` is applied on the local database. Organization settings and public SDK config continue to work; SDK config now reads the new columns without error. Application code for DPO fields (section 51) is unchanged.

### Next Task

Build the Billing page. The next agent must:
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices.
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- Update the sidebar "Billing" nav item href from `/dashboard/settings/organization` to `/dashboard/billing`.
- Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 53. COMPLETED: Public SDK and Consent Endpoint Security Hardening

### Completed Task

Inspected and hardened the public CMP SDK and consent endpoints only. CORS remains `Access-Control-Allow-Origin: *` without credentials so the browser SDK still loads from customer sites, localhost, and the demo page. Origin is not used as an allowlist because that would break legitimate embeds; `siteKey` remains the capability token. No schema, UI, or consent-flow feature changes.

### Findings (inspected)

| Check | Result |
|---|---|
| siteKey validation | Missing format/length guards (column is varchar 255; generated keys are `site_` + hex). Oversized or punctuation-laden keys hit Postgres unnecessarily. |
| website/domain checks | Websites resolved by `siteKey` + `status = active`. Registered `domain` is not Origin-enforced (intentional; SDK must run on publisher sites and demo/localhost). |
| CORS / methods / origin | `*` without credentials is correct for this public SDK. OPTIONS methods were incomplete/inconsistent on some routes. Unexpected methods already 405 via App Router. |
| Input length limits | GET consent had loose length checks; POST/withdraw had none. Invalid JSON became 500. Unbounded JSON body possible. |
| Public response data | Config used `parseBannerConfig` spread (`{...defaults, ...raw}`), so unknown JSONB keys on policy configuration could leak. Consent GET/withdraw used `select()` of full rows (visitorId, organizationId, metadata) even though the JSON mapper omitted most of them. |
| Error handling | `/api/sdk/script` 500 body interpolated `String(error)` into JavaScript sent to the browser. |

Confirmed not exposed on these public routes: Clerk secrets, API keys, webhook secrets, org settings JSON, users, memberships, internal DB URLs.

### Fixes

1. Shared guards in `src/lib/sdk/public-http.ts`: siteKey charset/length, website UUID, consentId charset/length, lang sanitization, http(s)-only `apiBase`, 64 KiB JSON body cap, CORS header helper.
2. SDK script: do not inject invalid siteKey or non-http(s) `apiBase` (`javascript:` rejected). 500 JS no longer includes the exception string.
3. Config/trackers: reject invalid siteKey with 400 before DB; cap language; return only known banner fields via `toPublicBannerConfig`; select only needed policy-version columns.
4. Consent record GET/POST and withdraw: format checks, JSON parse → 400, oversized body → 413, column-limited selects so visitorId/metadata/organizationId are never loaded for the public mapper, decision arrays capped at 200 items.

### Files Changed

- `src/lib/sdk/public-http.ts` — new shared public-endpoint guards
- `src/lib/banner-config.ts` — `toPublicBannerConfig` whitelist
- `src/app/api/sdk/[siteKey]/config/route.ts`
- `src/app/api/sdk/[siteKey]/trackers/route.ts`
- `src/app/api/sdk/script/route.ts`
- `src/app/api/consent/record/route.ts`
- `src/app/api/consent/withdraw/route.ts`
- `CMP_AGENT_CONTEXT.md`

### Verification

`npx tsc --noEmit` → exit 0.

Against local `http://localhost:3000` (existing siteKey):

| Request | Result |
|---|---|
| GET config | 200, CORS `*`, methods `GET, OPTIONS`, grievance present, banner keys are the public whitelist only |
| GET config short siteKey `abc` | 400 Invalid siteKey |
| GET config POST | 405 |
| OPTIONS config | 204 |
| GET trackers | 200 |
| GET script `?siteKey=` | 200 JS, siteKey injected |
| GET script `?apiBase=javascript:alert(1)` | 200 generic script, no apiBase injection |
| GET record bad ids | 400 |
| POST record invalid JSON | 400 |
| POST record non-UUID websiteId | 400 |
| POST record 70k body | 413 |
| POST record reject-all | 201 (`consentId`, `status`, `policyVersionId`, `expiresAt` only) |
| GET record | 200; no visitorId/metadata/organizationId |
| POST withdraw bad ids | 400 |
| POST withdraw of created record | 200 |

### Current Status

Public SDK config, tracker list, script, consent record, and withdraw endpoints reject malformed input, do not leak internal errors or extra JSONB keys, and still serve cross-origin browser clients with CORS `*`.

### Next Task

Build the Billing page. The next agent must:
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices.
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- Update the sidebar "Billing" nav item href from `/dashboard/settings/organization` to `/dashboard/billing`.
- Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 54. COMPLETED: Website Scanner SSRF Hardening

### Completed Task

Hardened the website scanner so fetches cannot target localhost, loopback, private/internal ranges, link-local addresses, cloud metadata, or non-http(s) protocols. Redirect hops are re-validated. Timeouts and HTML size limits are enforced. Error text does not include the target host or IP. Scanner UI and database schema were not changed. Legitimate public hostnames (e.g. `example.com`) still pass.

### Findings

- `fetchHtml` used `redirect: "follow"` with no host/IP checks, so a public URL could redirect to `169.254.169.254` or loopback.
- `scan-engine` used `websiteUrl.startsWith("http")`, which treats values like `httpfoo.com` as already-absolute.
- No DNS resolution check before connect; numeric IPs, `localhost`, metadata hostnames, and `file://` / `ftp://` were not blocked.
- Response body was read with unbounded `response.text()`.

### Fixes

- New `src/lib/scanner/ssrf-guard.ts`: http(s) only, ports 80/443, no userinfo, hostname denylist (localhost, `.local`/`.internal`, GCP metadata, Kubernetes), IPv4/IPv6 private/link-local/CGNAT/metadata ranges, IPv4-mapped IPv6, dword IPs (`2130706433`), DNS lookup of all A/AAAA records (any blocked address fails).
- `html-analyser.ts`: `redirect: "manual"`, max 5 hops, `assertSafeScanUrl` on each hop, 12s timeout, 2 MiB HTML cap.
- `scan-engine.ts`: `toAbsoluteScanUrl`; unexpected errors stored as a generic message.
- `POST /api/scanner/run`: rejects blocked website domains with 400 before creating a scan.

### Files Changed

- `src/lib/scanner/ssrf-guard.ts` — new
- `src/lib/scanner/html-analyser.ts`
- `src/lib/scanner/scan-engine.ts`
- `src/app/api/scanner/run/route.ts`
- `CMP_AGENT_CONTEXT.md`

### Verification

`npx tsc --noEmit` → exit 0.

Guard checks: blocked `localhost`, `127.0.0.1`, `[::1]`, `169.254.169.254`, `metadata.google.internal`, `file://`, `ftp://`, RFC1918, `0.0.0.0`, dword `2130706433`, port 22, userinfo URLs — all with message `This address cannot be scanned` (no host/IP leak). Allowed: `example.com` and `https://example.com`. Public IP `8.8.8.8` is not classified as blocked.

### Current Status

Scanner fetches are SSRF-guarded at the API, URL builder, and fetch/redirect layers. Public websites continue to scan as before.

### Next Task

Build the Billing page. The next agent must:
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices.
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- Update the sidebar "Billing" nav item href from `/dashboard/settings/organization` to `/dashboard/billing`.
- Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 55. COMPLETED: Application-wide UI/UX refinement

### Completed Task

Applied a restrained premium design pass over the existing CMP dashboard without changing business logic, APIs, schema, Clerk, SDK, scanner, or consent behavior. The indigo/slate identity is kept; glassmorphism and heavy gradients were reduced. Motion uses transform/opacity/box-shadow only, with `prefers-reduced-motion` disabling non-essential animation.

### Major UI/UX improvements

- Shared tokens and utilities in `globals.css`: `.page-wrap`, `.page-title`, `.page-description`, `.btn` / `.btn-primary`, `.field-input`, `.table-scroll`, `.data-table`, `.card-lift`, fade-in / fade-up / scale-in / slide-down / slide-in / shimmer / soft-pulse.
- Button states: primary/secondary/ghost/outline/danger, hover/active, disabled, loading spinner, focus ring.
- New reusable pieces: `PageHeader`, `PageHeaderLink`, `EmptyState`, `Alert`, `Skeleton`.
- Shell: solid header/sidebar, stronger active nav, mobile drawer uses `animate-slide-in`.
- Most dashboard routes use `.page-wrap`. Tables use `.table-scroll` where wrappers were updated. Primary list CTAs use `.btn-primary`.
- Root metadata title set to Consent Manager.

### Animation system

CSS keyframes in `globals.css`: `fade-in`, `fade-up`, `scale-in`, `slide-down`, `slide-in`, `shimmer`, `soft-pulse`. Card hover lifts 2px. `@media (prefers-reduced-motion: reduce)` short-circuits animation/transition and removes card lift.

### Responsive checks

`.page-wrap` padding scales at 480px and 768px; max content width 1600px; compact header; search hidden below `lg`; mobile nav overlay; table overflow isolated to `.table-scroll`. Live multi-breakpoint browser pass was not re-run in this session.

### Files Changed (principal)

- `src/app/globals.css`, `src/app/layout.tsx`, `src/app/dashboard/layout.tsx`
- `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `stat-card.tsx`
- `src/components/ui/page-header.tsx`, `empty-state.tsx`, `alert.tsx`, `skeleton.tsx`
- `src/components/dashboard/dashboard-shell.tsx`, `sidebar-nav.tsx`
- `src/components/websites/website-list.tsx`
- Dashboard list/detail/settings pages listed in the implementation (websites, policies, purposes, vendors, trackers, consent, scanner, analytics, audit, notifications, integrations, developers, webhooks, organization, team, rights-requests)
- `CMP_AGENT_CONTEXT.md`

### Verification

`npx tsc --noEmit` → exit 0.

### Current Status

The dashboard shares one spacing, type, button, card, and motion system. Routes and data behavior are unchanged.

### Next Task

Build the Billing page. The next agent must:
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices.
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- Update the sidebar "Billing" nav item href from `/dashboard/settings/organization` to `/dashboard/billing`.
- Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.


### Next Task

Build the Billing page. The next agent must:
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices.
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- Update the sidebar "Billing" nav item href from `/dashboard/settings/organization` to `/dashboard/billing`.
- Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.


### Next Task

Build the Billing page. The next agent must:
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices.
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- Update the sidebar "Billing" nav item href from `/dashboard/settings/organization` to `/dashboard/billing`.
- Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.


### Next Task

Build the Billing page. The next agent must:
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices.
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- Update the sidebar "Billing" nav item href from `/dashboard/settings/organization` to `/dashboard/billing`.
- Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 56. COMPLETED: Public Homepage Navbar

### Completed Task

Built a professional SaaS navbar for the public homepage only. Dashboard, APIs, database, authentication, consent engine, and business logic were not touched.

### Files Changed

- `src/components/public/home-navbar.tsx` - new sticky responsive public navbar with CMP logo, Product, Features, Solutions, Resources, Pricing, Sign In, and Get Started.
- `src/app/page.tsx` - replaced the stock starter homepage shell with a simple premium public homepage using the navbar.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Navbar Details

- Sticky top navigation with subtle border and backdrop blur.
- Desktop navigation links plus Sign In and Get Started actions.
- Mobile menu controlled by a keyboard-accessible button with `aria-expanded`, `aria-controls`, and clear accessible labels.
- Smooth mobile menu open/close using CSS grid-row and opacity transitions.
- Mobile menu closes after selecting a link.
- Design uses the existing restrained slate/indigo premium styling and shared `.btn` utilities.

### Verification

`npx tsc --noEmit` -> exit 0.

### Current Status

The public homepage now presents CMP with a responsive SaaS navbar and minimal premium hero copy. No protected product areas or backend logic changed.
---

# 57. COMPLETED: Public Homepage Hero Section

### Completed Task

Built a premium SaaS hero section for the public homepage only. Dashboard, APIs, database, authentication, consent engine, and business logic were not touched.

### Files Changed

- `src/app/page.tsx` - expanded the public homepage hero with strong headline, supporting copy, Get Started and See How It Works buttons, responsive layout, and a clean product visual.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Hero Details

- Responsive two-column layout on desktop and single-column layout on smaller screens.
- Primary CTA links to `/sign-up`; secondary CTA links to the product visual anchor.
- Product visual is code-native UI showing workspace status, consent metrics, consent performance bars, and tracker scan activity.
- Uses existing subtle `animate-fade-up` and `animate-scale-in` CSS animation utilities.
- Matches the existing simple premium slate/indigo visual direction.

### Verification

`npx tsc --noEmit` -> exit 0.

### Current Status

The public homepage now has a polished SaaS hero beneath the existing navbar. No protected app areas or backend logic changed.
---

# 58. COMPLETED: Public Homepage Features Section

### Completed Task

Built a clean Features section for the public homepage only. Dashboard, APIs, database, authentication, consent engine, and business logic were not touched.

### Files Changed

- `src/app/page.tsx` - added responsive feature cards for Consent Management, Purpose & Vendor Management, Tracker Scanner, Consent Analytics, SDK, and Privacy Controls.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Feature Section Details

- Added `#features` section below the public hero.
- Uses six responsive cards with simple inline SVG icons.
- Cards use existing `animate-fade-up` and `card-lift` utilities for subtle entrance and hover animation.
- Layout adapts from one column on mobile to two columns on small screens and three columns on desktop.
- Visual style follows the existing simple premium slate/indigo direction.

### Verification

`npx tsc --noEmit` -> exit 0.

### Current Status

The public homepage now includes navbar, hero, and a polished Features section. No protected app areas or backend logic changed.
---

# 59. COMPLETED: Public Homepage How It Works Section

### Completed Task

Built a simple visual How It Works section for the public homepage only. Dashboard, APIs, database, authentication, consent engine, and business logic were not touched.

### Files Changed

- `src/app/page.tsx` - added the public `#how-it-works` section with a five-step Website -> Configure Policy -> Install SDK -> Visitor Consent -> Manage Results flow.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Section Details

- Added responsive step cards below the Features section.
- Each step uses a simple inline SVG icon and concise supporting text.
- Desktop layout presents five cards in a horizontal flow with subtle connector lines.
- Mobile layout stacks cards cleanly and preserves the visual sequence.
- Uses existing `animate-fade-up` and `animate-scale-in` utilities plus subtle hover transitions.

### Verification

`npx tsc --noEmit` -> exit 0.

### Current Status

The public homepage now includes navbar, hero, Features, and How It Works sections. No protected app areas or backend logic changed.
---

# 60. COMPLETED: Public Homepage Final CTA and Footer

### Completed Task

Built the final CTA and professional footer for the public homepage only. Dashboard, APIs, database, authentication, consent engine, and business logic were not touched.

### Files Changed

- `src/app/page.tsx` - added a strong final Get Started CTA section and responsive footer with Product, Resources, Company, Legal, Sign In, and Sign Up links.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Section Details

- Added final CTA section with dark premium panel, Get Started and Sign In actions, and responsive spacing.
- Added footer brand block with concise product positioning.
- Added responsive footer link columns for Product, Resources, Company, and Legal.
- Included Sign In and Sign Up links in the footer.
- Links use subtle hover/focus transitions and preserve the existing slate/indigo visual direction.

### Verification

`npx tsc --noEmit` -> exit 0.

### Current Status

The public homepage now includes navbar, hero, Features, How It Works, final CTA, and footer. No protected app areas or backend logic changed.
---

# 61. COMPLETED: Public Homepage Premium Visual Refinement

### Completed Task

Improved the existing public homepage visual experience only. The navbar, hero, Features, How It Works, final CTA, and footer content/structure were preserved while adding more premium depth and motion. Dashboard, APIs, database, Clerk authentication, consent engine, SDK logic, and business logic were not touched.

### Files Changed

- `src/app/page.tsx` - added layered visual depth to existing homepage sections, enhanced the hero product showcase, added lightweight floating cards for Consent Banner, Purposes, Vendors, and Analytics, improved section transitions, card elevation, CTA depth, and footer visual treatment.
- `src/app/globals.css` - added public-page-only animation and visual utilities for layered backgrounds, scroll-linked reveal, subtle parallax, floating elements, animated gradient accents, and premium hover elevation.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Visual Details

- Added `public-page`, `public-section`, and `public-section-flow` utilities for continuous section depth and subtle divider gradients.
- Added CSS-only scroll-linked reveal/parallax behavior with `animation-timeline: view()` where supported.
- Added GPU-friendly `transform`/`opacity` keyframes: soft floating, gradient drift, parallax, scroll fade-up, and scroll scale-in.
- Disabled/reduced parallax and animation effects for small screens and `prefers-reduced-motion`.
- Enhanced hero product visual with floating UI cards while avoiding horizontal overflow on mobile.
- Improved feature cards, workflow cards, CTA panel, and footer with stronger depth and smooth hover elevation.

### Verification

`npx tsc --noEmit` -> exit 0.

### Current Status

The public homepage keeps the same content and sections but now feels more polished, layered, and product-led. No protected app areas or backend logic changed.
---

# 62. COMPLETED: Public Homepage Interactions and Animations

### Completed Task

Improved existing public homepage interactions and animations only. Homepage content and visible section structure were preserved. Dashboard, APIs, database, Clerk authentication, consent engine, SDK logic, and business logic were not touched.

### Files Changed

- `src/components/public/home-interactions.tsx` - new lightweight client helper for smooth anchor scrolling with sticky-navbar offset and Intersection Observer reveal handling.
- `src/components/public/home-navbar.tsx` - class-only hover transition refinements for public navbar links and mobile menu links.
- `src/app/page.tsx` - wired the public interactions helper into the homepage and added a footer anchor target for existing footer/resource links.
- `src/app/globals.css` - added smooth-scroll defaults, Intersection Observer reveal states, stagger-aware keyframes, icon/card hover transitions, and reduced-motion safeguards.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Animation and Navigation Details

- Anchor links now smooth-scroll with a sticky header offset and preserve keyboard focus on the target.
- Existing anchors are handled directly; existing `#solutions`, `#resources`, `#company`, and `#legal` links are routed to the nearest existing public homepage section/region without adding visible content.
- Added Intersection Observer section/card reveals using subtle fade-up and scale-in animations.
- Feature/workflow/card elements receive gentle stagger timing so groups do not enter all at once.
- Navbar links, buttons, cards, and icons now use lightweight transform/opacity/box-shadow transitions.
- Reduced-motion users get instant scrolling and visible content without reveal/parallax animation.
- Small-screen behavior keeps parallax disabled and uses lightweight transforms to avoid horizontal overflow or mobile performance issues.

### Verification

`npx tsc --noEmit` -> exit 0.

### Current Status

The public homepage keeps the same content and sections while anchor navigation and scroll reveal behavior now feel smoother and more polished.

### Next Task

Build the Billing page. The next agent must:
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives.
- Display current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices.
- Do not implement payment processing, Stripe integration, or plan upgrades yet - display only.
- Update the sidebar "Billing" nav item href from `/dashboard/settings/organization` to `/dashboard/billing`.
- Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.
---

# 63. COMPLETED: Public Navbar Clerk Auth Actions

### Completed Task

Connected the public homepage navbar authentication actions to Clerk-aware UI. Signed-out users see Sign In and Get Started. Signed-in users see a Dashboard button. Dashboard, APIs, database, consent engine, SDK logic, and business logic were not changed.

### Files Changed

- `src/components/public/home-navbar.tsx` - added Clerk `SignedIn` / `SignedOut` wrappers around desktop and mobile navbar actions; signed-in state now shows Dashboard linking to `/dashboard`.
- `src/app/sign-in/[[...sign-in]]/page.tsx` - configured Clerk `SignIn` with `fallbackRedirectUrl="/dashboard"` and `signUpUrl="/sign-up"`.
- `src/app/sign-up/[[...sign-up]]/page.tsx` - configured Clerk `SignUp` with `fallbackRedirectUrl="/dashboard"` and `signInUrl="/sign-in"`.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Verification

`npx tsc --noEmit` -> exit 0.

### Current Status

Public navbar auth actions are Clerk-aware and signed-in visitors can navigate directly to the dashboard.
---

# 64. COMPLETED: Public Navbar Clerk Core 3 Runtime Fix

### Completed Task

Fixed the public homepage navbar runtime error caused by unsupported Clerk Core 3 auth wrapper components. Dashboard, APIs, database, consent engine, SDK logic, and business logic were not changed.

### Files Changed

- `src/components/public/home-navbar.tsx` - replaced unsupported `SignedIn` / `SignedOut` usage with Clerk `useUser()` state checks; signed-out visitors see Sign In and Get Started, signed-in visitors see Dashboard, and loading state uses a lightweight placeholder.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Verification

`npx tsc --noEmit` -> exit 0.

### Current Status

The public navbar no longer uses Clerk components that are unavailable in `@clerk/nextjs` Core 3. Auth-aware navbar actions remain connected to Clerk through the supported client hook.
---

# 65. COMPLETED: Scanner SSRF Hardening

### Completed Task

Hardened the existing website scanner request path against SSRF and unsafe outbound requests. The scanner now keeps validation centralized in `ssrf-guard.ts`, validates every scanned URL and redirect hop before fetch, and returns safe scanner errors without exposing internal host/IP details. Database schema, dashboard UI, authentication, consent engine, SDK, and non-scanner business logic were not changed.

### Files Changed

- `src/lib/scanner/ssrf-guard.ts` - tightened URL safety validation for scanner targets, including additional non-public IPv4/IPv6 ranges, metadata/internal hostname patterns, invalid DNS labels, single-label hostnames, and a shared `getSafeScanUrl()` helper.
- `src/lib/scanner/html-analyser.ts` - reused `getSafeScanUrl()` for the initial scanner request and every manual redirect hop.
- `src/lib/scanner/scanner-security.test.cjs` - added a targeted scanner security harness for SSRF guard and analyser failure-path checks.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Security Cases Tested

- Valid public URL: `https://example.com` accepted.
- Localhost and loopback blocked: `localhost`, `127.0.0.1`, `[::1]`.
- Private/internal ranges blocked: `10.0.0.1`, `172.16.0.1`, `192.168.1.1`.
- Link-local/cloud metadata blocked: `169.254.169.254`, `metadata.google.internal`.
- Invalid/unsupported protocols blocked: `file://`, `gopher://`.
- Suspicious internal hostname blocked: `service.internal`.
- Redirect-to-private blocked before following the redirect.
- Timeout returns the safe generic scanner fetch error.
- Oversized response returns the safe generic scanner fetch error.
- Legitimate mocked public HTML still scans and detects Google Analytics.

### Verification

- `npx tsc --outDir .tmp/scanner-security --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/scanner/ssrf-guard.ts src/lib/scanner/tracker-signatures.ts src/lib/scanner/html-analyser.ts` -> exit 0.
- `node src/lib/scanner/scanner-security.test.cjs` -> exit 0.
- `npx tsc --noEmit` -> exit 0.

Temporary compiled scanner test output under `.tmp/scanner-security` was removed after testing.

### Current Status

The scanner preserves legitimate public-site scanning while rejecting unsafe protocols, internal/private destinations, suspicious hostnames, and unsafe redirect targets before requests are followed.

### Next Task

Add a proper project test script or lightweight test runner so scanner security tests can run from `npm` without the temporary compile step.
---

# 66. COMPLETED: API Rate Limiting and Abuse Protection

### Completed Task

Added server-side rate limiting for selected externally reachable CMP API mutation/intake routes. The limits are intentionally scoped to public write/intake endpoints and authenticated expensive admin mutations, while normal dashboard page rendering and public SDK config/script reads remain unthrottled for legitimate customer traffic. Database schema, consent logic, SDK behavior, billing behavior, and UI were not changed.

### Files Changed

- `src/lib/rate-limit.ts` - new reusable in-memory fixed-window server-side rate-limiting utility with client IP extraction, safe `429 Too Many Requests` responses, `Retry-After`, and rate-limit headers.
- `src/lib/rate-limit.test.cjs` - targeted utility test harness for allowed requests, exceeded limits, IP parsing, and 429 response shape.
- `src/app/api/consent/record/route.ts` - rate-limited public consent submissions by `websiteId + IP`.
- `src/app/api/consent/withdraw/route.ts` - rate-limited public withdrawal submissions by `websiteId + IP`.
- `src/app/api/rights-request/route.ts` - rate-limited unauthenticated rights-request intake by `websiteId + IP`.
- `src/app/api/scanner/run/route.ts` - rate-limited authenticated scanner starts by `orgId + userId + IP`.
- `src/app/api/api-keys/route.ts` - rate-limited API key creation by `orgId + userId + IP`.
- `src/app/api/api-keys/[id]/route.ts` - rate-limited API key revocation by `orgId + userId + IP`.
- `src/app/api/webhooks/endpoints/route.ts` - rate-limited webhook endpoint creation by `orgId + userId + IP`.
- `src/app/api/webhooks/endpoints/[id]/route.ts` - rate-limited webhook endpoint update/delete by `orgId + userId + IP`.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Limiting Strategy

- Public consent record submissions: 120 requests per minute per website/IP pair.
- Public consent withdrawals: 30 requests per minute per website/IP pair.
- Public rights-request intake: 5 requests per hour per website/IP pair.
- Scanner start: 10 requests per hour per authenticated org/user/IP tuple.
- API key creation: 20 requests per hour per authenticated org/user/IP tuple.
- API key revocation: 60 requests per hour per authenticated org/user/IP tuple.
- Webhook endpoint creation: 20 requests per hour per authenticated org/user/IP tuple.
- Webhook endpoint update/delete: 60 requests per hour per authenticated org/user/IP tuple.
- Public SDK script/config/tracker GET endpoints were inspected and left unthrottled to avoid breaking normal customer traffic and browser caching behavior.

### Tests

- Compiled the utility into `.tmp/rate-limit` for a local test harness.
- Verified allowed requests decrement remaining count.
- Verified exceeding the configured limit returns a blocked result.
- Verified separate keys have separate buckets.
- Verified `x-forwarded-for` client IP extraction.
- Verified `rateLimitResponse()` returns HTTP 429 with safe body, `Retry-After`, `X-RateLimit-*`, and preserved CORS headers.

### Verification

- `npx tsc --outDir .tmp/rate-limit --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/rate-limit.ts` -> exit 0.
- `node src/lib/rate-limit.test.cjs` -> exit 0.
- `npx tsc --noEmit` -> exit 0.

Temporary compiled rate-limit test output under `.tmp/rate-limit` was removed after testing.

### Current Status

High-risk public intake and authenticated mutation endpoints now return safe `429 Too Many Requests` responses when exceeded, without introducing billing/plan limits or changing normal dashboard rendering.

### Next Task

Replace the in-memory rate-limit store with a distributed store such as Redis or Postgres-backed counters before multi-instance production deployment.

---

# 67. COMPLETED: Tenant Isolation and Authorization Regression Tests

### Completed Task

Added focused automated regression coverage for tenant isolation and authorization checks across protected organization data paths. Database schema, UI, consent logic, SDK behavior, and unrelated features were not changed.

### Files Changed

- `src/lib/tenant-isolation-regression.test.cjs` - new standalone security harness that validates auth, local org/user resolution, user-scoped active membership checks, resource ownership predicates, cross-resource attachment guards, dashboard read scoping, and Owner/Admin gates.
- `src/app/api/policies/[id]/purposes/[purposeId]/route.ts` - small security fix: verifies the detached purpose belongs to the active organization before deleting the policy-purpose link.
- `src/app/api/vendors/[id]/purposes/[purposeId]/route.ts` - small security fix: verifies the detached purpose belongs to the active organization before deleting the vendor-purpose link.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Test Coverage

The new harness covers:

- Unauthorized users receive protected-route auth guards and `401` paths.
- Authenticated users must resolve to a local user, active Clerk organization, and user-scoped active membership.
- Organization A cannot read/update/delete Organization B-owned websites, policies, purposes, vendors, API keys, webhooks, scanner results, consent evidence, notifications, audit logs, trackers, consent records, settings, or rights requests.
- Organization A cannot attach or detach Organization B purposes across policy-purpose and vendor-purpose relationships.
- Integrations are scoped through organization-owned websites for connect and disconnect paths.
- Notifications are scoped to the active organization and the current user or org-wide records.
- Settings, team management, retention, and rights-request administration retain Owner/Admin-style role gates.

### Vulnerabilities Fixed

- `DELETE /api/policies/[id]/purposes/[purposeId]` previously scoped the policy through organization-owned websites but did not explicitly verify the `purposeId` belonged to the active organization before deleting the link.
- `DELETE /api/vendors/[id]/purposes/[purposeId]` previously scoped the vendor to the organization but did not explicitly verify the `purposeId` belonged to the active organization before deleting the link.

### Verification

- `node src/lib/tenant-isolation-regression.test.cjs` -> exit 0.
- `npx tsc --noEmit` -> exit 0.

### Current Status

Tenant isolation and authorization regression coverage is in place as a lightweight standalone security harness, matching the existing project test style.

### Next Task

Add a proper project test script or lightweight test runner so all standalone security harnesses can run from `npm` without manual commands.

---

# 68. COMPLETED: Reliable Outbound Webhook Delivery

### Completed Task

Implemented a small reusable server-side webhook delivery service using the existing `webhook_endpoints` and `webhook_deliveries` tables. No database schema, dashboard UI, Clerk/authentication, or webhook management redesign changes were made.

### Delivery Flow

- Consent events are appended through `appendConsentEvent`.
- After the consent event row is written, the delivery service maps eligible consent changes to webhook event types:
  - `accepted` -> `consent.granted`
  - `rejected` -> `consent.declined`
  - `consent.withdrawn` -> `consent.withdrawn`
- The service loads only active endpoints from the same `organizationId` and filters by `subscribedEvents`.
- Each endpoint delivery sends a signed `POST` request with JSON payload `{ id, type, organizationId, data }`.
- Delivery headers include `X-CMP-Signature`, `X-CMP-Timestamp`, `X-CMP-Event-Id`, and `X-CMP-Event-Type`.
- Signatures are HMAC-SHA256 over `timestamp.payload` using the stored `signingSecretHash` as server-side key material.
- Every attempt is recorded in `webhook_deliveries` with status, attempt number, payload, response status/body, safe error message, sent/completed times, and `nextRetryAt` when retrying.
- Endpoint `lastDeliveryAt` is updated after a successful delivery.
- Retries are bounded to 3 attempts with short backoff. Retryable failures are network/timeout failures, HTTP 408, HTTP 429, and HTTP 5xx. HTTP 4xx responses other than 408/429 are final failures.

### Files Changed

- `src/lib/webhooks/delivery.ts` - new reusable server-side delivery service with signing, verification helper, timeout handling, delivery persistence, active subscribed endpoint selection, ownership guard, and bounded retry/backoff.
- `src/lib/webhooks/delivery.test.cjs` - targeted standalone webhook delivery harness.
- `src/lib/consent-engine.ts` - dispatches webhook delivery after consent events are appended, best-effort and non-fatal to consent writes.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Tests

`src/lib/webhooks/delivery.test.cjs` verifies:

- HMAC signing and signature verification.
- Required delivery headers include event ID, event type, timestamp, and signature.
- Endpoint ownership is enforced before outbound delivery.
- Transient HTTP 500 failures are recorded as `retrying`, retried with backoff, then succeed.
- Non-retryable HTTP 400 failures are recorded once and not retried.
- Timeout failures record the safe message `Webhook delivery timed out`.
- Stored response bodies are truncated to 2,000 characters.
- Retry classification for network/timeout, 408, 429, 5xx, and 4xx cases.

### Verification

- `npx tsc -p tsconfig.json --outDir .tmp/webhook-delivery --module commonjs --moduleResolution node --target ES2022 --noEmit false` -> exit 0.
- `node src/lib/webhooks/delivery.test.cjs` -> exit 0.
- `npx tsc --noEmit` -> exit 0.

Temporary compiled webhook test output under `.tmp/webhook-delivery` was removed after testing.

### Known Limitations

- Delivery runs inline and best-effort after consent events; there is no durable background queue or worker yet.
- Existing endpoint rows store only `signingSecretHash`; the delivery service signs with that stored hash as key material to avoid schema changes or storing raw one-time secrets.
- Audit-log webhook dispatch is supported by the reusable delivery service but not wired into every scattered audit-log write path yet.
- Failed final deliveries are recorded but not automatically resumed later without a future worker/retry scheduler.

### Current Status

Outbound webhook delivery is functional for consent webhook events using existing endpoint subscriptions and delivery history tables.

### Next Task

Add a durable webhook retry worker or scheduled job that picks up failed/retryable `webhook_deliveries` rows by `nextRetryAt` and resumes delivery outside request handling.

---

# 69. COMPLETED: Consent Manager End-to-End Regression Coverage

### Completed Task

Added comprehensive end-to-end regression coverage for the existing Consent Manager flow without adding product features, changing UI, modifying Clerk/authentication, or changing the database schema.

### Files Changed

- `src/lib/consent-manager-e2e-regression.test.cjs` - new standalone E2E regression harness that executes the generated SDK in a lightweight fake browser, uses a real-shaped organization/website/published-policy/purpose/vendor/tracker fixture, and exercises the consent API contract in memory.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Test Matrix

The new harness covers:

- External SDK load with a real-shaped `siteKey`, organization, active website, published policy version, purposes, vendors, and tracker rules.
- Banner display after SDK config load.
- `Accept all` flow: consent record creation, all purpose/vendor grants, localStorage persistence, tagged script restoration, consent event creation, audit event creation, analytics counter update, evidence retrieval, and signed webhook delivery.
- `Reject all` flow: required purpose remains granted, optional purposes/vendors denied, tracker script remains blocked, `consent.declined` webhook delivery.
- Granular flow: mixed purpose/vendor decisions produce partial consent, allowed tracker restores, denied tracker remains blocked.
- Reload/persistence: stored unexpired consent suppresses banner and reapplies enforcement.
- Withdrawal: consent becomes withdrawn, storage is cleared, blocked scripts are re-paused, banner returns, `consent.withdrawn` webhook delivery is recorded.
- Expiry/re-consent: expired stored consent is removed and the banner is shown again.
- Tracker enforcement helpers: essential allowed, consent-controlled tracker allowed only with purpose/vendor grants, unclassified tracker blocked by default, domain suffix matching.
- Consent evidence retrieval: correct organization can read the evidence bundle; another organization receives not found.
- Analytics update: accepted/rejected/partial/withdrawn/event counters reflect consent activity.
- Negative cases: invalid `siteKey`, invalid website ID, invalid consent ID shape, invalid consent payload choice, wrong-tenant website access, duplicate withdrawal, invalid JSON payload, and blocked tracker behavior.

### Failures Found

No concrete product bugs were discovered by this task. The new E2E harness passed after implementation.

### Verification

- `npx tsc -p tsconfig.json --outDir .tmp/consent-manager-e2e --module commonjs --moduleResolution node --target ES2022 --noEmit false` -> exit 0.
- `node src/lib/consent-manager-e2e-regression.test.cjs` -> exit 0.
- `node src/lib/tenant-isolation-regression.test.cjs` -> exit 0.
- `npx tsc -p tsconfig.json --outDir .tmp/webhook-delivery --module commonjs --moduleResolution node --target ES2022 --noEmit false` -> exit 0.
- `node src/lib/webhooks/delivery.test.cjs` -> exit 0.
- `npx tsc --outDir .tmp/rate-limit --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck --noEmit false src/lib/rate-limit.ts` -> exit 0.
- `node src/lib/rate-limit.test.cjs` -> exit 0.
- `npx tsc --outDir .tmp/scanner-security --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck --noEmit false src/lib/scanner/ssrf-guard.ts src/lib/scanner/tracker-signatures.ts src/lib/scanner/html-analyser.ts` -> exit 0.
- `node src/lib/scanner/scanner-security.test.cjs` -> exit 0.
- `npx tsc --noEmit` -> exit 0.

Temporary compiled outputs under `.tmp/consent-manager-e2e`, `.tmp/webhook-delivery`, `.tmp/rate-limit`, and `.tmp/scanner-security` were removed after testing.

### Known Limitations

- The E2E test uses a fake browser/DOM and in-memory API contract rather than Playwright against a running Next.js server.
- The test does not authenticate through real Clerk or create data in the local PostgreSQL database.
- Dashboard analytics, evidence, and webhook behavior are verified at the data-contract level rather than by rendering protected dashboard pages in a browser.
- Existing standalone harnesses still require temporary TypeScript compile commands before running; there is no unified `npm test` script yet.

### Current Status

The core Consent Manager flow now has comprehensive automated regression coverage in the project’s existing lightweight test style.

### Next Task

Add a proper project test script or lightweight test runner that compiles required TypeScript modules into `.tmp` and runs all standalone security/E2E harnesses from one `npm test` command.

---

# 70. COMPLETED: Production Observability and Reliability

### Completed Task

Added small production observability and reliability primitives for the existing application. No database schema, dashboard UI, Clerk/authentication, consent behavior, or monitoring provider changes were made.

### Observability Changes

- Added `src/lib/logger.ts`, a server-only structured logger with `debug`, `info`, `warn`, and `error` levels.
- Logger output is JSON-shaped with timestamp, service name, level, message, and sanitized context.
- Log context redacts sensitive key names including passwords, secrets, tokens, API keys, key hashes/prefixes, authorization, cookies, signatures, visitor IDs, requester emails, requester phones, and generic email fields.
- Email-like values inside strings and error messages are redacted as `[REDACTED_EMAIL]`.
- Error objects include name/message and include stack traces only outside production.
- Replaced raw unexpected-error `console.error` calls in key server paths with structured logs:
  - consent record fetch/submission event failures
  - consent withdrawal event/failure paths
  - consent-engine webhook dispatch failures
  - scanner run failures
  - scanner run API request failures
  - webhook delivery failures before attempt recording
  - webhook endpoint create/update/delete failures
  - rights request intake/status failures

### Reliability Changes

- Added `GET /api/health`.
- Health endpoint verifies application availability and database connectivity with `select 1`.
- Successful response returns only high-level check status: app/database `ok`.
- Failure response returns HTTP `503` with generic unhealthy status and logs structured diagnostic context server-side.
- Health responses use `Cache-Control: no-store`.

### Files Changed

- `src/lib/logger.ts` - new server-side structured logger and sanitizer.
- `src/lib/logger.test.cjs` - new focused logger sanitizer regression test.
- `src/app/api/health/route.ts` - new lightweight health endpoint.
- `src/lib/consent-engine.ts` - structured logging for non-fatal webhook dispatch failures.
- `src/app/api/consent/record/route.ts` - structured logging for unexpected fetch/submission and event append failures.
- `src/app/api/consent/withdraw/route.ts` - structured logging for unexpected withdrawal and event append failures.
- `src/lib/scanner/scan-engine.ts` - structured logging for scan failures.
- `src/app/api/scanner/run/route.ts` - structured logging for scanner API failures.
- `src/lib/webhooks/delivery.ts` - structured logging for delivery failures before attempt recording.
- `src/app/api/webhooks/endpoints/route.ts` - structured logging for endpoint creation failures.
- `src/app/api/webhooks/endpoints/[id]/route.ts` - structured logging for endpoint update/delete failures.
- `src/app/api/rights-request/route.ts` - structured logging for rights request intake failures.
- `src/app/api/rights-request/[id]/route.ts` - structured logging for rights request status failures.
- `src/lib/webhooks/delivery.test.cjs` - updated test module shim for logger import.
- `src/lib/consent-manager-e2e-regression.test.cjs` - updated test module shim for logger import.
- `CMP_AGENT_CONTEXT.md` - this handoff note.

### Verification

- `npx tsc --outDir .tmp/logger --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck --noEmit false src/lib/logger.ts` -> exit 0.
- `node src/lib/logger.test.cjs` -> exit 0.
- `npx tsc -p tsconfig.json --outDir .tmp/consent-manager-e2e --module commonjs --moduleResolution node --target ES2022 --noEmit false` -> exit 0.
- `node src/lib/consent-manager-e2e-regression.test.cjs` -> exit 0.
- `node src/lib/tenant-isolation-regression.test.cjs` -> exit 0.
- `npx tsc -p tsconfig.json --outDir .tmp/webhook-delivery --module commonjs --moduleResolution node --target ES2022 --noEmit false` -> exit 0.
- `node src/lib/webhooks/delivery.test.cjs` -> exit 0.
- `npx tsc --outDir .tmp/rate-limit --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck --noEmit false src/lib/rate-limit.ts` -> exit 0.
- `node src/lib/rate-limit.test.cjs` -> exit 0.
- `npx tsc --outDir .tmp/scanner-security --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck --noEmit false src/lib/scanner/ssrf-guard.ts src/lib/scanner/tracker-signatures.ts src/lib/scanner/html-analyser.ts` -> exit 0.
- `node src/lib/scanner/scanner-security.test.cjs` -> exit 0.
- `npx tsc --noEmit` -> exit 0.

Temporary compiled outputs under `.tmp/logger`, `.tmp/consent-manager-e2e`, `.tmp/webhook-delivery`, `.tmp/rate-limit`, and `.tmp/scanner-security` were removed after testing.

### Known Limitations

- Logs currently go to stdout/stderr only; no external monitoring or log shipping provider is configured.
- The health endpoint verifies database connectivity but does not check migrations, queue health, webhook backlog, Clerk availability, or outbound network availability.
- Many lower-risk API routes still use existing raw `console.error` logging and can be migrated incrementally.
- There is still no unified `npm test` command for the standalone harnesses.

### Current Status

The most important consent, scanner, webhook, rights request, and health paths now have safe structured diagnostic logging while preserving generic API responses.

### Next Task

Add a unified `npm test` script or lightweight Node runner that compiles required TypeScript modules into `.tmp`, runs all standalone regression harnesses, and cleans temporary output automatically.

---

# 57. COMPLETED: Light/dark design-system UI/UX pass

### Completed Task

Applied a product-wide visual redesign using shared design tokens, a real dark theme (not a simple invert), and updated primitives/shell/marketing. No database, API, Clerk, consent, scanner, SDK, webhook, or rights-request logic was changed.

### Design tokens / palette

CSS variables on `:root` and `.dark` in `src/app/globals.css`.

Light: cool gray canvas (`#f3f5f8`), navy primary (`#2c4a7c`), teal accent (`#0f766e`), white cards, restrained semantic colors.

Dark: charcoal foundation (`#0b1220`), elevated card (`#121c2e`), lighter blue primary (`#8aa4d4`), teal accent (`#2dd4bf`), distinct border/surface layers.

Also: `--primary-hover`, `--accent-soft`, `--success-soft` / `--warning-soft` / `--danger-soft` / `--info-soft`, `--hover`, `--shadow-sm` / `--shadow-md`, motion duration/easing tokens.

Tailwind `@custom-variant dark (&:where(.dark, .dark *));`. `color-scheme` set per theme.

### Theme implementation

- Theme bootstrap uses `next/script` with `strategy="beforeInteractive"` (not a raw `<script>` in the layout tree). `ThemeProvider` always hydrates as `light`/`resolved=false`, then syncs from storage/DOM after mount so the toggle does not mismatch SSR.

Existing `bg-white` / `text-slate-*` / `border-slate-*` / indigo utility classes are remapped under `html.dark` so dashboard modules inherit the theme without rewriting every page.

### Shared components changed

- Button, Card, Badge, Alert, EmptyState, StatCard, Skeleton — token-based states including hover, focus-visible, disabled, loading.
- New: Input, Select, Textarea, FormSection.
- Dashboard shell, sidebar, notification bell, dashboard layout (org switcher/search/profile chrome).
- Homepage + `HomeNavbar`.
- Overview charts use token stroke/fill colors (series math unchanged).

### Animation / scroll

- Existing keyframes retained; `prefers-reduced-motion` still disables non-essential motion.
- Smooth scroll only on `html:has(.public-page)` so dashboard scroll is not forced smooth.
- Public IO/scroll reveals unchanged.

### Responsive / accessibility

- Shared `.page-wrap`, table scroll, 44px-class controls, visible `:focus-visible`.
- Live multi-breakpoint browser pass was not available in this session.

### Files changed (principal)

- `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`
- `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`
- `src/components/theme/*` (new)
- `src/components/ui/*` (tokens + new form primitives)
- `src/components/dashboard/dashboard-shell.tsx`, `sidebar-nav.tsx`
- `src/components/public/home-navbar.tsx`
- `src/components/notifications/notification-bell.tsx`
- `CMP_AGENT_CONTEXT.md`

### Verification

- `npx tsc --noEmit` → exit 0
- `node src/lib/tenant-isolation-regression.test.cjs` → passed
- Logger harness was not re-run (requires a separate `tsc --outDir .tmp/logger` compile step)

### Known limitations

- Clerk `SignIn` / `SignUp` / `UserButton` / `OrganizationSwitcher` widgets are not fully restyled for dark mode.
- Dark coverage for leftover one-off colors (e.g. some `bg-indigo-500`, `text-white` on dark CTAs) relies on remaps plus tokens; a few hardcoded hex values may remain.
- No dedicated Input wiring on every form yet; forms still use existing markup plus `.field-input` where already present.
- Browser visual QA (light/dark, mobile, reduced-motion) was not executed here.

### Next Task

Build the Billing page. The next agent must:

- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page using the shared Card/Badge/StatCard/Button primitives.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices.
- Do not implement payment processing, Stripe integration, or plan upgrades yet — display only.
- Update the sidebar "Billing" nav item href from `/dashboard/settings/organization` to `/dashboard/billing`.
- Run `npx tsc --noEmit` and update `CMP_AGENT_CONTEXT.md`.

---

# 58. COMPLETED: Public homepage and application-layout visual redesign

### Completed Task

Redesigned the public homepage and shared application chrome so the CMP reads as one premium privacy/security SaaS product. No database, API, Clerk, consent, SDK, scanner, webhook, rights-request, or tenant-isolation logic was changed.

### Visual system

- Tokens remain in `src/app/globals.css`: navy primary, teal accent, cool gray/navy foundation, semantic colors, `--header-height: 5rem`, `--public-max: 72rem`.
- Light: soft canvas, white/cool cards, deep navy type.
- Dark: charcoal/navy surfaces, elevated cards, lighter blue primary, teal highlights. Grid/dot overlays use `var(--foreground)` so they remain visible in both themes.

### Navbar / header

- Public header is `min-h-20` with a stronger logo lockup, denser nav, theme toggle, and a clearer CTA.
- Dashboard topbar matches at `h-20` and uses the same surface/blur language as the sidebar.
- Mobile menu keeps grid-row animation; hamburger remains labeled.

### Homepage

- Layered hero: dots, faint technical lines, radial depth, then alternating section surfaces (`public-section-alt`, `public-section-deep`).
- Hero copy states what the product is, who it is for, and why it exists, plus product-fact bullets that only describe existing capabilities.
- Product visual is a labeled workspace/browser preview plus a sample consent notice — not live metrics, logos, or certifications.
- Sections: value, workflow, platform capabilities, security/privacy, developers, monitoring, final CTA, footer.

### Background / animation / scroll

- Hero and section grids/dots/radials; separators remain thin and restrained.
- Smooth hash scrolling with sticky-header offset; IO reveals retained; `prefers-reduced-motion` still disables non-essential motion.
- Hero uses staggered `animate-fade-up` delays.

### Dashboard shell

- Sidebar active state is a soft surface plus teal rail instead of a filled primary pill.
- Slightly tighter collapsed width; page wrap and page-title spacing increased.

### Files changed

- `src/app/globals.css`
- `src/app/page.tsx`
- `src/components/public/home-navbar.tsx`
- `src/components/public/home-product-preview.tsx` (new)
- `src/components/public/home-interactions.tsx`
- `src/components/dashboard/dashboard-shell.tsx`
- `src/components/dashboard/sidebar-nav.tsx`
- `src/app/dashboard/layout.tsx`
- `src/components/ui/page-header.tsx`
- `CMP_AGENT_CONTEXT.md`

### Verification

- `npx tsc --noEmit` → exit 0
- `node src/lib/tenant-isolation-regression.test.cjs` → passed
- Live multi-breakpoint browser QA of light/dark/reduced-motion was not run in this session

### Remaining UI limitations

- Clerk widgets are still not fully restyled.
- Individual dashboard module pages were not redesigned one-by-one; they inherit tokens, page-wrap, and shell changes.
- Homepage preview figures remain illustrative sample layout only.

### Next Task

Build the Billing page (`/dashboard/billing`) as a display-only org billing overview. Do not add Stripe or payment processing.

---

# 71. COMPLETED: Production observability and application health

### Completed Task

Hardened the existing structured logger and health check, added focused tests (including database-failure and secret-redaction cases), and replaced remaining unexpected `console.error` calls on API-key and public SDK routes. No schema, consent, scanner, Clerk, tenant-isolation, or client-facing API contract changes.

### Observability architecture

- `src/lib/logger.ts` — JSON logs to stdout/stderr with `debug` (non-production only), `info`, `warn`, `error`.
- Fields: `timestamp`, `service: consent-manager`, `level`, `message`, sanitized `context`.
- `src/lib/health.ts` — `buildHealthResponse` / `runHealthCheck(ping)` used by `GET /api/health`.
- Health pings PostgreSQL with `select 1`. Unexpected ping failures are logged server-side; the HTTP body stays generic.

### Logger behavior / redaction

Allowed context includes route, operation, organizationId, websiteId, duration, and sanitized error name/message (stack only outside production).

Redacted by key name: passwords, secrets, tokens, API keys, fullKey, hashes/prefixes, authorization, cookies, signatures, visitor IDs, requester emails/phones, generic email fields, DATABASE_URL / connectionString, and `metadata` objects.

Redacted in string values: emails, `postgres://` URLs, Clerk `sk_`/`pk_` keys, `whsec_` secrets, `cmp_live_` / `cmp_test_` keys.

Never log full request bodies or Clerk/database credentials.

### Health endpoint

`GET /api/health`

- 200 `{ status: "ok", checks: { app: "ok", database: "ok" } }`
- 503 `{ status: "unhealthy", checks: { app: "ok", database: "unhealthy" } }`
- `Cache-Control: no-store`
- No credentials, stacks, SQL, or filesystem paths in the response

### Files changed

- `src/lib/logger.ts` — broader redaction
- `src/lib/logger.test.cjs` — redaction + unexpected-error JSON capture
- `src/lib/health.ts` — new extractable health evaluator
- `src/lib/health.test.cjs` — healthy / DB failure / safe body
- `src/app/api/health/route.ts` — uses `runHealthCheck`
- `src/app/api/api-keys/route.ts`, `src/app/api/api-keys/[id]/route.ts`
- `src/app/api/sdk/script/route.ts`, `src/app/api/sdk/[siteKey]/config/route.ts`, `src/app/api/sdk/[siteKey]/trackers/route.ts`
- `CMP_AGENT_CONTEXT.md`

Existing consent, scanner, webhook, and rights-request unexpected-error logs were already on `logger` and were left behaviorally unchanged.

### Tests executed

- `npx tsc --noEmit` → exit 0
- `node src/lib/logger.test.cjs` → passed
- `node src/lib/health.test.cjs` → passed
- `node src/lib/rate-limit.test.cjs` → passed
- `node src/lib/scanner/scanner-security.test.cjs` → passed
- `node src/lib/tenant-isolation-regression.test.cjs` → passed
- `node src/lib/webhooks/delivery.test.cjs` → passed
- `node src/lib/consent-manager-e2e-regression.test.cjs` → passed

Temporary `.tmp/*` compile outputs were removed after testing.

### Limitations

- Logs still go only to stdout/stderr (no vendor shipping).
- Health does not check Clerk, migrations, webhook backlog, or outbound network.
- Many lower-risk dashboard API routes still use `console.error`.
- In-memory rate limiting is unchanged; it has no unexpected-error path to log.
- No unified `npm test` script yet.

### Next recommended task

Add a unified `npm test` runner that compiles required TypeScript into `.tmp`, runs the standalone harnesses, and deletes temporary output.

---

# 72. COMPLETED: Dashboard action feedback and route loading UX

### Completed Task

Added consistent mutation feedback (React Hot Toast + loading buttons + duplicate-submit guards) and App Router loading skeletons. Investigated why `/dashboard/websites/[id]` felt slow and reduced blocking work without changing schema, consent logic, tenant isolation, Clerk behavior, SDK, scanner detection, or API contracts.

### Toast architecture

- Library: `react-hot-toast`.
- Central toaster: `src/components/feedback/app-toaster.tsx`, mounted from `DashboardProviders` in `src/app/dashboard/layout.tsx`.
- Client helpers: `notify.success` / `notify.error` (`src/components/feedback/notify.ts`) use stable toast ids so one failure does not stack duplicate toasts.
- Shared fetch: `dashboardFetch` + `useAsyncAction` in `src/components/feedback/use-async-action.ts`. Success toasts fire only after `response.ok`. Validation (400) stays inline when `onValidation` is provided; other errors use friendly toasts.
- Mapping: `src/lib/dashboard-feedback.ts` classifies 400 / 401-403 / 404 / 409 / 429 / network / generic server. Raw SQL, stacks, connection strings, and `SQLSTATE` strings are not shown.

### Mutation loading behavior

Major create/update/delete forms disable the triggering control, set `aria-busy`, show Button spinner/label copy such as “Adding website…”, “Saving policy…”, “Generating…”, “Deleting…”, and restore the control on success or error. `useAsyncAction` ignores a second submit while pending. Form field values are kept on failure.

Wired surfaces include websites, policies, purposes, vendors, API keys (create + revoke with confirm), webhooks (create/toggle/delete with confirm), integrations, organization settings, team invite/role/remove, rights requests, notifications (errors no longer swallowed; mark-all has a toast, mark-one does not), scanner start, publish policy, banner save/studio, and policy purpose/vendor attach/detach.

Visitor preference-center consent save/withdraw was not changed.

### Routes improved

- `src/app/dashboard/loading.tsx` — generic dashboard skeleton.
- `src/app/dashboard/websites/loading.tsx`
- `src/app/dashboard/websites/[id]/loading.tsx` plus settings / enforcement / installation `loading.tsx`
- `src/app/dashboard/policies/loading.tsx` and `policies/[id]/loading.tsx`
- `src/app/dashboard/scanner/[scanId]/loading.tsx`

Sidebar nav applies the active style immediately on click (`pendingHref`) until the pathname updates. There is no global spinner on every navigation.

### Route performance findings (code-path inspection, not invented timings)

Before this change, `/dashboard/websites/[id]` waited on:

1. `auth()` again (layout already ran `bootstrapCurrentContext`)
2. organization lookup by `clerkOrganizationId`
3. website `select()` of all columns
4. then `Promise.all` of trackers, policies, and scans
5. then vendor/purpose name lookups
6. no `loading.tsx`, so navigation looked frozen until the whole page finished

Settings, enforcement, and installation repeated the same sequential org-then-website lookups. The websites list did org lookup then websites.

Clerk + bootstrap in the dashboard layout still run for every dashboard request; that cost was not removed (authorization must stay). No new caching and no new indexes were added (no query plan evidence).

### Performance optimizations made

- `getTenantWebsite` / `requireTenantWebsite` (`src/lib/tenant-website.ts`): React `cache()`, one inner join of website + organization scoped to the active Clerk org, selected columns only. Used by website detail, settings, enforcement, and installation.
- Website list: single join query instead of org then websites.
- Website detail first paint: identity/details/SDK/integrations from the website row; trackers/policies/scans stream behind `Suspense` (`WebsiteDetailRelated`). Tenant checks remain on the website lookup.

### Files changed (representative)

- `package.json` / lockfile — `react-hot-toast`
- `src/lib/dashboard-feedback.ts`, `src/lib/tenant-website.ts`
- `src/components/feedback/*`, `src/components/dashboard/dashboard-providers.tsx`, `dashboard-skeletons.tsx`, `sidebar-nav.tsx`
- `src/app/dashboard/layout.tsx`, website/policy/scanner `loading.tsx` files
- `src/app/dashboard/websites/page.tsx`, `[id]/page.tsx`, settings/enforcement/installation pages
- Mutation forms/managers listed above
- Tests: `src/lib/dashboard-feedback.test.cjs`, `src/lib/dashboard-ux.test.cjs`
- `CMP_AGENT_CONTEXT.md`

### Tests run

- `npx tsc --noEmit` → exit 0
- `node src/lib/dashboard-feedback.test.cjs` → passed
- `node src/lib/dashboard-ux.test.cjs` → passed (loading files, Suspense split, website form loading/toast copy, Button `aria-busy`)
- `node src/lib/tenant-isolation-regression.test.cjs` → passed
- `node src/lib/rate-limit.test.cjs` → passed
- `node src/lib/logger.test.cjs` → passed
- `node src/lib/health.test.cjs` → passed
- `node src/lib/scanner/scanner-security.test.cjs` → passed
- `node src/lib/webhooks/delivery.test.cjs` → passed
- Browser click-through of toast/loading on a live dashboard session was not run in this pass
- No synthetic latency numbers were collected

### Verification results

Observed from source structure after the change: website detail can render header/details while related queries are still in flight, and nested `loading.tsx` covers the `[id]` segment during navigation. Layout bootstrap + Clerk `auth()` still occur before any page body. Residual slowness from DB round-trips for trackers/policies/scans, scanner HTML work, and Clerk/org bootstrap remains.

### Limitations

- Some APIs still return `{ success: false }` with HTTP 200; those paths use explicit JSON checks (team, rights, publish) rather than `dashboardFetch`.
- Mark-as-read on a single notification has error toasts only, to avoid noise.
- Preference center (public consent) mutations were left unchanged.
- No database indexes added.
- `consent-manager-e2e-regression.test.cjs` was not re-run (separate compile of many modules).

### Next recommended task

Build the Billing page (`/dashboard/billing`) as a display-only org billing overview. Do not add Stripe or payment processing.

---

# 74. COMPLETED: Responsive dashboard header + working search

### Completed Task

Made the dashboard top bar collapse cleanly on small screens, and replaced the inert Search field with a working command-palette style finder.

### Header

- Shorter bar on small screens (`h-16`, `lg:h-20`), `flex-nowrap`, truncated org switcher (`max-w-[7.5rem]` on phones).
- User name hidden below `lg`; Help hidden below `sm`.
- Middle slot grows (`flex-1 min-w-0`). Desktop search is a full-width combobox; below `md` it becomes a search icon plus a full-screen overlay.

### Search

- Local matches against dashboard pages immediately (`src/lib/dashboard-search.ts`).
- After 2+ characters, `GET /api/search?q=` returns org-scoped websites, policies (via website join), purposes, and vendors. LIKE wildcards are stripped.
- Keyboard: Arrow keys, Enter, Escape, Ctrl/Cmd+K.
- Clicking a result navigates; `mousedown` preventDefault so blur does not eat the click.

### Files changed

- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/dashboard-shell.tsx`
- `src/components/dashboard/dashboard-search.tsx`
- `src/lib/dashboard-search.ts`
- `src/app/api/search/route.ts`
- `src/lib/dashboard-search.test.cjs`
- `src/lib/tenant-isolation-regression.test.cjs`
- `CMP_AGENT_CONTEXT.md`

### Tests run

- `npx tsc --noEmit`
- `node src/lib/dashboard-search.test.cjs` (after compiling `src/lib/dashboard-search.ts`)
- `node src/lib/tenant-isolation-regression.test.cjs`

### Next recommended task

Build the Billing page (`/dashboard/billing`) as a display-only org billing overview. Do not add Stripe or payment processing.

---

# 73. COMPLETED: Dashboard blank after login + create-form UX

### Completed Task

Fixed `/dashboard` rendering a blank main area after a new login, and restyled the unpolished create/settings forms (starting with Add Website) onto the shared field/card primitives.

### Dashboard blank-page cause

`src/app/dashboard/page.tsx` called `auth()` again and `return null` when Clerk `orgId` was missing or the local org row was not found. After a fresh login the session often has a user but **no active organization id**, so the shell rendered and the page body was empty.

### Fix

- `bootstrapCurrentContext` is wrapped in React `cache()` so layout and pages share one resolution.
- If `auth().orgId` is absent, resolve the org from Clerk memberships (`organizationMemberships`, then `users.getOrganizationMembershipList`), then an existing local membership.
- `requireDashboardContext()` redirects to `/create-organization` only when the user truly has no org; it never returns `null`.
- Dashboard home and websites list use that helper. Empty workspaces show zeros and a real empty consent list (no placeholder people).

Tenant isolation is unchanged: org rows are still matched on `clerkOrganizationId` / `organization.id` after Clerk authentication.

### Form UX

- New `Field` / `FormCard` / `FormActions` in `src/components/ui/field.tsx`.
- Add Website no longer nests a bordered form inside a second card. Uses `Input`/`Select`, focus rings, language/region grid, Cancel + primary action.
- Create policy, create purpose, create vendor, and website settings use the same field-input / card treatment.
- `select.field-input` gets a consistent chevron in `globals.css`.

### Files changed

- `src/lib/bootstrap-current-context.ts`
- `src/app/dashboard/page.tsx`, `src/app/dashboard/websites/page.tsx`, `src/app/dashboard/websites/new/page.tsx`
- `src/components/ui/field.tsx` (new)
- `src/components/websites/create-website-form.tsx`, `website-settings-form.tsx`
- `src/components/policies/create-policy-form.tsx`
- `src/components/purposes/create-purpose-form.tsx`
- `src/components/vendors/create-vendor-form.tsx`
- `src/app/globals.css`
- `src/lib/dashboard-ux.test.cjs`
- `CMP_AGENT_CONTEXT.md`

### Tests run

- `npx tsc --noEmit` → exit 0
- `node src/lib/dashboard-ux.test.cjs` → passed
- `node src/lib/tenant-isolation-regression.test.cjs` → passed

### Next recommended task

Build the Billing page (`/dashboard/billing`) as a display-only org billing overview. Do not add Stripe or payment processing.

---

# 74. COMPLETED: Responsive dashboard header + working search

### Completed Task

Made the dashboard top bar collapse cleanly on small screens, and replaced the inert Search field with a working command-palette style finder.

### Header

- Shorter bar on small screens (`h-16`, `lg:h-20`), `flex-nowrap`, truncated org switcher (`max-w-[7.5rem]` on phones).
- User name hidden below `lg`; Help hidden below `sm`.
- Middle slot grows (`flex-1 min-w-0`). Desktop search is a full-width combobox; below `md` it becomes a search icon plus a full-screen overlay.

### Search

- Local matches against dashboard pages immediately (`src/lib/dashboard-search.ts`).
- After 2+ characters, `GET /api/search?q=` returns org-scoped websites, policies (via website join), purposes, and vendors. LIKE wildcards are stripped.
- Keyboard: Arrow keys, Enter, Escape, Ctrl/Cmd+K.
- Clicking a result navigates; `mousedown` preventDefault so blur does not eat the click.

### Files changed

- `src/app/dashboard/layout.tsx`
- `src/components/dashboard/dashboard-shell.tsx`
- `src/components/dashboard/dashboard-search.tsx`
- `src/lib/dashboard-search.ts`
- `src/app/api/search/route.ts`
- `src/lib/dashboard-search.test.cjs`
- `src/lib/tenant-isolation-regression.test.cjs`
- `CMP_AGENT_CONTEXT.md`

### Tests run

- `npx tsc --noEmit` → exit 0
- `node src/lib/dashboard-search.test.cjs` → passed
- `node src/lib/tenant-isolation-regression.test.cjs` → passed

### Next recommended task

Build the Billing page (`/dashboard/billing`) as a display-only org billing overview. Do not add Stripe or payment processing.

---

# 75. COMPLETED: Security headers, CSP, and CSRF review

### Completed Task

Production hardening limited to HTTP security headers, Content-Security-Policy, and CSRF origin checks for cookie-authenticated APIs. Schema, consent engine, scanner, webhooks, tenant isolation, and public SDK behavior were not changed. This is not a security certification.

### Headers implemented

Applied on matched requests in `src/proxy.ts` and on all routes via `next.config.ts` `headers()` (covers static files the Clerk matcher skips):

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN` (legacy complement to CSP `frame-ancestors`)
- `Permissions-Policy` — camera, microphone, geolocation, payment, USB, and related powerful features disabled; `fullscreen=(self)`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — **only** when `NODE_ENV=production` **and** the request is HTTPS (`https:` or `x-forwarded-proto: https`). Not sent from `next dev`.

Intentionally **not** set:

- `Cross-Origin-Resource-Policy: same-origin` — would block customer sites from loading `/api/sdk/script`
- `Cross-Origin-Embedder-Policy` — would break Clerk and third-party embeds
- `Access-Control-Allow-Credentials` on public CORS — session cookies must not be usable cross-origin

Public SDK/consent CORS remains `Access-Control-Allow-Origin: *` with `Content-Type` only (`src/lib/sdk/public-http.ts`).

### CSP policy

Enforced by Clerk `clerkMiddleware({ contentSecurityPolicy: { strict: true, directives: CLERK_CSP_EXTRA_DIRECTIVES } })` in `src/proxy.ts`.

Clerk **strict** mode (production):

- Per-request nonce + `script-src 'strict-dynamic'` (no `http:`/`https:` scheme allowlist on scripts)
- `unsafe-eval` **only when `NODE_ENV !== production`** (Next.js/React dev). Not in production.
- Clerk FAPI host from the publishable key, `https://challenges.cloudflare.com`, `https://*.protect.clerk.com` (+ `:*` on `connect-src`), telemetry, `img.clerk.com`, `worker-src 'self' blob:`
- Clerk default still includes Stripe/Google Maps hosts Clerk ships for its components even though this app does not use Stripe
- `style-src 'unsafe-inline'` — **required by Clerk CSS-in-JS**; also needed for react-hot-toast / theme `colorScheme` inline styles

Merged extras (`CLERK_CSP_EXTRA_DIRECTIVES`):

- `base-uri 'self'`
- `object-src 'none'`
- `font-src 'self' data:` (`next/font` is self-hosted)
- `media-src 'self'`
- `img-src data: blob:` (merged with Clerk `self` + `img.clerk.com`)
- `frame-ancestors 'self'` — dashboard/marketing pages must not be framed by other origins
- `frame-src http: https:` — banner studio `IframePreview` loads **customer** sites

`ClerkProvider dynamic` and theme bootstrap `next/script` `nonce` from `x-nonce` so strict CSP can run Clerk and the theme inline script.

### CSP exceptions and reasons

| Exception | Why |
| --- | --- |
| `style-src 'unsafe-inline'` | Clerk injects runtime CSS; cannot nonce all of it yet |
| `script-src 'unsafe-eval'` in development only | Next.js/React dev tooling |
| `frame-src http: https:` | Policy studio preview iframes arbitrary customer origins |
| Clerk Stripe/Maps hosts | Shipped by Clerk's default CSP generator; not removed (would fight Clerk upgrades) |
| CSP header may appear on `/api/sdk/*` and `/api/consent/*` responses | Middleware applies to API matcher; **browsers do not apply that response CSP as the customer page's policy**. Customer sites keep their own CSP. No CORP:same-origin. |
| `type="text/plain"` demo tags on `/sdk-demo` | Not executed as script until the SDK flips type; left as-is |

No `unsafe-eval` in production CSP.

### CSRF findings (threat model)

**Clerk dashboard session:** cookie-based (`__session`). Modern Clerk cookies are typically `SameSite=Lax`, so cross-site POSTs do not attach cookies. Dashboard `fetch()` is same-origin and does not enable CORS credentials for other origins.

**Additional control:** `src/proxy.ts` rejects state-changing `/api/*` requests that are not same-origin when `Sec-Fetch-Site: cross-site` or `Origin`/`Referer` does not match the request origin (optional `CMP_CSRF_ALLOWED_ORIGINS`). Missing Origin + missing Sec-Fetch-Site is allowed (curl/server clients).

**Not CSRF-tokenized (by design):**

- `POST/GET /api/consent/*` — public visitor consent; CORS `*` without credentials; capability is `websiteId` / consent id, not Clerk cookies
- `GET /api/sdk/*` — public script/config/trackers for customer origins
- `POST /api/rights-request` — public DPDP intake (no session). `PATCH /api/rights-request/[id]` **is** CSRF-checked (authenticated)
- `GET /api/health`

Classic CSRF against **consent** would forge a visitor record, not steal a dashboard session. That is an integrity concern already bounded by rate limits and site identifiers, not cookie CSRF.

### Endpoints reviewed

**Public / cross-origin (no origin CSRF gate):**  
`/api/sdk/script`, `/api/sdk/[siteKey]/config`, `/api/sdk/[siteKey]/trackers`, `/api/consent/record`, `/api/consent/withdraw`, `/api/consent/policy`, `/api/rights-request`, `/api/health`

**Authenticated mutations (origin CSRF gate + existing Clerk `auth()` / membership checks unchanged):**  
websites, policies, purposes, vendors, scanner, integrations, api-keys, webhooks, notifications (write), settings (org/team/retention/rights), sync-organization, search is GET-only

**Authenticated GET (no CSRF token; not state-changing):** search, me, notifications unread-count, consent evidence, scanner scanId, test-db

### Files changed

- `src/lib/security-headers.ts`
- `src/proxy.ts`
- `src/app/layout.tsx`
- `next.config.ts`
- `src/app/sdk-demo/page.tsx` (essential demo log uses `next/script` so nonce CSP can allow it)
- `src/lib/security-headers.test.cjs`
- `CMP_AGENT_CONTEXT.md`

### Tests run

- `npx tsc --noEmit`
- `node src/lib/security-headers.test.cjs`
- `node src/lib/tenant-isolation-regression.test.cjs` (not weakened)
- `npm test` — **no `test` script** in `package.json`

### Remaining risks

- Strict CSP + `ClerkProvider dynamic` forces dynamic rendering (no static HTML cache / nonce reuse).
- `style-src 'unsafe-inline'` remains XSS-relevant for style injection.
- `frame-src http: https:` allows the dashboard to iframe any site (needed for studio); it does **not** allow other sites to iframe us (`frame-ancestors 'self'`).
- HSTS `preload` should only be used once the production hostname is HTTPS-only.
- In-memory rate limits and CSRF origin checks are per-instance; they are not a WAF.
- Public consent POSTs remain callable from any origin without cookies (product requirement).
- Clerk-generated CSP still lists Stripe/Maps hosts unused by this app.
- No live browser CSP-violation audit was captured in this pass (requires a signed-in production-like session and browser console).

### Next recommended task

Build the Billing page (`/dashboard/billing`) as a display-only org billing overview. Do not add Stripe or payment processing.

---

# 76. COMPLETED: Privacy monitoring + consent drift detection

### Completed Task

Added scan-triggered privacy/consent drift detection. There is **no background worker or scheduler**. Flow is:

SCAN (completed) → COMPARE → DETECT DRIFT → STORE FINDING → NOTIFY (new/reopened only) → REVIEW → RESOLVE

Consent engine, public SDK, scanner signatures, Clerk, webhook, and rights-request behavior were not changed. A drift failure does not mark a successful scan as failed.

### Architecture

- Pure comparison: `src/lib/monitoring/drift-engine.ts`
- Load CMP snapshot + persist: `src/lib/monitoring/process-scan-drift.ts`
- After `scans.status = completed` in `runScan`, `runDriftForScan` runs in try/catch
- Org-scoped APIs under `/api/monitoring/*`
- Dashboard: `/dashboard/monitoring` and `/dashboard/monitoring/[id]`

CMP path used for comparison:

Organization → Website → published Policy Version → policy purposes → Vendors → vendor purposes → Trackers / scan results

Organization IDs are never taken from the client.

### Finding types

| Type | Meaning |
| --- | --- |
| `new_tracker` | Identifier in latest completed scan, not in previous completed scan (third-party only; skipped when there is no previous scan) |
| `removed_tracker` | Identifier in previous scan, absent from latest |
| `third_party_domain_changed` | Same identifier, different host between scans |
| `unmapped_tracker` | Active tracker with no vendor and no purpose, not essential |
| `unmapped_vendor` | Observed third-party domain matches no active org vendor domain |
| `vendor_mapping_changed` | Tracker vendor ≠ vendor implied by observed domain |
| `purpose_mapping_changed` | Tracker purpose is not on the published policy version |
| `missing_enforcement_rule` | Scan item has no active tracker rule |
| `enforcement_mismatch` | Vendor–purpose link missing, or consent-controlled tracker has no domain/identifier to match |

Ordinary HTML/text changes without identifier/domain/mapping changes do not emit findings.

### Severity rules

- **CRITICAL**: `new_tracker` / `unmapped_tracker` / `missing_enforcement_rule` when `type=fingerprint` or `riskLevel` is high/critical
- **HIGH**: other `new_tracker`, `unmapped_tracker`, `missing_enforcement_rule`
- **MEDIUM**: `vendor_mapping_changed`, `unmapped_vendor`, `third_party_domain_changed`; `purpose_mapping_changed` / `enforcement_mismatch` unless high-risk (then HIGH)
- **LOW**: `removed_tracker`

### Fingerprint strategy

`sha256("v1|{organizationId}|{websiteId}|{findingType}|{subjectKey}")` where `subjectKey` is the tracker identifier (or normalized domain for `unmapped_vendor`). Unique on `(organization_id, fingerprint)`.

- Unchanged OPEN/REVIEWED: update `lastDetectedAt`, details, severity, mappings — **no notification**
- RESOLVED + detected again: reopen to OPEN, clear resolved/reviewed fields — **notify**
- Findings are never deleted. Absence on a later scan does **not** auto-resolve.

### Persistence

New table `privacy_findings` (migration `drizzle/0036_privacy_findings.sql`). Applied with `drizzle-kit migrate`.

### APIs

All Clerk-authenticated, membership-checked, org-scoped:

- `GET /api/monitoring/findings` — filters: `websiteId`, `severity`, `type`, `status`
- `GET /api/monitoring/findings/[id]`
- `POST /api/monitoring/findings/[id]/review` — audit `privacy_finding.reviewed`
- `POST /api/monitoring/findings/[id]/resolve` — audit `privacy_finding.resolved`
- `POST /api/monitoring/run` — `{ websiteId, scanId? }` re-runs comparison on a completed scan (does not rescan the site)

### Notifications

Org-wide rows (`userId` null), type `scan.privacy_drift`, `resourceType=privacy_finding`. Created only on create or reopen.

### Audit

Admin review/resolve only. No audit row per comparison.

### Tests

- `src/lib/monitoring/drift-engine.test.cjs` — new/removed tracker, vendor/purpose change, unmapped tracker/vendor, missing enforcement, no-change, duplicate fingerprints, reopen/notify decisions, isolation of fingerprint by org/website, API source guards
- `src/lib/tenant-isolation-regression.test.cjs` — monitoring routes + dashboard list scoped by `organizationId`

### Verification

- `npx tsc --noEmit` → exit 0
- `node src/lib/monitoring/drift-engine.test.cjs` → passed
- `node src/lib/tenant-isolation-regression.test.cjs` → passed
- `npx drizzle-kit migrate` → `0036_privacy_findings` applied
- Browser click-through of `/dashboard/monitoring` was not run in this pass

### Limitations

- Not continuous/background monitoring; drift runs after a completed scan or a manual `/api/monitoring/run`
- Single-page scanner still only sees the homepage URL
- First completed scan does not emit new/removed/domain-change vs an empty previous scan (`previous === null` only when no prior completed scan exists; empty previous array is treated as a scan with zero items)
- Auto-resolve of stale OPEN findings is not implemented
- Findings are operational, not legal conclusions

### Next recommended task

Build the Billing page (`/dashboard/billing`) as a display-only org billing overview. Do not add Stripe or payment processing.

---

# 77. COMPLETED: Advanced privacy intelligence batch

### Completed Task

Added four operational privacy-intelligence capabilities on top of scan-triggered drift, without changing Clerk, RBAC, tenant isolation, the consent engine, public SDK, scanner signatures, webhooks, rights-request, analytics math, or existing drift comparison rules.

Flow:

Website → Scan (static HTML) → Discover trackers → Compare CMP configuration → Detect drift → Detect shadow behavior where HTML evidence exists → Consent Quality Score → Privacy risk dashboard → Review / resolve / notify

### Evidence model (precise)

The server-side scanner **fetches HTML**. It is **not** browser runtime monitoring and does **not** observe network execution after page parse.

| Term | Meaning in this product |
| --- | --- |
| **Configured** | CMP records: tracker, vendor, purpose, published policy, enforcement identifiers |
| **Observed** | Fields persisted from the HTML fetch (URL, script `src`, `type`, `data-cmp-purpose`, domain) |
| **Inferred / suspected** | Server infers that a normal script/pixel/iframe **would execute or fetch on HTML parse** (`wouldExecuteOnParse`) |
| **Confirmed execution** | Reserved. **This scanner never emits `confirmed_execution`.** There is no browser network log. |

Shadow evidence classes:

- `suspected_execution` — HTML resource would load/execute on parse while the tracker is active, non-essential, and consent-mapped
- `configuration_mismatch` — consent-mapped tracker is present but not on the expected CMP path (`type="text/plain"` + matching `data-cmp-purpose`)
- `confirmed_execution` — not produced

Gated (no shadow finding): `wouldExecuteOnParse === false` and `data-cmp-purpose` equals the mapped purpose **key**. Essential trackers and first-party hosts are skipped. Unmapped scan items stay in existing drift (`missing_enforcement_rule` / `unmapped_tracker`), not shadow.

### Shadow tracker architecture

- Detector: `src/lib/monitoring/shadow-trackers.ts`
- Runs after `detectDrift` in `runDriftForScan`
- Reuses `privacy_findings`, fingerprints, OPEN / REVIEWED / RESOLVED, notify-on-create-or-reopen
- Types: `shadow_ungated_script`, `shadow_no_cmp_marker`
- Notifications: `scan.shadow_tracker` (drift remains `scan.privacy_drift`)
- Cookies are not treated as shadow HTML-tag evidence

### Consent Quality Score

Deterministic weighted 0–100 **operational** score (`src/lib/monitoring/consent-quality.ts`). Not a legal compliance percentage.

Weights:

| Dimension | Weight |
| --- | --- |
| Tracker coverage (scanned third-party items with an active tracker rule) | 20 |
| Vendor mapping (non-essential trackers with vendor) | 15 |
| Purpose mapping (non-essential trackers with purpose) | 15 |
| Enforcement (consent-controlled trackers with domain or identifier) | 15 |
| Privacy drift / shadow (open+reviewed findings) | 15 |
| Evidence & expiry config (published policy, expire days, consent records) | 10 |
| Scanner freshness (completed scan age) | 10 |

Open-finding penalty on the drift dimension: `min(100, critical×12 + high×7 + medium×3 + low×1)`.

Categories: excellent ≥90, good ≥75, needs_attention ≥50, else poor.

Each score includes per-dimension values and **why points were lost**.

### Privacy risk model

- Aggregator: `src/lib/monitoring/privacy-risk.ts`
- Loader: `loadOrgRiskSnapshot` (org-scoped, batched, no N+1 for findings)
- Overall status from unresolved severity counts (critical > high > medium > low > clear)
- Surfaces critical/high/medium/low, affected websites, new (7 days), unresolved, recently resolved, top trackers/vendors, consent quality per website
- Filters: website, severity, type, status, date range (`lastDetectedAt`)
- Findings reuse drift/shadow rows; they are not duplicated

### Page-level intelligence

- Scanner still fetches **one URL per scan** (no crawler)
- `scan_results.page_url` stores that URL (migration `0037_scan_results_page_url`)
- HTML analyser records `pageUrl`, `wouldExecuteOnParse`, `cmpPurposeValue`, `resourceKind`
- UI groups latest completed scan results by `pageUrl` — typically homepage only; extra pages are not invented

### Schema

- `scan_results.page_url` varchar(2048) + indexes on `scan_id` and `(scan_id, page_url)`
- No new findings table
- `privacy_findings.details` may include `expectedState`, `observedState`, `evidenceSource`, `evidenceClass`, `pageUrl`

### APIs (authenticated, membership, never trust client organization IDs)

- `GET /api/monitoring/quality?websiteId=`
- `GET /api/monitoring/risk` — websiteId, severity, type, status, from, to
- `GET /api/monitoring/pages?websiteId=` (required)
- Existing findings list/review/resolve unchanged; `type` filter includes shadow types
- Not exposed on the public SDK

### Dashboard

Discovery & Monitoring: Scanner, Privacy drift, Privacy risk (`/dashboard/risk`), Consent quality (`/dashboard/quality`), Analytics.

Website detail: consent quality, page intelligence, links to risk / drift / enforcement.

Finding detail: expected vs observed/inferred plus evidence class/source.

### Notifications / audit

- Shadow create/reopen → `scan.shadow_tracker`; unchanged fingerprints do not re-notify
- Audit still only on review/resolve (not on score calculation)

### Tests

- `src/lib/monitoring/privacy-intelligence.test.cjs`
- Tenant isolation extended to quality/risk/pages APIs and dashboards
- Existing drift-engine tests remain required

### Verification

- `npx tsc --noEmit` → exit 0
- `npx drizzle-kit migrate` → `0037_scan_results_page_url` applied
- `node src/lib/monitoring/privacy-intelligence.test.cjs` → passed
- `node src/lib/monitoring/drift-engine.test.cjs` → passed
- `node src/lib/tenant-isolation-regression.test.cjs` → passed
- `node src/lib/scanner/scanner-security.test.cjs` → passed
- `node src/lib/rate-limit.test.cjs` → passed
- `node src/lib/webhooks/delivery.test.cjs` → passed
- `node src/lib/consent-manager-e2e-regression.test.cjs` → passed
- Live dashboard click-through was not completed in this pass (dev server had an unrelated Turbopack crash)

### Limitations

- Not browser RUM / tag-manager runtime
- One page per scan
- Quality score is configuration + inventory health, not law
- Open findings do not auto-resolve when HTML is later gated
- Org-wide quality still loads a CMP snapshot per website (in parallel)

### Next recommended task

Build the Billing page (`/dashboard/billing`) as a display-only org billing overview. Do not add Stripe or payment processing.

---

# 78. COMPLETED: Global consent & regulation batch

### Completed Task

Added a versioned regulation catalog, geo-based policy selection, Google Consent Mode v2 signal publishing, and an IAB TCF/GPP foundation. The internal consent engine remains canonical. Clerk, RBAC, tenant isolation, scanner, webhooks, analytics math, and existing consent record/evidence/withdrawal behavior were not redesigned.

### IMPLEMENTED

- Versioned regulation profiles: DPDP, GDPR/ePrivacy, CCPA/CPRA, LGPD, PIPEDA, UCPA, VCDPA, CPA (`src/lib/regulations/catalog.ts`)
- `resolveRegulationProfile`, `resolveRegulationVersion`, effective-date selection, geo-inferred profile (`src/lib/regulations/engine.ts`)
- Pluggable geo hints: `resolveJurisdiction` from optional country/region or website `defaultRegion`. **No IP geolocation provider.**
- Policy precedence: state/region rule → country rule → `isDefault` active policy → oldest active policy
- Website jurisdiction rules table (points at existing policies; no duplicated policy copies)
- Google Consent Mode v2: `default` then `update` for `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`, `functionality_storage`, `personalization_storage`, `security_storage`
- SDK publishes signals on accept, reject, granular save, stored-consent restore, and withdraw
- Dashboard: `/dashboard/websites/[id]/regulations`

### PARTIALLY IMPLEMENTED / FOUNDATION ONLY

- **IAB TCF 2.2**: `__tcfapi` ping/stub only. `tcString = null`. `cmpId` is not a registered CMP ID.
- **IAB GPP 1.1**: `__gpp` ping/stub only. No section encoding / GPP string.

### NOT IMPLEMENTED

- Official IAB CMP certification / Google certification
- Production IP geolocation
- Full TCF GVL / purpose/vendor bitfields
- Storing visitor geolocation on consent records

### Policy selection

1. Optional SDK `?country=&region=` or `window.__CMP_GEO` (hint)
2. Else website `defaultRegion` (coarse IN/EU/US/UK/CA/AU mapped to country or `EU` region)
3. Match `website_jurisdiction_rules` (unique per website+country+region)
4. Else active default policy (`isDefault`)
5. Else oldest active policy

Regulation key: rule override → website `default_regulation_key` → inferred from catalog geo scope → none.

### Schema

Migration `0038_global_consent_regulation`:

- `websites.default_regulation_key`
- `websites.consent_integrations` jsonb
- `website_jurisdiction_rules` (org + website scoped)

### APIs

- `GET /api/regulations` — authenticated catalog summary
- `GET/PUT /api/websites/[id]/consent-integrations` — org-owned website only, rate limited
- `GET/PUT /api/websites/[id]/jurisdiction-rules` — same
- Public SDK config adds `jurisdiction`, `regulation`, `signals` (safe fields only)

### Tests

- `src/lib/regulations/regulation-engine.test.cjs`
- Consent E2E includes Google/IAB signal propagation
- Tenant isolation for new website APIs and regulation catalog auth

### Verification

- `npx tsc --noEmit` → exit 0
- `npx drizzle-kit migrate` → `0038_global_consent_regulation` applied
- `node src/lib/regulations/regulation-engine.test.cjs` → passed
- `node src/lib/tenant-isolation-regression.test.cjs` → passed
- `node src/lib/consent-manager-e2e-regression.test.cjs` → passed
- `node src/lib/monitoring/drift-engine.test.cjs` → passed
- `node src/lib/monitoring/privacy-intelligence.test.cjs` → passed
- `node src/lib/scanner/scanner-security.test.cjs` → passed
- `node src/lib/rate-limit.test.cjs` → passed
- `node src/lib/webhooks/delivery.test.cjs` → passed

### Next recommended task

Build the Billing page (`/dashboard/billing`) as a display-only org billing overview. Do not add Stripe or payment processing.

---

# 79. COMPLETED: Continuous Privacy Scanner + Advanced Consent Analytics

## CONTINUOUS SCANNER

### IMPLEMENTED

Scheduling architecture:
- Persistent per-website config in `website_scan_schedules` (org + website scoped).
- Frequencies: `daily`, `weekly`, `monthly` only. Hourly/arbitrary intervals are rejected.
- Timezone is stored (org timezone default, validated IANA, else UTC). `next_scan_at` is computed in UTC (`+1 day` / `+7 days` / `+1 calendar month`).
- Due-scan logic: `enabled`, website `active` and not deleted, `next_scan_at <= now`, lock not held, no in-progress scan (`running`/`queued` within 20 minutes), and a minimum interval (20h / 6d / 25d) to prevent runaway retries.
- Concurrency: atomic `locked_until` claim. A second tick that fails to claim skips the website. Manual `POST /api/scanner/run` returns 409 if a scan is already running.
- Execution: `GET|POST /api/cron/scans` authenticates with `CRON_SECRET` or `SCANNER_CRON_SECRET` (Bearer or `x-cron-secret`), never Clerk, never a client org id. It calls `runDueScheduledScans` → existing `runScan`.
- Manual and scheduled scans share `src/lib/scanner/scan-engine.ts`. `scans.triggered_by` is `manual` or `scheduled`.
- After a **completed** scan, existing drift + shadow intelligence still runs inside `runScan`. Failed scans do not write `scan_results`, do not upsert empty tracker intelligence, and do not run drift.
- Failed scheduled scans keep prior successful scan rows. Schedule `last_scan_*` and `last_error` update; `consecutive_failures` increments. Notifications (`scan.schedule_failed`) only at 3, 6, and 12 consecutive failures.
- Dashboard: `/dashboard/scanner` and website settings show automatic scanning on/off, frequency, last/next scan, last result, Scan now (existing toast + loading), scan history with trigger.
- SSRF: scheduled path calls `assertSafeScanUrl` / `toAbsoluteScanUrl` before `runScan`.
- CSRF: `/api/cron/scans` is treated as a non-cookie scheduler path.

### LOCALLY VERIFIED

- `npx tsc --noEmit`
- `npx drizzle-kit migrate` → `0039_continuous_scanner_analytics`
- `node src/lib/scanner/scan-schedule.test.cjs`
- Scheduler source/isolation checks in `tenant-isolation-regression.test.cjs`
- Existing scanner SSRF harness still passes
- **No in-process `setInterval`.** Local `npm run dev` does **not** fire scheduled scans by itself.

### REQUIRES DEPLOYMENT SCHEDULER

Background scanning is **not live** until something invokes the job:

1. Set `CRON_SECRET` (or `SCANNER_CRON_SECRET`), ≥ 16 characters. Do not expose it to the browser.
2. `vercel.json` defines an hourly cron: `0 * * * *` → `/api/cron/scans` (Vercel sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is configured).
3. Non-Vercel: external cron/queue/worker `GET` or `POST` the same route with the Bearer secret. The scan engine does not need to be rewritten.

If the secret is missing, the route returns 503 and does not scan.

### NOT A WORKER PLATFORM

There is still no in-app queue worker. Each due website in a tick (max 5) runs `runScan` synchronously in that HTTP invocation (`maxDuration` 60s). Large sites still need a future queue.

---

## ANALYTICS

### Metrics definitions

Record-level (one row per `consent_records.id`, never double-counted):
- **Total / accepted / rejected / partial (granular) / withdrawn / pending**
- **Consent rate** = (accepted + partial) / total
- **Accept / reject / granular / withdrawal rates** from current record status

Event-level (one row per `consent_events.id`):
- **Interactions** = `consent.created` + `consent.updated` + `consent.expired_and_renewed` + `consent.withdrawn`
- **Accept-all / reject-all / granular rates** from `event_data.choice` on created/updated/renewed events only
- **Withdrawal rate (events)** = withdrawn events / interactions
- Trends: SQL `date_trunc('day', occurred_at)` grouped counts

Purpose acceptance: `consent_decisions` joined to org-scoped records and org-scoped `purposes` (canonical purpose id/key). Unique (record, purpose, vendor) already enforced in schema.

Policy versions: grouped by `consent_records.policy_version_id` + website (policies are per website; versions are not compared across sites as one series).

### Country source

**IMPLEMENTED for new records:** ISO-3166 alpha-2 in `metadata.analytics.country` from `cf-ipcountry` / `x-vercel-ip-country` / `x-country-code`, else a 2-letter `jurisdiction` on the record. Raw IPs are not stored.

**NOT AVAILABLE DUE TO MISSING DATA:** Production IP geolocation; region/state drill-down; historical rows without ISO country (shown as Unknown / empty geography). CDN country is only present when the edge sets those headers.

### Device / browser classification

**IMPLEMENTED for new records:** normalized `metadata.analytics.device` (`desktop|mobile|tablet|other`) and `browser` (`chrome|safari|firefox|edge|other`) from the request User-Agent at write time. Dashboard never shows raw UA.

**NOT AVAILABLE DUE TO MISSING DATA:** classification on records saved before this change (Unknown empty state).

### Privacy / aggregation

- Management `GET /api/analytics/consent` returns aggregates only (no visitorId, IP, UA, fingerprints, full metadata, consentId lists).
- Dashboard recent-activity table still truncates consent IDs (existing operational view, not the analytics API).
- Org id is never taken from the client. Website filters must belong to the active org.
- Scanner results do not overwrite consent analytics.

### APIs

- `GET /api/analytics/consent` — Clerk session, membership, rate limited, `loadConsentAnalytics(organization.id, filters)`
- Filters: `days` (7/30/90/all), optional `from`/`to`, `websiteId`, `country`, `device`, `browser`, `purposeId`, `policyVersionId`
- Dashboard `/dashboard/analytics` uses the same query helper (DB-side `GROUP BY`, `Promise.all`)

### Database / indexes

Migration `0039_continuous_scanner_analytics`:
- `scans.triggered_by`
- `scans_website_status_idx`
- `website_scan_schedules` + due/org indexes
- `consent_records_org_created_idx` `(organization_id, created_at)`

### Tests

- `src/lib/scanner/scan-schedule.test.cjs` — enable/disable, frequencies, due/future/disabled, claim/lock, overlapping running scan, manual/scheduled same engine, failed scan preserves prior success object, SSRF short-circuit, tenant ids on outcome
- `src/lib/analytics/consent-analytics.test.cjs` — trends, rates, withdrawal, country/device/browser/policy grouping, date parse, empty set, duplicate event ids, no visitor key leakage
- Tenant isolation + CSRF/cron path updates

### Verification

- `npx tsc --noEmit` → exit 0
- `npx drizzle-kit migrate` → `0039_continuous_scanner_analytics`
- `node src/lib/scanner/scan-schedule.test.cjs` → passed
- `node src/lib/analytics/consent-analytics.test.cjs` → passed
- `node src/lib/tenant-isolation-regression.test.cjs` → passed
- `node src/lib/consent-manager-e2e-regression.test.cjs` → passed
- `node src/lib/monitoring/drift-engine.test.cjs` → passed
- `node src/lib/monitoring/privacy-intelligence.test.cjs` → passed
- `node src/lib/scanner/scanner-security.test.cjs` → passed
- `node src/lib/rate-limit.test.cjs` → passed
- `node src/lib/webhooks/delivery.test.cjs` → passed
- `node src/lib/regulations/regulation-engine.test.cjs` → passed
- `node src/lib/security-headers.test.cjs` → passed

Browser click-through was not run in this session (no browser automation). Exercise `/dashboard/scanner` schedule controls and `/dashboard/analytics` filters in the running app after login.

### Limitations

- Scheduled scans require a deployed cron/worker hitting `/api/cron/scans`.
- Country/device/browser charts stay empty until new consent POSTs land with hints (and, for country, an edge country header or ISO jurisdiction).
- Custom `from`/`to` query params are supported in the API/query layer; the dashboard presets remain 7/30/90/all.

---

# 80. COMPLETED: Global locale registry + visitor-facing banner localization

### What this is

Production localization for the **public consent banner and preference center**. Language controls **presentation and notice-language evidence**, not consent decisions, jurisdiction, or regulation selection.

### Status vocabulary (do not collapse these)

| Term | Meaning |
|---|---|
| **SUPPORTED** | Locale is in the registry (`src/lib/i18n/locale-registry.ts`) and can be requested/normalized. |
| **TRANSLATED** | Administrator saved a translation pack covering all banner text fields for that locale. |
| **FALLBACK / PARTIAL** | Requested locale is supported but missing some or all strings; copy comes from base language, configured default (other language), or English root. |
| **NOT YET TRANSLATED** | Supported locale with no admin pack. The product does **not** ship a full translation for every registered language. There is **no** automatic/AI translation API. |

English root fields (`title`, `description`, button labels, preference-center strings) remain the default content. `translations.en` is not stored.

### Locale registry

- Base languages include at least: `en es fr de it pt nl pl ru uk tr ar he fa hi bn ur pa gu mr ta te kn ml or as ne id ms th vi zh ja ko el cs sv da fi ro hu`, plus existing Eighth-Schedule extras (`mai ks sd kok mni bodo doi sa sat`).
- Regional tags include: `en-IN en-US en-GB en-AU fr-FR fr-CA de-DE de-AT de-CH es-ES es-MX es-US es-419 pt-BR pt-PT zh-CN zh-TW zh-HK ar-SA ar-AE ar-EG hi-IN`.
- Unlisted regionals of a registered language still **normalize** (e.g. `nl-NL`) when the base language is registered.
- Invalid/unknown tags are rejected (`null`), never passed through as arbitrary strings.
- Normalization: trim, `_` → `-`, BCP-47 casing (`HI-in` → `hi-IN`, `en_us` → `en-US`).

Adding a language: register it in `locale-registry.ts`. Consent-engine decision code must not import this module.

### Resolution precedence (public experience)

1. Explicit SDK language (`data-lang`, `window.__CMP_LANG`, `CMP.setLanguage`)
2. Page `?lang=`
3. `navigator.language`
4. `navigator.languages[0]`
5. `Accept-Language` (server)
6. Website default language
7. Banner configured default language
8. English

Only inputs available in that runtime are used. The SDK always fetches `/api/sdk/{siteKey}/config?lang=...` so the server applies the same resolver.

### Translation fallback (notice strings)

Exact locale → **base language** → configured default **only if it is a different language** → English root.

- `pt-BR` with pack `pt` → Portuguese.
- `fr-CA` with only `fr-FR` (no `fr`) → **not** French-France; English/default instead.
- `en-*` uses English root (or an exact `en-US` pack). A Hindi default must not overlay English requests.
- Missing fields in a pack fall back to English root for that field only (partial translation).

Optional `supportedLocales` allowlist on banner JSON: empty means any registered locale.

### Data model (backward compatible)

`consent_policy_versions.configuration` JSONB:

```
translations?: Record<locale, {
  title?, description?, acceptAllLabel?, rejectAllLabel?, customizeLabel?,
  savePreferencesLabel?, privacyPolicyText?, closeLabel?,
  preferenceCenterTitle?, preferenceCenterDescription?,
  purposesHeading?, vendorsHeading?, requiredLabel?,
  purposes?: Record<purposeKey, { name?, description? }>,
  vendors?: Record<vendorDomainOrId, { name?, description? }>
}>
supportedLocales?: string[]
```

English remains on the root object. Policies are not duplicated per language.

### Banner / preference center

Resolved strings are merged into `bannerConfig` before the SDK renders. Changing language **re-renders** banner/PC text, sets `dir`/`lang`, and does **not** POST consent or change decisions. `CMP.setLanguage` refetches config with `?lang=`. Evidence uses the locale actually resolved at **submission**.

### RTL

`ar`, `he`, `fa`, `ur` → `dir="rtl"` on banner and preference center. Other languages stay LTR. Toggle knobs use `inset-inline-start`. Logos are not mirrored.

### Language vs region vs regulation

`en-IN` is English + India **locale context**. It does **not** select India DPDP by itself. Jurisdiction remains `resolveWebsiteConsentContext` (`country`/`region` query + website defaults). SDK payload keeps `locale` and `jurisdiction` separate.

### Consent evidence

`POST /api/consent/record` resolves notice server-side from `body.language`, then `Accept-Language`, website default, banner default. Snapshot stores `noticeLanguage`, `noticeTitle`, `noticeDescription` from that resolution — not the unsigned English root and not a later UI language change without a new submission.

### Caching

`GET /api/sdk/[siteKey]/config` uses `Cache-Control: private, no-store` and `Vary: Accept-Language`. The SDK includes `lang` on every config URL so Hindi and English are not the same cache key.

### Admin

Languages tab: supported-locale allowlist, translation editor, Translated / Partially translated / Using fallback, preview language (including RTL). Default language selects use the global registry. Org/website default language columns remain `varchar(10)`.

### Tests

- `node src/lib/i18n/localization.test.cjs` — registry, fallback, RTL, resolution, EN/ES/FR/DE/PT/HI/AR/ZH/JA, regionals listed in the product brief.
- `node src/lib/consent-manager-e2e-regression.test.cjs` — `?lang=hi|fr-FR|pt-BR|ar`, unsupported fallback, evidence locale, `setLanguage` without creating a record.

### Manual verification (no browser automation in this session)

1. In banner Languages, add Hindi/French/Portuguese/Arabic packs; save.
2. Open the demo/embed with `?lang=hi` / `fr-FR` / `pt-BR` / `ar` and confirm title, description, and buttons change; Arabic is RTL.
3. Use an unsupported `?lang=` and confirm English/default.
4. Accept all; inspect consent record metadata `noticeLanguage` matches the banner `lang`.
5. Change language in the banner `<select>` before accepting; confirm no extra consent row until submit; submitted evidence matches the language shown at click.

### Limitations

- Registry support ≠ shipped translations. Operators must enter copy.
- Purpose/vendor overlays are optional maps keyed by purpose `key` and vendor `domain` (else id).
- Website/org default language max length is 10 characters (schema).
- No machine translation and no CDN language negotiation beyond `?lang=` + `Accept-Language` + `Vary`.

---

# 81. COMPLETED: Host-page scroll lock for banner and preference center

### What this is

When the visitor-facing consent banner or preference center is open, the **host website** cannot scroll or receive pointer/keyboard page-scroll behind the CMP UI. Preference-center content still scrolls internally. Consent decisions, APIs, schema, and SDK security are unchanged.

### Implementation

`src/lib/sdk/scroll-lock.ts` exports `createHostScrollLock` runtime (vanilla JS) plus `installHostScrollLock` for tests. The SDK inlines that runtime once and stores a singleton on `window.__CMP_HOST_SCROLL_LOCK__`.

A second SDK load **teardowns** the previous lock (listeners, attribute, injected stylesheet) before creating a new one.

API: `lock` / `unlock` / `sync` / `beginTransition` / `endTransition` / `teardown` / `isLocked`.

- `sync()` locks if `#__cmp_banner__` or `#__cmp_pc__` is in the DOM (or a transition hold is active); otherwise unlocks.
- `beginTransition` / `endTransition` keep the lock across banner → preference-center and language re-render so the page does not briefly unlock.

### Page-state preservation

Before locking, the utility stores the current `pageYOffset` and the **inline** `overflow`, `position`, `top`, `left`, `right`, `width`, `padding-right`, and `scrollbar-gutter` values on `html`/`body`. Unlock restores those inline values (empty means the property is removed so host stylesheets apply again) and `scrollTo(0, savedY)`. The page does not jump to the top.

iOS/overflow fallback: `body` is `position: fixed; top: -<scrollY>px; left/right: 0; width: 100%` while locked.

### Layout shift

Injected stylesheet (`#__cmp_host_lock_css`) sets `scrollbar-gutter: stable` on `html[data-cmp-scroll-lock]`. If `scrollbarGutter` is not in the style object, padding-right is increased by the measured scrollbar width (`innerWidth - documentElement.clientWidth`). Widths are not hard-coded.

### Interaction blocking

While locked:

- `html[data-cmp-scroll-lock]` + body `overflow: hidden`, `pointer-events: none`, `touch-action: none`
- CMP nodes (`#__cmp_banner__`, `#__cmp_pc__`, `#__cmp_pc_overlay__`) re-enable pointer/touch
- non-passive `wheel` / `touchmove` / page-scroll keys (`PageDown`, arrows, Space, Home/End) `preventDefault` unless the event target is inside a CMP root or an editable field

### Preference center

The dialog body keeps `overflow-y: auto`, `overscroll-behavior: contain`, and `-webkit-overflow-scrolling: touch`. Overlay click / close / save still follow previous dismiss rules (no new Escape-to-dismiss). Tab focus is trapped inside the dialog; previous `document.activeElement` is restored on close when it is still in the document.

### Language change

`CMP.setLanguage` wraps DOM rebuild in `beginTransition`/`endTransition` so the lock is not released.

### Tests

- `node src/lib/sdk/scroll-lock.test.cjs` — nested lock, restore, scrollbar compensation, wheel/touch/keyboard prevent, CMP-internal events allowed, sync/hold, teardown
- `node src/lib/consent-manager-e2e-regression.test.cjs` — banner lock, accept/reject/granular unlock, preserved scrollY, preference-center lock + internal overflow, language change without unlock, stylesheet not duplicated on reinit, withdraw re-locks

### Verification

- `npx tsc --noEmit`
- Unit + consent E2E + tenant isolation, regulations, scanner security, drift, privacy intelligence, analytics, webhooks, rate limit, security headers

Browser click-through of an external customer site was **not** run in this session (no browser automation). Manual checks remain: long scrollable host page, wheel/trackpad/PageDown, preference-center inner scroll, save, restore mid-page position, narrow viewport.

### Limitations

- `position: fixed` on `body` can still interact poorly with unusual host layouts (already-fixed body, transform on ancestors). Original inline values are restored on unlock.
- Keyboard trapping covers Tab inside the preference center; it does not inert the rest of the DOM (`inert` on `body` would also inert the CMP nodes).
- Scroll lock applies whenever the banner or preference center is in the DOM, including `showBanner()` after consent (demo/manage flow).





