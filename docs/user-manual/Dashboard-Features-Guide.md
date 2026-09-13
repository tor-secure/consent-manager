# Consent Guru — Dashboard Features Guide

**Product:** Consent Guru  
**Audience:** anyone using the dashboard for the first time  
**What this guide covers:** every dashboard area — what it is, and how to use it step by step  

This is an operations guide. It explains what the software does. It is not legal advice and does not certify GDPR, CCPA, DPDP, or any other law.

---

## How the dashboard is organized

After you **Log in** and pick (or create) an organization, you land on `/dashboard`.

**Left sidebar**

1. **Dashboard** — home overview
2. **Websites** — your sites and install snippets
3. **Consent Management** — records, policies, purposes, vendors, transfers, trackers
4. **Discovery & Monitoring** — scanner, drift, risk, quality, analytics
5. **Intelligence** — firewall, simulator, experiments, graphs, planning tools
6. **Security & Governance** — audit logs, notifications, privacy rights
7. **Developer** — SDK, API keys, integrations, webhooks
8. **Administration** — organization, retention, team

Most sidebar items open a **hub page** of cards. Click a card to open that feature.

**Top header**

- **Organization switcher** (left) — change workspace
- **Search** (center) — find pages and records
- **Theme, notifications, account** (right)

**Roles**

| Role | Typical access |
| --- | --- |
| **Owner** | Full control, including assigning Owner |
| **Admin** | Can publish, scan, invite, and change settings |
| **Member** | Can view; many create/publish/invite actions are blocked |

Owner and Admin together are called **operators** in this product.

---

## The path to a live banner

Until you finish this sequence, visitors will not see a working banner.

1. Add a **website**
2. Create **purposes** (or use a template)
3. Add **vendors** and set a real **Role** (not unknown)
4. Create a **policy**, attach purposes, open **Banner Studio**
5. Fix the compliance checklist, then **Publish** (Owner/Admin)
6. Copy the snippet from **Websites → [site] → Installation** into your site `<head>`

The home page **Get live** strip shows which of those steps are done.

---

## 1. Dashboard home

**Path:** Sidebar → **Dashboard** (`/dashboard`)

**What it is**  
The overview of your organization for the last 30 days. It does not change live enforcement.

**What you see**

- **Get live** — Website → Purposes → Vendors → Policy → Publish → Install
- **Total records / Accepted / Granular / Withdrawn**
- **Daily choices** chart (accept all, reject all, granular)
- **Consent mix** pie chart
- **Purpose grants**, **By website**, **By country** (or by device if country is unknown)
- **Recent consent records**
- **Inventory** — websites, policies, vendors, trackers
- Setup checks: website registered, policy created, records collected, trackers detected

**How to use it**

1. Sign in and select your organization.
2. Read **Get live**. Click any incomplete step.
3. After the SDK is collecting choices, use the cards and charts.
4. Click **View analytics** (top right) for filters, or **View all** on recent records.

**If charts are empty**  
You do not have a published policy yet, or the snippet is not installed, or no visitor has chosen yet. That is expected.

---

## 2. Websites

**Path:** Sidebar → **Websites** (`/dashboard/websites`)

**What it is**  
Each website is a domain you will put the consent banner on. The product gives it a **site key**. The script on your site uses that key.

**How to add a website**

1. Click **Add website**.
2. Enter **Website name** (example: `Acme marketing site`).
3. Enter **Domain** only — `example.com`, not `https://example.com`.
4. Choose **Default language** (usually English).
5. Choose **Default region**: India, European Union, United States, or United Kingdom.
6. Click **Add website**.
7. You are sent to **Create consent policy** for that site. You can finish the policy now or go back to Websites.

**On the website detail page** you will see:

- Domain, environment, language, region, verification, **site key**
- Buttons: **Child protection**, **Enforcement**, **Regulations**, **Settings**
- A link to **Installation**
- Shortcuts to quality, risk, drift, firewall, and other tools

**Important:** In this product, region **CA** (on settings) means **Canada**, not California. California is **United States** plus a CCPA-style regulation.

