# Browser crawler

Consent Guru's browser crawler is an additional scanning mode. It does not replace the existing HTML scanner. A crawl is queued in the dashboard, then processed by the authenticated scheduler at `/api/cron/browser-crawls`; closing the dashboard does not stop it.

## What it records

Each bounded crawl stores its configuration, status, progress, visited pages, HTTP resource metadata, cookie names, destination host, resource type, first or third party classification, and timestamps. Browser evidence is written to the Phase 1 `runtime_discovery_observations` model with `discovery_source: browser_crawler` and `evidence_status: observed`.

It never stores request bodies, response bodies, credentials, authorization headers, cookie values, storage values, URL query strings, or fragments. The browser route also removes authorization, cookie, proxy-authorization, and API-key request headers before continuing navigation. Existing tracker, vendor, and purpose mappings remain configured intelligence; a destination without one stays an observed unknown.

## Safety limits

The crawler only permits HTTP(S) targets on public DNS addresses and standard ports. It blocks loopback, private, link local, metadata, and internal hosts both before navigation and for browser requests. It removes credentials, query strings, and fragments while normalizing URLs; follows only same-site links; deduplicates URLs; bounds depth to 0–5 and pages to 1–100; caps resources per page; times out navigation; blocks unsafe redirects; and respects `robots.txt` by default. Configured page concurrency is bounded from 1 to 3; each page uses an isolated browser context. If robots.txt cannot be safely fetched, parsing fails open and the crawl continues.

Browser HTTP(S) traffic goes through a loopback-only egress proxy. The proxy validates every target, rejects mixed public/private DNS answers, and opens the upstream socket to the selected validated IP, so Chromium does not independently resolve the target hostname. The robots.txt fetch uses the same pinned-address check. Keep the worker in an outbound-restricted network that blocks private, loopback, link-local, and metadata ranges as defense in depth, especially if browser or proxy behavior changes.

Chromium is launched with host resolution disabled except for the loopback proxy address, and WebRTC restricted to proxied UDP. This prevents target hostname resolution and direct peer-to-peer sockets while allowing Chromium to reach its proxy. The proxy itself removes authorization, cookie, API-key, token, secret, credential, and password headers as a second boundary, including WebSocket handshakes. Site-set cookie names remain observable in the isolated browser context, but cookie values are not sent on subsequent crawler requests.

Robots rules select the most specific matching crawler user-agent group, support wildcard and end-anchored paths, and prefer the longest matching rule (Allow wins a tie). Empty Disallow rules impose no restriction. A scan with no successfully loaded pages finishes as failed, with an explanation; individual page failures remain inspectable. Cancellation takes precedence over this result. The request cap also applies to document and redirect requests, and queued links are deduplicated before discovery counts are incremented.

The worker and scan-creation API fail closed unless `CONSENT_GURU_CRAWLER_EGRESS_RESTRICTED=true` is set. Set this deployment attestation only after the worker's network policy has been verified; the variable itself does not configure or prove firewall enforcement.

Proxy downloads are capped at 16 MiB per HTTP response or HTTPS connection and 128 MiB across a scan. HTTPS limits count encrypted tunnel bytes rather than decoded individual responses. Idle upstream tunnels time out after 20 seconds. These limits bound network input; they do not replace worker container memory/CPU limits, particularly for decompression or malicious page scripts. Oversized content can cause individual pages to fail.

## APIs

- `POST /api/browser-crawls` queues a browser scan for an authorized website.
- `GET /api/browser-crawls` lists organization-scoped browser scans.
- `GET /api/browser-crawls/:scanId` returns scan progress and pages.
- `DELETE /api/browser-crawls/:scanId` cancels a queued scan or requests cancellation of an active scan after its in-flight pages finish.
- `GET /api/browser-crawls/:scanId/compare?previousScanId=…` compares observed pages, destinations, cookie names, and resource types.

The dashboard is at **Discovery & Monitoring → Browser crawler**. It provides safe configuration, queue history, progress, pages, scan-specific observed evidence, and a comparison panel for completed scans of the same site. Scheduled workers must be given `CRON_SECRET` or `SCANNER_CRON_SECRET` (16+ characters).
