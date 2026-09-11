# CONSENTFLOW SECURITY FINDINGS

Audit date: 2026-09-11. Status values: **CONFIRMED** (code evidence), **LIKELY**, **POTENTIAL**, **NOT VERIFIED**. Secret values are redacted.

---

## Gap matrix

| ID | Finding | Severity | Location | Exploitable | Impact | Fix Priority | Status |
|---|---|---|---|---|---|---|---|
| SEC-001 | Invitee / missing local membership granted Owner | CRITICAL | `src/lib/bootstrap-current-context.ts` | Yes, authenticated invitee | Full tenant takeover | P0 | CONFIRMED |
| SEC-002 | Next.js 16.3.2 unauthenticated RCE advisories | CRITICAL | `package.json` `next@16.3.2` | Env-dependent | RCE / app compromise | P0 | CONFIRMED (advisory) |
| SEC-003 | Admin can promote any member (incl. self via collusion) to Owner | HIGH | `src/app/api/settings/team/role/route.ts` | Yes | Privilege escalation | P0 | CONFIRMED |
| SEC-004 | Member can mint live API keys and mutate core CMP config | HIGH | `src/app/api/api-keys/route.ts` + most CRUD | Yes | Key theft, policy/webhook abuse | P1 | CONFIRMED |
| SEC-005 | Webhook SSRF (weak allowlist + redirect follow) | HIGH | `webhooks/endpoints/route.ts`, `webhooks/delivery.ts` | Yes, authenticated | Cloud metadata / internal HTTP | P0 | CONFIRMED |
| SEC-006 | Portable consent trusts spoofable `Origin` | HIGH | `consent/portable/export` & `import` | Yes, if IDs known | Consent PII export / replay in-org | P1 | CONFIRMED |
| SEC-007 | Stored `javascript:` / `data:` XSS via banner & vendor URLs | HIGH | `banner-config.ts`, `cmp-sdk-script.ts` | Yes, Member | XSS on every CMP visitor page | P1 | CONFIRMED |
| SEC-008 | Webhook HMAC uses hash, not customer-shown secret | HIGH | `webhooks/endpoints/route.ts`, `delivery.ts` | Integrity failure | Forgery if DB hash leaked; customers cannot verify as documented | P1 | CONFIRMED |
| SEC-009 | SDK/consent unbound to domain; `verified` unused | HIGH | `public-http.ts`, `sdk/[siteKey]/config` | Yes | Config leak, consent pollution | P1 | CONFIRMED |
| SEC-010 | Public consent GET/withdraw by ID knowledge | MEDIUM | `consent/record`, `consent/withdraw` | If IDs leak | Read/withdraw visitor consent | P2 | CONFIRMED |
| SEC-011 | In-memory rate limit + trusted `X-Forwarded-For` | MEDIUM | `src/lib/rate-limit.ts` | Yes on multi-instance / spoof | Abuse, DSAR spam, consent flood | P1 | CONFIRMED |
| SEC-012 | CSRF allows missing Origin/Referer/Sec-Fetch-Site | MEDIUM | `security-headers.ts` 125–126 | Conditional | State-changing APIs without browser CSRF tokens | P1 | CONFIRMED |
| SEC-013 | Age-context HMAC has no production secret requirement | MEDIUM | `src/lib/children/context.ts` 18–24 | If secrets unset | Forged age/guardian context | P1 | CONFIRMED |
| SEC-014 | Policy/consent HMAC may use `DATABASE_URL` as key | MEDIUM | `policy-context.ts`, `consent-proof.ts` | If DB leaked | Forge consent proofs | P2 | CONFIRMED |
| SEC-015 | Domain verification SSRF weaker than scanner | MEDIUM | `website-domain-verify.ts` | Authenticated | Limited SSRF | P2 | CONFIRMED |
| SEC-016 | No Clerk webhooks; membership drift | MEDIUM | (missing) + bootstrap | Enables SEC-001 | Stale/wrong roles | P0 | CONFIRMED |
| SEC-017 | Hardcoded Postgres password + published 5432 | MEDIUM | `docker-compose.yml` | If compose used / repo leaked | DB compromise | P1 | CONFIRMED |
| SEC-018 | CSS injection via unsanitized banner colors | MEDIUM | `cmp-sdk-script.ts` style concat | Authenticated Member | UI redress / limited injection | P2 | CONFIRMED |
| SEC-019 | Public SDK exposes DPO/grievance emails + tracker map | MEDIUM | `sdk/[siteKey]/config/route.ts` | Anyone with siteKey | PII + evasion intel | P2 | CONFIRMED |
| SEC-020 | `sql.raw` string-built UUID array | MEDIUM | `dashboard/audit-logs/page.tsx` 151 | Low today | SQLi if IDs ever attacker-controlled | P2 | CONFIRMED |
| SEC-021 | Middleware does not require authentication | MEDIUM | `src/proxy.ts` | Defense-in-depth | Missed route auth | P2 | CONFIRMED |
| SEC-022 | Unsanitized `console.error(error)` | MEDIUM | many API routes | Log drain access | Secret/stack in logs | P2 | CONFIRMED |
| SEC-023 | CSP `frame-src http: https:` | LOW | `security-headers.ts` 51–52 | Low | Weak framing control | P3 | CONFIRMED |
| SEC-024 | No database RLS | MEDIUM | schema / migrations | After query bug | Cross-tenant at DB | P2 | CONFIRMED |
| SEC-025 | DSAR tokens returned in intake JSON | LOW | `rights-request/route.ts` 89–101 | If intercepted | Forge verification | P2 | CONFIRMED (by design) |
| SEC-026 | sharp / libheif high advisories | LOW–HIGH | transitive via Next | Env-dependent | Image codec bugs | P1 | CONFIRMED (advisory) |
| SEC-027 | `/api/test-db` on non-production | LOW | `api/test-db/route.ts` | Auth user on staging | Org-count oracle | P2 | CONFIRMED |
| SEC-028 | Health discloses DB health unauthenticated | LOW | `api/health/route.ts` | Yes | Recon | P3 | CONFIRMED |
| SEC-029 | Missing COOP on app HTML | LOW | headers | Low | Isolation hardening | P3 | CONFIRMED |
| SEC-030 | No CI/CD security scanning | LOW | (no `.github/workflows`) | N/A | Drift, vuln lag | P2 | CONFIRMED |
| SEC-031 | Last-Owner demote TOCTOU | LOW | `team/role/route.ts` 124–151 | Race | Zero owners | P3 | CONFIRMED |
| SEC-032 | Cron 503 reveals missing secret | LOW | `cron/scans/route.ts` 12–18 | Unauth | Config recon | P3 | CONFIRMED |
| INFO-001 | CORS `*` on public CMP APIs | INFO | `public-http.ts` | Intentional | Amplifies siteKey | — | CONFIRMED |
| INFO-002 | No file upload feature | INFO | — | — | — | — | CONFIRMED |
| INFO-003 | No `"use server"` actions | INFO | — | — | — | — | CONFIRMED |
| INFO-004 | sdk-demo `dangerouslySetInnerHTML` static | INFO | `sdk-demo/page.tsx` | No | — | — | CONFIRMED |

