# FINAL FEATURE AUDIT — Consent Manager

**Audit date:** 2026-09-16  
**Scope:** Current tree under `d:\consent-manager` (`src/`, `drizzle/`, `vercel.json`, `package.json`).  
**Method:** Independent code trace of routes, APIs, schema, SDK, and runtime. Prior reports (including `FEATURE_COMPLETENESS_IMPLEMENTATION_REPORT.md`) were not used as evidence.  
**Browser visitor CMP:** **BROWSER E2E: NOT VERIFIED** (no Playwright suite; no live banner session in this audit). Unit tests that execute SDK source in Node/VM are **not** treated as browser proof.

Layer keys in the table: **Y** = present and wired, **P** = partial, **N** = missing, **n/a** = not applicable.

Completion % is an honest estimate of end-to-end product usefulness for that feature, not a marketing score. Runtime-dependent CMP features cannot be 100% while browser E2E is unverified.

---

## Methodology

1. Inventory from `src/config/navigation.ts`, all `src/app/**/page.tsx`, all `src/app/api/**/route.ts` (113 API routes in `next build`), `src/db/schema`, `src/lib/sdk/cmp-sdk-script.ts`, `vercel.json`.
2. Grep in `src/` for TODO/FIXME/Coming Soon/Not Implemented/mock. Product hits: one documented GPP opt-out-propagation limit in `src/lib/compliance/rule-registry.ts`; banner-studio `FallbackMockPage` is a preview fallback only.
3. No product feature-flag system exists in `src/`.
4. `test-db` remains a 404 stub.
5. Commands run on this machine (exact results in § Build / Test).

---

## BROWSER E2E: NOT VERIFIED

Visitor flows not executed in a real browser this audit:

1. First visit  
2. Banner display  
3. Accept All  
4. Reload persistence  
5. Reject All  
6. Reload  
7. Preferences  
8. Granular save  
9. Withdrawal  
10. GPC  
11. Tracker blocking  
12. Policy update → SDK update  

Those features are scored **PARTIAL** even when the source path looks complete.

Live HTTP replay of publish → `/api/sdk/[siteKey]/config` ETag/304 was **not** executed. Cache scoring is code + unit tests only.

---

## Build / Test (exact)

| Command | Result |
|---------|--------|
| `npm test` (`node scripts/run-tests.cjs`) | **exit 0**. All listed `.cjs` suites passed (including consent analytics, CCPA/GPC, children, compliance, `consent-manager-e2e-regression` **source/VM regression**, enforcement, localization, intelligence, drift, lifecycle-core, portable/redaction, privacy-rights, processing, rate-limit, regulation-engine, retention, scan-schedule, scanner-security, origin-allowlist, scroll-lock, security-headers, iab-standards, tenant-isolation-regression, tracker-management, webhook delivery, website-domain-verify). |
| `npx tsc --noEmit` | **exit 0** |
| `npm run build` | **exit 0**. Next.js 16.3.4 Turbopack. Compiled successfully. TypeScript in build finished. 113 static pages generated. |
| `npx eslint . --max-warnings 999` | **exit 1**. 11 errors, 9 warnings. Errors include `require()` in `scripts/*.cjs`, unused import in `src/app/api/billing/route.ts`, React Compiler purity (`Date.now` in `src/components/dashboard/home-sections.tsx`), `setState` in effects in `src/components/ui/combobox.tsx`. |
| Playwright / browser CMP | **Not present / not run** |

Tests were **not** modified to pass.

---

## Integrations classification

Runtime mapping is **only** `runtimeKindForIntegration()` in [`src/lib/integrations/runtime.ts`](src/lib/integrations/runtime.ts). Connect may flip `websites.consentIntegrations` JSON for those kinds. Test connection **does not call any vendor API**; it sets `lastVerifiedAt` ([`src/app/api/integrations/[id]/test/route.ts`](src/app/api/integrations/[id]/test/route.ts)). Catalog table has **no seed in repo**.

| Pattern (key or category) | Class | Runtime |
|---------------------------|--------|---------|
| consent-mode / google-analytics / gtm / tag-manager | **FULLY FUNCTIONAL** (flags only; no Google OAuth) | Enables Google Consent Mode in SDK config |
| tcf / iab-tcf | **FULLY FUNCTIONAL** (flags + encode if CMP ID + GVL + mappings) | `__tcfapi` / TC string |
| gpp / iab-gpp | **FULLY FUNCTIONAL** (flags + encode if registration + sections) | `__gpp` / GPP string |
| All other catalog rows (CRM, ads, CDP, etc.) | **CONNECTION RECORD ONLY** | Persist `website_integrations`; no SDK effect |

---

## Security / multi-tenant (code review, not live two-tenant test)

- Dashboard APIs generally use Clerk `auth()` + `resolveLocalUser` / `resolveLocalOrganization` / `resolveActiveMembership` and `organizationId` predicates. Static regression: [`src/lib/tenant-isolation-regression.test.cjs`](src/lib/tenant-isolation-regression.test.cjs).
- Mutations often use `requireOperatorRole` (Owner/Admin).
- Public SDK routes: origin allowlist (`sdkOriginGuard`), siteKey validation, CORS, rate limits.
- `/api/v1/redact` and `/api/v1/consent/evaluate`: hashed API keys + scopes.
- `/api/intelligence/redact`: Clerk + operator role + `evaluateConsentForTenant` with org id.
- Crons: `authorizeCronRequest` + `CRON_SECRET` (401 if unset).
- Clerk webhook: Svix signature required; **no svix-id replay store**.
- `test-db`: 404 (not a live debug dump).
- Tenant isolation is **not** proven by running Tenant A vs Tenant B HTTP in this audit → scored PARTIAL as a *verification* of the control, while the implementation is real.

