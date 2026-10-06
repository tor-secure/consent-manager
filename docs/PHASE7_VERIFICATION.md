# Phase 7 verification and remaining deployment gates

## Scope and status

The migration inventory is in [PHASE7_MIGRATION_INVENTORY.md](PHASE7_MIGRATION_INVENTORY.md). It maps runtime discovery, crawler/worker/diff, evidence/provenance, graph/simulation, sessions/proofs/keys/events, experiments/SDK, and transfer authorization/keys/envelopes/redaction to backend, API, schema, UI, tests, and documentation.

Automated verification passes. Phase 7 is **not certified complete for production**: authenticated dashboard workflows and deployment network controls still require verification in a dedicated test environment. No production database, live tenant records, or production migration was used. Work is published only on `rift-features`; main/master is untouched.

## Follow-up bugs and hardening

- Chromium's blanket DNS block prevented connection to the pinned loopback proxy. The rule now excludes `127.0.0.1`, allowing the proxy while keeping destination hostname resolution disabled.
- Scans previously reported completion even when every page failed. They now fail when no page loaded successfully; cancellation remains distinct. HTTP error pages retain an inspectable page error.
- HTTP proxy forwarding passed an undefined header value, which Node rejects. That value is removed and proxy connection headers are filtered.
- Proxy shutdown now closes idle sockets and browser cleanup always attempts proxy cleanup. CONNECT processing stops if its client disconnected during DNS validation.
- The resource cap now includes document requests and redirects. Links are deduplicated while queued. Workers recheck URL claims and page limits after asynchronous DNS validation.
- Robots handling now supports matching crawler groups, Allow exceptions, comments, wildcard paths, terminal anchors, and tie precedence. Wildcard matching avoids exponential regular-expression backtracking on untrusted rules.
- Downloads are bounded at 16 MiB per response/tunnel and 128 MiB per scan, with a 20-second idle tunnel timeout. HTTPS bounds apply to encrypted bytes, not decoded response content.
- The test runner previously deleted the entire shared `.tmp` folder. A rerun failed with `EPERM` while logs and a disposable database were present. It now cleans only its own generated test directories, preserving other harness artifacts. The corrected full suite was executed again.

## Commands and results

| Executed command / verification | Result |
|---|---|
| `npm.cmd test` | Complete repository test runner passed; includes API/regression fixtures, SDK, crawler, graph, proof/session, experiment, transfer/redaction, isolation and existing feature tests |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run lint` | Passed with four existing warnings, zero errors |
| `npm.cmd run build` | Production build passed; final run explicitly used the disposable local database URL |
| `npx.cmd drizzle-kit check` | Passed |
| `npx.cmd drizzle-kit migrate` | Entire journal through `0062` applied successfully to fresh local PostgreSQL, listening only on `127.0.0.1:55433` |
| `CMP_SKIP_REAL_TENANT_PROBE=1 node scripts/cmp-browser-readiness.mjs` | 27 checks passed, zero failures; Chrome, Edge and Firefox launched; real tenant verification skipped |
| Temporary local TSX worker harness | Real Chromium loaded `https://example.com` through the hardened proxy; persisted HTTP 200 page, two sanitized observed crawler records and completed scan |
| Temporary local graph harness | Persisted crawler observations appeared as OBSERVED graph nodes; another organization received no site graph |
| Temporary local failed-crawl harness | Missing public page produced failed scan with an explanatory error |
| `git diff --check` | Passed |

Temporary database fixtures used synthetic organization/site IDs. The public-site check fetched only public pages; it did not connect to a live Consent Guru tenant. Test-only Node harnesses bypassed the `server-only` package marker to import server modules outside Next.js; production authentication was unchanged.

New crawler assertions cover robots exceptions/groups/wildcards, empty rules, hostile wildcard patterns, failure/cancellation status, proxy-address resolution, cumulative byte-budget exhaustion, and idle proxy shutdown. Existing tests were retained.

## Frontend, API and database changes

This follow-up adds no API, frontend route, or database schema. Existing crawler detail/history surfaces receive truthful failure status and error messages through their existing API. All migrated frontend locations and authorization boundaries are listed in the inventory. Previous Phase 7 integration changes include server-side transfer eligibility checks, organization/site graph scoping, scan evidence inspection, confirmations, and removal of generic privacy-event writes that allowed callers to forge provenance.

Migration `0062_secure_transfers.sql` remains **unapplied in production**, along with any earlier migration not yet deployed. Local migration success does not establish production schema state. Apply deployment migrations only through the normal reviewed process. PostgreSQL emitted nonfatal notices that existing long foreign-key identifiers are truncated; migration execution succeeded.

## Remaining warnings and manual verification

Lint warnings: one unoptimized image in `src/components/public/news-feed.tsx`; three `beforeInteractive` placement warnings in `src/components/site/consent-guru-install.tsx`. No authorization bypass or disabled test was introduced to suppress them.

Required authenticated test-tenant browser checks remain: login/readiness; discovery filtering and evidence details; crawler create/progress/results/diff; graph filtering/evidence/simulation; session decision history and proof verification; experiment lifecycle/events/results; transfer recipient registration, authorization/revocation, envelope retrieval/attestation/audit; existing consent and transfer screens. The SDK harness does not establish these authenticated UI results.

Production deployment must verify the crawler worker's outbound firewall policy, scheduler authorization and capacity, process memory/CPU limits, proof-key provisioning/rotation, and secure-transfer recipient key ownership. `CONSENT_GURU_CRAWLER_EGRESS_RESTRICTED=true` is an attestation, not a firewall configuration. Tunnel byte caps cannot bound decompressed browser memory or malicious script CPU. Robots retrieval retains the documented fail-open behavior if unavailable.

Secure transfer uses X25519, HKDF-SHA-256 and AES-256-GCM. **It is not server-blind E2EE**: plaintext reaches Consent Guru's server before recipient encryption. Retain that architecture limitation in user-facing claims and deployment threat models. Crypto and authorization tests are not a substitute for an independent security review.

## Follow-up files

- `src/lib/scanner/browser-crawl-core.ts`
- `src/lib/scanner/browser-crawler.ts`
- `src/lib/scanner/safe-browser-proxy.ts`
- `src/lib/scanner/safe-browser-proxy-core.ts`
- `src/lib/scanner/browser-crawler.test.cjs`
- `scripts/run-tests.cjs`
- `docs/browser-crawler.md`
- `docs/PHASE7_MIGRATION_INVENTORY.md`
- `docs/PHASE7_VERIFICATION.md`

The broader migrated files are in commit `d4576664a29910b6faa8d637c1b3146fd684cf16` on `rift-features`. Follow-up fixes are committed on that same branch. Review and deploy separately; these results do not authorize production migrations.