---

## SEC-001 — CRITICAL — Local Owner grant on missing membership

**Status:** CONFIRMED  
**CVSS v3.1 (estimate):** 8.8 `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H`  
**File:** `src/lib/bootstrap-current-context.ts`  
**Functions:** `ensureOwnerMembership`, `bootstrapCurrentContext`  
**Lines:** 45–75, 200–205, 266–270  

If Clerk says the user belongs to the org but no `memberships` row exists, the app **inserts Owner**. Invites are created as `org:member` / `org:admin` (`settings/team/invite/route.ts`) and never written locally until this path.

```45:70:src/lib/bootstrap-current-context.ts
async function ensureOwnerMembership(organizationId: string, userId: string) {
  return db.transaction(async (tx) => {
    // ...
    const [newMembership] = await tx
      .insert(memberships)
      .values({
        organizationId,
        userId,
        roleId: ownerRole.id,
        status: "active",
        joinedAt: new Date(),
      })
```

Creating a new org in the same file (lines 313–322) also always assigns Owner — acceptable for the **creator**, not for later joiners.

Same pattern when syncing a brand-new local org: `src/lib/sync-clerk-organization.ts` 106–113.

No Clerk webhook exists to create Member rows on invitation accept.

### ATTACK SCENARIO

```
ATTACK SCENARIO
Attacker: Authenticated invited user (org:member)
Step 1: Owner/Admin invites attacker as Member via /api/settings/team/invite.
Step 2: Attacker accepts Clerk invitation.
Step 3: Attacker opens /dashboard. layout.tsx calls bootstrapCurrentContext().
Result: Local role = Owner.
Impact: Full tenant control: API keys, webhooks (SSRF), policies, DSAR, retention purge, role changes.
```