---

### 2.1 Website settings

**Path:** Websites → open a site → **Settings**

**What it is**  
Edit the name, optional description, environment (production / staging / development), language, and region. Domain and site key cannot be changed after create.

**How to use it**

1. Change the fields you need.
2. Click **Save changes**.
3. Use **Cancel** to go back without saving.

---

### 2.2 Installation

**Path:** Websites → open a site → **Installation**

**What it is**  
The page that shows the script you paste into your website so the banner can appear.

**How to use it**

1. Confirm the page says a **published** policy is live. A draft policy will not serve a banner.
2. Copy the snippet. It looks like a `<script>` tag with your site key.
3. Paste it in your site `<head>` **before** Google Tag Manager, gtag, and other tags. Do not add `async` or `defer`.
4. Open your live site in a private window and check that the banner appears.

**Common mistake**  
Installing the snippet before you publish. The public config then returns “not found” and there is no banner.

---

### 2.3 Regulations

**Path:** Websites → open a site → **Regulations**

**What it is**  
The legal **profile** for that site (DPDP, GDPR, CCPA, and others), plus Google Consent Mode and IAB options. This is not automatic IP geolocation. The SDK can send a country hint, or the site default is used.

**How to use it**

1. Set the **Fallback legal profile**.
2. Optionally add **jurisdiction rules**: country (ISO code like `DE`) → policy + regulation.
3. Set **Unknown tracker behavior**: BLOCK (safest), WARN, or ALLOW.
4. Enable **Google Consent Mode** if you use Google tags.
5. Enable **IAB TCF / GPP** only if you have an external CMP ID and a synced vendor list. The UI stays **Blocked** until that is complete. This product is not IAB-certified.
6. Click **Save regulation settings**.

---

### 2.4 Enforcement

**Path:** Websites → open a site → **Enforcement**

**What it is**  
A read-only view of how trackers are grouped for blocking:

- **Always allowed** — essential, tied to a required purpose
- **Blocked until consent** — optional, mapped to a purpose/vendor
- **Always blocked** — unmapped optional trackers

**How to use it**

1. Map every optional tracker on **Trackers**.
2. Re-open Enforcement to confirm the groups.
3. Use **Consent firewall** to preview Accept all / Reject all / Essential only.

---

### 2.5 Child protection

**Path:** Websites → open a site → **Child protection**  
**Who:** Owner or Admin to save

**What it is**  
Optional age / guardian controls. This is a technical lock. It does not certify legal parental consent.

**How to use it**

1. Enable child protection only if the site is child-directed.
2. Set minimum age, age assurance, guardian requirement, and restricted purposes (usually advertising).
3. Save, then **Publish** the policy. Incomplete child settings can block publish.
4. Staff attestation is the built-in unlock for a verified state. An email token only proves contact.

---

## 3. Consent Management

Open **Consent Management** in the sidebar, then pick a card.

### 3.1 Consent

**Path:** `/dashboard/consent`

**What it is**  
The list of visitor choices stored after someone uses the banner (accept, reject, customize, or withdraw). Each record can have a **proof** (hash and signature) so you can check it was not changed.

**How to use it**

1. Collect at least one live choice with the SDK installed.
2. Open **Consent**. Filter by website if needed.
3. Open a record to see status, website, policy version, and proof.
4. Historical proof stays readable after withdraw or replace.

**If the list is empty**  
Snippet missing, policy unpublished, or no visitor has chosen yet.

---

### 3.2 Policies

**Path:** `/dashboard/policies`

**What it is**  
A policy belongs to one website. It is a **draft** until you publish. Only the published version is what visitors see.

**How to create a policy**

1. Click **Create policy**.
2. Pick a **template** (or Start from scratch):
   - Standard (GDPR / ePrivacy)
   - India (DPDP)
   - US (CCPA-style opt-out)
   - Necessary + analytics
   - UK GDPR (if shown)
3. Choose the **Website**.
4. Enter a **Policy name**. Description is optional.
5. Optionally tick **Set as default policy**.
6. Click **Create policy**.

