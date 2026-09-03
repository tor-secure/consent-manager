# Consent Manager — Feature Guide (27 Features)

This document explains every major feature in the Consent Manager product: what it is, how it appears and works on your websites and dashboard, and how to use it step by step.

**Prerequisites for almost every feature**

1. Sign in and select (or create) an organization.
2. Add at least one website under **Websites**.
3. Create purposes, vendors, and a consent policy; publish a policy version.
4. Install the CMP SDK on your site from **Websites → [site] → Installation** (or **Developer → SDK / Installation**).

---

## 1. Consent Banner & Preference Center

**What it is**  
The consent banner is the first notice visitors see asking them to accept, reject, or customize cookies and tracking. The preference center is the detailed panel where visitors can turn individual purposes and vendors on or off. Together they are the main visitor-facing UI of the CMP.

**How it is used on the website**  
After you publish a policy and install the SDK, the script loads banner config from the CMP API. If the visitor has no valid stored consent, the banner appears (layout, colors, and copy come from Banner Studio / policy banner config). Choosing “Customize” (or opening preferences later) opens the preference center. Choices are saved to local storage and sent to the consent record API so enforcement can update immediately.

**How to use it (step by step)**

1. Go to **Dashboard → Purposes** and create purposes (e.g. Essential, Analytics, Marketing). Mark essential purposes as required.
2. Go to **Vendors** and add third parties; link them to purposes.
3. Go to **Policies → New**, attach purposes/vendors, then open the policy.
4. Use **Banner Studio** (`/dashboard/policies/[id]/studio`) to set layout, position, colors, and button labels.
5. Optionally open **Preference Center** settings for that policy (`/dashboard/policies/[id]/preference-center`).
6. **Publish** the policy version.
7. On the website page, open **Installation**, copy the embed snippet, and place it in your site’s `<head>` (or Next.js `beforeInteractive` Script).
8. Visit your live site in a private window to see the banner; use Accept / Reject / Customize and confirm the preference center opens.

---

## 2. Cookie / SDK / Tracker Scanner

**What it is**  
The scanner crawls (or analyses) your website to discover cookies, scripts, pixels, and other trackers. Results feed tracker inventory, drift monitoring, quality scoring, and enforcement mapping.

**How it is used on the website**  
Scans run from the dashboard against the registered website domain. Detected items appear under **Trackers** and in scan detail pages. Those trackers should be mapped to purposes and vendors so the SDK knows what to block or allow after consent.

**How to use it (step by step)**

1. Ensure the website domain is correct under **Websites → [site]**.
2. Go to **Scanner** (`/dashboard/scanner`).
3. Start a scan for the target website (and configure schedule on the website if available).
4. Open the completed scan (`/dashboard/scanner/[scanId]`) and review detected items.
5. Promote or map findings into **Trackers**, assigning purpose and vendor where possible.
6. Re-scan after major site or tag-manager changes.

---

## 3. AI Regulation & Geo-Legal Engine

**What it is**  
The geo-legal engine resolves which regulation and notice behaviour apply based on visitor geography (and website jurisdiction rules). It helps the CMP choose the right consent mode and policy behaviour for regions such as GDPR-style opt-in vs other regimes.

**How it is used on the website**  
When the SDK requests config, it can pass country/region hints. The server resolves legal settings for that website and may adjust banner requirements, defaults, and integrations. Dashboard pages let you configure regulations and preview geo-legal behaviour per website.

**How to use it (step by step)**

1. Open **Websites → [site] → Regulations** (`/dashboard/websites/[id]/regulations`).
2. Set applicable regulations / jurisdiction rules for the site.
3. Use the geo-legal preview on the website detail/overview where available.
4. Publish a policy so the SDK config includes the resolved legal behaviour.
5. Test with different geo hints (or real regional traffic) and confirm banner/consent mode matches expectations.

---

## 4. Consent Receipts & Cryptographic Consent Proof

**What it is**  
Every consent event can produce an evidence bundle (receipt): who consented, when, which policy version, and which purposes/vendors were granted or denied. Cryptographic proof adds a hash and HMAC signature so you can verify the record was not tampered with.

