# Vendors, Processors, Data Processing Relationships & Cross-Border Transfers

This document describes Phase 9 of the Consent Management Platform: **vendor, processor, processing-activity, and cross-border transfer inventory**, with an **immutable published-policy snapshot**.

This is a **technical inventory and publication-control system**. It does not constitute legal certification, adequacy, SCC validity, DPA sufficiency, or proof that a vendor deleted or corrected personal data.

---

## Architecture

Phase 9 extends existing engines. It does **not** add a second consent, compliance, evidence, or vendor engine.

| Layer | Existing system | Phase 9 hook |
|---|---|---|
| Vendors | `vendors`, `vendor_purposes`, `purposes`, `trackers` | Role, DPA metadata, processing countries, archive |
| Processing | New org-scoped tables | Activities, processor relationships, transfers |
| Publication | Phase 7 `evaluatePolicyCompliance` | Inventory rules + freeze `processing_snapshot` |
| Evidence | Phase 5 `consent_evidence_snapshots.signals` | Copy frozen snapshot, never live vendor tables |
| DSAR | Phase 6 discovery / export / erasure | Downstream action tracking only |
| Auth | Clerk org + membership | Every query scoped by `organizationId` |

---

## Published-policy snapshot

On successful publish, the server writes a minimized deterministic JSON snapshot to `consent_policy_versions.processing_snapshot` for **that version only**.

- Drafts validate against **live** inventory.
- New drafts created after a published version get `processing_snapshot: {}`. They must be re-validated and re-frozen on the next publish.
- A published row is never updated with live vendor/transfer changes (`UPDATE ... WHERE is_published = false`).
- Historical policies and consent evidence must not resolve vendor/transfer configuration from today's live tables.

Consent recording copies `evidenceProcessingInventory(contextVersion.processingSnapshot)` into `signals.processingInventory` when the version snapshot is frozen. Policy/version/context/notice binding from Phase 1 remains authoritative.

---

## Validation rules (server-side, never client-trusted)

Errors that block publish:

- `VENDOR_ROLE_MISSING`
- `INACTIVE_VENDOR_REFERENCED`
- `VENDOR_DPA_CONFIGURATION_MISSING` (processor/subprocessor + GDPR family or org `settings.processingInventory.dpaRequired`)
- `PROCESSING_ACTIVITY_PURPOSE_MISSING`
- `PROCESSING_ACTIVITY_DATA_CATEGORY_MISSING`
- `TRANSFER_DESTINATION_MISSING`
- `TRANSFER_MECHANISM_MISSING` (inventory record or required transfer without a complete transfer)
- `TRANSFER_SAFEGUARD_MISSING`
- `SUBPROCESSOR_RELATIONSHIP_MISSING`

Warning:

- `TRANSFER_REVIEW_EXPIRED`
- Existing declaration `TRANSFER_MECHANISM_MISSING` is skipped when inventory already covers the transfer

Client `validated` / `jurisdiction` / `organizationId` claims are ignored.

---

## DSAR

Downstream vendor actions (`rights_downstream_actions`) are operator-recorded orchestration:

`not_required | required | pending | sent | acknowledged | completed | failed | manually_handled`

Recording `completed` does **not** mean this CMP performed or verified an external vendor's deletion or correction.

---

## Soft delete

Vendors, activities, and transfers are archived. Hard delete is not used for records historical evidence may reference.

---

## APIs

- `GET/POST /api/vendors`
- `GET/PATCH/DELETE /api/vendors/[id]` (`DELETE` archives)
- `POST /api/vendors/[id]/purposes` (existing; optional `processingRole`)
- `POST/PATCH /api/vendors/[id]/relationships`
- `GET/POST /api/processing-activities`, `GET/PATCH /api/processing-activities/[id]`
- `GET/POST /api/transfers`, `GET/PATCH/DELETE /api/transfers/[id]`
- `PATCH /api/settings/rights-requests/[id]/downstream`

Public SDK vendors may include `role` only. DPA, contacts, notes, and credentials are not exposed.

---

## Deployment

1. Apply migration `drizzle/0054_vendors_processors_transfers.sql` (journal tag `0054_vendors_processors_transfers`).
2. Do **not** run `drizzle-kit push --force`.
3. Restart the app. Existing published versions keep empty snapshots until those versions are republished through a new draft.
