# ConsentFlow Operator Guide

**Product:** ConsentFlow Consent Management Platform  
**Audience:** site owners, privacy operators, and developers  
**Version:** September 2026

This guide walks every item in the left sidebar, plus website sub-pages, tracker blocking, purpose/policy templates, and the regulation profiles (DPDP, GDPR, CCPA, and others). It describes **what this product does**, not what the law requires.

> This is an operations manual. It is not legal advice and not a DPDP, GDPR, UK GDPR, CCPA/CPRA, LGPD, or other compliance certification.

---

## Contents

1. [What ConsentFlow does](#1-what-consentflow-does)
2. [Sign in, organization, and the sidebar](#2-sign-in-organization-and-the-sidebar)
3. [Get live path](#3-get-live-path)
4. [Dashboard home](#4-dashboard-home)
5. [Websites](#5-websites)
6. [Website regulations, enforcement, and child protection](#6-website-regulations-enforcement-and-child-protection)
7. [Consent records](#7-consent-records)
8. [Policies, Banner Studio, and publish](#8-policies-banner-studio-and-publish)
9. [Purposes](#9-purposes)
10. [Vendors](#10-vendors)
11. [Transfers](#11-transfers)
12. [Trackers](#12-trackers)
13. [Tracker blocking](#13-tracker-blocking)
14. [Scanner](#14-scanner)
15. [Privacy drift](#15-privacy-drift)
16. [Privacy risk](#16-privacy-risk)
17. [Consent quality](#17-consent-quality)
18. [Analytics](#18-analytics)
19. [Intelligence tools](#19-intelligence-tools)
20. [Audit logs, notifications, and privacy rights](#20-audit-logs-notifications-and-privacy-rights)
21. [Developer: SDK, API keys, integrations, webhooks](#21-developer-sdk-api-keys-integrations-webhooks)
22. [Administration](#22-administration)
23. [Templates](#23-templates)
24. [DPDP, GDPR, CCPA, and other acts](#24-dpdp-gdpr-ccpa-and-other-acts)
25. [Publish rules in plain language](#25-publish-rules-in-plain-language)
26. [If something fails](#26-if-something-fails)

---

## 1. What ConsentFlow does

### What it is

A multi-tenant consent management platform (CMP). You configure websites, purposes, vendors, and a policy in the dashboard. A script on your site shows a banner, records the visitor’s choice on the server, and keeps optional trackers blocked until that choice is confirmed.

### What it does

| In the dashboard | On the website |
|---|---|
| Websites, purposes, vendors, policies, Banner Studio, publish | Consent banner and preference center |
| Installation snippet and site key | CMP script in `<head>` |
| Tracker mapping and scans | Optional scripts stay inert until consent |
| Consent and rights-request pages | Choice stored, withdrawable, with evidence |

### How to use

Follow the Get live path in chapter 3. Do not paste the SDK snippet until a policy version is **published**.

### When it blocks / common mistakes

- A **draft** policy does not serve a banner. The public config API returns 404 until a version is published.
- Old vendors with role **unknown** block publish. Set a real role and save.
- Unmapped optional trackers block publish (`TRACKER_UNMAPPED`).

---

## 2. Sign in, organization, and the sidebar

### What it is

Clerk authenticates you. PostgreSQL stores your organization, websites, and policies. The navy left sidebar is the product map.

### What it does

After sign-in you must have an **active organization**. The header organization switcher chooses the workspace. Every list (purposes, vendors, policies) is scoped to that organization.

Sidebar groups:

| Group | Links |
|---|---|
| Overview | Dashboard (Get live strip + consent totals) |
| Websites | Websites (create, install, settings) |
| Consent Management | Consent, Policies, Purposes, Vendors, Transfers, Trackers |
| Discovery & Monitoring | Scanner, Privacy drift, Privacy risk, Consent quality, Analytics |
| Intelligence | Firewall, simulator, experiments, graph, recommendations, data flow, cross-domain, autopilot, digital twin, ROI, negotiation, agent permissioning, data redaction |
| Security & Governance | Audit logs, Notifications, Privacy Rights |
| Developer | API keys & SDK, Integrations, Webhooks |
| Administration | Organization settings, Data retention, Team & roles |

Website pages that are **not** in the sidebar: Installation, Regulations, Enforcement, Child protection, Website settings. Open them from a website’s detail page.

### How to use

1. Open the app and sign in.
2. Create an organization if you have none, or pick one in the header.
3. Use the sidebar for day-to-day work. Collapse groups you do not need; Intelligence is secondary until you are live.

### When it blocks / common mistakes

- “No active organization selected” on create APIs: pick an org in the header.
- Blank dashboard after login: finish organization bootstrap / switcher.

---

## 3. Get live path

### What it is

The only sequence that produces a live banner.

### What it does

Website → Purposes → Vendors (set Role) → Policy → Banner Studio (title, description, privacy URL) → Publish → Installation snippet in `<head>` → visitor sees the banner.

### How to use

1. **Websites → Add website.** Note the site key.
2. **Purposes → Create** (or use a template). Every purpose needs a visitor-facing description and a lawful basis.
3. **Vendors → Create.** Set **Role** (not unknown) and a privacy policy URL. Processor/subprocessor needs a DPA status other than `not_configured` on GDPR-style sites.
4. **Policies → New.** Pick a website and a template (or custom). Attach purposes. Link vendors to those purposes.
5. Open the policy → **Banner Studio**. Set title, description, privacy URL.
6. On the policy page, wait until the compliance panel is green, then **Publish**.
7. **Websites → [site] → Installation.** Confirm it says a published policy is live. Copy the snippet into `<head>` **before** GTM, gtag, and other tags.
8. Open the live site in a private window. Accept / Reject / Customize.

The home dashboard **Get live** strip shows which of these steps are done.

### When it blocks / common mistakes

- Snippet installed but no published version → no banner (config 404).
- Publish 422 → read the **rule ID** on the policy page and follow the deep link. Do not disable the validator.

---

## 4. Dashboard home

**Path:** `/dashboard`

### What it is

Workspace overview: Get live steps, consent totals, 30-day trend, purpose mix, recent records.

### What it does

Shows whether you have a website, purposes, a policy, a published version, and any consent records. It does not publish or change live enforcement.

### How to use

1. After login, read the **Get live** cards. Incomplete steps link to the next page.
2. Use the metric cards once the SDK is collecting records.
3. Open **Consent** for a single record, **Analytics** for filters.

### When it blocks / common mistakes

Empty charts mean no published policy or no snippet yet — not a broken dashboard.

---

## 5. Websites

**Path:** `/dashboard/websites`

### What it is

Each registered domain gets a **site key**. The SDK and config API use that key.

### What it does

Stores name, domain, default language/region, and links to Installation, Regulations, Enforcement, Child protection, and Settings.

### How to use

1. **Add website.** Name, domain (host only, no `https://`), language (`en`), region (`IN`, `EU`, `US`, `UK`, `AU`, `CA` for Canada).
2. Open the site. Copy the site key.
3. Use **Installation** after you publish a policy.
4. Use **Settings** to change language/region later.

### When it blocks / common mistakes

- Region `CA` in this product is **Canada**, not California. California is `US` plus a California-applicable regulation / visitor geo. Do not treat website region `CA` as CCPA.
- You can create many websites per organization. Portable consent and A/B tests are per website.

---

## 6. Website regulations, enforcement, and child protection

These open from a website, not from the main sidebar.

### 6.1 Regulations — `/dashboard/websites/[id]/regulations`

**What it is.** Default regulation profile, country/region jurisdiction rules, Google Consent Mode, IAB TCF/GPP, unknown-tracker behavior.

**What it does.** When the SDK asks for config (optionally with a country hint), the server picks a legal profile and policy. This is **not** IP geolocation. Hints come from `?country=`, `__CMP_GEO`, or the website default.

**How to use**

1. Set the website default regulation (DPDP, GDPR, CCPA, and others — see chapter 24).
2. Add jurisdiction rules: ISO country (and optional region) → policy + regulation key.
3. Enable **Google Consent Mode** if you use gtag/GTM.
4. Enable **IAB TCF / GPP** only if you have an external CMP ID, a synced GVL, and complete mappings. The UI will say **Blocked** until then. This product is not IAB-certified.
5. Set unknown-tracker behavior: **BLOCK** (default), WARN, or ALLOW.

**Blocks / mistakes.** Turning on TCF without a registered CMP ID does not produce valid TC strings. Geo preview uses hints, not a new IP-geo product.

### 6.2 Enforcement — `/dashboard/websites/[id]/enforcement`

**What it is.** Server-side categories of your tracker map.

**What it does**

| Category | Meaning |
|---|---|
| Always allowed | Essential trackers linked to a required purpose |
| Blocked until consent | Optional trackers with a purpose/vendor; wait for a grant |
| Always blocked | Unclassified / unmapped optional trackers |

These categories match the SDK blocklist. The **Consent firewall** page previews the same rules under Accept all / Reject all / Essential only.

**How to use.** Map every optional tracker in **Trackers**, then re-open Enforcement.

### 6.3 Child protection — `/dashboard/websites/[id]/child-protection`

**What it is.** Optional age/guardian controls. Technical only; not certified parental consent.

**What it does.** When enabled, restricted purposes (typically advertising) stay blocked until server state allows them. Staff attestation is the built-in unlock. Email guardian tokens prove contact only.

**How to use.** Enable only if the site is child-directed. Complete the fields, then publish. Incomplete child config **blocks publish**.

---

## 7. Consent records

**Path:** `/dashboard/consent` and `/dashboard/consent/[consentId]`

### What it is

Each visitor choice stored after the SDK calls `POST /api/consent/record`.

### What it does

Shows status (accepted, rejected, partial, withdrawn), website, policy version, jurisdiction, and a **cryptographic proof** (hash + HMAC). Historical evidence stays readable after withdraw or replace. Deleting current consent state does not delete evidence.

### How to use

1. Collect at least one live choice with the SDK installed.
2. Open **Consent**, then a record.
3. Review proof: intact / signature-valid.
4. Authenticated export: `/api/consent/evidence/[consentId]`.
5. Retention and legal holds: **Administration → Data retention**.

### When it blocks / common mistakes

Empty list = snippet missing, policy unpublished, or visitors have not chosen yet.

---

## 8. Policies, Banner Studio, and publish

**Paths:** `/dashboard/policies`, `/dashboard/policies/new`, `/dashboard/policies/[id]`, `.../studio`, `.../preference-center`

### What it is

A policy belongs to one website. Versions are drafts until published. The published version is what the SDK loads.

### What it does

- Attach purposes and vendors for that version.
- Banner Studio stores notice title, body, buttons, colors, layout, California toggles, language packs.
- Preference center is the granular panel visitors open from Customize.
- Publish runs the **server** validator. The browser preview cannot override it.

### How to use

1. **Policies → Create policy.** Choose website, template (chapter 23), name.
2. Attach purposes. Create missing template purposes automatically if their keys do not exist yet.
3. Link vendors to those purposes (vendor manager on the policy page).
4. Open **Banner Studio**. Required for publish: **title**, **description**, **privacy policy URL**.
5. Optionally preview **Preference Center**.
6. On the policy page, use **Get this policy live**. Fix each red step.
7. Read the compliance panel. Each error has a deep link (Purposes, Vendors, Trackers, Studio, Transfers).
8. **Publish** when there are zero errors. Warnings do not block.

### When it blocks / common mistakes

Typical rule IDs: `PURPOSE_REQUIRED_MISSING`, `PURPOSE_WITHOUT_DESCRIPTION`, `VENDOR_ROLE_MISSING`, `VENDOR_WITHOUT_PRIVACY_URL`, `VENDOR_DPA_CONFIGURATION_MISSING`, `TRACKER_UNMAPPED`, `NOTICE_TITLE_MISSING`, `NOTICE_PRIVACY_POLICY_MISSING`, `TRANSFER_MECHANISM_MISSING`. Follow the link; do not force-publish.

---

## 9. Purposes

**Paths:** `/dashboard/purposes`, `/dashboard/purposes/new`, `/dashboard/purposes/[id]`

### What it is

Visitor-facing processing purposes (Necessary, Analytics, Advertising, …). Shared across policies in the organization. The **key** never changes after create.

### What it does

Purposes appear on the banner/preference center. Required purposes cannot be declined. Optional purposes need a grant before matching trackers run. GDPR-style publish checks lawful basis (`consent`, `contract`, `legitimate_interests`, `legal_obligation`, `vital_interests`, `public_task`). Singular aliases (`legitimate_interest`) are accepted and stored as the plural GDPR form.

### How to use

1. **Create purpose** or pick a template (chapter 23).
2. Fill name, description (required before publish), required flag, data categories, retention, legal basis.
3. Click a row later to **edit**. Key stays locked.

### When it blocks / common mistakes

Missing description → `PURPOSE_WITHOUT_DESCRIPTION`. Empty purpose list on a policy → `PURPOSE_REQUIRED_MISSING`.

---

## 10. Vendors

**Paths:** `/dashboard/vendors`, `/dashboard/vendors/new`, `/dashboard/vendors/[id]`

### What it is

Third parties that process data (analytics, ads, processors). Organization-scoped.

### What it does

Stores identity, privacy URL, **role** (independent controller, joint controller, processor, subprocessor), DPA status, processing countries, California sale/share/sensitive PI flags. On publish, a **frozen snapshot** is written onto the policy version. Later vendor edits do not rewrite old evidence.

### How to use

1. Create from the catalog or Custom vendor.
2. Set **Role**. Do not leave unknown. New creates default to independent controller if you omit role.
3. Set privacy policy URL.
4. If role is processor/subprocessor on a GDPR-style site, set DPA to something other than `not_configured`.
5. For California policies, set sale/share/sensitive PI to applicable or not applicable — not `unknown`.
6. Open existing vendors that show **Set role** and save.

### When it blocks / common mistakes

`VENDOR_ROLE_MISSING`, `VENDOR_WITHOUT_PRIVACY_URL`, `VENDOR_DPA_CONFIGURATION_MISSING`, `INACTIVE_VENDOR_REFERENCED`. The product will not bulk-rewrite live roles for you.

---

## 11. Transfers

**Path:** `/dashboard/transfers` (also on a vendor detail page)

### What it is

Processing activities, processor relationships, and cross-border transfer mechanisms.

### What it does

Feeds Phase 9 publish rules. If the site or vendors imply an international transfer, you must record a mechanism (or inventory that covers it).

### How to use

1. Open Transfers or a vendor.
2. Add activities (purpose + data categories).
3. Add transfers (destination country + safeguard).
4. Record subprocessors if you use them.

### When it blocks / common mistakes

`TRANSFER_MECHANISM_MISSING`, `TRANSFER_DESTINATION_MISSING`, `TRANSFER_SAFEGUARD_MISSING`, `SUBPROCESSOR_RELATIONSHIP_MISSING`.

---

## 12. Trackers

**Path:** `/dashboard/trackers`

### What it is

The inventory the SDK uses to allow or block scripts, cookies, pixels, and iframes.

### What it does

Each tracker belongs to a website and should have a **purpose** and **vendor**. Essential is allowed only when mapped to a **required** purpose. Unmapped optional trackers stay blocked and **block publish**.

### How to use

1. Run **Scanner**, or add a tracker manually.
2. Assign purpose + vendor.
3. Confirm essential only for strictly necessary tags.
4. Re-open website **Enforcement** and the policy checklist.

### When it blocks / common mistakes

`TRACKER_UNMAPPED`, `TRACKER_ESSENTIAL_NOT_REQUIRED`, `TRACKER_IGNORED_STILL_ACTIVE`. Ignoring a scan finding does not authorize execution.

---

## 13. Tracker blocking

This is the visitor-facing enforcement engine. The firewall page only **previews** it.

### What it is

Fail-closed client + server rules. The SDK starts in a blocked state, loads config, then unlocks only confirmed grants.

### What it does

- Tagged scripts stay `type="text/plain"` until the purpose is granted.
- Dynamic third-party scripts, iframes, and known pixels are evaluated against the tracker registry.
- Known first-party cookie/storage keys can be blocked and cleaned after denial or withdrawal.
- Unknown third-party behavior: **BLOCK** (default), WARN, or ALLOW (website regulations).
- Google Consent Mode and IAB APIs follow the **confirmed** server state, not a local guess.

### How to use

1. Map trackers (chapter 12).
2. Put the CMP snippet **first** in `<head>`, no `async`/`defer`. Next.js: `beforeInteractive`.
3. Keep static optional tags inert:

```html
<script type="text/plain" data-cmp-purpose="analytics"
  src="https://www.google-analytics.com/analytics.js"></script>
```

4. Load with no consent: analytics/ads must not run.
5. Accept Analytics: those scripts activate.
6. Optional: `window.__CMP_DEBUG = true` then `window.CMP.getEnforcementDiagnostics()`.
7. Preview scenarios in **Intelligence → Consent firewall** before go-live.

### When it blocks / common mistakes

JavaScript cannot undo data already sent, remove HttpOnly or third-party cookies, or catch tags that loaded **before** the SDK. Use CSP, GTM consent checks, and server-side tagging for stronger coverage. MutationObserver is a fallback, not a network firewall.

---

## 14. Scanner

**Path:** `/dashboard/scanner` and `/dashboard/scanner/[scanId]`

### What it is

Crawls/analyses the registered domain for cookies, scripts, pixels, and other trackers.

### What it does

Writes scan results. Known items can match existing trackers. Unmapped items stay visible and must be classified. Scheduled scans need an external cron + `CRON_SECRET`.

### How to use

1. Confirm the website domain is correct.
2. Start a scan. Open the completed scan.
3. For each **Unmapped** row, open **Trackers** and assign purpose + vendor.
4. Re-scan after GTM or tag changes.

### When it blocks / common mistakes

Unmapped detections do not disappear on their own. They feed `TRACKER_UNMAPPED` and quality score.

---

## 15. Privacy drift

**Path:** `/dashboard/monitoring` and `/dashboard/monitoring/[id]`

### What it is

Compares scans and CMP state: new scripts, lost mappings, shadow trackers, page URLs.

### What it does

Open findings lower the quality score and appear in Autopilot. Resolving a finding is an operator action after you map or remove the tag.

### How to use

1. Complete a baseline scan after go-live.
2. Filter by website, severity, type, status.
3. Open a finding. Note the **page URL** when present.
4. Fix the tag or map the tracker, then resolve.

### When it blocks / common mistakes

Stale findings do not auto-resolve. Quality stays low until you close them.

---

## 16. Privacy risk

**Path:** `/dashboard/risk`

### What it is

Aggregated risk view from findings, unmapped trackers, and site coverage.

### What it does

Helps prioritize pages and vendors. It is not a legal risk assessment.

### How to use

Open after a scan. Follow links to Trackers, Drift, or the website.

---

## 17. Consent quality

**Path:** `/dashboard/quality`

### What it is

Operational score 0–100 from published policy, tracker mapping, scan coverage, and open findings.

### What it does

Feeds Autopilot, Digital Twin, ROI, and Negotiation. **Not** a legal compliance percentage.

### How to use

1. Publish a policy and map trackers.
2. Read lost-point reasons.
3. Use the links: Map trackers, Publish policy, Run a scan, Review drift.

---

## 18. Analytics

**Path:** `/dashboard/analytics`

### What it is

Aggregated consent metrics: totals, trends, website, purpose, country, device, browser.

### What it does

Reads consent records/events. Filters narrow the cohort. Trends show daily mix (accept-all, reject-all, granular, withdrawals).

### How to use

1. Collect live consent first.
2. Set date range and filters.
3. Open **Consent quality** from the header when you want configuration gaps, not rates.

---

## 19. Intelligence tools

All of these need a website. Most also need a published policy or a scan. They **do not** auto-publish.

### 19.1 Consent firewall — `/dashboard/firewall`

Preview block/allow for Reject all, Essential only, Accept all using the live tracker graph. Same rules as the SDK. Fix unmapped items that stay blocked in every scenario.

### 19.2 Impact simulator — `/dashboard/simulator`

Estimates how the quality score would change if you mapped trackers, resolved findings, published, or improved scan coverage. Not a legal assessment.

### 19.3 Experiments — `/dashboard/experiments`

Banner A/B tests. Weighted variants override layout/copy. The SDK stores the variant in session and records it with consent. Needs a policy. Promote the winner into default Banner Studio config.

### 19.4 Dependency graph — `/dashboard/graph`

Purposes ↔ vendors ↔ trackers. Use it to find missing links.

### 19.5 Recommendations — `/dashboard/recommendations`

Ordered configuration gaps with deep links. No generated legal text.

### 19.6 Data flow map — `/dashboard/data-flow`

Purpose → vendors → trackers and data categories. “What leaves the site for which purpose.”

### 19.7 Cross-domain consent — `/dashboard/cross-domain`

Export a signed consent bundle from website A and import onto website B (same org), mapping by purpose keys and vendor domains. APIs: `GET /api/consent/portable/export`, `POST /api/consent/portable/import`. SDK: `window.CMP.importPortableConsent`.

### 19.8 AI consent autopilot — `/dashboard/autopilot`

Assisted next-best-actions from quality + simulator. **Does not auto-publish.**

### 19.9 Consent digital twin — `/dashboard/digital-twin`

Current graph snapshot plus projected score deltas for scenarios.

### 19.10 Consent ROI engine — `/dashboard/roi`

Ranks scenarios by quality-delta × a points value. Not a financial ledger.

### 19.11 Consent negotiation engine — `/dashboard/negotiation`

Plan toward a target quality score (`?target=90`). Open each action page in order.

### 19.12 AI-agent permissioning — `/dashboard/agent-permissioning`

Given a `consentId`, may an agent use these purpose keys / vendor domains? API: `POST /api/agent/permission`. Essential purposes can be allowed; denied ones return reasons.

### 19.13 Data redaction — `/dashboard/data-redaction`

MVP: analytics purpose breakdown filtered by a consent record (`redactConsentId`). Not a general PII redaction engine.

---

## 20. Audit logs, notifications, and privacy rights

### Audit logs — `/dashboard/audit-logs`

Who created, updated, published, or changed vendor roles. Use it after a publish rejection.

### Notifications — `/dashboard/notifications`

Workspace alerts (scans, findings). The header bell opens the same stream.

### Privacy Rights — `/dashboard/rights-requests` and public `/privacy-request`

DSAR-style intake, identity verification workflow, access/portability export, hold-aware deletion. Downstream vendor action status is **orchestration only** — not proof a vendor deleted data. See also `docs/PRIVACY_RIGHTS.md`.

---

## 21. Developer: SDK, API keys, integrations, webhooks

### API keys & SDK — `/dashboard/developers`

Credentials plus pointers to website Installation. Public config: `GET /api/sdk/{siteKey}/config`. Record: `POST /api/consent/record`. Withdraw: `POST /api/consent/withdraw`.

The public visitor API remains `window.CMP`.

### Integrations — `/dashboard/integrations`

Catalog of connected tools. Enable Google Consent Mode and IAB on **Website → Regulations**, not only here.

### Webhooks — `/dashboard/developers/webhooks`

Event delivery for consent and operational events. Check deliveries if a downstream system missed a choice.

---

## 22. Administration

### Organization settings — `/dashboard/settings/organization`

Workspace name and billing placeholder. Billing is not a full product yet.

### Data retention — `/dashboard/settings/retention`

How long consent evidence and operational data are kept. Legal holds block deletion of held evidence.

### Team & roles — `/dashboard/settings/team`

Members and access. Invites go through Clerk + local membership.

---

## 23. Templates

### Purpose templates

| Key | Name | Required | Legal basis | Typical use |
|---|---|---|---|---|
| `necessary` | Necessary | Yes | legitimate_interests | Security, login, storing this consent |
| `functional` | Functional | No | consent | Language, region, preferences |
| `analytics` | Analytics | No | consent | Page views, funnels |
| `advertising` | Advertising | No | consent | Ads, retargeting |
| `personalization` | Personalization | No | consent | Recommendations |

Each template also fills description, data-category labels, and a retention string (12–14 months). You can edit after create.

### Policy templates

| ID | Name | Region | Purposes | Banner default |
|---|---|---|---|---|
| `custom` | Start from scratch | Any | none | Opt-in bar, reject shown |
| `gdpr-standard` | Standard (GDPR / ePrivacy) | EU / UK | necessary, functional, analytics, advertising | Opt-in, reject shown |
| `dpdp-india` | India (DPDP) | India | those plus personalization | Center dialog, opt-in |
| `us-opt-out` | US (CCPA-style opt-out) | United States | necessary, analytics, advertising | Opt-out default |
| `analytics-only` | Necessary + analytics | Any | lean, no ads | Opt-in |

Templates pre-fill; they do not certify the site. You still must set vendor roles, map trackers, and pass publish validation.

---

## 24. DPDP, GDPR, CCPA, and other acts

These are **operational profiles** in `src/lib/regulations/catalog.ts`. They change banner defaults, validator rules, and optional signals. They do **not** decide that you are in-scope or compliant.

| Key | Label | Typical geography in product | Consent style | Extra signals |
|---|---|---|---|---|
| `dpdp` | DPDP (India) | IN | Opt-in notice + consent | None required |
| `gdpr` | GDPR / ePrivacy | EEA | Opt-in, reject, preference center | Google Consent Mode, IAB TCF/GPP |
| `uk_gdpr` | UK GDPR / PECR | GB | Same opt-in style | Same as GDPR |
| `ccpa` | CCPA / CPRA | US / California-oriented | Notice + opt-out | GCM, GPP; GPC / Do Not Sell |
| `lgpd` | LGPD | BR | Opt-in notice | None required |
| `pipeda` | PIPEDA | CA (Canada) | Opt-in notice | None required |
| `ucpa` | UCPA | US-UT | Opt-out | GCM, GPP |
| `vcdpa` | VCDPA | US-VA | Opt-out | GCM, GPP |
| `cpa` | CPA | US-CO | Opt-out | GCM, GPP |

### DPDP in this product

- Purpose form collects data categories, retention period, and legal basis (shown as DPDP Rules 2025 Rule 3 fields).
- India policy template uses a center dialog and all five purpose keys.
- Publish can require notice fields and child config if you marked the site child-directed.

### GDPR / UK GDPR in this product

- Opt-in: optional purposes start denied.
- Reject-all and withdrawal must be available.
- Lawful basis on purposes is checked (plural GDPR keys).
- Processor vendors need DPA status.
- Transfers need a mechanism when implied.
- IAB strings stay null until CMP ID + GVL + mappings exist.

### CCPA / CPRA in this product

- Opt-out style notice. Banner Studio: Do Not Sell, Do Not Share, honor GPC, Limit Sensitive PI.
- Vendors/trackers need sale/share/sensitive classification (not `unknown`) when those controls are on.
- Valid `Sec-GPC: 1` is honored without a click when the runtime applies. Your CDN must forward the header.
- Website region `CA` is Canada in this app. California is typically `US` + CCPA profile / `US-CA` style visitor geo.

### LGPD, PIPEDA, UCPA, VCDPA, CPA

They switch the same engine: opt-in vs opt-out, whether GCM/GPP is suggested, and which publish rules run. They do not add a second consent engine.

---

## 25. Publish rules in plain language

The server runs common checks, then jurisdiction checks. **Errors block. Warnings do not.**

You will usually see:

1. Policy has a name and a website.
2. At least one purpose, each with a description.
3. Notice has title, description, privacy URL.
4. Vendors have a role, privacy URL, and DPA when they are processors.
5. Optional active trackers have purpose + vendor.
6. Essential trackers are tied to a required purpose.
7. Transfers recorded if the configuration implies them.
8. Child-directed sites have complete child controls.
9. California opt-out mappings complete when those toggles are on.

The validate API is `POST /api/policies/[id]/validate`. Publish re-runs it. Client-supplied “already valid” flags are ignored.

---

## 26. If something fails

| Symptom | What to do |
|---|---|
| Unable to create purpose/vendor/policy | Read the red message. 503 usually means database unreachable or missing columns (`npm run db:ensure-schema`). |
| Unable to validate | Same as above, or the validate API crashed. Not a normal 422 rule list. |
| Publish 422 | Open the compliance panel. Click the deep link for each rule ID. |
| No banner | Confirm a **published** version on Installation, snippet first in `<head>`, private window. |
| Config 404 | No published version for that site key. |
| Analytics empty | No records yet, or old records lack country/device hints. |
| IAB stub / null TC string | Missing CMP ID, GVL, or mappings — expected. |
| GPC not honored | `Sec-GPC` stripped by proxy, or site not in a California-applicable configuration. |

Public visitor API: `window.CMP`. Debug: `window.__CMP_DEBUG = true` before the script.

---

## Sidebar quick map

| Sidebar item | Path | One-line job |
|---|---|---|
| Dashboard | `/dashboard` | Get live + totals |
| Websites | `/dashboard/websites` | Domain, site key, install |
| Consent | `/dashboard/consent` | Records and proof |
| Policies | `/dashboard/policies` | Draft, studio, publish |
| Purposes | `/dashboard/purposes` | Why you process data |
| Vendors | `/dashboard/vendors` | Who processes it (role + DPA) |
| Transfers | `/dashboard/transfers` | Cross-border inventory |
| Trackers | `/dashboard/trackers` | What the SDK blocks |
| Scanner | `/dashboard/scanner` | Discover tags |
| Privacy drift | `/dashboard/monitoring` | Scan vs map |
| Privacy risk | `/dashboard/risk` | Priority view |
| Consent quality | `/dashboard/quality` | Operational score |
| Analytics | `/dashboard/analytics` | Rates and trends |
| Consent firewall | `/dashboard/firewall` | Block/allow preview |
| Impact simulator | `/dashboard/simulator` | Quality what-if |
| Experiments | `/dashboard/experiments` | Banner A/B |
| Dependency graph | `/dashboard/graph` | Links |
| Recommendations | `/dashboard/recommendations` | Gap list |
| Data flow map | `/dashboard/data-flow` | Purpose → vendor → tracker |
| Cross-domain consent | `/dashboard/cross-domain` | Portable bundle |
| AI consent autopilot | `/dashboard/autopilot` | Assisted plan |
| Consent digital twin | `/dashboard/digital-twin` | Snapshot + deltas |
| Consent ROI engine | `/dashboard/roi` | Rank fixes |
| Consent negotiation | `/dashboard/negotiation` | Target score plan |
| AI-agent permissioning | `/dashboard/agent-permissioning` | May the agent access this? |
| Data redaction | `/dashboard/data-redaction` | Consent-scoped analytics |
| Audit logs | `/dashboard/audit-logs` | Who changed what |
| Notifications | `/dashboard/notifications` | Alerts |
| Privacy Rights | `/dashboard/rights-requests` | DSAR workflow |
| API keys & SDK | `/dashboard/developers` | Keys + install |
| Integrations | `/dashboard/integrations` | Connected tools |
| Webhooks | `/dashboard/developers/webhooks` | Event delivery |
| Organization settings | `/dashboard/settings/organization` | Workspace |
| Data retention | `/dashboard/settings/retention` | Evidence retention |
| Team & roles | `/dashboard/settings/team` | Members |

---

*Generated for ConsentFlow. Operational scores and AI-assisted planners support configuration quality. They do not replace legal advice.*