### Fix

```
Current Problem → Security Risk → Recommended Architecture → Exact Code Change → Verification
```

- Map Clerk organization membership role → local role (`org:admin`→Admin, `org:member`→Member, creator only → Owner).
- Delete `ensureOwnerMembership` for existing orgs; use `ensureMembershipForClerkRole`.
- Add Clerk `organizationMembership.created|updated|deleted` webhooks with Svix verification.
- Verification: invite a Member, load dashboard, assert local role is Member; attempt `/api/api-keys` POST → 403 after SEC-004 fix.

---

## SEC-002 — CRITICAL — Next.js 16.3.2 RCE advisories

**Status:** CONFIRMED (dependency advisory). Exploitation in *this* deployment: **NOT VERIFIED** (no live exploit attempted).  
**CVSS:** Per GitHub advisories (critical). Do not invent a second number.  
**File:** `package.json` line 23 (`"next": "16.3.2"`)

`npm audit` reported:

1. GHSA-p293-qw3h-jr36 — Unauthenticated RCE on **Windows-hosted** Next servers (16.0.0–16.3.2).
2. GHSA-2xp9-vwfh-vxw4 — Unauthenticated RCE in Image Optimization when AVIF is used.

Also `sharp` high (SEC-026).

### ATTACK SCENARIO

```
ATTACK SCENARIO
Attacker: Unauthenticated
Step 1: Identify Next 16.3.2 from headers / error pages / this repo.
Step 2: Follow public advisory PoC against a Windows host, or Image Optimization AVIF path if enabled.
Result: Remote code execution in the Node process.
Impact: Full app + DATABASE_URL + Clerk secret access; all tenants.
```

Windows hosting is this developer’s OS; Vercel is typically Linux — **still patch**. Image-opt RCE is not Windows-only.

### Fix

Upgrade to patched Next (audit suggested `16.3.4` or later) and `npm audit` clean. Read each GHSA for required config flags. Re-run `npm audit` in CI.

---

## SEC-003 — HIGH — Admin can assign Owner

**Status:** CONFIRMED  
**CVSS estimate:** 7.2 `AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H`  
**File:** `src/app/api/settings/team/role/route.ts`  
**Function:** `POST`  
**Lines:** 70–151  

Guards: caller Owner or Admin; target in org; cannot demote last Owner. **No guard:** `newRole.name === "Owner"` requires caller Owner. UI loads all roles including Owner.

### ATTACK SCENARIO

```
ATTACK SCENARIO
Attacker: Authenticated Admin (or two colluding Admins)
Step 1: POST /api/settings/team/role { targetMembershipId: self, newRoleId: <Owner uuid> }
Step 2: Refresh session/local membership.
Result: Attacker is Owner.
Impact: Same as SEC-001.
```

### Fix

Only Owner may assign Owner. Admins may assign Admin/Member only. Optionally sync Clerk org role. Add unique partial index so last Owner cannot be removed (SEC-031).

---

## SEC-004 — HIGH — Membership-only authorization for privileged operations

**Status:** CONFIRMED  
**CVSS estimate:** 8.1 `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`  
**File:** `src/app/api/api-keys/route.ts` Function `POST` Lines 41–88  

Any active member can create **live** keys with scopes `consent:evaluate` and `data:redact`. Same membership-only pattern: websites, policies, **publish**, vendors, webhooks, scanner.

