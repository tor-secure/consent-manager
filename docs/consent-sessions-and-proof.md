# Consent sessions and proof lifecycle

Consent Guru consent records, decisions, receipts, and evidence snapshots remain the authoritative receipt system. Sessions add a short-lived grouping and replay control around consent changes.

## Sessions

The SDK creates a 256-bit random session token in `sessionStorage` before submitting consent. The API stores only its SHA-256 hash, associates it with organization, website, policy version, consent record, expiry, and decision count, and returns the token only to that browser. Session tokens expire after 30 minutes or when the consent expires, whichever comes first. Consent submission IDs and state versions continue to protect duplicate/stale updates; session decision counts use atomic compare-and-update semantics. Withdrawal revokes the linked active session.

## Proof versions and key rotation

New consent-record proofs use proof version 2 and bind consent ID, website, policy version, status, choice, jurisdiction, decisions, timestamp, and session ID. Existing v1 canonicalization remains verifiable. Evidence snapshots retain their own proof key ID and version so historical signatures can be verified after rotation.

Configure server-only `CONSENT_PROOF_KEYS` as comma-separated `key-id:secret` values, with the active signing key first. To rotate, add a new key first and retain old keys after it for verification. Remove a historical key only when records signed by it no longer need verification. `CONSENT_PROOF_SECRET` remains the legacy key for proofs with no key ID. The key metadata API returns IDs and statuses only, never key material.

## Structured privacy events

`privacy_events` contains organization/site-scoped identifiers, event type, provenance, structured payload, and event/creation timestamps. Event payloads reject common identity/secret fields and are size limited by the management API. Consent creation/change/withdrawal, session creation/revocation, and runtime observation events are recorded. The model/API also supports policy, tracker, enforcement, scan, experiment, and transfer event types.

## APIs and UI

- `POST /api/consent/sessions` creates an organization-authorized short-lived session for a site's published policy and returns its bearer token once.
- `GET /api/consent/sessions` and `GET /api/consent/sessions/:sessionId` return scoped metadata without token hashes.
- `DELETE /api/consent/sessions/:sessionId` revokes an active session (Owner/Admin).
- `GET /api/consent/evidence/:consentId` returns policy, decisions, session metadata, proof version/key ID, proof verification, and ordered privacy events.
- `GET /api/consent/proof-keys` returns public key lifecycle metadata only.
- `GET /api/privacy-events` provides organization-scoped event history. Events are written by their Consent Guru workflows; there is no generic event-ingestion route that could forge observed or enforced evidence.
- Dashboard views: **Consent → Consent sessions**, **Consent → Privacy events**, and the consent record's **Cryptographic consent proof** page.

Session bearer tokens and private proof-key values are never returned by evidence, session history, or key metadata endpoints.