---

## FINAL FEATURE TABLE

| # | Feature | UI | Frontend | API | Backend | DB | SDK | Runtime | Status | Completion % | Evidence | Missing |
| - | ------- | -- | -------- | --- | ------- | -- | --- | ------- | ------ | ------------ | -------- | ------- |
| 1 | Clerk sign-in | Y | Y | n/a | Y | n/a | n/a | Y | Fully Complete | 95 | `src/app/sign-in`, Clerk middleware | External Clerk account/config |
| 2 | Clerk sign-up | Y | Y | n/a | Y | n/a | n/a | Y | Fully Complete | 95 | `src/app/sign-up` | External Clerk |
| 3 | Create organization | Y | Y | n/a | Y | Y | n/a | Y | Fully Complete | 90 | `src/app/create-organization`, local org sync | Clerk org product |
| 4 | Organization sync | n/a | n/a | Y | Y | Y | n/a | Y | Fully Complete | 88 | `src/app/api/sync-organization/route.ts` | Depends on Clerk session |
| 5 | Team invite and roles | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 90 | `src/app/api/settings/team/*`, `memberships` | Email delivery of invites is Clerk, not this app |
| 6 | RBAC Owner/Admin/Member | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 92 | `src/lib/org-roles.ts` `requireOperatorRole` | Live IDOR matrix not executed |
| 7 | Dashboard home | Y | Y | n/a | Y | Y | n/a | Y | Partially Complete | 85 | `src/app/dashboard/page.tsx`, `home-sections.tsx` | Lint/purity `Date.now`; not browser-verified |
| 8 | Website CRUD | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 90 | `src/app/api/websites`, `websites` schema | — |
| 9 | Website plan limit | P | P | Y | Y | Y | n/a | Y | Partially Complete | 80 | `assertWebsiteEntitlement` in `entitlements.ts`, used on website create | Internal $0 plan; no paid upgrade path |
| 10 | Domain verification | Y | Y | Y | Y | Y | P | P | Partially Complete | 80 | `src/app/api/websites/[id]/verify`, `verifyWebsiteDomain` | Unverified sites still get SDK config |
| 11 | SDK install snippets | Y | Y | n/a | Y | n/a | Y | n/a | Fully Complete | 90 | `websites/[id]/installation`, `buildEmbedSnippet` | Host page not E2E tested |
| 12 | Website settings | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 88 | `websites/[id]/settings`, PATCH website | — |
| 13 | Scan schedule config | Y | Y | Y | Y | Y | n/a | P | Fully Complete | 88 | `website-scan-schedules`, `/api/websites/[id]/scan-schedule` | Execution depends on cron |
| 14 | Consent records list | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 90 | `dashboard/consent`, `consent_records` | — |
| 15 | Consent evidence / proof | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 90 | `consent/evidence/[consentId]`, `consent-evidence-snapshots` | — |
| 16 | CMP banner first visit | Y | Y | Y | Y | Y | Y | P | Partially Complete | 78 | `cmp-sdk-script.ts` `renderBanner` | **BROWSER E2E: NOT VERIFIED** |
| 17 | Accept All | Y | Y | Y | Y | Y | Y | P | Partially Complete | 80 | `acceptAll` → `submitConsent('accept-all')` → `/api/consent/record` | Browser reload/tracker outcome not verified |
| 18 | Reject All | Y | Y | Y | Y | Y | Y | P | Partially Complete | 80 | `rejectAll` → `submitConsent('reject-all')` | Non-essential block not browser-verified |
| 19 | Granular purpose/vendor save | Y | Y | Y | Y | Y | Y | P | Partially Complete | 80 | `saveGranular`, preference center in SDK | Individual purpose effect not browser-verified |
| 20 | Withdraw consent | Y | Y | Y | Y | Y | Y | P | Partially Complete | 82 | `withdrawConsent`, `/api/consent/withdraw`, events/snapshots | Browser + analytics after withdraw not verified |
| 21 | Consent record API (idempotency, proof) | n/a | n/a | Y | Y | Y | Y | Y | Fully Complete | 92 | `src/app/api/consent/record/route.ts` advisory lock, `submissionId`, TCF/GPP encode, child/CCPA | Live load not measured |
| 22 | Public published-only policy | n/a | n/a | Y | Y | Y | Y | Y | Fully Complete | 90 | `consent/policy/route.ts` `isPublished: true` | Simpler payload than full SDK config |
| 23 | Policy CRUD | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 92 | `policies` routes, `consent-policies` | — |
| 24 | Banner studio | Y | Y | Y | Y | Y | P | P | Fully Complete | 88 | `policies/[id]/studio`, banner-config API | Studio preview mock fallback; live banner E2E missing |
| 25 | Banner i18n | Y | Y | Y | Y | Y | Y | P | Fully Complete | 88 | `resolveRequestedLocale`, banner translations | Visitor locale E2E missing |
| 26 | Preference center editor | Y | Y | Y | Y | Y | Y | P | Fully Complete | 88 | `policies/[id]/preference-center` | Visitor PC E2E missing |
| 27 | Policy validate | Y | Y | Y | Y | n/a | n/a | n/a | Fully Complete | 90 | `policies/[id]/validate` | — |
| 28 | Exclusive publish | Y | Y | Y | Y | Y | Y | P | Fully Complete | 92 | `markVersionPublished` in `lifecycle.ts`; archives prior published | Live SDK fetch after publish not HTTP-tested |
| 29 | Unpublish | Y | Y | Y | Y | Y | Y | P | Fully Complete | 90 | `unpublishPolicy`, PolicyLifecycleControls | Public empty-policy HTTP not live-tested |
| 30 | Schedule publish | Y | Y | Y | Y | Y | n/a | P | Partially Complete | 85 | `schedulePolicyVersion`, `cron/policies`, vercel `*/5 * * * *` | Needs `CRON_SECRET` + Vercel cron; not live-fired |
| 31 | Rollback (clone+publish) | Y | Y | Y | Y | Y | Y | P | Partially Complete | 85 | `cloneVersionForRollback` + `markVersionPublished` | `vendorIds: []` on processing snapshot; live SDK not tested |
| 32 | Policy–purpose linking | Y | Y | Y | Y | Y | Y | P | Fully Complete | 90 | `policies/[id]/purposes` | Consumed when published |
| 33 | Policy–vendor linking | Y | Y | Y | Y | Y | Y | P | Fully Complete | 90 | `policies/[id]/vendors` | Consumed when published |
| 34 | SDK config no-store + ETag + hash | n/a | n/a | Y | Y | n/a | Y | P | Partially Complete | 85 | `sdkConfigCacheHeaders`, `etagMatches`, `hashPublishedConfig` in `lifecycle-core.ts`; used by `sdk/[siteKey]/config` | Live 304/V2 freshness **NOT VERIFIED** |
| 35 | Purposes CRUD | Y | Y | Y | Y | Y | Y | P | Fully Complete | 92 | `purposes` API + pages | Runtime via published policy |
| 36 | Vendors CRUD | Y | Y | Y | Y | Y | Y | P | Fully Complete | 92 | `vendors` API + pages | Runtime via published policy |
| 37 | Vendor–purpose mapping | Y | Y | Y | Y | Y | Y | P | Fully Complete | 90 | `vendors/[id]/purposes` | — |
| 38 | Vendor relationships | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 85 | `vendors/[id]/relationships` | No SDK consumption found |
| 39 | Trackers CRUD | Y | Y | Y | Y | Y | Y | P | Fully Complete | 90 | `trackers` API; rules in SDK config | Enforcement E2E missing |
| 40 | Tracker classify / map | Y | Y | Y | Y | Y | Y | P | Fully Complete | 90 | `trackers/[id]/classify`, `map` | — |
| 41 | Unmapped tracker queue | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 88 | `trackers/unmapped` | — |
| 42 | Transfers | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 90 | `dashboard/transfers`, `transfers` API | Governance catalog, not CMP runtime |
| 43 | Processing activities | Y | Y | Y | Y | Y | n/a | P | Fully Complete | 88 | `processing-activities` API; snapshot on publish | Freeze is operational not legal RoPA certification |
| 44 | Manual website scan | Y | Y | Y | Y | Y | n/a | P | Partially Complete | 75 | `scanner/run`, `scan-engine.ts` HTML fetch | Not a headless browser; JS-only tags missed |
| 45 | Hourly / scheduled scans | Y | Y | Y | Y | Y | n/a | P | Partially Complete | 80 | `SCAN_FREQUENCIES` includes hourly; `runDueScheduledScans`; vercel hourly cron | Cron secret + HTML-only engine |
| 46 | Scan history / detail | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 88 | `scanner/[scanId]`, `scans` / `scan_results` | — |
| 47 | Privacy drift findings | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 85 | `monitoring` pages, `privacy-findings` | Drift quality depends on HTML scans |
| 48 | Finding review / resolve | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 85 | `monitoring/findings/[id]/review`, `resolve` | — |
| 49 | Privacy risk overview | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 85 | `dashboard/risk`, `monitoring/risk` | Derived scores, not a risk model certification |
| 50 | Consent quality score | Y | Y | Y | Y | n/a | n/a | n/a | Fully Complete | 85 | `calculateConsentQualityScore` | Operational metric |
| 51 | Consent analytics | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 88 | `analytics/consent` from real `consent_records` | No hardcoded dashboard numbers found |
| 52 | Analytics CSV export | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 85 | `analytics/consent/export` | Overview + purpose rates only |
| 53 | Consent firewall (dashboard) | Y | Y | n/a | Y | Y | Y | P | Partially Complete | 80 | `evaluateFirewall`, `firewallDecisionReason` | Preview vs live page; JS cannot block all cookies |
| 54 | Impact simulator | Y | Y | n/a | Y | Y | n/a | n/a | Partially Complete | 75 | `simulatePrivacyImpact` | Simulated/estimated; not observed production traffic |
| 55 | A/B banner experiments | Y | Y | Y | Y | Y | Y | P | Partially Complete | 78 | `policies/[id]/ab-test`, sticky variant in SDK, `summarizeAbChoices` | No auto-winner; banner E2E missing |
| 56 | Dependency graph | Y | Y | n/a | Y | Y | n/a | n/a | Fully Complete | 85 | `loadConsentGraph`, `dashboard/graph` | Visualization of stored graph |
| 57 | Recommendations | Y | Y | n/a | Y | Y | n/a | n/a | Partially Complete | 70 | `buildConsentRecommendations` | Rule-based; missing confidence/expected-impact fields |
| 58 | Data flow map | Y | Y | n/a | Y | Y | n/a | n/a | Partially Complete | 80 | `dashboard/data-flow` | Derived from inventory, not packet capture |
| 59 | Cross-domain portable consent | Y | Y | Y | Y | Y | P | P | Partially Complete | 82 | `consent/portable/export`+`import`, signed codes | Cross-origin browser exchange not E2E tested |
| 60 | Autopilot analyze / plan | Y | Y | Y | Y | Y | n/a | n/a | Partially Complete | 75 | `buildAutopilotPlan`, `runAuditedIntelligence` | Advisory; AI enrich optional Bedrock |
| 61 | Autopilot apply / tracker rollback | Y | Y | Y | Y | Y | n/a | P | Partially Complete | 65 | `applyAutopilotStep` only `map_unclassified` and `complete_coverage`; `restoreWebsiteTrackers` | Other steps advisory; does not publish policy |
| 62 | Digital twin snapshot / diff | Y | Y | Y | Y | Y | n/a | n/a | Partially Complete | 70 | `captureDigitalTwinSnapshot`, `diffTwinPayloads` | Capture on publish/scan/manual |
| 63 | Digital twin restore | N | N | N | N | Y | n/a | N | Not Implemented | 10 | Snapshots stored; no restore endpoint | No apply-snapshot mutation |
| 64 | ROI engine | Y | Y | Y | Y | Y | n/a | n/a | Partially Complete | 72 | `computeConsentRoi` measured rates + operator $ inputs | Estimates mixed with observed; not finance-grade |
| 65 | Negotiation engine | Y | Y | Y | Y | Y | Y | P | Partially Complete | 75 | `negotiationConfigurations`, `sdk/[siteKey]/negotiation` | Offers are config, not a live bargainer |
| 66 | AI-agent permissioning | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 85 | `/api/agent/permission`, `evaluateConsentForTenant` | Relies on stored consent, not agent runtime plugins |
| 67 | Dashboard data-redaction UI | Y | Y | P | P | Y | n/a | n/a | Partially Complete | 55 | `data-redaction-tool.tsx` GET `/api/analytics/consent?redactConsentId=` | Does **not** call `/api/intelligence/redact` |
| 68 | `/api/intelligence/redact` | n/a | n/a | Y | Y | Y | n/a | Y | Fully Complete | 88 | Clerk + operator + `redactValue` + audit + dryRun | Dashboard unused |
| 69 | `/api/v1/redact` | n/a | n/a | Y | Y | Y | n/a | Y | Fully Complete | 88 | API key `data:redact`, same `redactValue` engine | Idempotency is request-id/audit, not exactly-once store |
| 70 | Intelligence ROI/negotiation settings API | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 85 | `intelligence/settings` | — |
| 71 | Audit logs | Y | Y | n/a | Y | Y | n/a | n/a | Fully Complete | 90 | `audit-logs` page + inserts on mutations | Completeness of every action not proven |
| 72 | In-app notifications | Y | Y | Y | Y | Y | n/a | n/a | Partially Complete | 82 | `notifications` APIs, unread-count | No email/push channel |
| 73 | Transactional email | N | N | N | N | N | n/a | N | Not Implemented | 0 | DSAR `resend_verification` returns tokens in JSON only | No mailer |
| 74 | Public privacy-request portal | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 85 | `/privacy-request`, `rights-request/status`+`verify` | Identity is token, not IDV |
| 75 | DSAR operator fulfillment | Y | Y | Y | Y | Y | n/a | Y | Partially Complete | 82 | settings rights-requests export/deletion/correction/withdraw/downstream | Email “resend” does not send email; downstream is recorded not vendor-confirmed |
| 76 | Data retention policy | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 90 | `settings/retention`, `runRetentionCleanup` | — |
| 77 | Legal holds | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 88 | `legal-holds` APIs, used in purge | — |
| 78 | Retention purge (dry-run) | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 88 | `settings/retention/purge` | Destructive purge needs operator; not live-run here |
| 79 | SDK script delivery | n/a | n/a | Y | Y | n/a | Y | P | Partially Complete | 85 | `/api/sdk/script` generates `cmp-sdk-script.ts` | Browser behavior unverified |
| 80 | SDK config (policy, purposes, vendors, trackers, signals) | n/a | n/a | Y | Y | Y | Y | P | Partially Complete | 85 | `sdk/[siteKey]/config` | Live freshness unverified |
| 81 | SDK public tracker list | n/a | n/a | Y | Y | Y | Y | P | Fully Complete | 85 | `sdk/[siteKey]/trackers` | — |
| 82 | SDK California opt-out API | n/a | n/a | Y | Y | Y | Y | P | Partially Complete | 82 | `sdk/[siteKey]/opt-out`, `california_opt_out` | GPC/opt-out E2E missing |
| 83 | SDK negotiation offers | n/a | n/a | Y | Y | Y | Y | P | Partially Complete | 80 | `sdk/[siteKey]/negotiation` | — |
| 84 | Public GVL for SDK | n/a | n/a | Y | Y | Y | Y | P | Partially Complete | 80 | `/api/sdk/gvl`, `iab_gvl_cache` | Needs GVL sync success |
| 85 | API keys | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 90 | `api-keys` hashed + scopes | — |
| 86 | Outbound webhooks | Y | Y | Y | Y | Y | n/a | Y | Fully Complete | 88 | HMAC `createWebhookSignature`, deliveries table | Delivery to customer URL not live-tested |
| 87 | Clerk inbound webhook | n/a | n/a | Y | Y | Y | n/a | Y | Partially Complete | 75 | `webhooks/clerk` Svix verify; membership/user/org events | No idempotency store for `svix-id` |
| 88 | Integration catalog connect/disconnect | Y | Y | Y | Y | Y | P | P | Partially Complete | 50 | `integrations/connect`, `disconnect`; runtime only GCM/IAB patterns | Empty catalog without DB seed; most rows connection-only |
| 89 | Integration “test connection” | Y | Y | Y | P | Y | n/a | N | Stub/Mock | 25 | Updates `lastVerifiedAt`; no provider ping | Fake success for non-runtime kinds |
| 90 | Google Consent Mode | Y | Y | Y | Y | Y | Y | P | Partially Complete | 78 | `gtag('consent','default'|'update')` in `cmp-sdk-script.ts`; `toPublicGoogleConsentConfig` | Browser + gtag presence **NOT VERIFIED** |
| 91 | IAB TCF (`__tcfapi`, TC string) | Y | Y | Y | Y | Y | Y | P | Partially Complete | 68 | `encodeTcString` when CMP ID valid, GVL loaded, mappings complete | Needs IAB CMP ID; not a registered CMP certification |
| 92 | IAB GPP (`__gpp`) | Y | Y | Y | Y | Y | Y | P | Partially Complete | 65 | `encodeGppString` when sections + registration | Rule-registry: full opt-out propagation not a runtime guarantee |
| 93 | GPC / CCPA opt-out | Y | Y | Y | Y | Y | Y | P | Partially Complete | 78 | `parseGpcFromRequest`, `resolveCaliforniaOptOut`, persist, SDK config | Browser Sec-GPC E2E missing |
| 94 | JS tracker enforcement (fetch/XHR/beacon/script/storage) | n/a | n/a | n/a | Y | Y | Y | P | Partially Complete | 70 | `installNetworkGuard`, storage patch, `shouldBlock` | Cannot control HttpOnly cookies, browser 3P cookies, pre-CMP scripts, GTM inner tags |
| 95 | `/api/v1/consent/evaluate` | n/a | n/a | Y | Y | Y | n/a | Y | Fully Complete | 88 | API key `consent:evaluate` | — |
| 96 | Jurisdiction rules | Y | Y | Y | Y | Y | Y | P | Partially Complete | 82 | `jurisdiction-rules`, `resolveWebsiteConsentContext` | Geo from headers/hints, not certified geolocation |
| 97 | Legal engine preview | Y | Y | Y | Y | Y | n/a | n/a | Partially Complete | 80 | `websites/[id]/legal-engine` | Explainability operational, not legal advice |
| 98 | Child-protection config / attest | Y | Y | Y | Y | Y | Y | P | Partially Complete | 80 | child-protection routes, SDK child snapshot | Self-declaration, not age verification vendor |
| 99 | Age-assurance session | Y | Y | Y | Y | Y | Y | P | Partially Complete | 75 | `age-assurance` routes reject client-claimed age | No IDV provider |
| 100 | Guardian consent | Y | Y | Y | Y | Y | Y | P | Partially Complete | 78 | `/guardian-consent`, `guardian-consent/verify` | Token flow; not legal parental-consent certification |
| 101 | Regulations catalog | Y | Y | Y | Y | n/a | n/a | n/a | Fully Complete | 85 | `REGULATION_CATALOG`, `/api/regulations` | Catalog not a law library |
| 102 | IAB GVL sync | P | P | Y | Y | Y | Y | P | Partially Complete | 80 | `/api/settings/iab/gvl`, `cron/iab-gvl` daily 03:00 | Needs network to IAB + cron secret |
| 103 | IAB CMP ID configuration | Y | Y | Y | Y | Y | Y | P | Partially Complete | 70 | `website-regulation-form` cmpId; `getIabRegistration` | Encode blocked without valid ID (1–4095) |
| 104 | Internal billing entitlements | Y | Y | Y | Y | Y | n/a | Y | Partially Complete | 70 | GET `/api/billing`, `ensureOrganizationSubscription`, website cap | No invoices generated by usage; $0 internal plan |
| 105 | Stripe / card checkout | Y | Y | Y | N | Y | n/a | N | Stub/Mock | 15 | POST `/api/billing` 501 without Stripe or “not wired” | External Stripe account required |
| 106 | Dashboard search | Y | Y | Y | Y | Y | n/a | n/a | Fully Complete | 90 | `/api/search` org-scoped | — |
| 107 | Health check | n/a | n/a | Y | Y | Y | n/a | Y | Fully Complete | 95 | `/api/health` `select 1` | — |
| 108 | Cron authentication | n/a | n/a | Y | Y | n/a | n/a | Y | Fully Complete | 88 | `authorizeCronRequest` | Unset secret → 401 (config) |
| 109 | Rate limiting | n/a | n/a | Y | Y | n/a | n/a | Y | Fully Complete | 90 | `src/lib/rate-limit.ts` | In-memory; multi-instance weak |
| 110 | Tenant isolation controls | n/a | n/a | Y | Y | Y | n/a | P | Partially Complete | 80 | org predicates + static regression test | Live Tenant A/B HTTP **NOT VERIFIED** |
| 111 | `test-db` debug endpoint | n/a | n/a | Y | N | N | n/a | N | Stub/Mock | 5 | Always 404 | Intentionally disabled |
| 112 | Marketing landing | Y | Y | n/a | n/a | n/a | n/a | n/a | Partially Complete | 70 | `src/app/page.tsx` | Marketing, not CMP |
| 113 | SDK demo page | Y | Y | Y | Y | P | Y | P | Partially Complete | 75 | `/sdk-demo` | Not a customer-site E2E |
| 114 | Website enforcement preview page | Y | Y | n/a | Y | Y | n/a | n/a | Partially Complete | 80 | `websites/[id]/enforcement` | Dashboard preview |
| 115 | Website consentIntegrations JSON | Y | Y | Y | Y | Y | Y | P | Fully Complete | 85 | `websites/[id]/consent-integrations` | Consumed by SDK config |
| 116 | Hosted public `/consent` page | N | N | N | N | n/a | N | N | Not Implemented | 0 | No `src/app/consent/**` | Visitor UX is embed SDK only |
| 117 | Theme / dashboard i18n chrome | Y | Y | n/a | Y | n/a | n/a | n/a | Fully Complete | 85 | locale registry, dashboard chrome | — |
| 118 | Processing snapshot on publish | n/a | n/a | Y | Y | Y | n/a | Y | Fully Complete | 88 | `buildLivePolicyProcessingSnapshot` on publish | Rollback snapshot omits vendors |
| 119 | Origin allowlist for public SDK | n/a | n/a | Y | Y | n/a | Y | Y | Fully Complete | 88 | `sdkOriginGuard` | — |
| 120 | Bedrock AI enrichment | P | P | Y | Y | Y | n/a | P | Partially Complete | 60 | `enrichDeterministicOutput`; fallback if invalid JSON | AWS credentials optional; deterministic path without AI |