**How to finish and publish**

1. Open the policy.
2. Attach **purposes**. Link **vendors** to those purposes.
3. Open **Banner Studio**. Fill **title**, **description**, and **privacy policy URL** (required to publish).
4. Optionally open **Preference Center** to preview the detailed panel.
5. On the policy page, wait until the compliance panel has **zero errors**.
6. Click **Publish** (Owner/Admin). Warnings do not block; errors do.

**After publish**  
The Installation page can serve that version. Editing vendors later does **not** rewrite old published snapshots or old consent proof.

---

### 3.3 Banner Studio

**Path:** Policies → open a policy → **Banner Studio** (`/dashboard/policies/[id]/studio`)

**What it is**  
The visual editor for the notice visitors see: layout, colors, button labels, and behavior.

**Tabs:** Presets | Layout | Style | Text | Settings

**How to use it**

1. Open Banner Studio from the policy.
2. Pick a **preset**, or set **Layout** (bar / box / dialog) and **Position** (bottom, top, corners, center).
3. On **Style**, set colors and which buttons to show (Accept all, Reject all, Customize, Close).
4. On **Text**, set title, description, button labels, and the privacy link URL.
5. On **Settings**, set default choice (none / opt-in / opt-out), expiry days, and options such as Respect DNT or block the page until consent.
6. Click **Save draft**.
7. Return to the policy and **Publish** when ready.

**Result of Save draft**  
The draft banner is stored. Visitors still see the last **published** version until you publish again.

---

### 3.4 Preference Center

**Path:** Policies → open a policy → **Preference Center**

**What it is**  
The detailed panel visitors open from **Customize**. They can turn individual purposes (and vendors, if shown) on or off.

**How to use it**

1. Open the preview from the policy.
2. Try **Accept all**, **Reject all**, **Save preferences**, and **Withdraw**.
3. Confirm required purposes cannot be turned off.
4. Publish the policy so the live site matches this preview.

---

### 3.5 Purposes

**Path:** `/dashboard/purposes`

**What it is**  
The reasons you process data, shown to visitors — for example Necessary, Analytics, Advertising. The **key** (like `analytics`) never changes after create.

**How to create a purpose**

1. Click **Create purpose**.
2. Pick a template or Custom.
3. Fill **Name**, **Key**, and a visitor-facing **Description** (needed before publish).
4. Tick **Required** only for strictly necessary processing (visitors cannot decline it).
5. Add **data categories** (optional tags such as IP address).
6. Add **Retention period** (example: `12 months`).
7. Choose **Legal basis**: consent, contract, legitimate interests, legal obligation, vital interests, or public task.
8. Click **Create purpose**.

**How to edit**  
Open the purpose row. The key stays locked. Click **Save purpose**.

---

### 3.6 Vendors

**Path:** `/dashboard/vendors`

**What it is**  
Third parties that process data (analytics, ads, processors). You must set a **Role** and usually a **privacy policy URL**.

**How to create a vendor**

1. Click **Create** (or add from the catalog).
2. Enter name, key, domain, and privacy policy URL.
3. Set **Role**: controller, processor, subprocessor, independent controller, joint controller, service provider, or third party. Do **not** leave it unknown.
4. If the role is processor/subprocessor on a GDPR-style site, set **DPA status** to something other than `not_configured`.
5. For California-style policies, set sale / share / sensitive PI to applicable or not applicable — not `unknown`.
6. Click **Create vendor**.

**How to edit**  
Open the vendor. Save. Old published policies keep a frozen snapshot of what was published.

---

### 3.7 Transfers

**Path:** `/dashboard/transfers`

**What it is**  
Where you record **cross-border transfers** and **processing activities** (what a vendor does, in which country, with which safeguard).

**How to add a transfer**

1. Choose **Vendor** and optionally a **Website** (or organization-wide).
2. Enter source and destination country (example: `DE` → `US`).
3. Choose a **Mechanism**: adequacy, SCC, BCR, derogation, consent, or other.
4. Add purpose and safeguards if asked.
5. Save.

