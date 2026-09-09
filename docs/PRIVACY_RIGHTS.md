# Privacy Rights / DSAR

The CMP provides a tenant-scoped workflow for privacy-rights requests. It extends the existing `data_principal_requests` model rather than replacing it.

> The CMP provides technical workflow support for privacy-rights requests. Applicability, legal deadlines, exemptions, identity requirements, and final responses remain dependent on the customer's applicable law and configuration.

This is not a GDPR, DPDP, CCPA/CPRA, or LGPD compliance certification.

## Architecture

Requests are operational workflow records. They are distinct from:

- **Current operational data** — mutable consent records and decisions that may be exported, corrected, withdrawn, or deleted where eligible.
- **Immutable evidence** — `consent_evidence_snapshots` and append-only consent events. DSAR deletion never deletes these.

## Request lifecycle

```text
verification_pending
        ↓ (identity token or staff attestation)
verified
        ↓
in_review
        ↓
in_progress
        ↓
completed
```

Terminal states: `rejected`, `expired`, `cancelled`.

Legacy rows may still use `received` / `acknowledged`. Clients cannot PATCH a request to `verified` or `completed`. Status transitions are enforced server-side.

## Identity verification

A request is not actionable because someone knows a URL or email address.

1. Intake creates the request as `verification_pending`.
2. A single-use identity token and a longer-lived status token are issued.
3. Tokens are stored hashed, expire, and are rate-limited.
4. Successful verification moves the request to `verified`.
5. Failed, reused, expired, or locked tokens do not reveal whether another request exists.

Organization membership does **not** prove the caller is the data subject. Owner/Admin may staff-attest an out-of-band identity check.

## Authorized agents

`requester_kind` may be `direct_requester` or `authorized_agent`. Agent requests require an authorization note and verified/attested status before completion.

## Jurisdiction

Configured applicability exists for `dpdp`, `gdpr`, `ccpa`, and `lgpd`. The jurisdiction and available-rights snapshot are stored at submission time and are not recalculated later.

Deadlines are **configured targets**, stored separately from any claim of a legally mandated SLA.

## Access / portability

Verified Owner/Admin operators can generate JSON exports stored in `rights_request_exports` (authenticated download, 24-hour expiry, not public files).

- **Access** may include current state, decisions, event summaries, and historical evidence references.
- **Portability** is limited to structured current consent/decision state. The export states that not every CMP record is claimed to be legally portable.

## Deletion

Deletion is a reviewed workflow, not a raw SQL delete:

1. Verify requester
2. Discover tenant-scoped records
3. Check legal holds
4. Delete eligible current consent state
5. Anonymise related event payloads
6. Preserve evidence snapshots
7. Record the outcome and audit the action

Active legal holds block deletion. Requesters cannot release holds.

## Correction

Only `requesterName`, `requesterPhone`, `description`, and `consentId` can be changed, after verification and Owner/Admin review.

## Objection / restriction / withdrawal

Objection and restriction are workflow types with operator review. They do not automatically withdraw consent.

`withdraw_consent` (and optional objection follow-up) reuses the existing Phase 2 withdrawal engine and writes a new evidence snapshot. Historical evidence is unchanged.

## Retention

Rights-request retention remains a Phase 5 category, independent from consent-evidence retention. Changing DSAR retention does not rewrite evidence.

## Admin UI

- `/dashboard/rights-requests` — list, filters, assigned admin, SLA chips
- `/dashboard/rights-requests/[id]` — request, verification, data, holds, assignment, activity, actions
- `/privacy-request` — requester status / verify token entry

Verification secrets are never stored in the UI after the one-time display. Cancelled, rejected, or expired requests cannot complete a verification challenge.

Activity is loaded from organization-scoped audit records for that request only. Tokens and other secrets are not written to audit metadata.

## Security

- Tenant is resolved from the Clerk session and server-side org membership, never from a client `organizationId`.
- View: Owner, Admin, Member
- Destructive/export/status execution: Owner, Admin
- Public verify/status endpoints are rate-limited and enumeration-resistant
- Exports are org-scoped, authenticated, and expire
