# CONSENTFLOW SECURITY AUDIT
==========================

**Product:** ConsentFlow (repository `consent-manager`)  
**Scope:** Full repository (application code, configuration, SDK, APIs, database layer, dependencies)  
**Date:** 2026-09-11  
**Method:** Source-code audit with targeted local dependency scanning (`npm audit`). No production systems were attacked. No secrets are printed in this report.  
**Application code changed:** None (audit-only phase).

```
CONSENTFLOW SECURITY AUDIT
==========================

Overall Security Score: 5.3 / 10

Production Readiness:
🟠 PRODUCTION WITH MAJOR SECURITY FIXES REQUIRED

Critical Findings: 2
High Findings: 8
Medium Findings: 14
Low Findings: 9
Informational: 4

Biggest Security Risk:
Invited (or otherwise Clerk-joined) users are granted local Owner on first dashboard load when a local membership row is missing. This is a confirmed privilege-escalation path to full tenant administration.

Biggest Data-Breach Risk:
Authenticated operators can create webhooks whose URLs are only hostname-blocklisted. Delivery uses fetch() with default redirect following, so an open redirect or DNS-to-private-IP host can reach cloud metadata and internal services. Combined with Next.js 16.3.2 unauthenticated RCE advisories, a compromised or Windows-hosted deployment can become a full platform breach.

Biggest Authentication Risk:
Edge middleware never calls auth.protect(). Dashboard HTML is gated in layout; every API route must self-enforce. There is no Clerk webhook to keep local membership/roles aligned with Clerk. Missing local membership is “fixed” by granting Owner.

Biggest Multi-Tenant Risk:
Authenticated IDOR on org-scoped dashboard resources is generally blocked (queries join organizationId). Isolation is application-enforced only (no Postgres RLS). The public SDK treats siteKey as a cross-origin capability token with no domain allowlist, so tenant notice config, DPO contacts, and tracker rules are readable by anyone who copies a siteKey.

Biggest API Risk:
Public portable-consent export/import trusts a client-supplied Origin header as proof the caller is on the customer domain. Cookie-authenticated mutations allow missing Origin/Referer (intentional for curl), weakening CSRF. Rate limits are process-local Maps and trust X-Forwarded-For.

Biggest SDK Risk:
siteKey is public and unbound to Origin. Banner/vendor URLs are assigned to <a href> without an https-only allowlist, enabling stored javascript: / data: XSS on every page that loads the CMP. Color values are concatenated into style attributes (CSS injection).

Top 5 Things That Must Be Fixed:
1. Stop granting Owner to any user who lacks a local membership; map Clerk org:member / org:admin to local roles; add Clerk organization webhooks.
2. Upgrade Next.js (and sharp) off GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4.
3. Reuse the scanner SSRF guard for webhook create and deliver; disable redirect following.
4. Bind public SDK/consent traffic to verified domains (or at least an allowlist); stop trusting Origin for portable consent.
5. Enforce RBAC on mutations (API keys, publish, webhooks, websites) and forbid Admin→Owner promotion.
```

---

## 1. How secure is the application overall?

ConsentFlow is **not a naive prototype**. It has real security work: Clerk on the server, per-route `auth()`, organization-scoped Drizzle queries for most dashboard APIs, HMAC policy-context tokens for consent writes, hashed API keys, a strong scanner SSRF guard, baseline security headers, Clerk CSP strict mode, CSRF origin checks for cookie APIs, Zod/length guards on some public JSON, consent crypto proofs, and audit logs for many admin actions.

It is also **not enterprise-ready** as implemented. The local authorization model is inconsistent and, in one path, **actively unsafe**: missing membership becomes Owner. Public CMP endpoints are capability-token based with **no origin binding**. Outbound webhooks are an SSRF hole relative to the scanner. Dependencies currently include **critical Next.js RCE advisories**. There is no CI security pipeline, no database RLS, and rate limiting will not hold on serverless.

**Judgement:** Suitable for a locked-down internal/staging demo. **Not suitable for production enterprise customers holding real consent, DSAR, and DPO data until P0/P1 items are fixed.**

---

## 2. What is actually secure vs insecure

### Controls that appear correct (evidence-based)

