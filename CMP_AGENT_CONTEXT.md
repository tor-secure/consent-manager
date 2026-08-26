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

Banner configuration: COMPLETE

Webhooks: COMPLETE

Integrations: COMPLETE

Organization settings: COMPLETE

API Keys: COMPLETE

Notifications: COMPLETE

Audit logs: COMPLETE

Trackers module: COMPLETE

Vendors management: COMPLETE

Purposes management: COMPLETE

Consent policy management: COMPLETE

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
11. SDK installation
12. Consent collection
13. Consent records
14. Consent events
15. Analytics
16. ~~Trackers display~~ COMPLETE (org list + per-website list)
17. Scanner automation
18. ~~Audit logs~~ COMPLETE
19. ~~Integrations~~ COMPLETE
20. ~~Webhooks~~ COMPLETE
21. ~~Notifications~~ COMPLETE
22. ~~API Keys~~ COMPLETE
23. ~~Organization Settings~~ COMPLETE
24. Billing

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

# 22. CURRENT TASK

### Task

Build the Billing page.

The next agent must:

- Read this file first.
- Inspect `src/db/schema/plans.ts`, `src/db/schema/subscriptions.ts`, `src/db/schema/subscription-usage.ts`, and `src/db/schema/invoices.ts`.
- Build `/dashboard/billing` as an org-scoped billing overview page.
- Display: current plan name and features, subscription status, billing period, next renewal date, usage metrics from `subscription_usage`, and recent invoices from `invoices` (amount, status, date, download placeholder).
- Do not implement payment processing, Stripe integration, or plan upgrades yet — this is display only.
- All queries must be scoped to the active organization.
- Keep Clerk authentication/bootstrap unchanged.
- Keep database schema unchanged.
- Do not add new npm dependencies.
- Run typecheck.
- Update this file before stopping.

---

# 23. Prompt Template

Use small prompts.

Example:

"Read CMP_AGENT_CONTEXT.md first. Work only on the current task described in the file. Inspect existing code before changing it. Preserve the existing Clerk, Drizzle, PostgreSQL, and tenant-isolation architecture. Make the smallest necessary change. Run the relevant typecheck/build. Update CMP_AGENT_CONTEXT.md with the completed work, changed files, verification result, and next task. Stop when the task is complete."

---

# 24. Definition of Done

A task is complete only when:

- The requested feature works.
- Existing functionality still works.
- Tenant isolation remains intact.
- No unnecessary schema changes were made.
- Authentication remains intact.
- Relevant checks pass.
- The agent context file is updated.
- The next task is clearly recorded.