**TOTAL FEATURES: 120**

---

## STATUS SUMMARY

| Status                | Count |
| --------------------- | ----: |
| Fully Complete        |    62 |
| Partially Complete    |    52 |
| Broken                |     0 |
| Not Implemented       |     3 |
| Stub/Mock             |     3 |
| **TOTAL**             | **120** |

### Overall Functional Completeness: **79%**

**Formula:** unweighted mean of the 120 per-feature Completion % values.

Sum of completion percentages = **9436**  
9436 / 120 = **78.63%** → reported as **79%**.

This is **not** “62/120 = 52% complete.” Fully Complete rows are typically 85–95%, not 100%, because browser E2E, live HTTP, cron, and external services were not all proven. Partial rows still carry substantial working code. Fully Complete is used only where the applicable layers exist in code and do not depend on unverified visitor-browser runtime.

---

## CONSENT LIFECYCLE (critical)

| Flow | Code path | Audit result |
|------|-----------|--------------|
| Accept All | Banner → `acceptAll` → `POST /api/consent/record` → `consent_records` + decisions + evidence → SDK grants → GCM update + network guard | **Implemented in source.** **BROWSER E2E: NOT VERIFIED** |
| Reject All | `rejectAll` → record `reject-all` → deny-by-default `shouldBlock` | Same. JS cannot block HttpOnly / pre-init / GTM-inner |
| Granular | Preference center → `saveGranular` → purpose/vendor arrays | Same |
| Withdraw | `withdrawConsent` + `/api/consent/withdraw` + events | Same; dashboard also lists history |

