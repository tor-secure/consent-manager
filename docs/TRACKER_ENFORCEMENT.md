# Tracker enforcement integration

## Required load order

Place the CMP script first in `<head>`, without `async` or `defer`:

```html
<script src="https://cmp.example/api/sdk/script" data-site-key="site_..."></script>
```

It must execute before application bundles, Google Tag Manager, analytics,
advertising, chat widgets, maps, video embeds, and other optional resources.
For Next.js, use `next/script` with `strategy="beforeInteractive"`.

Static parser-loaded optional scripts must remain inert:

```html
<script
  type="text/plain"
  data-cmp-purpose="analytics"
  src="https://analytics.example/sdk.js"
></script>
```

Third-party resources are treated as essential only when their server-provided
tracker registry rule is explicitly reviewed and marked essential. A DOM
attribute cannot make an unknown third-party tracker essential.

## Enforced client-side surfaces

- Tagged scripts are inert until their purpose has confirmed consent.
- Scripts appended to `head`, `body`, or the root element are synchronously
  evaluated against tracker domains, identifiers, and URL patterns.
- Dynamic iframes are replaced with `about:blank` while blocked and restored
  after confirmed consent.
- Known image/pixel elements inserted through patched roots are replaced with a
  local transparent image while blocked.
- MutationObserver provides fallback discovery for nested DOM insertions.
- Configured first-party cookie names and local/session storage keys are blocked
  while their tracker is denied.
- Accessible configured cookies, local/session storage keys, and configured
  IndexedDB databases are cleaned after denial or withdrawal.
- Google Consent Mode and IAB APIs derive grants only from the confirmed state.

The server-provided `unknownTrackerBehavior` supports `BLOCK`, `WARN`, and
`ALLOW`. `BLOCK` is the default. Same-origin application files are not treated
as trackers unless they match a registry rule or carry a CMP purpose attribute.

## Debugging and performance

Enable developer diagnostics in website regulation settings or set
`window.__CMP_DEBUG = true` before loading the SDK. Inspect:

```js
window.CMP.getEnforcementDiagnostics()
```

The result contains bootstrap time, cumulative inspection time, inspected,
blocked and allowed counts, MutationObserver batch count, and at most 100
sanitized enforcement events. Resource query strings and payloads are omitted.
The implementation uses event-driven DOM observation and does not poll.

## Browser limitations

Client-side JavaScript cannot guarantee interception or cleanup of:

- requests initiated before the CMP executed;
- an untagged static parser script that the browser executes during parsing;
- image, iframe, `fetch`, XHR, beacon, WebSocket, or worker requests initiated
  outside the controlled DOM insertion paths;
- service workers or browser extensions;
- HTTP response `Set-Cookie` headers;
- HttpOnly cookies;
- third-party cookies that are not accessible from the website origin;
- cookies at unknown paths or domains;
- data already sent to a vendor;
- tracker behavior inside a cross-origin iframe after it has loaded.

MutationObserver is a fallback detector, not a browser network firewall. Some
resource requests may begin before its callback runs.

## Recommended stronger controls

- Configure CSP `script-src`, `frame-src`, `img-src`, and `connect-src`
  allowlists. Use nonces/hashes for application scripts.
- In GTM, use consent initialization triggers and require the corresponding
  consent type on every optional tag. Load GTM only after CMP bootstrap.
- Use server-side tagging or a controlled first-party proxy when network-level
  enforcement is required.
- Gate application `fetch`, XHR, beacon, worker, and vendor SDK initialization
  through `CMP.onConsentChange` and `CMP.getConsent().confirmed`.
- Keep the tracker registry current through scanning and operational review.
- Use vendor deletion/revocation APIs when withdrawal must propagate beyond the
  browser.