**How to add a processing activity**

1. Choose vendor, website, and purpose.
2. Set processing role, data categories, location.
3. Tick **Transfer required** if data leaves the country.
4. Save.

Missing transfer details can **block publish**.

---

### 3.8 Trackers

**Path:** `/dashboard/trackers`

**What it is**  
The inventory the SDK uses to allow or block scripts, cookies, pixels, and iframes.

**How to use it**

1. Run **Scanner**, or click to add a tracker manually.
2. For each **Unmapped** row, choose a **Vendor** and **Purpose**, then **Map Tracker**.
3. Mark **Essential** only if it is strictly necessary and tied to a **required** purpose.
4. Use Ignore only if you understand the item still will not be authorized to run.
5. Re-open website **Enforcement**.

**Unmapped optional trackers stay blocked and can block publish.**

---

## 4. Discovery & Monitoring

### 4.1 Scanner

**Path:** `/dashboard/scanner`

**What it is**  
Crawls the registered domain to find cookies, scripts, pixels, and other trackers.

**How to run a scan**

1. Confirm the website domain is correct.
2. Select the website.
3. Click **Start scan**.
4. Open the completed scan.
5. Map unmapped items on **Trackers**.

**Automatic scanning**

1. Turn **Automatic** on for a website.
2. Choose daily, weekly, or monthly.
3. Save. Scheduled runs also need an external cron job and `CRON_SECRET` on the server.

---

### 4.2 Privacy drift

**Path:** `/dashboard/monitoring`

**What it is**  
Findings when the site changes: new scripts, lost mappings, “shadow” trackers, page URLs.

**How to use it**

1. Complete a baseline scan after go-live.
2. Filter by website, severity, type, and status (open / reviewed / resolved).
3. Open a finding. Note the page URL if shown.
4. Fix the tag or map the tracker.
5. **Mark reviewed** or **Resolve**.

Findings do not close themselves. Open findings lower the quality score.

---

### 4.3 Privacy risk

**Path:** `/dashboard/risk`

**What it is**  
A priority view of unmapped trackers, gaps, and high-impact issues. It is **not** a legal risk assessment.

**How to use it**

1. Open after a scan.
2. Follow links to Trackers, Drift, or the website.
3. Fix the highest items first.

---

### 4.4 Consent quality

**Path:** `/dashboard/quality`

**What it is**  
An operational score from 0–100 based on published policy, tracker mapping, scan coverage, and open findings. **Not** a legal compliance percentage.

**How to use it**

1. Publish a policy and map trackers.
2. Read why points were lost.
3. Follow the links (map trackers, publish, scan, review drift).
4. Re-check after you fix gaps.

---

### 4.5 Analytics

**Path:** `/dashboard/analytics`

**What it is**  
How visitors respond: totals, daily mix, websites, purposes, countries, devices, browsers, policy versions.

**How to use it**

1. Collect live consent first.
2. Set the date range: 7 / 30 / 90 days / All time.
3. Filter by website if needed.
4. Use **Consent quality** when you want configuration gaps, not rates.

---

## 5. Intelligence

These tools help you plan and preview. They **do not auto-publish** a policy (except Autopilot steps that you explicitly approve). Pick a website on each page.

### 5.1 Consent firewall

**What it is**  
Preview which trackers would be **blocked or allowed** for Reject all, Essential only, or Accept all — using the same rules as the live SDK.

**How to use it**

1. Select a website.
2. Choose a scenario.
3. Fix anything that stays blocked in every scenario (usually unmapped).

---

### 5.2 Impact simulator

**What it is**  
Estimates how the **quality score** would change if you mapped trackers, resolved findings, published, or improved scan coverage.

**How to use it**

1. Select a website.
2. Read each scenario’s projected change.
3. Do the real work on Trackers / Drift / Policies, then refresh.

---

### 5.3 Experiments

**What it is**  
A/B tests for banner copy, layout, or buttons. Visitors are assigned a variant; the choice is recorded with that variant.

**How to use it**