`authorizeOwnedPolicy` (`src/lib/compliance/http.ts`) checks membership, not role.

### ATTACK SCENARIO

```
ATTACK SCENARIO
Attacker: Authenticated Member (or Owner via SEC-001)
Step 1: POST /api/api-keys with environment live.
Step 2: POST /api/webhooks/endpoints to an attacker URL (SEC-005).
Step 3: POST /api/policies/[id]/publish.
Result: Long-lived server credential + data exfil + production notice change.
Impact: Consent evaluation/redaction API abuse; customer-site policy change.
```

### Fix

Central `requireOrgRole(ctx, ["Owner","Admin"])` on: API keys, webhooks, publish, scan-run, retention, org settings. Members: read-only or draft-only. Verification: Member token 403 on those routes.

---

## SEC-005 — HIGH — Webhook outbound SSRF

**Status:** CONFIRMED  
**CVSS estimate:** 8.5 `AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:L/A:N`  
**Create:** `src/app/api/webhooks/endpoints/route.ts` 96–126  
**Deliver:** `src/lib/webhooks/delivery.ts` 202–207  

Create blocks literal `localhost`, some RFC1918 regexes, `169.254.169.254` as hostname. Does **not** resolve DNS. Does **not** block decimal IPs, `metadata.google.internal` aliases, `100.64.0.0/10`, DNS rebinding.

Delivery:

```202:207:src/lib/webhooks/delivery.ts
        const response = await fetchImpl(endpoint.url, {
          method: "POST",
          headers: request.headers,
          body: request.body,
          signal: controller.signal,
        });
```

Default `fetch` **follows redirects**. An `https://attacker.example/redirect` → `http://169.254.169.254/` bypasses create-time hostname checks.

Scanner path (`ssrf-guard.ts` + `redirect: "manual"`) is the correct design and is **not reused**.

### ATTACK SCENARIO

```
ATTACK SCENARIO
Attacker: Authenticated Member (SEC-004)
Step 1: Create webhook URL https://<attacker>/r that 302s to http://169.254.169.254/latest/meta-data/ (or 127.0.0.1).
Step 2: Trigger an event (create website, record consent).
Step 3: Read metadata from webhook delivery logs (response body stored, truncated 2000 chars) or attacker server if using DNS rebind instead of redirect.
Result: SSRF; possible cloud credential theft on hosts with IMDS.
Impact: Platform compromise beyond the tenant.
```

### Fix

Call `assertSafeScanUrl` (or shared `assertSafeWebhookUrl`) at create **and** each delivery. `redirect: "manual"`. Allow only `https:` in production. Do not persist response bodies from private IPs. Verification: unit tests for redirect-to-metadata and DNS-to-loopback.

---

## SEC-006 — HIGH — Portable consent Origin spoof

**Status:** CONFIRMED  
**CVSS estimate:** 6.5 `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N` (needs consentId knowledge → maybe 5.3 if IDs secret; treat as 6.5 if IDs leak via XSS/analytics)  
**Files:**  
- `src/app/api/consent/portable/export/route.ts` Function `callerMayExport` Lines 198–217  
- `src/app/api/consent/portable/import/route.ts` Function `callerMayImport` Lines 256–274  

If no Clerk session, authorization is `Origin` hostname equals `websites.domain`. Any non-browser client can send `Origin: https://victim.com`.

HMAC on the portable bundle protects integrity of claims, **not** who is allowed to export.

Same-org target website required (limits cross-tenant import). Still exposes a visitor’s consent bundle (token/code plaintext on export).

### ATTACK SCENARIO

```
ATTACK SCENARIO
Attacker: Unauthenticated (script)
Step 1: Obtain consentId + websiteId (page JS, leaked analytics, SEC-007 XSS).
Step 2: GET/POST export with Origin: https://<registered domain> and targetWebsiteId in same org.
Step 3: Receive token/code; import elsewhere in-org or archive PII.
Result: Unauthorized portable export.
Impact: Consent preference + identity linkage disclosure; possible preference replay on sibling sites.
```

### Fix