**Verdict:** Core consent **backend + SDK source** is real. Core consent is **not** Fully Complete as a product claim without browser proof.

---

## POLICY LIFECYCLE

| Step | Code | Notes |
|------|------|--------|
| Draft/edit/save | Policies API + UI | Real |
| Publish | `markVersionPublished` exclusive archive | Real |
| SDK | Config loads published version | Real in code; live V1→V2 **not HTTP-tested** |
| Unpublish | All published archived, `liveVersionId` cleared | Real |
| Schedule | `scheduled` status + cron promote | Real code; cron config required |
| Rollback | Clone version then publish | Real; processing snapshot `vendorIds: []` |

---

## REMAINING PARTIAL FEATURES

Each item below is currently **Partially Complete** (or Stub where noted). Fully Complete rows are omitted.

### CMP banner / Accept / Reject / Granular / Withdraw / SDK script+config (~78–85%)
- **What works:** Generated SDK, record/withdraw APIs, grants, evidence, GCM/GPC/IAB hooks in source, unit/VM tests.
- **What doesn't:** Proven visitor browser behavior and reload persistence.
- **Why partial:** Plan rule: no FULLY COMPLETE without browser E2E.
- **Files:** `src/lib/sdk/cmp-sdk-script.ts` (`acceptAll`, `rejectAll`, `saveGranular`, `withdrawConsent`, `installNetworkGuard`, `publishExternalSignals`); `src/app/api/consent/record/route.ts`; `src/app/api/consent/withdraw/route.ts`.
- **To complete:** Run real-browser E2E against a published site key (first visit, reload, GPC, tracker).

