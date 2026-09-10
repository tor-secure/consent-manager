# California opt-out and GPC runtime

This document describes the Phase 10 technical implementation of California opt-out signaling (CCPA/CPRA-family) and Global Privacy Control (GPC) in this Consent Management Platform.

**This is a technical implementation. It is not legal certification, a CCPA/CPRA compliance opinion, or proof that a business’s sale/share analysis is correct.**

Sale/share/sensitive-PI classification is operator-configured. GPC applicability depends on configured jurisdiction and website rules. IAB GPP encoding, when enabled, is not proof that downstream vendors ingested or honored the string. External vendor compliance is not automatically verified.

## What this runtime does

For California-applicable traffic, opt-out is an **additional enforcement layer** on top of the existing consent state machine (`UNKNOWN → PENDING → GRANTED / DENIED / FAILED`).

Consent may still be `GRANTED`. If a configured sale, sharing, or sensitive-PI limitation applies, the runtime still blocks that processing. The consent record is not rewritten from `GRANTED` to `DENIED` to represent GPC.

## GPC detection

### Sec-GPC

The server reads `Sec-GPC` (and `sec-gpc`) at public SDK and consent endpoints.

| Header value | Parsed state | Effect |
|---|---|---|
| absent / empty | `absent` | Not a header opt-out. Browser `navigator.globalPrivacyControl === true` may still apply. |
| `1` | `valid_1` | Valid positive GPC signal. |
| `0`, `true`, `yes`, or any other value | `invalid` | Not a positive header signal. Does **not** silently become an opt-out. |

Only the exact value `1` is a valid positive header signal.

### Browser GPC

The SDK sends `gpc: true` only when `navigator.globalPrivacyControl === true`. It does not send `gpc: false` as an override attempt.

Client `gpc: false` cannot override a server-detected `Sec-GPC: 1`.

JavaScript GPC is visible to the server only when the client reports it (or a later request includes `Sec-GPC: 1`). A stripped or spoofed JS claim is not a substitute for the header.

### Framework note

Next.js App Router forwards incoming request headers to route handlers. `Sec-GPC` is read from `request.headers`. Proxies or CDNs that strip `Sec-GPC` will prevent header detection; configure them to forward it.

## State model

Persisted and public states:

| State | Meaning |
|---|---|
| `unknown` | Not yet resolved |
| `not_applicable` | Website/jurisdiction is not in the California runtime set |
| `not_opted_out` | Applicable, no active opt-out |
| `gpc_opted_out` | Valid GPC is active |
| `manual_opt_out` | Explicit Do Not Sell / Share / Limit Sensitive PI |
| `withdrawn` | Consent withdrawal also activates sale/share opt-out |

Sources: `none`, `gpc`, `manual`, `withdrawal`, `mixed`.

Applicability is `ccpa` / `cpra` / related configured US state keys, or region `CA` / `US-CA`. A generic `US` region is not treated as California by itself.

GPC-only opt-out does not remain after the signal is gone. Manual opt-out persists for the existing `consentId`. A later “Allow all” does not clear an applicable GPC opt-out.

## Persistence

Table: `california_opt_out_states` (migration `0055_ccpa_gpc_runtime`).

Keyed by organization, website, and existing `consentId`. No extra fingerprint columns.

Rows are written only when a valid `consentId` exists. Pre-consent optional processing stays blocked by the existing Phase 3 bootstrap.

## Do Not Sell / Do Not Share / sensitive PI

Operators classify vendors, trackers, and processing activities as:

`unknown` | `applicable` | `not_applicable`

Unknown is **not** treated as a sale or share at runtime. Publication **errors** if California opt-out is enabled and optional vendors/trackers remain unknown.

Tracker classification inherits from the linked vendor when the tracker value is `unknown`.

Essential processing stays allowed under GPC unless the operator explicitly classified that tracker/vendor as applicable sale, share, or sensitive PI.

Limit Sensitive PI applies on GPC only when `limitSensitivePiEnabled` is configured, or when the user explicitly enables the limit.

## Runtime order

Existing Phase 3 `shouldBlock` evaluates:

