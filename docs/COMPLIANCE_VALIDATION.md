# Compliance Publication Validation

This CMP runs a **server-side configuration validator** before a policy version can be published.

> This is a technical control system. It is not legal advice and not a GDPR, DPDP, CCPA/CPRA, or LGPD certification.

The platform does not store or honor fields such as `isGDPRCompliant: true`. A policy is publishable only when the current draft configuration and the actual runtime capabilities pass the configured rules.

## Architecture

```text
Policy draft
    → load tenant-owned policy/version/notice
    → resolve jurisdictions from website + jurisdiction rules
    → common validators
    → jurisdiction validators
    → errors block publish
    → warnings do not block publish
```

The browser may preview results and disable the publish button. The publish API re-runs the same validator and ignores client claims such as `validated`, `jurisdiction`, and `organizationId`.

Existing published versions are never rewritten when a later publish attempt fails.

## What is reused

Phase 7 extends existing infrastructure:

- Regulation catalog and website jurisdiction rules
- Banner/notice configuration on the policy version
- Purpose, vendor, and tracker models, including Phase 4 essential confirmation
- Phase 6 privacy-rights applicability for represented rights
- Audit logs for validation history

No second regulation engine was added. Migration **0053** was not required; results are returned in the API and written to `audit_logs`.

## APIs

- `POST /api/policies/[id]/validate` — authenticated dry-run
- `POST /api/policies/[id]/publish` — validates, then publishes only when `errors.length === 0`

Both routes resolve ownership from the Clerk session and organization-owned websites.

## Blocking vs warning

- **Error** — publication is rejected.
- **Warning** — shown to operators; publishing is still allowed.

Warnings are used when the product can represent a gap honestly (for example, GPC is not implemented in this runtime).

## Rule IDs

Stable IDs live in `src/lib/compliance/rule-registry.ts`. Examples:

| ID | Typical severity |
|---|---|
| `POLICY_IDENTITY_MISSING` | error |
| `PURPOSE_REQUIRED_MISSING` | error |
| `PURPOSE_WITHOUT_DESCRIPTION` | error |
| `VENDOR_WITHOUT_PRIVACY_URL` | error |
| `TRACKER_UNMAPPED` | error |
| `TRACKER_ESSENTIAL_NOT_REQUIRED` | error |
| `TRACKER_IGNORED_STILL_ACTIVE` | error |
| `GDPR_PREGRANTED_OPTIONAL_CONSENT` | error |
| `GDPR_MISSING_WITHDRAWAL` | error |
| `DPDP_NOTICE_MISSING_CATEGORY` | error |
| `DPDP_CONSENT_MANAGER_CONFIG_MISSING` | error |
| `CCPA_MISSING_DO_NOT_SELL_SHARE` | error |
| `CCPA_GPC_RUNTIME_UNSUPPORTED` | warning (only if the runtime flag is off) |
| `CCPA_GPC_CLAIMED_WITHOUT_RUNTIME` | error |
| `CCPA_SALE_OPT_OUT_UNCONFIGURED` | error |
| `CCPA_SHARE_OPT_OUT_UNCONFIGURED` | error |
| `CCPA_SENSITIVE_PI_CONTROL_UNCONFIGURED` | error |
| `CCPA_OPT_OUT_VENDOR_MAPPING_MISSING` | error |
| `CCPA_OPT_OUT_TRACKER_MAPPING_MISSING` | error |
| `LGPD_MISSING_RIGHT` | error |
| `TRANSFER_MECHANISM_MISSING` | warning |

## How to add a rule

1. Add a stable ID to `COMPLIANCE_RULES`.
2. Emit it from the appropriate collector in `evaluate.ts`.
3. Add a unit test that constructs a `PolicyComplianceSnapshot`.
4. Do not add a boolean “compliant” flag.

## Runtime honesty

Phase 10 implements Sec-GPC (`1` only) and internal California opt-out enforcement. The validator:

- uses server `GPC_RUNTIME_SUPPORTED` — client `gpcSupported` / `gpcHonored` claims are not proof
- errors `CCPA_GPC_CLAIMED_WITHOUT_RUNTIME` if a draft claims GPC is honored while the runtime flag is off
- warns `CCPA_GPC_RUNTIME_UNSUPPORTED` only when the runtime flag is off
- errors when California opt-out is enabled but vendor/tracker sale-share classifications remain `unknown`

IAB GPP encoding is a publication aid. It is not a guarantee that third-party networks received or applied the opt-out. See `docs/CCPA_GPC_RUNTIME.md`.

## Admin UI

Policy detail (`/dashboard/policies/[id]`) shows blocking errors and warnings, then disables publish when errors exist. The publish endpoint still rejects invalid drafts if the button is forced.

## Deployment

No database migration is required for Phase 7.

1. Deploy the application build.
2. Confirm `POST /api/policies/[id]/validate` and publish both require an authenticated organization session.
3. Do not run `drizzle-kit push --force`.