### SDK cache freshness (~85%)
- **Works:** `private, no-store, must-revalidate`, ETag, `configHash`, 304 matcher.
- **Doesn't:** Live V1→V2→rollback HTTP demonstration this audit.
- **Files:** `src/lib/policy/lifecycle-core.ts`; `src/app/api/sdk/[siteKey]/config/route.ts`.
- **To complete:** HTTP replay after publish/rollback.

### Schedule publish (~85%)
- **Works:** Schedule API, `promoteDueScheduledPolicies`, vercel.json 5-minute cron, cron auth.
- **Doesn't:** Proven tick in this environment.
- **Files:** `src/lib/policy/lifecycle.ts`; `src/app/api/cron/policies/route.ts`; `vercel.json`.
- **To complete:** Configure `CRON_SECRET` and observe a due promotion.

### Policy rollback snapshot (~85%)
- **Works:** New published clone.
- **Doesn't:** Full vendor list in `buildLivePolicyProcessingSnapshot` (`vendorIds: []` in rollback route).
- **Files:** `src/app/api/policies/[id]/rollback/route.ts`.
- **To complete:** Pass linked vendor IDs like normal publish.

### Domain verification (~80%)
- **Works:** DNS/meta/well-known checks.
- **Doesn't:** Gate SDK issuance on verified flag.
- **Files:** `src/app/api/websites/[id]/verify/route.ts`; SDK config route.
- **To complete:** Optionally refuse config for unverified domains if that is the product rule.