1. You need a policy.
2. Start the experiment (weighted variants).
3. Let traffic collect.
4. Pause when done.
5. Put the winning copy into Banner Studio and publish.

---

### 5.4 Dependency graph

**What it is**  
A map of purposes ↔ vendors ↔ trackers.

**How to use it**

1. Select a website.
2. Look for missing links.
3. Fix them on Purposes, Vendors, and Trackers.

---

### 5.5 Recommendations

**What it is**  
An ordered list of configuration gaps with links to the page that fixes them.

**How to use it**

1. Select a website.
2. Open the first item.
3. Complete it, then return.

---

### 5.6 Data flow map

**What it is**  
Shows “what leaves the site for which purpose” — purpose → vendors → trackers.

**How to use it**

1. Select a website.
2. Trace each purpose.
3. Fill missing vendor or tracker links before you publish changes.

---

### 5.7 Cross-domain consent

**What it is**  
Export a signed consent bundle from website A and import it onto website B in the **same organization**.

**How to use it**

1. Copy a **Consent ID** from Consent records.
2. Select **From website** and click **Export portable consent**.
3. Select **Target website** and click **Import onto target website**.
4. Review the mapped decisions.

---

### 5.8 AI consent autopilot

**What it is**  
An assisted “next best actions” plan from quality score and simulator results. It does not silently publish.

**How to use it**

1. Select a website.
2. Generate / refresh the plan.
3. Follow each step (or approve a reversible step if offered).
4. Refresh to see an updated score.

---

### 5.9 Consent digital twin

**What it is**  
A snapshot of the current setup plus projected score changes for “what if” scenarios.

**How to use it**

1. Select a website.
2. Read baseline counts and open findings.
3. Compare before/after snapshots if you generate them.

---

### 5.10 Consent ROI engine

**What it is**  
Ranks fix scenarios by quality-score improvement × a points value. It is **not** a finance ledger.

**How to use it**

1. Select a website.
2. Optionally set monthly sessions, costs, and target score.
3. Run the engine.
4. Do the top scenario’s real work, then re-run.

---

### 5.11 Consent negotiation engine

**What it is**  
Builds an ordered plan to reach a target quality score (you can use `?target=90` in the URL).

**How to use it**

1. Select a website.
2. Generate the plan.
3. Open each action page in order.

---

### 5.12 AI-agent permissioning

**What it is**  
Answers: given this visitor’s consent record, may an AI agent use these purposes or vendor domains?

**How to use it**

1. Copy a Consent ID.
2. Select the website.
3. Enter purpose keys (example: `analytics`) and/or vendor domains.
4. Click **Evaluate agent permission**.
5. Read allowed vs denied and the reasons.

---

### 5.13 Data redaction

**What it is**  
Filters analytics so only purposes granted (or essential) for that consent ID are shown. This is not a general “hide all personal data” tool.

**How to use it**

1. Choose website and paste a Consent ID.
2. Set 7 / 30 / 90 days.
3. Load the redacted preview.

---

## 6. Security & Governance

### 6.1 Audit logs

**What it is**  
Who created, updated, published, or changed vendor roles.

**How to use it**  
Open after a publish failure or a config change. Search or scroll the list.

---

### 6.2 Notifications

**What it is**  
Workspace alerts (scans, findings, rights requests). The header bell opens the same stream.

**How to use it**

1. Open a notification.
2. Mark one read, or mark all read.

---

### 6.3 Privacy Rights

**Path:** `/dashboard/rights-requests`

**What it is**  
The operator inbox for data-subject requests (access, deletion, and similar). The public page `/privacy-request` is only for **status** and **identity verify** with a token — it is not the intake form. Intake is via API.

**How operators use a request** (Owner/Admin)

1. Open the request.
2. Assign yourself.
3. Issue verification or staff-attest if needed.
4. Generate an access/portability export, apply a correction, invoke withdrawal, or execute eligible deletion.
5. Update status (in review, in progress, completed, rejected, cancelled) and notes.
6. Downstream vendor chips are **orchestration only** — not proof a vendor deleted data.

---

## 7. Developer

### 7.1 SDK & API keys