**How it is used on the website**  
When a visitor submits a choice, the consent record API stores decisions and attaches a crypto proof in metadata. Operators later open a consent detail page and call the evidence API to verify that stored hash/signature still match the claims.

**How to use it (step by step)**

1. Collect at least one real consent on a published site with the SDK installed.
2. Go to **Consent** (`/dashboard/consent`) and open a record (`/dashboard/consent/[consentId]`).
3. Review status, jurisdiction, policy version, and the proof section (hash, signature, verification flags).
4. Confirm **intact** / signature-valid when auditing for regulators or internal compliance.
5. Use the evidence endpoint `/api/consent/evidence/[consentId]` (authenticated) for programmatic export.

---

## 5. Script & SDK Blocking

**What it is**  
Client-side enforcement that stops non-essential scripts from running until the matching purpose (or vendor) consent is granted. Scripts marked with CMP attributes stay inert (`type="text/plain"`) until consent unlocks them.

**How it is used on the website**  
The CMP SDK loads tracker rules with the config, builds a blocklist from current decisions, and rewrites or pauses tagged scripts. After Accept All / granular save, granted purposes restore scripts so tags can fire.

**How to use it (step by step)**

1. Map trackers to purposes under **Trackers**.
2. On your site HTML, tag controllable scripts, e.g. `data-cmp-purpose="analytics"`.
3. Install the CMP SDK **before** third-party tags where possible.
4. Load the page with no consent: confirm analytics/marketing scripts do not execute.
5. Accept Analytics (or Accept All) and confirm those scripts activate.
6. Review **Websites → [site] → Enforcement** for how rules are categorized.

---

## 6. Consent Firewall

**What it is**  
A dashboard simulator that shows which trackers would be blocked or allowed under consent scenarios (reject-all, essential-only, accept-all) using your live purpose–vendor–tracker graph.

**How it is used on the website**  
It does not replace the live SDK blocker; it previews enforcement outcomes so you can fix unmapped trackers before they leak data. The same blocklist logic powers production SDK enforcement.

**How to use it (step by step)**

1. Open **Intelligence → Consent firewall** (`/dashboard/firewall`).
2. Select a website.
3. Choose a scenario (Reject all / Essential only / Accept all).
4. Review blocked vs allowed trackers and domains.
5. Fix gaps (map unclassified trackers, attach vendors) and re-check.

---

## 7. Google Consent Mode

**What it is**  
Integration that updates Google’s Consent Mode signals (`ad_storage`, `analytics_storage`, etc.) based on CMP decisions so Google tags respect visitor consent.

**How it is used on the website**  
The SDK publishes Google Consent Mode defaults (typically denied until consent) and updates `gtag`/`dataLayer` when the visitor accepts or changes preferences. Website regulation/integration settings control whether Consent Mode is enabled for that site.

**How to use it (step by step)**

1. Configure consent integrations / regulations for the website so Google Consent Mode is enabled.
2. Install the CMP SDK early on the page (before GTM/gtag where possible).
3. Load the site and inspect `dataLayer` / Consent Mode state before consent (should be denied for ads/analytics as configured).
4. Accept relevant purposes and confirm Consent Mode updates to granted where appropriate.
5. Validate in Google Tag Assistant or browser network tools that tags follow the new state.

---

## 8. IAB TCF / GPP Support

**What it is**  
Support for industry signalling frameworks (IAB Europe TCF and Global Privacy Platform / GPP) so ad tech and vendors can read standardized consent/privacy strings alongside your first-party CMP decisions.

**How it is used on the website**  
Adapters in the CMP signals layer and SDK/config path expose TCF/GPP-related outputs when enabled for the website. Vendors that understand these frameworks can read the shared APIs or strings from the page.

**How to use it (step by step)**

1. Open website regulation / consent integration settings and enable IAB TCF and/or GPP as required for your markets.
2. Ensure vendors that rely on TCF/GPP are listed and mapped.
3. Publish policy and load the site with the SDK.
4. After a consent choice, verify framework APIs/strings are present (browser console / vendor debug tools).
5. Re-test after policy version changes that affect purposes or vendor lists.

---

## 9. Cross-Domain & Cross-Device Consent