| Control | Evidence | Residual |
|---|---|---|
| Dashboard HTML requires Clerk `userId` | `src/app/dashboard/layout.tsx` 67–70 | Middleware still open |
| Most dashboard APIs require session + local membership | e.g. `src/lib/compliance/http.ts` `authorizeOwnedPolicy` | Role often ignored |
| Resource-by-id queries typically include `organizationId` | policies, purposes, vendors, API keys, trackers, rights requests, evidence | No RLS |
| Org ID is taken from Clerk session, not client body | API helpers + tenant regression tests | — |
| API keys stored hashed; plaintext shown once | `src/lib/api-key-utils.ts`, `src/lib/api-key-auth.ts` | Member can mint keys |
| v1 evaluate/redact require scoped bearer keys | `src/app/api/v1/consent/evaluate/route.ts` | In-memory rate limit |
| Consent write requires signed policy context | `src/lib/policy-context.ts`, `consent/record` | siteKey still public |
| Consent overwrite uses stateVersion + submissionId lock | `src/app/api/consent/record/route.ts` | Knowledge of IDs still powerful |
| Scanner SSRF: DNS + private IP + manual redirects | `src/lib/scanner/ssrf-guard.ts` | DNS rebinding TOCTOU |
| Cron uses timing-safe secret compare, min length 16 | `src/lib/scanner/cron-auth.ts` | 503 leaks “not configured” |
| Logger redacts secrets/emails in structured logs | `src/lib/logger.ts` | Many routes use `console.error` |
| CSP via Clerk `strict` + extra directives | `src/proxy.ts`, `src/lib/security-headers.ts` | `frame-src http: https:` |
| HSTS in production when HTTPS | `shouldSendHsts` | Relies on `x-forwarded-proto` |
| No `"use server"` actions found | grep | — |
| No user file-upload pipeline found | grep | — |
| Search API org-scoped + ILIKE wildcard stripped | `src/app/api/search/route.ts` | — |

### Controls that exist but are implemented incorrectly

| Control | What’s wrong |
|---|---|
| Local RBAC (Owner/Admin/Member) | Invite + bootstrap ignore Clerk role and grant Owner |
| Team role change | Admins can assign Owner |
| CSRF origin check | Returns true when Origin, Referer, and Sec-Fetch-Site are all absent |
| Webhook URL “SSRF block” | Hostname string checks only; `fetch` follows redirects |
| Webhook signatures | HMAC key is SHA-256 **hash** of `whsec_…`, not the secret given to the customer |
| Age-context HMAC | No production throw; falls back to `DATABASE_URL` or a fixed dev string |
| Policy/consent HMAC | Production can use `DATABASE_URL` as key material |
| Rate limiting | In-process `Map`; IP from first `X-Forwarded-For` hop |
| Domain verification | Exists in schema/UI; **not consulted** by SDK/consent routes |
| `test-db` | 404 only when `NODE_ENV === "production"` (preview/staging often not) |

### Controls that are missing

- Clerk organization/user webhooks (membership lifecycle)
- Middleware `auth.protect()` for `/dashboard` and authenticated `/api`
- Domain allowlist / origin binding for SDK and consent write
- Postgres RLS / tenant constraints at the database
- Distributed rate limiting
- CI (GitHub Actions) and dependency/security scanning in pipeline
- `Cross-Origin-Opener-Policy` / dashboard `Cross-Origin-Resource-Policy`
- HTTPS-only URL sanitization for banner/vendor links
- Central `requireRole()` used by all mutating APIs
- Idempotency/replay protection on inbound customer webhooks (outbound only)
- File malware scanning (N/A — no uploads)
- Secret scanning / `.env.example` documenting required production secrets

---

## 3. Authentication

**Provider:** Clerk (`@clerk/nextjs` ^7.8.0).  
**Edge:** `src/proxy.ts` uses `clerkMiddleware` only for CSRF, CORS preflight, CSP, and headers. `_auth` is unused. There is no `auth.protect()`, no `authorizedParties`.

**Server-side dashboard:** YES — `layout.tsx` redirects unauthenticated users.  
**Server-side API:** PARTIAL — each handler must check `auth()`. A missed check is an open endpoint. Confirmed unauthenticated (by design or weak):

| Route | Auth model |
|---|---|
| `/api/health` | None (DB up/down) |
| `/api/sdk/*` | siteKey |
| `/api/consent/*` | IDs / siteKey / Origin |
| `/api/rights-request*` | Public tokens |
| `/api/age-assurance*`, `/api/guardian-consent/verify` | siteKey / tokens |
| `/api/cron/scans`, `/api/cron/iab-gvl` | `CRON_SECRET` |
| `/api/test-db` | Any Clerk user if not production |
| `/api/v1/*` | API key |
| `/api/agent/permission` | API key or session |