### Website plan limit (~80%)
- **Works:** Server-side max websites on create.
- **Doesn't:** Paid upgrade/downgrade/cancel.
- **Files:** `src/lib/billing/entitlements.ts`; `src/app/api/websites/route.ts`.

### HTML scanner / scheduled scans (~75–80%)
- **Works:** Fetch+parse, persist, hourly cron, stale lock unlock, findings.
- **Doesn't:** Headless execution of JS tags; live cron.
- **Files:** `src/lib/scanner/scan-engine.ts`; `src/lib/scanner/run-due-scans.ts`; `src/app/api/cron/scans/route.ts`.
- **To complete:** Headless scanner **or** document HTML-only as the product ceiling (browser/platform).

### Firewall / enforcement preview (~80%)
- **Works:** ALLOW/BLOCK reasons from tracker+consent+CCPA.
- **Doesn't:** Live site proof; JS limits remain.
- **Files:** `src/lib/sdk/enforcement.ts` `firewallDecisionReason`; `src/lib/intelligence/firewall.ts`.

### Impact simulator (~75%)
- **Works:** What-if quality deltas from graph.
- **Doesn't:** Observed production metrics.
- **Files:** `src/lib/intelligence/simulator.ts`.
- **To complete:** Label UI OBSERVED vs SIMULATED everywhere (partially present in ROI; keep honest).