**What it is**  
Portable consent lets you export a cryptographically signed consent bundle from one website and import it onto another site’s active policy (same organization), mapping by purpose keys and vendor domains. That enables continuity across related domains or devices when the visitor presents the portable proof.

**How it is used on the website**  
Dashboard tool at **Cross-domain consent** exports/imports bundles. The SDK also exposes `window.CMP.importPortableConsent(bundle, targetWebsiteId)` so a destination site can apply imported decisions and enforce immediately. APIs: `GET /api/consent/portable/export` and `POST /api/consent/portable/import`.

**How to use it (step by step)**

1. Collect consent on Website A; note the `consentId` from **Consent** records.
2. Open **Intelligence → Cross-domain consent** (`/dashboard/cross-domain`).
3. Enter Consent ID, select **From website** (A), and click **Export portable consent**.
4. Select **Target website** (B) and click **Import onto target website**.
5. Review the mapped decisions JSON (purpose/vendor grants for B’s policy).
6. Optionally call `CMP.importPortableConsent` on site B with the exported `{ claims, proof }` so local storage and script blocking update for that visitor.

---

## 10. Consent Analytics & Visualization

**What it is**  
Aggregated metrics of how visitors respond to consent: totals by status (accepted, rejected, partial, withdrawn), rates, website breakdowns, purposes, countries, devices, browsers, and recent events—shown as cards, tables, and trend charts.

**How it is used on the website**  
Visitor choices recorded by the SDK become consent records/events. The analytics page and `/api/analytics/consent` aggregate them for the organization (optionally filtered by website and period).

**How to use it (step by step)**

1. Ensure the SDK is collecting consent on at least one live site.
2. Open **Analytics** (`/dashboard/analytics`).
3. Set date range / website / country / device / browser / purpose filters.
4. Review overview cards, website summary, purpose grant rates, and geo/device tables.
5. Use insights to adjust banner copy, purpose list, or A/B experiments.

---

## 11. Consent Trends & Segmentation

**What it is**  
Trend views show daily consent interaction volume and choice mix (accept-all, reject-all, granular, withdrawals). Segmentation slices the same data by country, device, browser, purpose, policy version, and website so you can see *who* consents how—not only totals.

**How it is used on the website**  
Implemented inside the Analytics experience: trend charts plus filterable segment tables. Filters narrow the cohort; trends show time series for that cohort.

**How to use it (step by step)**

1. Go to **Analytics**.
2. In **Consent trends**, inspect the daily chart for the selected period.
3. Apply segmentation filters (e.g. mobile + a specific country).
4. Compare accept/reject/granular rates across segments (devices, browsers, countries, purposes).
5. Export or note patterns, then change banner UX or purpose defaults for weak segments (via Studio / policy).

---

## 12. Consent Quality Score

**What it is**  
An operational score (0–100) for how well a website’s CMP setup is configured: published policy, tracker mapping, scan coverage, open drift/shadow findings, and enforceability. It is **not** a legal compliance certificate.

**How it is used on the website**  
Computed from CMP inventory and monitoring inputs; shown on **Consent quality** and reused by Autopilot, Digital Twin, ROI, and Negotiation.

**How to use it (step by step)**

1. Run scans and map trackers; publish a live policy.
2. Open **Consent quality** (`/dashboard/quality`).
3. Read each website’s overall score and category (excellent / good / needs attention / etc.).
4. Follow linked gaps (unmapped trackers, open findings, unpublished policy).
5. Re-check the score after remediation.

---

## 13. AI Consent Autopilot

**What it is**  
An assisted planner that combines quality score, recommendations, and privacy-impact scenarios into an ordered “next best actions” plan. It does not auto-publish policies yet; it guides operators to the highest-impact fixes.

**How it is used on the website**  
Dashboard page ranks simulator scenarios by expected quality delta and lists recommendations with deep links to Trackers, Monitoring, Policies, Scanner, etc.

**How to use it (step by step)**

1. Open **Intelligence → AI consent autopilot** (`/dashboard/autopilot`).
2. Select a website.
3. Read **Baseline** score and **Next best action**.
4. Follow **Autopilot plan** steps (Apply / Open related page).
5. Complete the linked work (map trackers, resolve findings, publish policy).
6. Refresh Autopilot to see an updated plan and score.