**Session:** Clerk-managed (expiration, logout, cookies). NOT VERIFIED in this audit: Clerk Dashboard MFA, session lifetime, hijacking protections — those live in Clerk config, not this repo.

**Impersonation / org switch:** Client-supplied `organizationId` takeover was not found. Tenant comes from Clerk `orgId`. Fallback `resolveActiveClerkOrgId` uses first membership if session org is empty (not attacker-chosen).

**Invitations:** Clerk invitations with `org:admin` / `org:member` are **not mapped** into local `memberships` until bootstrap, which then calls `ensureOwnerMembership`. **THIS IS NOT SECURE.**

**Account enumeration:** Rights-request intake returns 404 for unknown `websiteId` (website oracle). Invite duplicate returns whether email is already pending (low).

---

## 4. Authorization / RBAC matrix

Local roles used in code: **Owner**, **Admin**, **Member**. Permissions tables exist in the schema/UI but **mutating APIs rarely consult them** — they use string allowlists or membership-only.

| Resource | Read | Create | Update | Delete | Required role (actual) | Tenant isolated |
|---|---|---|---|---|---|---|
| Websites | Member+ | Member+ | Member+ | Member+ | membership only | Yes (orgId) |
| Policies / publish | Member+ | Member+ | Member+ | Member+ | membership only (`authorizeOwnedPolicy`) | Yes |
| Purposes | Member+ | Member+ | Member+ | Member+ | membership | Yes |
| Vendors | Member+ | Member+ | Member+ | Member+ | membership | Yes |
| Consent records (dashboard evidence) | Member+ | Public SDK | Public SDK | N/A | membership for evidence GET | Yes for dashboard |
| Analytics | Member+ | — | — | — | membership | Yes |
| SDK config | Public | — | — | — | siteKey | No (public) |
| API keys | Member+ | **Member+** | Member+ (revoke) | Member+ | **should be Owner/Admin — is not** | Yes |
| Webhooks | Member+ | Member+ | Member+ | Member+ | membership | Yes |
| Org settings | Member read / Owner+Admin write | — | Owner/Admin | — | gated | Yes |
| Team invite/role | Owner/Admin | Owner/Admin | Owner/Admin | Owner/Admin | gated, **but Admin can assign Owner** | Yes |
| Rights requests (manage) | Member view | Public intake | Owner/Admin | Owner/Admin | partially gated | Yes |
| Retention / legal hold / purge | Owner/Admin | Owner/Admin | Owner/Admin | Owner/Admin | gated | Yes |
| Users (Clerk) | Owner/Admin via Clerk | Invite | Role API | Remove | mixed | Yes |

**Vertical escalation:** CONFIRMED — missing local membership → Owner; Admin → Owner via role API.  
**Horizontal escalation (Org A → Org B dashboard data):** NOT CONFIRMED for authenticated IDOR on core entities.

---

## 5. Multi-tenant isolation

**Application layer:** Generally `WHERE id = ? AND organization_id = ?` or join through `websites.organizationId`. Helpers: `getTenantWebsite`, `authorizeOwnedPolicy`, `loadOwnedTracker`, `loadOwnedRightsRequest`, `loadOwnedVendorRecord`.

**Database layer:** Foreign keys exist. **No RLS.** A compromised query or missed filter is a cross-tenant read. Superuser DB credentials in `docker-compose.yml` are committed.

**Public layer:** Isolation is “knows siteKey / websiteId / consentId”. That is **not** tenant isolation against a motivated attacker who can read HTML or network traces.

**Pass 2 attacker questions:**

- *Steal another customer’s dashboard data?* Changing IDs on authenticated APIs should 404 if org filters hold. Steal **public CMP config and DPO emails** via siteKey: yes.
- *Become administrator?* Invite accept + first `/dashboard` load → Owner. Or Admin promotes to Owner.
- *Abuse public SDK?* Copy siteKey; call config/record from any origin; pollute consent; scrape tracker rules.
- *Bypass publishing?* Any Member can publish if compliance validator passes; client compliance claims are ignored (good), role is not required (bad).
- *Malicious website?* Load victim siteKey; javascript: banner URL XSS on **your** site if you are a Member of that tenant; SSRF via webhooks if authenticated.
- *Low-privilege user?* Member ≈ full operator except team/org/retention/rights-manage.

---

## 6. API security (inventory pattern)

