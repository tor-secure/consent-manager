# CONSENTFLOW OWASP TOP 10 ASSESSMENT

**Date:** 2026-09-11  
**Framework:** OWASP Top 10:2021 (mapped to this codebase)  
**Scoring:** PASS / PARTIAL / FAIL / NOT VERIFIED  

**OWASP rollup: 4 / 10** (count PARTIAL as 0.5, PASS as 1, FAIL as 0, NOT VERIFIED as 0)

| # | Category | Status |
|---|---|---|
| A01 | Broken Access Control | FAIL |
| A02 | Cryptographic Failures | PARTIAL |
| A03 | Injection | PARTIAL |
| A04 | Insecure Design | FAIL |
| A05 | Security Misconfiguration | PARTIAL |
| A06 | Vulnerable and Outdated Components | FAIL |
| A07 | Identification and Authentication Failures | PARTIAL |
| A08 | Software and Data Integrity Failures | PARTIAL |
| A09 | Security Logging and Monitoring Failures | PARTIAL |
| A10 | Server-Side Request Forgery | FAIL |

---

## A01 Broken Access Control

**Status:** FAIL  

**Evidence:**  
- `ensureOwnerMembership` on missing local membership (`bootstrap-current-context.ts` 200–205, 266–270).  
- Admin can set role to Owner (`settings/team/role/route.ts` 70–151).  
- Member can create API keys (`api-keys/route.ts` 41–88) and publish policies (`authorizeOwnedPolicy` membership-only).  
- Positive: most ID lookups include `organizationId`; no client org takeover found.

**Findings:** SEC-001, SEC-003, SEC-004, SEC-006, SEC-010, SEC-021, SEC-024.

**Risk:** Tenant administrator takeover; Member as operator; portable consent export without being on the site.

**Recommended fix:** Map Clerk roles; Owner-only Owner assignment; `requireOrgRole` on privileged mutations; fail-closed CSRF; RLS.

---

## A02 Cryptographic Failures

**Status:** PARTIAL  

**Evidence:**  
- API keys hashed (SHA-256), shown once.  
- Consent/policy HMAC exists; production can key off `DATABASE_URL`.  
- Age context can use a fixed dev string with no production throw.  
- Webhook HMAC uses stored hash as key (SEC-008).  
- Consent metadata stores user-agent; visitorId stored.  
- HTTPS/HSTS only when production + https proto.

**Findings:** SEC-008, SEC-013, SEC-014, SEC-017.

**Risk:** Proof forgery if DB URL leaks; webhook consumers cannot verify; compose password leak.

**Recommended fix:** Independent production secrets; correct webhook MAC; never commit DB passwords; minimize PII in metadata (hash UA/IP if needed).

---

## A03 Injection

**Status:** PARTIAL  

**Evidence:**  
- Drizzle parameterized queries dominate.  
- `sql.raw` UUID list in `audit-logs/page.tsx` 151.  
- Stored XSS via unsanitized `href` (`cmp-sdk-script.ts` ~1981).  
- CSS concatenation of colors.  
- Public JSON size limits.  
- `new Function` in scroll-lock is static source.

**Findings:** SEC-007, SEC-018, SEC-020.

**Risk:** Customer-origin XSS; latent SQLi pattern.

**Recommended fix:** https-only URL allowlist; hex colors; `inArray`; lint ban on `sql.raw` with interpolation.

---

## A04 Insecure Design

**Status:** FAIL  

**Evidence:**  
- siteKey designed as origin-unbound capability token (`public-http.ts` 5–8).  
- Origin header used as portable-consent authentication.  
- Domain `verified` unused on SDK routes.  
- RBAC tables exist but are not the enforcement point for most mutations.  
- Knowledge of `consentId` authorizes withdraw.  
- Rate limit designed as process-local Map.

**Findings:** SEC-006, SEC-009, SEC-010, SEC-011, SEC-016.

**Risk:** The CMP trust boundary is “secrecy of identifiers that are published in browsers.” That is insecure design for enterprise consent evidence.

**Recommended fix:** Domain binding, verified-only SDK, portable consent without Origin-as-auth, distributed limits, Clerk webhooks as part of the identity design.

---

## A05 Security Misconfiguration

**Status:** PARTIAL  

