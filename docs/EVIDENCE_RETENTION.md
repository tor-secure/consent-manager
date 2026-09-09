# Evidence Retention and Immutable Consent History

This document describes how the CMP separates **current consent state** from **historical consent evidence**, and how retention cleanup, legal holds, and withdrawals behave.

This is a technical architecture note. It is not a legal compliance certification. Retention periods are configurable and should be selected based on the customer’s applicable legal and business requirements.

## Current state vs historical evidence

### Current consent state

Mutable operational data used for evaluation, the preference center, withdrawal, re-consent, and SDK/API reads:

- `consent_records`
- `consent_decisions`

These rows may be updated, replaced, or deleted according to the configured current-consent retention policy.

### Historical consent evidence

Immutable proof of what existed at decision time:

- `consent_evidence_snapshots` — signed notice, decisions, policy context, jurisdiction, locale, variant, hashes
- `consent_events` — append-only lifecycle events with their own organization, website, and consent identifiers

Historical evidence is independently understandable. It must not be reconstructed from today’s policy, tracker mapping, purpose, or vendor configuration.

**Deleting current consent state does not delete historical consent evidence.**

## Immutability

`consent_evidence_snapshots` is append-only at the database layer.

- Ordinary `UPDATE` is rejected by trigger `consent_evidence_snapshots_immutable`.
- Ordinary `DELETE` is rejected by the same trigger.
- There is no `PATCH /api/evidence/:id` or `DELETE /api/evidence/:id` for ordinary users.
- Automated retention cleanup never deletes evidence snapshots.
- If a privileged legal-hold / legal-deletion workflow is required later, it must be a separate path. The trigger only permits delete when the transaction-local setting `app.allow_evidence_retention_delete` is `on`. The application cleanup job does not set that flag.

Changing tracker mappings, purposes, vendors, or publishing a new policy version does not rewrite existing snapshots.

## Foreign keys

| Child | Parent | On delete |
|---|---|---|
| `consent_decisions.consent_record_id` | `consent_records` | `CASCADE` (current-state only) |
| `consent_events.consent_record_id` | `consent_records` | `SET NULL` |
| `consent_evidence_snapshots.consent_record_id` | none | informational only |
| `consent_evidence_snapshots` org/website/policy/version | those tables | `RESTRICT` |
| `portable_consent_exchanges.source_consent_record_id` | `consent_records` | `SET NULL` |

`consent_events` also stores `organization_id`, `website_id`, and `consent_id` so the event remains tenant-scoped after the current record is removed.

## Withdrawal and re-consent

Grant:

1. Current record is created or updated.
2. Evidence #1 is inserted with the v1 notice snapshot, hash, and decisions.

Withdraw:

1. Current record becomes `withdrawn`.
2. Evidence #1 is left unchanged.
3. Evidence #2 is inserted with withdrawn decisions and the same historical notice/policy context.

Re-consent after policy v2:

1. Current record and decisions are replaced.
2. Evidence #1 still refers to v1.
3. Evidence #2 (or later) refers to v2.

## Retention configuration

Administrators configure four categories under **Dashboard → Data retention**:

| Category | Default | Automated delete |
|---|---|---|
| Historical evidence | 1825 days, disabled | Never by the cleanup job |
| Current consent records | 1825 days, enabled | Yes, if past cutoff and not on legal hold |
| Audit logs | 2555 days, disabled | Only if explicitly enabled |
| Rights requests | 1825 days, disabled | Only if explicitly enabled |

These defaults are product starting points, not legally mandated periods.

Changing retention configuration does not rewrite existing evidence.

## Legal holds

`legal_holds` can cover `consent_evidence`, `consent_record`, `audit_event`, or `rights_request`.

A record under an active hold is skipped by cleanup. Releasing the hold makes it eligible again according to the retention rules.

## Cleanup behavior

`runRetentionCleanup`:

1. Resolves the authenticated organization’s retention configuration.
2. Loads candidates in bounded batches (`200`).
3. Skips legal holds, disabled categories, in-window records, other tenants, and immutable evidence.
4. Deletes only eligible current/operational rows.
5. Writes `RETENTION_DELETE_EXECUTED` without extra personal data.

Tenant A cannot read, hold, or purge Tenant B data. Organization IDs are taken from the authenticated session, not the request body.

## Migration

Apply `drizzle/0051_evidence_retention.sql` after `0050`.

The migration:

- backfills event tenant identifiers from current records
- changes the events FK to `ON DELETE SET NULL`
- makes evidence `consent_record_id` nullable
- adds `variant_id` on evidence
- creates `retention_policies` and `legal_holds`
- preserves the append-only evidence trigger
- does not delete existing evidence snapshots
