# Children, Age & Guardian Controls

This document describes Phase 8 of the Consent Management Platform: **server-authoritative children, age, and guardian controls**.

This is a **technical control system**. It does not constitute legal certification, parental-consent sufficiency, age-assurance certification, or compliance with COPPA, GDPR Article 8, DPDP, CPRA, LGPD, or any other law.

---

## Architecture

Phase 8 extends existing engines. It does **not** add a second consent engine or a second compliance validator.

| Layer | Existing system | Child-protection hook |
|---|---|---|
| Website config | `websites.child_protection` JSONB | Parsed by `parseChildProtectionConfig` |
| Consent write | `POST /api/consent/record` | `denyRestrictedDecisions` before persist |
| Consent evaluate | `evaluateConsentForTenant` / `evaluateConsentSnapshot` | `CHILD_RESTRICTED` |
| Tracker enforcement | `shouldBlock` + SDK `isBlocked` | `childRestrictedPurposeIds` |
| Policy context | HMAC signed policy context | HMAC signed `ageContext` |
| Publication | Phase 7 rule registry | Child-protection rule IDs |
| Evidence | Phase 5 snapshots `signals` JSONB | Minimized age/guardian state |
| DSAR | Phase 6 discovery / export / erasure | Operational age sessions only |
| Tokens | Phase 6 hashed rights tokens | Guardian authorization tokens |

Unknown age is **never** treated as adult. When child protection or age assurance is active, restricted processing fails closed until the server state allows it.

---

## State machine

Age status:

`unknown → asserted | minor | child | guardian_required | assured | guardian_verified | expired | failed`

Guardian status:

`none → pending → contact_verified / authority_unverified → verified | failed | expired`

Rules:

- A browser `age: 18` or `guardianVerified: true` claim is rejected.
- `SELF_DECLARATION` over the threshold becomes **`asserted`**, not **`assured`**.
- Restricted purposes unlock from self-declaration only if `minimumAssurance === "self_declaration"` (default is **`assured`**).
- Under-threshold + `guardianConsentRequired` becomes `guardian_required` / `pending`.
- Email token success proves **contact**, sets `authority_unverified`, and **does not** unlock restricted processing.
- Staff attestation (`kind: "age" | "guardian"`) is the only built-in path to `assured` / `guardian_verified`.
- Expired or failed state keeps restricted processing blocked.
- Essential / required purposes and essential trackers continue unless they are explicitly listed as restricted.

---

## Age-assurance methods

| Method | What it means | Unlocks restricted processing? |
|---|---|---|
| `self_declaration` | Visitor answered over/under | Only if `minimumAssurance` is `self_declaration` |
| `staff_verification` | Owner/Admin attested a session | Yes (`assured` / `guardian_verified`) |
| `guardian_verification` | Email token redeemed | No. Contact only. |
| `account_age` / `third_party_assurance` | Reserved | Not implemented. Do not mark verified. |

The product does **not** collect government ID, date of birth, passport, Aadhaar, biometrics, or identity documents.

Stored fields are minimized: `ageStatus`, `ageBand`, `assuranceMethod`, `assertedOverThreshold`, `guardianRequired`, `guardianStatus`, `expiresAt`.

---

## Guardian workflow

```text
MINOR / CHILD
  → GUARDIAN_REQUIRED
  → hashed one-time token created
  → token redeemed (contact proven)
  → GUARDIAN_AUTHORITY_UNVERIFIED
  → restricted processing still blocked
  → staff attest (optional operational unlock)
  → GUARDIAN_VERIFIED
  → only explicitly allowed purposes may activate
```

Email is not legal proof of parental responsibility. The UI and API say so explicitly.

Token rules (same pattern as Phase 6 DSAR):

- cryptographically random
- hashed at rest (`SHA-256`)
- single-use
- 24-hour expiry
- failed-attempt lock (5)
- tenant- and request-scoped
- no personal information in URLs
- raw token never stored

---

## SDK / runtime enforcement

The SDK receives:

- public `childProtection` (no secrets, no identity documents)
- signed `ageContext` (HMAC, tenant-scoped, expiring)

The SDK:

- shows “Some optional features require age verification.” when age is unknown
- shows “A parent or guardian must approve these optional features.” when guardian approval is pending
- labels the age gate as a **self-declaration**, never “Verified age”
- does not preselect restricted purposes
- forces restricted purpose grants to `false` unless the server says `restrictedProcessingAllowed`
- keeps advertising / behavioral trackers blocked through `isBlocked` / `shouldBlock`

