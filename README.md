# Consent Guru

Consent management platform (CMP) for privacy-regulated websites. Customers embed a **hosted browser SDK** — there is no separate npm CMP package.

## Getting started (operators)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, create an organization and website, publish a consent policy, then open **Developers → Install SDK**.

## Customer SDK quickstart (hosted embed)

1. **Verify the website domain** in Website settings. Production Origin checks reject unverified hosts.
2. **Publish a policy** so `GET /api/sdk/{siteKey}/config` returns live banner config.
3. Copy the stack snippet from **Developers → Install SDK** (HTML, React, Next.js, PHP, or .NET).
4. Paste it as the **first** thing in `<head>` (before GTM, gtag, Meta Pixel, ads). Do not add `async` or `defer` to the CMP script, and do not inject it from `useEffect`.
5. Use **Check connection** on the Install page to confirm the published config.

The snippet loads:

- an inline early-block (Google Consent Mode defaults + tracker hold)
- a config prefetch
- `GET /api/sdk/script` with `data-site-key="…"`

### Public API (browser)

After load, customers use `window.CMP`:

| Method | Notes |
| --- | --- |
| `getConsent()` | Includes `state`, `confirmed`, `decisions`, `consentId` |
| `acceptAll()` / `rejectAll()` / `saveGranular(…)` | Persist guest choices |
| `withdrawConsent()` | Guest or account withdrawal |
| `openPreferenceCenter()` | Preference UI |
| `onConsentChange(fn)` | Listener |
| `setSubjectSession(…)` / `clearSubjectSession()` | Signed-in path (optional) |

**Gate optional product features on grant, not merely confirmation:**

```js
const c = window.CMP.getConsent();
if (c.state === "GRANTED") {
  // unlock optional analytics / marketing
}
```

`confirmed` means the last decision was server-confirmed (including deny / withdraw). Prefer `state === "GRANTED"` before enabling optional processing.

### What `siteKey` allows

Public site keys can load published config and create/update/withdraw **guest** consent for that site (with Origin allowlist + signed policy context). They do not grant dashboard or admin access.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit and regression tests |
| `npm run typecheck` | TypeScript check |

## Learn more

- In-product: **Developers → Install SDK**, **API reference**, **Webhooks**
- Next.js docs: [https://nextjs.org/docs](https://nextjs.org/docs)