---

## 14. Consent Digital Twin

**What it is**  
A combined “twin” view of the current consent dependency graph (purposes, vendors, trackers) plus projected score changes if you apply configuration scenarios. It helps you understand current state and simulated future state in one place.

**How it is used on the website**  
Dashboard-only intelligence view. It reads the same graph snapshot and quality simulator used elsewhere.

**How to use it (step by step)**

1. Open **Intelligence → Consent digital twin** (`/dashboard/digital-twin`).
2. Select a website.
3. Review baseline score, open findings, and counts of purposes/vendors/trackers.
4. Inspect projected twin deltas for each scenario.
5. Use the dependency snapshot to verify mappings before changing production config.

---

## 15. Consent Enforcement API

**What it is**  
Public/authenticated HTTP APIs that load policy config, record consent, withdraw consent, fetch records, and expose evidence—so the browser SDK (and your backends) can enforce and audit consent programmatically.

**How it is used on the website**  
The embed script calls endpoints such as `/api/sdk/{siteKey}/config`, `/api/consent/record`, and `/api/consent/withdraw`. Dashboard and automation can call evidence and analytics APIs with auth.

**How to use it (step by step)**

1. Install the SDK (preferred) or call APIs directly with `websiteId` / `siteKey` as documented.
2. `GET` config for the site key to receive banner, purposes, vendors, and tracker rules.
3. `POST /api/consent/record` with `accept-all`, `reject-all`, or `granular` decisions.
4. `GET /api/consent/record` to restore an existing consentId.
5. `POST /api/consent/withdraw` when the user withdraws.
6. For audit, call `/api/consent/evidence/[consentId]` while logged into the org.

---

## 16. Server-Side Consent Enforcement

**What it is**  
Server-side logic that evaluates grants against tracker rules (blocklists, essential exceptions, deny-by-default for unclassified trackers). Used by dashboard enforcement views, firewall evaluation, and SDK config payloads so enforcement decisions stay consistent.

**How it is used on the website**  
Pure enforcement helpers (`shouldBlock`, `buildBlocklist`) run on the server when building config and on the client when applying that config. Website **Enforcement** page visualizes categories (essential, consent-required, unclassified).

**How to use it (step by step)**

1. Map every non-essential tracker to a purpose/vendor.
2. Open **Websites → [site] → Enforcement**.
3. Confirm unclassified trackers are listed (they stay blocked until mapped).
4. Collect consent and verify SDK blocking matches the server-built rules.
5. Use Consent Firewall scenarios to double-check reject/accept outcomes.

---

## 17. Data-Flow Consent Map

**What it is**  
A map of how data categories / purposes flow to vendors and trackers for a website—so you can see “what leaves the site for which purpose” under consent control.

**How it is used on the website**  
Dashboard **Data flow map** builds a view from the consent graph (purposes ↔ vendors ↔ trackers). It supports privacy reviews and vendor diligence.

**How to use it (step by step)**

1. Ensure purposes have data categories and vendors are linked to purposes.
2. Open **Intelligence → Data flow map** (`/dashboard/data-flow`).
3. Select a website.
4. Trace each purpose to vendors and trackers.
5. Fix missing links, then re-open the map before publishing policy changes.

---

## 18. Consent ROI Engine

**What it is**  
Converts expected quality-score improvements from remediation scenarios into a relative ROI score (quality delta × configurable points value). Helps prioritize work with the best operational return—not a financial ledger.

**How it is used on the website**  
**Consent ROI engine** page runs the privacy impact simulator and ranks scenarios by ROI units.

**How to use it (step by step)**

1. Open **Intelligence → Consent ROI engine** (`/dashboard/roi`).
2. Select a website.
3. Note baseline score, target, and ROI per quality point.
4. Compare scenario ROI breakdowns.
5. Execute the best scenario’s underlying work (trackers / findings / publish / scan coverage).
6. Re-run ROI to confirm deltas shrink as quality rises.

---

## 19. AI Consent Firewall

