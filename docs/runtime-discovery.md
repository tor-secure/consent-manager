# Runtime Discovery

Runtime Discovery records browser-observed privacy evidence from the existing Consent Guru SDK. It helps an organization see which destinations, browser resources, cookies, and storage keys were active during real page use. It is an observation feature in Phase 1; it does not grant consent, change consent decisions, or enforce a block.

## Installation and dashboard

No second browser product is required. Sites that load the existing Consent Guru install snippet receive Runtime Discovery automatically. Open **Discovery & Monitoring → Runtime discovery** to choose a website, review evidence, and distinguish a browser observation from linked tracker, vendor, or purpose configuration.

## Collected metadata

The SDK observes `fetch`, XHR, `sendBeacon`, image assignments, dynamically added resource elements, browser PerformanceObserver resources, cookie writes, and local/session storage writes. Each observation can include the sanitized page URL, page origin, destination host, path, resource type, request method, navigation type, timestamp, first or third party classification, and the CMP consent-grant snapshot available at the time.

## Explicit exclusions and sanitization

Runtime Discovery never collects request or response bodies, form contents, headers, credentials, authorization tokens, cookie values, local/session storage values, query strings, URL fragments, or arbitrary application data. The SDK strips URL credentials, queries, and fragments before queuing an observation. The ingestion API rejects them again, rejects malformed URLs, caps reports at 100 observations and 64 KiB, and accepts only enumerated request methods and observation types.

## Evidence and intelligence

Stored rows have `evidenceStatus: observed` and `discoverySource: cmp_sdk_runtime`. A tracker, vendor, or purpose link is populated only when an existing Consent Guru tracker matches the observed destination for that site. That link is configured intelligence; it does not change the fact that the network or storage activity was observed. Unknown destinations remain unknown observations and do not create vendor records.

## API

- `POST /api/sdk/{siteKey}/discovery` accepts the SDK batch. It uses the same public site key, CORS policy, rate limiting, and site-origin protection as existing SDK endpoints. It is write-only.
- `GET /api/runtime-discovery?websiteId={uuid}&pageUrl={sanitized-url}&limit=100` is authenticated and organization-scoped. It returns recent observations for dashboard/API consumers.

Reports are deduplicated by site and browser event ID. A public site key cannot choose another site or organization: the backend resolves both from the key, and dashboard retrieval resolves them from the signed-in organization.