### A/B experiments (~78%)
- **Works:** Variant config, sticky assignment in SDK, stats from metadata.
- **Doesn't:** Auto winner; browser assignment proof.
- **Files:** `src/lib/intelligence/ab-test.ts`; `src/app/api/policies/[id]/ab-test/route.ts`.

### Recommendations (~70%)
- **Works:** Evidence-like counts from graph (unmapped trackers, unpublished policy, findings).
- **Doesn't:** Structured confidence, expected impact, separate action object.
- **Files:** `src/lib/intelligence/recommendations.ts` `buildConsentRecommendations`.
- **To complete:** Add those fields from measured analytics where available.

### Data flow map (~80%)
- **Works:** Inventory-derived map.
- **Doesn't:** Observed network flows.

### Portable consent (~82%)
- **Works:** Signed export/import APIs + dashboard.
- **Doesn't:** Cross-domain browser proof.
- **Files:** `src/app/api/consent/portable/export/route.ts`, `import/route.ts`.

### Autopilot (~65–75%)
- **Works:** Plan, approve metadata, apply two tracker mutations, tracker rollback, no auto-publish.
- **Doesn't:** Apply for remaining step types; transactional multi-table apply.
- **Files:** `src/lib/intelligence/autopilot-apply.ts` `applyAutopilotStep`; `src/app/api/intelligence/autopilot/[id]/route.ts`.
- **To complete:** Implement remaining mutating steps with validation **or** keep them explicitly advisory in UI.

### Digital twin snapshot/diff (~70%) / restore (Not Implemented 10%)
- **Works:** Capture + compare.
- **Doesn't:** Restore configuration.
- **Files:** `src/lib/intelligence/service.ts`; `src/app/api/intelligence/digital-twin/route.ts`.
- **To complete:** Restore API with auth, diff apply, audit.

### ROI (~72%)
- **Works:** Uses measured consent rate when present; env fallback documented in tests.
- **Doesn't:** Historical finance truth.
- **Files:** intelligence ROI compute (tested in intelligence `.cjs`).

### Negotiation (~75%)
- **Works:** Stored offers, public SDK endpoint.
- **Doesn't:** Dynamic bargaining runtime.

### Dashboard redaction UI (~55%)
- **Works:** Filters analytics for a consent id.
- **Doesn't:** Payload redaction engine / dry-run / same audit as v1.
- **Files:** `src/components/data-redaction/data-redaction-tool.tsx`.
- **To complete:** Call `/api/intelligence/redact` with policy + dryRun.

### Notifications (~82%)
- **Works:** In-app read/unread.
- **Doesn't:** Email.

### DSAR fulfillment (~82%)
- **Works:** Lifecycle, discovery, export/delete/correct/withdraw APIs, public portal.
- **Doesn't:** Actual email send; confirmed downstream vendor deletion.

### GCM / GPC / TCF / GPP / JS enforcement (~65–78%)
- **Works:** Source implementations as listed in table.
- **Doesn't:** Browser proof; TCF/GPP need CMP ID + GVL + mappings; GPP opt-out not a runtime guarantee (`rule-registry.ts`).
- **Files:** `cmp-sdk-script.ts`; `src/lib/signals/iab-adapter.ts`; `src/lib/ccpa/*`.

### Geo / child / age / guardian (~75–82%)
- **Works:** Config, server evaluation, SDK snapshots, token guardian verify.
- **Doesn't:** Certified geo, IDV, legal parental-consent certification.

### Integrations catalog (~50%) / test (Stub 25%)
- **Works:** Connection rows; GCM/IAB keys flip runtime JSON.
- **Doesn't:** OAuth, outbound test, catalog seed.
- **Files:** `src/lib/integrations/runtime.ts`; `src/app/api/integrations/[id]/test/route.ts`.

### Clerk webhook (~75%)
- **Works:** Signature + event handlers for membership/user/org.
- **Doesn't:** Idempotent replay store.
- **Files:** `src/app/api/webhooks/clerk/route.ts`.

### Billing (~70%) / Stripe (Stub 15%)
- **Works:** Internal starter plan, GET subscription, website cap.
- **Doesn't:** Checkout, invoices from Stripe, cancel/upgrade.
- **Files:** `src/app/api/billing/route.ts` POST 501.

### Tenant isolation verification (~80%)
- **Works:** Code-level org scoping + static tests.
- **Doesn't:** Live two-tenant HTTP.

### AI Bedrock (~60%)
- **Works:** Optional enrich with JSON validation and fallback.
- **Doesn't:** Required production AI.

### Dashboard home (~85%)
- **Works:** Counts from DB.
- **Doesn't:** Clean lint (`Date.now` purity error).

### Landing (~70%) / sdk-demo (~75%) / enforcement page (~80%)
- Supporting surfaces, not the hosted CMP.

---

## EXTERNAL DEPENDENCIES