There are **100+ `route.ts` handlers** under `src/app/api`. Full per-method rows are in `SECURITY_FINDINGS.md` grouped by surface. Summary:

| Surface | Auth | AuthZ | Validation | Rate limit | Risk |
|---|---|---|---|---|---|
| Dashboard CRUD (`/api/websites`, policies, vendors, …) | Clerk | membership, rarely role | mixed Zod/manual | sparse | HIGH (RBAC) |
| Team / org / retention | Clerk | Owner/Admin | manual | sparse | HIGH (Owner assign) |
| `/api/sdk/*` | siteKey | none | format checks | some | HIGH (unbound) |
| `/api/consent/record\|withdraw` | IDs + HMAC context | none | JSON size limits | in-memory | MEDIUM–HIGH |
| `/api/consent/portable/*` | session **or Origin** | Origin spoofable | HMAC bundle | in-memory | HIGH |
| `/api/consent/evidence/*` | Clerk + org | membership | — | no | OK tenant |
| `/api/v1/*` | API key + scope | org of key | yes | in-memory | OK if keys protected |
| `/api/webhooks/endpoints` | Clerk | membership | weak URL check | in-memory | HIGH SSRF |
| `/api/cron/*` | cron secret | — | — | in-memory | OK if secret strong |
| `/api/rights-request*` | public + tokens | token = capability | email regex | in-memory | MEDIUM |
| `/api/health` | none | — | — | none | LOW |
| `/api/test-db` | Clerk, non-prod | none | — | none | MEDIUM staging |

**CSRF:** Cookie POSTs to `/api/*` except public paths require Origin/Referer/same-origin Sec-Fetch-Site — **unless all are missing**, then allow. Classic browser CSRF is mostly blocked (`cross-site` rejected). SameSite Clerk cookies likely reduce risk. Incomplete vs Fetch from non-browser cookie holders.

**CORS:** Public SDK/consent: `Access-Control-Allow-Origin: *` without credentials — expected for CMP, amplifies siteKey use from any origin.

---

## 7. Input validation / XSS / injection

- Public JSON: size cap 64KB (`readPublicJsonObject`).
- Banner config: `parseBannerConfig` merges raw fields; **does not** restrict URL schemes or color tokens.
- SDK: `textContent` for titles (good); `href` and inline `style` concatenation (bad).
- `dangerouslySetInnerHTML` on `/sdk-demo` is static demo strings (informational).
- `new Function` in `scroll-lock.ts` is a static factory, not user input (low).
- SQL: Drizzle parameterized almost everywhere. **Exception:** `sql.raw` array of user IDs on audit-logs page (IDs from DB UUIDs today — still a dangerous pattern).
- No classic SQLi in public APIs confirmed.

---

## 8. Secrets & cryptography

- No `.env` committed. No live `sk_live` in app source (test fixtures only).
- `NEXT_PUBLIC_APP_URL` is the only `NEXT_PUBLIC_*` — acceptable.
- **`docker-compose.yml` contains a plaintext Postgres password** and publishes `5432:5432`. Treat as compromised if this repo was shared; rotate; do not reuse.
- HMAC secrets for policy context / consent proof: require dedicated secret **or** `DATABASE_URL` in production. DB leak ⇒ signature forgery.
- Age context: can use fixed `"cmp-dev-age-context"` if neither dedicated secrets nor `DATABASE_URL` are set — **no production guard**.
- Webhook: customer shown `whsec_…`; server HMAC-SHA256 uses **SHA-256 hex of that string**. Recipients verifying with the shown secret will fail unless they hash first. Anyone with DB `signing_secret_hash` can forge.

---

## 9. SDK

| Question | Answer |
|---|---|
| Public vs secret | `siteKey` is documented as a public capability token. API keys are the secret. |
| Impersonate another website | Yes, if you have their siteKey. No Origin check. `websites.verified` unused on SDK routes. |
| Forge consent | Create new records for that site with stolen siteKey + server-issued `policyContext`. Cannot blindly overwrite unknown `consentId`s. |
| Rotate/revoke siteKey | Site key generated at website create; rotation not evidenced as a first-class control. |
| Secrets in browser | Policy context HMAC is a **token**, not the server secret. API keys must not be in the SDK (not found). |

---

## 10. Consent / privacy data

Stored: consent decisions, policy versions, `visitorId`, user-agent (analytics hints in metadata), jurisdiction, crypto proofs, DSAR requester name/email/phone, tokens.