**What it is**  
Intelligence-layer firewall evaluation on top of the consent graph: scenario-based allow/block predictions for trackers, used for privacy operations and “what would be blocked if visitors reject all” style reviews. Complements live Script & SDK Blocking.

**How it is used on the website**  
Exposed primarily via **Consent firewall** UI and shared firewall/enforcement libraries. Operators use it before go-live and after scans discover new trackers.

**How to use it (step by step)**

1. Complete a scan and map new trackers.
2. Open `/dashboard/firewall` and pick **Reject all**.
3. Verify marketing/analytics domains appear under blocked.
4. Switch to **Accept all** and confirm expected trackers move to allowed (non-essential still respect grants).
5. Resolve any unclassified items that appear blocked in every scenario.

---

## 20. Consent Negotiation Engine

**What it is**  
Builds an ordered negotiation plan: a sequence of high-impact configuration steps aimed at reaching a target consent quality score, using simulator deltas.

**How it is used on the website**  
Dashboard page shows goal, predicted score after the plan, and clickable steps into operational pages.

**How to use it (step by step)**

1. Open **Intelligence → Consent negotiation engine** (`/dashboard/negotiation`).
2. Select a website (optionally pass `?target=90` for a custom target score).
3. Review Goal (baseline vs target vs predicted).
4. Execute **Plan steps** in order via “Open action page”.
5. After each remediation, refresh Negotiation until predicted score meets target or no positive steps remain.

---

## 21. AI-Agent Permissioning

**What it is**  
An API and dashboard tool that answers: “Given this visitor’s consent record, may an AI agent access data for these purpose keys / vendor domains?” Essential purposes can be allowed; denied purposes/vendors are rejected with reasons.

**How it is used on the website**  
Operators test with **AI-agent permissioning**. Backends/agents call `POST /api/agent/permission` with `consentId`, `websiteId`, `requestedPurposeKeys`, and/or `requestedVendorDomains` before fetching or processing personal data.

**How to use it (step by step)**

1. Collect a consent record and copy its Consent ID.
2. Open **Intelligence → AI-agent permissioning** (`/dashboard/agent-permissioning`).
3. Select website; enter Consent ID.
4. Enter requested purpose keys (e.g. `analytics`) and/or vendor domains.
5. Click **Evaluate agent permission** and read `allowed`, `purposeDetails`, `vendorDetails`.
6. Wire the same API into your agent runtime so denied requests never pull redacted/restricted data.

---

## 22. Real-Time Consent-Based Data Redaction

**What it is**  
Filters analytics (and similarly scoped data views) so only purposes granted (or essential) for a given consent record are exposed. MVP redacts the analytics purpose breakdown via `redactConsentId`.

**How it is used on the website**  
**Data redaction** tool calls `/api/analytics/consent` with website, days, and `redactConsentId`. The response marks `redacted: true` and trims purpose lists to allowed IDs.

**How to use it (step by step)**

1. Open **Intelligence → Data redaction** (`/dashboard/data-redaction`).
2. Choose website and paste a Consent ID.
3. Set the days window and load redacted analytics.
4. Confirm only granted/essential purposes appear in the purpose sections.
5. For integrations, call the analytics API with `redactConsentId` whenever serving consent-scoped reports.

---

## 23. Consent Graph & Dependency Intelligence

**What it is**  
A structured model of purposes, vendors, and trackers and how they depend on each other. Powers firewall, recommendations, digital twin, data-flow map, and enforcement rule generation.

**How it is used on the website**  
Visible as **Dependency graph** and reused under the hood by other intelligence pages.

**How to use it (step by step)**

1. Open **Intelligence → Dependency graph** (`/dashboard/graph`).
2. Select a website.
3. Review purposes, vendor→purpose links, and tracker mappings/status.
4. Fix missing purpose/vendor links on **Purposes**, **Vendors**, and **Trackers**.
5. Confirm Recommendations / Firewall update after fixes.

---

## 24. Shadow Tracker Detection

**What it is**  
Detection of trackers or third-party activity that appear in scans but are not properly declared/mapped in the CMP inventory—“shadow” trackers that may fire outside consented control.