Do not treat Origin as authentication. Require: (a) Clerk session, or (b) valid policyContext + siteKey + server-side recorded origin from the consent row, or (c) one-time user interaction token. Pin export to the consent’s websiteId. Verification: curl with spoofed Origin must 403.

---

## SEC-007 — HIGH — Stored XSS via policy/vendor URLs

**Status:** CONFIRMED  
**CVSS estimate:** 8.0 `AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N`  
**Files:**  
- `src/lib/banner-config.ts` `parseBannerConfig` 143–174 (no URL scheme check)  
- `src/lib/sdk/cmp-sdk-script.ts` ~1981, ~2452, ~2567  

```1979:1982:src/lib/sdk/cmp-sdk-script.ts
    if (cfg.privacyPolicyUrl && cfg.privacyPolicyText) {
      var pol = document.createElement('a');
      pol.href = cfg.privacyPolicyUrl;
```

`javascript:alert(document.domain)` or `data:text/html,...` executes in the **customer website origin** when a visitor clicks the privacy link (and some browsers navigate `javascript:` hrefs). Vendor `privacyPolicyUrl` has the same sink. `parseBannerConfig` / `optionalText(..., 500)` do not restrict schemes.

Titles use `textContent` (good). Colors concatenated into `style` (SEC-018).

### ATTACK SCENARIO

```
ATTACK SCENARIO
Attacker: Authenticated Member of the tenant
Step 1: Set banner privacyPolicyUrl to javascript:... or data:text/html;base64,...
Step 2: Publish policy (Member can).
Step 3: Visitors load CMP; click “Privacy policy”.
Result: XSS in customer origin — steal consentId, session cookies if not HttpOnly, deface notice.
Impact: Breaks the security of every site embedding this CMP for that tenant.
```

### Fix

Allow only `https:` (and `http:` on localhost). Reject `javascript:`, `data:`, `vbscript:`, `file:`. Apply in parse + SDK (`safeHref()`). Verification: set `javascript:alert(1)`, confirm href is empty and not clickable.

---

## SEC-008 — HIGH — Webhook signed with stored hash

**Status:** CONFIRMED  
**File:** `src/app/api/webhooks/endpoints/route.ts` 26–30; `src/lib/webhooks/delivery.ts` 68–79, 153–157  

`generateSigningSecret` returns `raw = whsec_…` and `hash = sha256(raw).hex`. Delivery HMAC key is `signingSecretHash`. Customers receive `raw`. Standard Stripe-style verify is HMAC(raw, timestamp.body). Here HMAC(hash, …).

**Risks:** (1) Honest consumers cannot verify with the secret they were shown. (2) DB leak of hashes **is** leak of HMAC keys (hashing did not add a verification-only layer).

### Fix

HMAC with the raw secret; store only a hash **for lookup/identification** or encrypt the secret at rest (KMS). Rotate all existing endpoints. Document verify algorithm. Add timestamp skew check for consumers (docs).

---

## SEC-009 — HIGH — siteKey is an origin-unbound capability token

**Status:** CONFIRMED (intentional design; still a finding for enterprise CMP)  
**Files:** `src/lib/sdk/public-http.ts` 5–8; `src/app/api/sdk/[siteKey]/config/route.ts` 84–101  

Comment states Origin is not an allowlist. `websites.verified` is never checked on SDK routes (grep). Config returns websiteId, signed policyContext, purposes, vendors, **full trackerRules**, grievance/DPO contacts (155–173).

### ATTACK SCENARIO

```
ATTACK SCENARIO
Attacker: Unauthenticated
Step 1: View victim page source / Network: site_... key.
Step 2: GET /api/sdk/{siteKey}/config from any origin (CORS *).
Step 3: POST /api/consent/record with issued policyContext.
Result: Read DPO emails + tracker map; insert bogus consent evidence/analytics.
Impact: Privacy contact harvesting; poisoned audit evidence; competitive intel.
```

### Fix

Enforce verified domain allowlist (exact + optional www) using `Origin`/`Referer` **and** reject missing Origin for browser SDK. Bind policyContext to origin. Rotate siteKey. Treat unverified sites as config-disabled. Keep CORS * only if allowlist still enforced server-side.

