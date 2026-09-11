# CONSENTFLOW SECURITY ROADMAP

**Date:** 2026-09-11  
**Current production status:** 🟡 HARDENED — set production secrets and Clerk webhook; remaining: distributed rate limit, RLS, MFA  
**P0 and most P1/P2 items below are implemented.** Residual: SEC-011 (Redis/shared rate limit), SEC-022 (logger cleanup), SEC-024 (RLS).

---

## P0 — Fix immediately (breach / takeover / RCE)

| Order | ID | Action | Why first | Owner skillset | Verify |
|---|---|---|---|---|---|
| 1 | SEC-001 + SEC-016 | Stop `ensureOwnerMembership` for existing orgs. Map Clerk roles. Add Clerk membership webhooks (Svix). Backfill: demote accidental Owners who are Clerk `org:member`. | Any invited user is a full admin today. | Auth | Invite Member → local Member; webhook revoke removes access |
| 2 | SEC-002 + SEC-026 | Upgrade Next.js past GHSA-p293-qw3h-jr36 / GHSA-2xp9-vwfh-vxw4; refresh sharp | Unauthenticated RCE advisories on the locked version | Platform | `npm audit` clean for these GHSA |
| 3 | SEC-005 | Shared SSRF guard on webhook create **and** deliver; `redirect: "manual"`; https-only in prod | Authenticated SSRF → metadata/internal | Backend | Tests: redirect to 169.254.169.254 rejected |
| 4 | SEC-003 | Only Owner can assign Owner; sync Clerk org role | Closes remaining vertical escalation | Auth | Admin POST Owner → 403 |

**Exit criteria:** No code path grants Owner except org creator / explicit Owner action. Dependencies patched. Egress to link-local/metadata impossible via webhooks.

---

## P1 — Fix before production

| Order | ID | Action | Why |
|---|---|---|---|
| 5 | SEC-004 | Role-gate API keys, webhooks, publish, scanner run, integrations | Member must not be a production operator by default |
| 6 | SEC-007 + SEC-018 | https-only URLs; hex-only colors in parser **and** SDK | XSS on every customer origin |
| 7 | SEC-009 | Enforce verified domain / Origin allowlist on SDK + consent writes | Stops silent siteKey replay from arbitrary origins |
| 8 | SEC-006 | Remove Origin-as-auth for portable export/import | Stops curl Origin spoof of consent bundles |
| 9 | SEC-008 | Sign webhooks with the raw secret; encrypt/hash properly at rest; rotate `whsec_` | Customers can verify; DB hash ≠ HMAC key |
| 10 | SEC-011 | Distributed rate limit; platform IP | DSAR/consent/API abuse on serverless |
| 11 | SEC-012 | CSRF fail-closed when Origin missing | Cookie APIs |
| 12 | SEC-013 + SEC-014 | Dedicated HMAC secrets required in production; no DATABASE_URL keying | Proof forgery |
| 13 | SEC-017 | Compose password from env; don’t publish 5432 publicly; rotate | Credential leak |

**Exit criteria:** Member cannot create live keys or webhooks. Public CMP calls fail from disallowed origins. Portable export fails without a real browser session or proof stronger than Origin. `npm run` production boot fails without HMAC secrets.

---

## P2 — Fix soon

- SEC-010: siteKey/policyContext on public consent GET/withdraw  
- SEC-015: domain-verify uses scanner SSRF guard  
- SEC-019: minimize public tracker/DPO JSON for anonymous callers  
- SEC-020: replace `sql.raw` with `inArray`  
- SEC-021: `auth.protect()` in `proxy.ts` with explicit public allowlist  
- SEC-022: all errors through `logger`  
- SEC-024: Postgres RLS + least-privilege DB role  
- SEC-025: email DSAR verify links; don’t return both tokens in one JSON if avoidable  
- SEC-027: delete `/api/test-db`  
- SEC-030: CI (`npm audit`, tenant isolation tests, typecheck)  
- SEC-031: transactional last-Owner protection  

---

## P3 — Future hardening

- SEC-023: tighten `frame-src` to studio-only  
- SEC-028: split liveness vs authenticated readiness  
- SEC-029: COOP `same-origin` on dashboard  
- SEC-032: generic 401 on cron  
- WAF / bot management on public intake  
- siteKey rotation UI  
- Outbound webhook mTLS or allowlisted IP for enterprise  
- Pen test with two real orgs  
- Secret scanning (gitleaks) in CI  
- Review Clerk MFA / hijack protection in Clerk Dashboard (NOT VERIFIED in repo)

---

## Suggested implementation waves

**Wave A (1–3 days):** SEC-001/003/016 role mapping; Next upgrade; webhook SSRF.  
**Wave B (3–7 days):** RBAC on keys/publish/webhooks; URL/color sanitization; HMAC env requirements.  
**Wave C (1–2 weeks):** Origin allowlist + portable auth redesign; distributed rate limit; CSRF fail-closed; webhook signing rotation.  
**Wave D:** RLS, CI, CSP, logging cleanup, DSAR token UX.

---

## Production gate checklist

Do **not** call the product production-ready until:

- [ ] Invited Member cannot perform Owner actions  
- [ ] `npm audit` has no critical/high on runtime deps (or documented exceptions)  
- [ ] Webhook delivery cannot follow redirects to private IPs  
- [ ] SDK config denied from unlisted origins  
- [ ] Portable export denied with spoofed Origin  
- [ ] Banner `javascript:` URLs rejected  
- [ ] Production requires dedicated HMAC and cron secrets  
- [ ] Rate limiting is shared across instances  
- [ ] Compose/prod DB credentials are not in git  

---

## Residual risk after P0–P1

CMP siteKeys will still be visible in HTML (inherent). Consent IDs in browser storage remain stealable via *customer-site* XSS outside this app. Clerk remains a third-party IdP dependency. Scanner DNS rebinding TOCTOU remains Low. These are acceptable for enterprise if documented.