`window.childMode = true` is ignored. Client age/guardian flags are not a security boundary.

Server consent evaluation also returns `CHILD_RESTRICTED` for restricted purposes and their trackers.

---

## Policy publication (Phase 7)

If a website is child-directed or child-protection is enabled, publish uses the existing validator. New rule IDs:

- `CHILD_PROTECTION_CONFIG_MISSING`
- `AGE_ASSURANCE_REQUIRED`
- `GUARDIAN_WORKFLOW_MISSING`
- `CHILD_RESTRICTED_PURPOSE_UNCONTROLLED`
- `CHILD_ADVERTISING_CONTROL_MISSING`

Jurisdiction-specific codes remain:

- GDPR / UK GDPR: `GDPR_CHILD_CONFIG_MISSING`
- DPDP: `DPDP_CHILD_CONFIG_MISSING`
- CCPA/CPRA family: `CCPA_MINOR_CONFIG_MISSING`
- LGPD: `LGPD_CHILD_CONFIG_MISSING`

There is **no global hard-coded age**. Each website sets `minimumAge`. Completeness of configuration is not legal sufficiency.

---

## Evidence, retention, DSAR

When consent is recorded, evidence `signals.childProtection` stores only:

- age status / guardian status
- assurance method
- whether restricted processing was allowed
- that self-declaration is not verified

No tokens, dates of birth, or raw contact details are written into immutable evidence.

**Retention**

- Operational sessions expire (`sessionTtlHours`, default 90 days).
- Guardian tokens expire in 24 hours.
- Immutable evidence follows Phase 5 evidence retention and legal holds.
- Expired operational rows are not a license to delete evidence.

**DSAR**

- Access/portability exports include minimized age-assurance state.
- Erasure deletes operational `age_assurance_sessions` (guardian rows cascade).
- `consent_evidence_snapshots` are preserved.
- Legal holds still block current-state deletion.

---

## Security

- Public APIs are siteKey + website scoped, rate limited, and CORS-enabled.
- Dashboard APIs require Clerk + org membership. Writes require Owner/Admin.
- Age context is HMAC-signed and tenant-bound.
- Guardian tokens are hashed, single-use, expiring, and lock after failures.
- Audit actions include `AGE_ASSURANCE_STARTED`, `MINOR_IDENTIFIED`, `GUARDIAN_REQUEST_CREATED`, `GUARDIAN_VERIFICATION_SENT`, `GUARDIAN_VERIFIED`, `GUARDIAN_VERIFICATION_FAILED`, `GUARDIAN_VERIFICATION_EXPIRED`.

---

## Admin and public UI

- Dashboard: `/dashboard/websites/[id]/child-protection`
- Public token page: `/guardian-consent`
- APIs:
  - `POST /api/age-assurance`
  - `GET /api/age-assurance/[id]?siteKey=&websiteId=`
  - `POST /api/guardian-consent/verify`
  - `GET|PUT /api/websites/[id]/child-protection`
  - `POST /api/websites/[id]/child-protection/attest`

Administrators see configuration and session IDs, not child or guardian identity documents.

---

## Limitations

- No third-party age-assurance vendor integration.
- No government-ID or biometric verification.
- Email token ≠ legal guardian authority.
- Staff attestation is an operational control, not a legal finding.
- No automated out-of-band email delivery of guardian tokens (the initiating flow may receive a one-time token for testing/handoff).
- Age thresholds are configured per website; the product does not certify the legally correct age for a jurisdiction.
- Browser dashboard verification of Clerk-protected pages is not a substitute for automated tests.

---

## Deployment

1. Apply migration `drizzle/0053_children_guardian_controls.sql` (journal tag `0053_children_guardian_controls`).
2. Or run the idempotent statements in `scripts/neon-ensure-schema.sql` / `scripts/apply-pending-schema.sql`.
3. Do **not** run `drizzle-kit push --force`.
4. Redeploy the app so SDK config, consent record, and publication validation pick up the new column/tables.
5. Configure each website under **Websites → Child protection**.
6. Publish is blocked until required child controls are complete for child-directed/enabled sites.

---

## Testing

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx drizzle-kit check
```

Covered automatically:

- unknown age blocks restricted processing
- self-declaration ≠ assured
- expired / failed / pending guardian stay blocked
- token reuse / expiry / lock
- client cannot forge signed age context or set `guardianVerified`
- advertising/behavioral trackers remain blocked
- tenant/website scoping on admin and public routes
- publication blocked without controls, succeeds when configured
- Phase 1–7 regression suites