---

## SEC-010 — MEDIUM — Public consent read/withdraw

**File:** `src/app/api/consent/record/route.ts` GET; `src/app/api/consent/withdraw/route.ts`  
`consentId` is `cid_`+UUID (unguessable). Possession of IDs + `expectedStateVersion` allows GET and withdraw without siteKey.

**Fix:** Require siteKey or policyContext on withdraw/GET; bind to origin; consider sender proof (GPC still public by design).

---

## SEC-011 — MEDIUM — Rate limit not production-grade

**File:** `src/lib/rate-limit.ts` 18–76  

`Map` is per-isolate. `getClientIp` uses first XFF hop (spoofable unless platform overwrites). Affects consent, DSAR, portable, agent, scanner, cron.

**Fix:** Redis/Upstash/Vercel KV; trust platform IP only (`x-real-ip` / `cf-connecting-ip` after hop stripping).

---

## SEC-012 — MEDIUM — CSRF allow-missing-origin

**File:** `src/lib/security-headers.ts` 99–126; `src/proxy.ts` 26–43  

Documented for curl. Cookie-authenticated APIs should **fail closed**. Machine clients should use API keys (no cookies).

**Fix:** If `Sec-Fetch-Site` absent and Origin absent → 403 for cookie routes. Allowlist `CMP_CSRF_ALLOWED_ORIGINS` only with explicit Origin match.

---

## SEC-013 — MEDIUM — Age context secret fallback

**File:** `src/lib/children/context.ts` 18–24  

Unlike `policy-context.ts` (throws in production if empty), age HMAC always hashes `secret || DATABASE_URL || "cmp-dev-age-context"`.

**Fix:** Same production throw; never use a fixed string.

---

## SEC-014 — MEDIUM — HMAC keyed by DATABASE_URL

**Files:** `src/lib/policy-context.ts` 79–90; `src/lib/consent-proof.ts`; `src/lib/portable-consent-proof.ts`  

**Fix:** Require `POLICY_CONTEXT_SECRET` and `CONSENT_PROOF_SECRET` in production; independent of DB URL; rotate independently.

---

## SEC-015 — MEDIUM — Domain verify SSRF

**File:** `src/lib/website-domain-verify.ts`  

Weaker IP set than `ssrf-guard.ts`; DNS then fetch TOCTOU. `redirect: "manual"` is good.

**Fix:** Reuse `assertSafeScanUrl`.

---

## SEC-016 — MEDIUM — Missing Clerk webhooks

No `svix` / Clerk webhook route. Local users/orgs sync on dashboard bootstrap only. Enables SEC-001; also stale membership after Clerk removal until next request (and even then may re-Owner).

**Fix:** Webhook endpoint, signature verify, map roles, revoke local membership on Clerk delete.

---

## SEC-017 — MEDIUM — Committed database password

**File:** `docker-compose.yml` 7–11  

Plaintext `POSTGRES_PASSWORD` (redacted here) and `5432:5432`.

**Fix:** `${POSTGRES_PASSWORD}` from env; bind `127.0.0.1:5432`; rotate if repo was shared.

---

## SEC-018 — MEDIUM — CSS injection in banner colors

**File:** `src/lib/sdk/cmp-sdk-script.ts` ~1915–1917 and other `background:' + cfg.*Color`

**Fix:** Allow `#RGB` / `#RRGGBB` / `rgb()` only.

---

## SEC-019 — MEDIUM — Excessive public config

DPO/grievance emails may be legally required **on the first-layer notice**, but they should not be a JSON API for anonymous third parties without origin bind (SEC-009). Tracker rules help evasion.

**Fix:** Origin bind; split “notice contacts” vs “enforcement map”; consider hashing/minimizing tracker patterns.

---

## SEC-020 — MEDIUM — sql.raw audit log users

**File:** `src/app/dashboard/audit-logs/page.tsx` 145–151  

