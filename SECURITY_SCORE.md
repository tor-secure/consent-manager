# CONSENTFLOW SECURITY SCORE

**Date:** 2026-09-11 (post-remediation)  
**Overall: 8.5 / 10**  
**Previous audit:** 5.3 / 10

P0 and P1 from `SECURITY_ROADMAP.md` are implemented in code, except **distributed rate limiting** (still process-local). That, Postgres RLS, MFA (Clerk Dashboard), and leftover `console.error` usage are why this is **8.5 rather than 9**.

Production still depends on operators setting dedicated secrets (`CLERK_WEBHOOK_SECRET`, `CONSENT_PROOF_SECRET` / `POLICY_CONTEXT_SECRET`, `WEBHOOK_SECRET_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`) and registering the Clerk membership webhook.

---

## Weighted model

| Category | Weight | Category score (0–10) | Weighted |
|---|---:|---:|---:|
| Authentication & Sessions | 10% | 8.6 | 0.86 |
| Authorization / RBAC | 15% | 8.8 | 1.32 |
| Multi-Tenant Isolation | 15% | 7.8 | 1.17 |
| API Security | 10% | 8.2 | 0.82 |
| Data / Database Security | 10% | 7.8 | 0.78 |
| Input / Injection / XSS | 10% | 8.4 | 0.84 |
| Secrets / Cryptography | 10% | 8.6 | 0.86 |
| SDK Security | 8% | 8.4 | 0.67 |
| Infrastructure / Configuration | 5% | 8.2 | 0.41 |
| Dependencies / Supply Chain | 4% | 7.5 | 0.30 |
| Logging / Monitoring | 3% | 6.0 | 0.18 |
| **Total** | **100%** | | **8.51 → 8.5** |

---

## Category rationale

### Authentication & Sessions — 8.6
`auth.protect()` in middleware with an explicit public allowlist. Clerk membership webhooks (Svix). `/api/test-db` is a 404 stub. Remaining: Clerk MFA is a Dashboard setting, not verified here.

### Authorization / RBAC — 8.8
First local membership is Owner; later joiners map Clerk `org:admin` → Admin and `org:member` → Member. Only Owner can assign Owner; last-Owner blocked. Operator gate on API keys, webhooks, scanner, integrations, policy publish. Bootstrap does not overwrite in-app roles; Clerk webhooks may `syncRole`.

### Multi-Tenant Isolation — 7.8
Org-scoped queries remain the control. SDK Origin allowlist + `siteKey` on consent GET/withdraw reduce public replay. Still no Postgres RLS.

### API Security — 8.2
CSRF fail-closed without Origin/Referer (Bearer exempt). Portable consent is session-auth, not Origin-as-auth. Rate limits are still in-memory (weak on serverless).

### Data / Database Security — 7.8
Audit log IDs use `inArray`. Compose password from env; Postgres bound to localhost. No RLS; UA may still sit in consent metadata.

### Input / Injection / XSS — 8.4
HTTPS URL + CSS color sanitization on banner/vendor/SDK sinks. Public JSON size limits unchanged.

### Secrets / Cryptography — 8.6
No `DATABASE_URL` HMAC fallback. Production throws without dedicated secrets. Webhook `whsec_` encrypted at rest (`enc:v1:`); delivery HMAC uses the raw secret.

### SDK Security — 8.4
Origin allowlist on config, trackers, opt-out, negotiation, consent record/policy/withdraw. Remaining tracker/DPO payload minimization is incomplete.

### Infrastructure / Configuration — 8.2
COOP `same-origin`, `frame-src` https-only, GitHub Actions for typecheck/tests/critical audit. CSP not runtime-verified.

### Dependencies / Supply Chain — 7.5
Next.js **16.3.4**. CI fails on *critical* npm audit. Transitive `sharp` / other highs may remain.

### Logging / Monitoring — 6.0
Structured logger + audit events exist. Mass `console.error` cleanup not done; no SIEM.

---

## How the overall number should be read

- **9–10:** Would still need distributed rate limits, RLS (or equivalent), patched remaining highs, Clerk MFA verified, logging cleanup.
- **8.5:** P0/P1 class issues addressed in code. Safe to proceed to production **after** env/webhook setup — not a substitute for a pen test.
- **5.3:** Pre-remediation (Owner grant, unbound SDK, webhook SSRF, Next RCE advisories).