**Evidence:**  
- Baseline headers + Clerk CSP strict + Permissions-Policy + HSTS: present.  
- `frame-src http: https:` weakens CSP.  
- CSRF fail-open without Origin.  
- `/api/test-db` on non-production.  
- docker 5432 published.  
- No CI, no `.env.example`.  
- Health unauthenticated.

**Findings:** SEC-012, SEC-017, SEC-021, SEC-023, SEC-027, SEC-028, SEC-029, SEC-030, SEC-032.

**Risk:** Staging oracles, weak framing, leaked local DB, missing automated gates.

**Recommended fix:** Fail-closed CSRF; remove diagnostics; tighten CSP per-route; COOP; CI; compose bind localhost.

---

## A06 Vulnerable and Outdated Components

**Status:** FAIL  

**Evidence:** `npm audit` on 2026-09-11 against `next@16.3.2`:

- Critical: GHSA-p293-qw3h-jr36 (Windows RCE)  
- Critical: GHSA-2xp9-vwfh-vxw4 (Image Optimization AVIF RCE)  
- High: sharp libheif  

No GitHub Actions to block merges.

**Findings:** SEC-002, SEC-026, SEC-030.

**Risk:** Unauthenticated RCE depending on host and image pipeline.

**Recommended fix:** Patch immediately; CI `npm audit --audit-level=high`; pin and review Next releases.

---

## A07 Identification and Authentication Failures

**Status:** PARTIAL  

**Evidence:**  
- Clerk used server-side on dashboard.  
- API keys scoped and hashed.  
- Cron timing-safe compare, min length 16.  
- Middleware does not require auth.  
- No local session invalidation on Clerk membership removal until request + broken Owner grant.  
- MFA/session policy: **NOT VERIFIED** (Clerk Dashboard).

**Findings:** SEC-001, SEC-016, SEC-021.

**Risk:** Authentication of HTTP is mostly present; **identity-to-role binding is wrong**.

**Recommended fix:** Webhooks + role map; edge protect; verify Clerk MFA in production tenant.

---

## A08 Software and Data Integrity Failures

**Status:** PARTIAL  

**Evidence:**  
- Policy context HMAC binds consent writes to a notice snapshot (good).  
- Consent crypto proofs (good).  
- Webhook signatures exist but key material is the hash (bad).  
- No lockfile integrity in CI.  
- No in-repo SBOM/signing.  
- Client compliance claims ignored on publish (good: `ignoreClientComplianceClaims`).

**Findings:** SEC-008, SEC-014, SEC-030.

**Risk:** Downstream webhook consumers get unverifiable or incorrectly documented signatures; unsigned dependency pipeline.

**Recommended fix:** Correct HMAC; npm ci in CI; consider provenance later.

---

## A09 Security Logging and Monitoring Failures

**Status:** PARTIAL  

**Evidence:**  
- `auditLogs` on role change, invites, API keys, compliance publish.  
- `logger.ts` redacts secrets/emails.  
- Many routes `console.error(error)` bypass redaction/stack rules.  
- No alerting configuration in repo.  
- Login success/failure lives in Clerk, not locally (acceptable if Clerk retained).

**Findings:** SEC-022.

**Risk:** Incident response gaps; secret leakage to log drains.

**Recommended fix:** Standardize logger; alert on role changes to Owner, API key create, webhook create, retention purge.

---

## A10 SSRF

**Status:** FAIL  

**Evidence:**  
- Scanner: strong (`ssrf-guard.ts`, manual redirects) — **this part would be PASS**.  
- Webhooks: hostname regex only + default redirect follow — **FAIL**.  
- Domain verification: weaker than scanner — PARTIAL.

Overall category is FAIL because a primary outbound feature (webhooks) is exploitable.

**Findings:** SEC-005, SEC-015.

**Risk:** Cloud metadata, localhost admin ports, internal HTTP.

**Recommended fix:** One shared SSRF library for all egress: scanner, verify, webhooks, future integrations.

---

## Mapping notes

- **PASS** would require evidence the control works end-to-end, not merely a library import.  
- Clerk, Zod, Drizzle, and Next were **not** counted as automatic passes.  
- Runtime CSP nonce behavior and live Clerk MFA remain **NOT VERIFIED**.