### CODE THAT STILL NEEDS IMPLEMENTATION
- Digital twin restore
- Transactional email
- Hosted `/consent` page (if product requires it)
- Autopilot apply for non-tracker steps (or permanently advisory UI)
- Redaction dashboard wired to intelligence/v1 engine
- Clerk webhook idempotency store
- Integration catalog seed + real provider tests
- Rollback processing snapshot vendor IDs
- Optional: gate SDK on domain verification
- Optional: headless scanner
- Stripe checkout wiring (when provider chosen)
- ESLint errors (purity/combobox/scripts) — quality, not CMP runtime

### CONFIGURATION REQUIRED
- Clerk keys + `CLERK_WEBHOOK_SECRET`
- Database URL
- `CRON_SECRET` (scans, GVL, scheduled policies)
- `IAB_CMP_ID` / `IAB_CMP_VERSION` or per-site registration (TCF/GPP encode)
- Published policy + mapped purposes/vendors (TCF mappingComplete)
- Integration catalog rows in DB
- Optional: `STRIPE_SECRET_KEY` (still 501 “not wired” after that)
- Optional: AWS Bedrock credentials

### EXTERNAL SERVICE REQUIRED
- Clerk
- Postgres
- Vercel (or other) cron runner
- IAB GVL HTTP fetch
- Stripe (payments)
- AWS Bedrock (optional AI)
- Real analytics/ads tags for GCM to matter

### BROWSER/PLATFORM LIMITATION
- HttpOnly cookies
- Browser-managed third-party cookies
- Resources loaded before CMP init
- GTM internal tags the CMP never sees
- Cannot claim JS blocks “all tracking”

### LEGAL/CERTIFICATION LIMITATION
- Not an IAB-registered CMP unless CMP ID is issued and certified
- Not a legal opinion / DPA certification
- Geo engine is operational, not certified geolocation
- Age/guardian is self-declaration + token, not IDV / verifiable parental consent
- Regulations catalog is not legal advice

---

## FINAL VERDICT

1. **How many total features exist?** 120 discovered and scored.  
2. **How many are fully complete?** 62  
3. **How many are partial?** 52  
4. **How many are broken?** 0  
5. **How many are not implemented?** 3 (digital twin restore, transactional email, hosted `/consent` page)  
6. **How many are stubs/mocks?** 3 (integration test connection ping, Stripe checkout POST, `test-db` 404)  
7. **What is the overall completion percentage?** **79%** (unweighted mean of 120 feature scores; sum 9436 / 120).  
8. **Is the core consent flow fully functional?** **Not as a verified product claim.** Record/withdraw APIs, evidence, and SDK source for Accept/Reject/Granular/Withdraw are real. **BROWSER E2E: NOT VERIFIED**, so those visitor flows are Partial (~80%).  
9. **Is the SDK fully functional?** **Partial.** Config load, consent APIs, GCM/GPC/IAB hooks, and network guards exist in `cmp-sdk-script.ts`. Visitor runtime and live config freshness were not browser/HTTP proven. TCF/GPP encode needs CMP ID + GVL.  
10. **Is runtime enforcement fully functional within browser limitations?** **Partial in code, unverified in browser.** Fetch/XHR/beacon/script/storage interception exists. It **cannot** block HttpOnly cookies, browser-managed third-party cookies, pre-CMP resources, or GTM-inner tags.  
11. **Is policy publishing fully functional?** **Yes in application code** (exclusive `markVersionPublished`, UI controls, compliance validate, processing snapshot). Live post-publish HTTP to the SDK was not replayed.  
12. **Is policy → SDK propagation fully functional?** **Implemented** (`no-store`, ETag, `configHash`, published-only public policy). **Live V1→V2→rollback fetch: NOT VERIFIED.**  
13. **Are integrations actually functional?** **Only GCM / IAB TCF / IAB GPP pattern keys** flip SDK runtime flags. All other catalog items are **CONNECTION RECORD ONLY**. Test connection does not ping providers. Catalog is empty without DB seed.  
14. **Is billing actually functional?** **Internal entitlements only** (website cap, GET subscription, $0 starter plan). Card checkout is **501 / not wired**. Stripe is an external dependency, not a working payment product.  
15. **Is multi-tenant isolation secure?** **Designed and statically tested** (org predicates, membership, API keys scoped). **Live Tenant A vs Tenant B HTTP was not run.** Clerk webhook replays are not idempotent.  
16. **What are the top 10 remaining gaps?**  
    1. Browser E2E of the visitor CMP  
    2. Live publish → SDK cache proof  
    3. Digital twin restore  
    4. Autopilot apply limited to two tracker steps  
    5. Integrations mostly connection records  
    6. Stripe checkout  
    7. TCF/GPP blocked without CMP ID / GVL / mappings  
    8. HTML-only scanner (no headless JS)  
    9. Dashboard redaction UI not using the real redaction APIs  
    10. No transactional email; Clerk webhook not idempotent  
17. **What must be done before calling the product production-ready?**  
    - Run real-browser CMP E2E (accept/reject/granular/withdraw/reload/GPC/blockers) on a published site.  
    - Replay HTTP: publish V2, confirm SDK hash/ETag changes; unpublish and rollback.  
    - Set Clerk, DB, `CRON_SECRET`; run crons in the target host.  
    - Decide IAB: obtain CMP ID or keep TCF/GPP disabled and labeled.  
    - Seed or hide empty integration catalog; do not imply vendor OAuth.  
    - Keep billing copy honest until Stripe is wired.  
    - Add webhook idempotency; do not expose `test-db`.  
    - Fix ESLint errors (dashboard purity, combobox).  
    - Document JS enforcement limits to customers.  
    - Do not claim legal certification, IAB registration, or headless scan completeness.