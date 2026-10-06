# Transfer authorization and secure transfer

Consent Guru's transfer authorization extends the existing cross-border transfer inventory. A transfer must still reference its existing vendor recipient and processing activity. Authorization binds that transfer to the exact site, recipient vendor, processing activity purpose, consent record, the currently granted purpose decision, and (when a live session is available) the consent session. A generic `consent=true` state is never sufficient. The decision must still be present and granted when an envelope is created; withdrawal, a changed decision, expired consent/session, a revoked authorization, a revoked recipient key, or an inactive transfer blocks execution.

The dashboard location is **Transfers and processing** (`/dashboard/transfers`). Operators can register a vendor's X25519 public key, issue a time-limited single-use authorization, create an encrypted envelope, download that ciphertext, and review or revoke authorizations and prepared transfers. Marking a transfer delivered is an operator attestation; Consent Guru does not claim to verify delivery by the recipient network.

## Envelope cryptography

The server uses Node's established cryptographic APIs: ephemeral X25519 Diffie-Hellman, HKDF-SHA-256 to derive a per-envelope key, and AES-256-GCM for authenticated encryption. The authenticated additional data binds the envelope ID, transfer ID, authorization ID, recipient vendor, recipient key ID, creation time, and expiry. Envelopes include the ephemeral public key, salt, nonce, ciphertext, and GCM tag. Tampered metadata or ciphertext fails authentication. Recipient keys are accepted only as X25519 SubjectPublicKeyInfo DER encoded in base64.

Private keys are never accepted or stored by Consent Guru. The recipient must retain the matching private key and implement the published envelope format to decrypt. The application stores only encrypted envelope contents and cryptographic metadata; raw payloads are not written to database columns, audit metadata, or logs. The dashboard submits plaintext to the application server for the short encryption operation, so this is recipient encryption at rest/in transit after API receipt, not client-side end-to-end encryption against the Consent Guru server. Use a recipient-controlled channel to deliver the downloaded envelope. The product does not currently deliver ciphertext directly to a vendor endpoint or verify receipt.

## Authorization and replay controls

Authorization expiry is capped at 30 days and may not outlive the associated consent/session. Envelopes expire at the earlier of authorization expiry and 24 hours. Single-use authorizations are locked and consumed in the same database transaction that stores the envelope. A scoped unique idempotency key makes POST retries return existing envelope metadata without ciphertext; it cannot create a second envelope. Ciphertext is returned only by the separately authorized envelope GET after the current authorization, consent decision, transfer, recipient key, expiry, and revocation state are revalidated. Multi-use authorizations are explicit and may create separate envelopes with distinct idempotency keys. Revocation cascades to ready envelopes and is recorded in privacy events and audit logs.

All management APIs require an authenticated organization member. Creating an envelope, retrieving ciphertext, and mutating keys, authorizations, or transfer status require an operator role. Every query is organization scoped, and recipient/vendor keys must belong to that organization and the selected transfer's vendor. Ciphertext, recipient key identifiers, transfer identifiers, and status are visible only to authorized organization operators. No recipient private material is exposed.

## Runtime discovery redaction

Runtime discovery observes request metadata only. It never reads fetch/XHR/beacon bodies, headers, form input values, cookie values, or storage values. URL query strings and fragments are removed in the browser; the server rejects query-bearing page/resource paths. Credential-bearing URLs are normalized without credentials. Sensitive path segments and cookie/storage key names that look like credentials, session IDs, tokens, emails, or account identifiers are replaced with `[redacted]` before persistence. This is conservative pattern-based redaction, not a guarantee that every custom identifier is recognized. Discovery should remain limited to the metadata needed for privacy intelligence.

## API surface

- `GET/POST /api/transfers/recipient-keys`; `PATCH /api/transfers/recipient-keys/:id` registers or revokes vendor public keys.
- `GET/POST /api/transfer-authorizations`; `GET/PATCH /api/transfer-authorizations/:id` lists, issues, inspects, or revokes scoped authorizations. `?eligibleTransferId=` lists only same-site consent records with a current grant for the transfer purpose and vendor.
- `GET/POST /api/secure-transfers`; `GET/PATCH /api/secure-transfers/:id` lists or retrieves encrypted envelopes (retrieval revalidates current authorization), executes an authorized encryption, or records operator delivery/revocation status.
- Each issuance, revocation, envelope creation, and status change is represented in existing `privacy_events` and/or `audit_logs`.

Migration `0062_secure_transfers.sql` adds recipient public-key metadata, transfer authorizations, and encrypted envelope records. Apply the normal database migration process before enabling the dashboard feature.