**Path:** `/dashboard/developers`

**What it is**  
Install pointers plus API keys for your backends.

**How to create a key** (Owner/Admin)

1. Enter a **Key name**.
2. Choose **live** or **test**.
3. Optional expiry date.
4. Create the key. Copy the secret once.
5. Revoke later if it is leaked or unused.

Visitor sites should use the **Installation snippet**, not an API key in the browser.

---

### 7.2 Integrations

**What it is**  
Catalog of tools you can connect per website (analytics, tag manager, and similar). Google Consent Mode and IAB are mainly configured on **Website → Regulations**.

**How to use it** (Owner/Admin)

1. Pick a website on the card.
2. Click **Connect** or **Disconnect**.

---

### 7.3 Webhooks

**Path:** `/dashboard/developers/webhooks`

**What it is**  
Sends events to your HTTPS endpoint when consent or config changes.

**Events you can subscribe to**

- Consent granted / declined / withdrawn
- Policy created / published / archived
- Website created / updated
- Scan completed
- Tracker detected

**How to create one** (Owner/Admin)

1. Click to add an endpoint.
2. Enter name and HTTPS URL.
3. Tick events (or Select all).
4. Save. Copy the **signing secret** once.
5. Check deliveries if a downstream system missed an event.

---

## 8. Administration

### 8.1 Organization settings

**Who:** Owner/Admin to edit; Members see read-only

**What you can set**

- Organisation name, description, logo URL
- Timezone, default language, default region
- DPO and grievance officer contacts
- Mark onboarding completed

Click **Save settings**. Billing is a placeholder — billing is not enabled yet.

---

### 8.2 Data retention

**Who:** Owner/Admin

**What it is**  
How long evidence, current consent records, audit logs, and rights requests are kept (30–7300 days). **Legal holds** block deletion of a specific record.

**How to use it**

1. Set the day counts and save.
2. To hold a record: choose type, paste resource ID, enter a reason, create the hold.
3. Release the hold when the legal reason ends.

---

### 8.3 Team & roles

**Who:** Owner/Admin to invite

**How to invite**

1. Enter **Email**.
2. Choose **Member** (`org:member`) or **Admin** (`org:admin`).
3. Send invite.
4. Change role or remove later. Only an Owner can assign Owner.

---

## Public pages (not in the sidebar)

| Page | What it is | How to use |
| --- | --- | --- |
| `/sdk-demo` | Fake “external website” to test a site key | Paste site key → **Load SDK**. Invalid keys show **Website not found**. Use showBanner / acceptAll / rejectAll to test the public API. |
| `/privacy-request` | Status / verify for a rights request | Paste the token you were given. **Check status** or **Verify identity** → Continue. Unknown tokens show **Request not found** or **Verification failed**. |
| `/guardian-consent` | Guardian one-time token | Paste token → **Verify token**. Proving contact is not legal guardian authority. |

---

## Quick “I want to…” index

| I want to… | Go here |
| --- | --- |
| Get a banner live | Get live strip on Dashboard, then Installation |
| See who consented | Consent |
| Change banner look | Policies → Banner Studio → Save draft → Publish |
| Find cookies on my site | Scanner → Trackers |
| See if tags drifted | Privacy drift |
| Preview blocking | Consent firewall |
| Invite a teammate | Administration → Team & roles |
| Copy the install script | Websites → [site] → Installation |

---

## Common mistakes

1. **Snippet installed, no banner** — policy is still a draft. Publish first.
2. **Publish blocked** — open the policy compliance panel. Typical causes: missing purpose description, vendor role unknown, missing privacy URL, unmapped tracker, missing banner title/privacy URL, incomplete child or transfer settings.
3. **Vendor role left unknown** — set a real role and save.
4. **Region CA treated as California** — in this product CA is Canada.
5. **Essential tracker on an optional purpose** — essential must map to a required purpose.
6. **Quality score treated as legal compliance** — it is an operations score only.

---

*Consent Guru dashboard features guide. Operational scores and planners support configuration quality. They do not replace legal advice.*