**How it is used on the website**  
Scan processing and privacy intelligence raise findings (often alongside drift). Risk/monitoring views surface them so you can create tracker records or block them by default.

**How to use it (step by step)**

1. Run **Scanner** regularly (or on a schedule).
2. Open **Privacy drift** / monitoring and **Privacy risk** for shadow-related findings.
3. For each shadow item, either add/map a tracker or confirm it should remain blocked.
4. Resolve the finding after remediation.
5. Re-scan to verify the shadow signal clears.

---

## 25. Consent Drift Detection

**What it is**  
Compares successive scans / CMP state to detect drift: new scripts, lost mappings, policy mismatches, or trackers that appeared after you thought the site was clean.

**How it is used on the website**  
**Privacy drift** (`/dashboard/monitoring`) lists findings; detail pages support review/resolve. Drift feeds quality score and Autopilot recommendations.

**How to use it (step by step)**

1. Complete a baseline scan after go-live.
2. Enable scheduled scans where available.
3. Open **Privacy drift** (`/dashboard/monitoring`).
4. Open a finding (`/dashboard/monitoring/[id]`), review, and resolve or fix config.
5. Use Autopilot / Quality after clearing findings to confirm score recovery.

---

## 26. Page-Level Consent Intelligence

**What it is**  
Page-aware privacy intelligence that associates scan/monitoring insights with specific page URLs—so you know *where* risky or unconsented trackers load, not only that they exist site-wide.

**How it is used on the website**  
Monitoring APIs and intelligence modules store/use page URLs from scan results. Dashboard monitoring and related risk/quality views help prioritize pages that load the most sensitive tags.

**How to use it (step by step)**

1. Run scans that capture page URLs (multi-page / scheduled coverage as configured).
2. Open monitoring findings and note page URL context when present.
3. Fix tags on the offending templates/pages (GTM containers, hardcoded scripts).
4. Map any new trackers and republish policy if purposes changed.
5. Re-scan those pages to confirm clean results.

---

## 27. Consent A/B Testing

**What it is**  
Banner A/B experiments that assign visitors to variants with different layout/copy/button overrides, then measure consent outcomes so you can improve accept rates without guessing.

**How it is used on the website**  
Configured per policy (A/B settings API / Experiments UI). The SDK picks a weighted variant (stored in session), applies overrides to banner config, and records the variant with consent submissions for analytics.

**How to use it (step by step)**

1. Open a published (or draft) policy and configure A/B variants (or use **Experiments** at `/dashboard/experiments`).
2. Set at least two variants with weights and overrides (e.g. different title or show/hide Reject).
3. Publish/enable the experiment.
4. Visit the site multiple times in fresh sessions; confirm different banners appear.
5. Review experiment/analytics stats and promote the winning variant into the default banner config.

---

## Quick route map

| Feature | Primary dashboard path |
|---|---|
| Banner & Preference Center | `/dashboard/policies/[id]/studio`, `.../preference-center` |
| Scanner | `/dashboard/scanner` |
| Geo-Legal | `/dashboard/websites/[id]/regulations` |
| Consent proof | `/dashboard/consent/[consentId]` |
| Enforcement / blocking | `/dashboard/websites/[id]/enforcement`, SDK on site |
| Consent firewall | `/dashboard/firewall` |
| Analytics / Trends / Segmentation | `/dashboard/analytics` |
| Quality score | `/dashboard/quality` |
| Autopilot | `/dashboard/autopilot` |
| Digital twin | `/dashboard/digital-twin` |
| Data-flow map | `/dashboard/data-flow` |
| ROI | `/dashboard/roi` |
| Negotiation | `/dashboard/negotiation` |
| Cross-domain | `/dashboard/cross-domain` |
| Agent permissioning | `/dashboard/agent-permissioning` |
| Data redaction | `/dashboard/data-redaction` |
| Dependency graph | `/dashboard/graph` |
| Drift / shadow / page intel | `/dashboard/monitoring`, `/dashboard/risk` |
| A/B testing | `/dashboard/experiments` |
| SDK install | `/dashboard/websites/[id]/installation` |

---

*Generated for the Consent Manager application. Operational scores and AI-assisted planners support configuration quality; they do not replace legal advice.*