```ts
sql.raw(`ARRAY[${userIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)
```

IDs currently from DB. Still unsafe construction.

**Fix:** `inArray(users.id, userIds)` with UUID regex check.

---

## SEC-021 — MEDIUM — No edge auth gate

**File:** `src/proxy.ts` 13–58  

**Fix:** `auth.protect()` for `/dashboard(.*)` and `/api(.*)` with public path allowlist matching `isPublicCrossOriginApiPath` plus `/api/v1`, `/api/health`, `/api/cron`.

---

## SEC-022 — MEDIUM — Raw console.error

Dozens of API routes. `logger.ts` already sanitizes.

**Fix:** Replace with `logger.error`. Ban `console.error(error)` in lint.

---

## SEC-023 — LOW — Permissive frame-src

**File:** `src/lib/security-headers.ts` 51–52  

Studio iframes any http(s) origin. Limit to known preview origins or `frame-src` only on studio routes.

---

## SEC-024 — MEDIUM — No RLS

All isolation is in app SQL. Postgres role is typically a superuser app user (`consent_admin` in compose).

**Fix:** RLS policies `organization_id = current_setting('app.org_id')::uuid`; set in request; least-privilege DB user.

---

## SEC-025 — LOW — DSAR tokens in response

**File:** `src/app/api/rights-request/route.ts` 89–101  

By design for the portal. Tokens are bearer capabilities. In-memory rate limit (SEC-011) weakens abuse control. Return tokens only over the portal UI after CSRF; email the verify link.

---

## SEC-026 — HIGH (advisory) — sharp

Transitive via Next. Apply `npm audit fix` where possible without breaking Next.

---

## SEC-027 — LOW — test-db

**File:** `src/app/api/test-db/route.ts`  

404 only if `NODE_ENV === "production"`. Remove route or gate on explicit `ENABLE_DIAGNOSTICS`.

---

## SEC-028 — LOW — Public health DB status

Acceptable for load balancers; consider authenticating detailed checks; keep `/healthz` liveness without DB.

---

## SEC-029 — LOW — Missing COOP

Add `Cross-Origin-Opener-Policy: same-origin` on dashboard HTML.

---

## SEC-030 — LOW — No CI

Add GitHub Actions: `npm audit --audit-level=high`, lint, typecheck, unit tests including tenant isolation tests.

---

## SEC-031 — LOW — Last-Owner race

Two concurrent demotions can both pass the count check.

**Fix:** Transaction + `SELECT … FOR UPDATE` or deferrable constraint.

---

## SEC-032 — LOW — Cron config disclosure

Unauthenticated 503 message says secrets are unset. Return 401 uniformly.

---

## API inventory (grouped)

Authenticated dashboard APIs (Clerk + membership unless noted):  
`/api/websites`, `/api/websites/[id]`, verify, scan-schedule, jurisdiction-rules, consent-integrations, child-protection, legal-engine,  
`/api/policies`, `/api/policies/[id]/*` (publish, validate, banner-config, ab-test, purposes, vendors),  
`/api/purposes`, `/api/vendors`, `/api/trackers`, `/api/processing-activities`, `/api/transfers`, `/api/scanner/*`, `/api/monitoring/*`, `/api/intelligence/*`, `/api/analytics/consent`, `/api/search`, `/api/notifications/*`, `/api/integrations/*`, `/api/webhooks/endpoints`, `/api/api-keys`, `/api/age-assurance/[id]` (dashboard), `/api/regulations`, `/api/settings/*` (org, team, retention, legal-holds, rights-requests, iab/gvl), `/api/me`, `/api/sync-organization`.

Public: `/api/sdk/*`, `/api/consent/*` (except evidence), `/api/rights-request*`, `/api/age-assurance` POST, `/api/guardian-consent/verify`, `/api/health`.

Secret: `/api/cron/scans`, `/api/cron/iab-gvl`.

API key: `/api/v1/consent/evaluate`, `/api/v1/redact`, `/api/agent/permission` (or session).

Diagnostic: `/api/test-db`.

---

## File uploads

**None found.** No multipart avatar/logo pipeline. No malware scanning applicable.

---

## Inbound webhooks

**None found** (no Clerk/Svix receiver). Outbound webhooks: SEC-005, SEC-008.