Access: dashboard evidence is Clerk + org scoped. Public GET `/api/consent/record` returns decisions given `consentId`+`websiteId`.

Retention/purge APIs exist and are Owner/Admin gated. Tamper resistance: HMAC proofs help integrity, not confidentiality. Public withdraw is knowledge-based.

---

## 11. Webhooks

Outbound only (no Clerk inbound webhook). Signing headers exist (`X-CMP-Signature`, timestamp, event id). **No redirect lock, no DNS revalidation at deliver, no replay window documented for consumers.** Create-time SSRF list is incomplete (see findings).

---

## 12. Headers & CSP

**Present (baseline):** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, restrictive `Permissions-Policy`, HSTS in production HTTPS, Clerk CSP `strict` (nonce / strict-dynamic expected from Clerk).

**Extra CSP:** `base-uri self`, `object-src none`, `frame-ancestors self`, `img-src` includes data/blob, **`frame-src http: https:`** (banner studio). That last directive **makes frame-src effectively any web origin**.

**Absent:** COOP, CORP on dashboard HTML (public APIs set CORP `cross-origin` intentionally).

**CSP strength:** Useful against inline script on Clerk-protected HTML if nonces work. **Does not protect customer sites** that load the CMP SDK (their CSP is theirs). `unsafe` Clerk exceptions may exist for Clerk itself — NOT VERIFIED at runtime.

---

## 13. Dependencies / Next.js

`package.json` pins `next: 16.3.2`. `npm audit` (2026-09-11):

- **Critical:** Next.js unauthenticated RCE on **Windows-hosted** servers — GHSA-p293-qw3h-jr36  
- **Critical/High:** Next.js Image Optimization AVIF RCE — GHSA-2xp9-vwfh-vxw4  
- **High:** `sharp` libheif advisories  

Fix available: Next `16.3.4` (audit suggested). **Do not assume Vercel is immune without reading both advisories**; Windows RCE is environment-specific; image-opt may not be.

No GitHub Actions. Lockfile `package-lock.json` is present (npm). No suspicious postinstall in direct deps reviewed.

---

## 14. Errors, logging, rate limit, uploads, SSRF, races

- Client dashboard errors use digests (`dashboard/error.tsx`). API JSON messages are mostly generic. **`console.error(error)`** on many routes can put stacks/connection strings into platform logs.
- Rate limit: in-memory, spoofable IP — **cannot be relied on in production/serverless**.
- Uploads: **none found**.
- SSRF: scanner strong; domain-verify medium; **webhooks high**.
- Races: consent record uses advisory lock (good). Role change last-Owner check is TOCTOU (medium). Webhook create vs deliver URL mutation (medium).

---

## 15. Deployment

- `vercel.json`: hourly cron → `/api/cron/scans` (expects Vercel `CRON_SECRET`).
- `docker-compose.yml`: hardcoded DB password, host port 5432.
- No Dockerfile found for the app.
- Preview deployments: `NODE_ENV` may not be `production` → `test-db` and HMAC dev fallbacks more likely. **NOT VERIFIED** on a live Vercel project (no access).

---

## 16. Areas NOT VERIFIED

- Live Clerk Dashboard settings (MFA, attack protection, allowed origins, session).
- Production env vars actually set (`POLICY_CONTEXT_SECRET`, `CRON_SECRET`, `DATABASE_URL` SSL).
- Runtime CSP header contents (Clerk-generated).
- Whether Vercel deployment uses Windows (almost certainly not) vs AVIF image pipeline enabled.
- Penetration test of IDOR with two live orgs (static review + helper patterns only).
- Whether `CMP_CSRF_ALLOWED_ORIGINS` is set in prod (could widen CSRF).
- Customer-site CSP interaction with SDK `innerHTML` of static SVG (static SVG is low risk).

---

## 17. Production readiness rationale

**🟠 PRODUCTION WITH MAJOR SECURITY FIXES REQUIRED**

Reasons: confirmed Owner privilege escalation; Next.js critical advisories in the locked version; webhook SSRF; public Origin trust; Member-level operator powers including API keys; in-memory rate limits; committed DB password.

After P0/P1, this codebase could become a credible CMP. Libraries (Clerk, Drizzle, Zod, Next) did **not** automatically make the implementation secure.

See `SECURITY_FINDINGS.md`, `SECURITY_SCORE.md`, `SECURITY_ROADMAP.md`, `OWASP_ASSESSMENT.md`.