1. California sale/share/sensitive overlay (including classified essential)
2. Essential allow
3. Child-protection restrictions
4. Purpose/vendor consent
5. Unclassified fail-closed

The strictest applicable restriction wins. Child-restricted processing cannot be enabled by a California opt-out change.

Before GPC/consent is resolved, optional processing remains blocked.

## APIs

| Endpoint | Role |
|---|---|
| `GET/POST /api/sdk/[siteKey]/opt-out` | Public CORS. Resolves website from `siteKey`. Ignores client `organizationId` / jurisdiction. |
| `POST /api/consent/record` | Resolves GPC from headers + body; persists California state; copies a snapshot into evidence. Does not flip purpose grants to represent GPC. |
| `GET /api/consent/record` | Returns current California public state using stored row + current `Sec-GPC`. |
| `GET /api/sdk/[siteKey]/config` | Public `california` object: enabled, header parse, GPC recognized, DNS/SPI flags. No DPA/secrets. |

Client JSON such as `{ "gpc": false, "optOut": false, "saleShare": "allowed" }` cannot authorize processing when `Sec-GPC: 1` is present.

## Preference center

For California-enabled websites:

- Do Not Sell or Share My Personal Information
- Limit Use of Sensitive Personal Information (when configured)
- Status copy: GPC detected / opt-out managed by browser privacy signal / manual opt-out active

A valid GPC signal is honored without requiring a click.

Same-origin tabs converge via the existing `localStorage` listener (`cmp_ca_optout_<siteKey>`).

## Publication validation (Phase 7)

Validator version `1.3.0`. `GPC_RUNTIME_SUPPORTED` and internal opt-out propagation flags are `true`.

New / relevant rule IDs:

- `CCPA_GPC_RUNTIME_UNSUPPORTED` — warning if a build disables the runtime flag
- `CCPA_GPC_CLAIMED_WITHOUT_RUNTIME` — error if `gpcHonored` is claimed without runtime
- `CCPA_SALE_OPT_OUT_UNCONFIGURED`
- `CCPA_SHARE_OPT_OUT_UNCONFIGURED`
- `CCPA_SENSITIVE_PI_CONTROL_UNCONFIGURED`
- `CCPA_OPT_OUT_VENDOR_MAPPING_MISSING`
- `CCPA_OPT_OUT_TRACKER_MAPPING_MISSING`

Client `gpcSupported` / `gpcHonored` claims are not accepted as proof. Publish still requires server-side validation.

## GPP / IAB

Official `@iabgpp/cmpapi` encoding already exists. This runtime sets US-section Sale / Sharing / Sensitive limit fields from internal opt-out state when GPP is enabled and registered.

That is **not** a claim that:

- every vendor parsed the string
- networks applied the opt-out
- GPP replaces internal tracker blocking

Internal California state works even when GPP is disabled.

## Evidence and DSAR

When opt-out state is recorded with consent, a copy is stored on the evidence snapshot (`californiaOptOut`). Later GPC or vendor classification changes do not mutate old snapshots.

Phase 6 discovery/export includes current California opt-out rows for matching `consentId` values, scoped by organization and website.

## Deployment

1. Apply migration `drizzle/0055_ccpa_gpc_runtime.sql` (or the equivalent section in `scripts/apply-pending-schema.sql` / `scripts/neon-ensure-schema.sql`).
2. Deploy the application build.
3. For California sites, enable Do Not Sell / Do Not Share (and Limit Sensitive PI if used) in banner configuration.
4. Classify vendors and optional trackers. Do not leave them `unknown` if opt-out is enabled.
5. Publish through the existing Draft → Phase 7 → publish flow.
6. Confirm `Sec-GPC` is forwarded to the app.
7. Do **not** run `drizzle-kit push --force`.

## Limitations

- Operator classification is required. The product does not decide that Meta, Google, or any other vendor is a “sale” or “share.”
- GPC applicability follows configured jurisdiction/business rules, not a hidden legal engine.
- Header-less JS GPC depends on the client reporting `true`.
- Invalid `Sec-GPC` values are not treated as opt-out.
- GPP strings are encoded with the official library; downstream honor is unverified.
- No claim of CCPA/CPRA “compliance” or certification.
- Dashboard browser tests require an authenticated Clerk session.
