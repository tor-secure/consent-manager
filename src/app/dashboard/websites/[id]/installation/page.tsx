import Link from "next/link";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { requireTenantWebsite } from "@/lib/tenant-website";
import { consentPolicies } from "@/db/schema/consent-policies";
import {
  CodeBlock,
  VerifyInstallation,
} from "@/components/sdk/copy-snippet";
import { buildEmbedSnippet } from "@/lib/sdk/cmp-sdk-script";

// Auth + bootstrap guaranteed by dashboard layout.
// Tenant isolation: website scoped to org+id.
export default async function InstallationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const website = await requireTenantWebsite(id);

  const [activePolicy] = await db
    .select({ id: consentPolicies.id, name: consentPolicies.name })
    .from(consentPolicies)
    .where(
      and(
        eq(consentPolicies.websiteId, website.id),
        eq(consentPolicies.status, "active"),
      ),
    )
    .limit(1);

  // ---------------------------------------------------------------------------
  // Determine the CMP app origin so we can emit absolute URLs to the SDK
  // script and API endpoints that work from external websites.
  // ---------------------------------------------------------------------------
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto =
    h.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const appOrigin = host ? `${proto}://${host}` : "";

  const sdkScriptUrl = `${appOrigin}/api/sdk/script`;
  const configUrl = `/api/sdk/${website.siteKey}/config`;
  const configUrlAbsolute = `${appOrigin}/api/sdk/${website.siteKey}/config`;

  // ---------------------------------------------------------------------------
  // Snippet templates
  // ---------------------------------------------------------------------------

  const htmlSnippet = buildEmbedSnippet({
    siteKey: website.siteKey,
    cdnUrl: sdkScriptUrl,
  });

  const nextjsSnippet = `// app/layout.tsx  (or pages/_app.tsx)
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          id="cmp-sdk"
          strategy="beforeInteractive"
          src="${sdkScriptUrl}"
          data-site-key="${website.siteKey}"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`;

  const reactSnippet = `// Add to your index.html <head>, or load via useEffect:
import { useEffect } from 'react';

function ConsentProvider() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${sdkScriptUrl}';
    script.async = true;
    script.setAttribute('data-site-key', '${website.siteKey}');
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);
  return null;
}
// Render <ConsentProvider /> at the top of your component tree.`;

  const configEndpointNote = `GET ${configUrlAbsolute}
# Returns: banner config, purposes, vendors, trackerRules for site key ${website.siteKey}
# Public endpoint — no authentication required.
# CORS: Access-Control-Allow-Origin: *
# Cache-Control: public, max-age=300`;

  const enforceSnippet = `<!-- Pause a third-party script until the "analytics" purpose is granted -->
<script type="text/plain" data-cmp-purpose="analytics" src="https://www.google-analytics.com/analytics.js"></script>

<!-- Pause an inline script until "marketing" consent is granted -->
<script type="text/plain" data-cmp-purpose="marketing">
  // Your marketing pixel code here
</script>

<!-- Essential scripts — no data-cmp-purpose attribute, never blocked -->
<script src="/your-essential-app.js"></script>`;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/websites" className="transition hover:text-slate-900">Websites</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <Link href={`/dashboard/websites/${website.id}`} className="transition hover:text-slate-900">{website.name}</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="text-slate-900">Installation</span>
      </nav>

      {/* Page header */}
      <div>
        <h1 className="page-title">SDK Installation</h1>
        <p className="page-description">
          Add the CMP banner to{" "}
          <span className="font-medium text-slate-700">{website.domain}</span>{" "}
          using the snippet below.
        </p>
      </div>

      {/* Policy status banners */}
      {!activePolicy && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M8 2l6 12H2z" />
            <path strokeLinecap="round" d="M8 7v3M8 12h.01" />
          </svg>
          <p>
            <strong className="font-semibold">No active consent policy.</strong>{" "}
            Create and activate a policy for this website before deploying the SDK.{" "}
            <Link href={`/dashboard/policies/new?websiteId=${website.id}`}
              className="font-medium underline underline-offset-2 hover:text-amber-900">
              Create policy →
            </Link>
          </p>
        </div>
      )}
      {activePolicy && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4.5" />
          </svg>
          <p>
            <strong className="font-semibold">Active policy:</strong>{" "}
            &ldquo;{activePolicy.name}&rdquo; is configured for this website.
          </p>
        </div>
      )}

      <div className="max-w-3xl space-y-8">

        {/* Step 1 — Site key */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Step 1 — Your site key</h2>
          <p className="mb-3 text-sm text-slate-500">
            Unique identifier for <strong className="text-slate-700">{website.domain}</strong>. Safe to include in client-side code.
          </p>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm text-slate-900">
              {website.siteKey}
            </code>
            <span className="shrink-0 text-xs text-slate-400">site key</span>
          </div>
        </section>

        {/* Step 2 — Add the snippet */}
        <section>
          <h2 className="mb-1 text-base font-semibold text-slate-900">Step 2 — Add the snippet</h2>
          <p className="mb-4 text-sm text-slate-500">
            Paste the snippet as high in the{" "}
            <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">&lt;head&gt;</code>{" "}
            as possible, before any analytics or advertising scripts.
          </p>

          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">HTML / static sites</p>
            <CodeBlock code={htmlSnippet} language="html" />
          </div>
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Next.js (App Router / Pages Router)</p>
            <CodeBlock code={nextjsSnippet} language="tsx" />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">React (CRA / Vite)</p>
            <CodeBlock code={reactSnippet} language="tsx" />
          </div>
        </section>

        {/* Step 3 — How it works */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Step 3 — How the SDK works</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-slate-600">
            <li>Loads asynchronously and fetches the active banner configuration from <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{configUrlAbsolute}</code>.</li>
            <li>Shows the banner if no stored consent is found.</li>
            <li>On visitor choice, calls <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">POST /api/consent/record</code> and stores the <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">consentId</code> in <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">localStorage</code>.</li>
            <li>On subsequent visits, stored consent is respected until it expires.</li>
            <li>Visitors can reopen the Preference Center at any time to update or withdraw consent.</li>
          </ol>
        </section>

        {/* Config endpoint */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Config API endpoint</h2>
          <p className="mb-3 text-sm text-slate-500">
            Public endpoint — call it directly to inspect the active configuration.
          </p>
          <CodeBlock code={configEndpointNote} language="text" label="endpoint" />
        </section>

        {/* Script enforcement */}
        <section>
          <h2 className="mb-1 text-base font-semibold text-slate-900">Script enforcement</h2>
          <p className="mb-4 text-sm text-slate-500">
            Tag third-party scripts with{" "}
            <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">data-cmp-purpose</code>{" "}
            and <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">type=&quot;text/plain&quot;</code>.
            The SDK pauses them until consent is granted.
          </p>
          <CodeBlock code={enforceSnippet} language="html" label="enforcement" />

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">How it works</p>
            <ul className="list-inside list-disc space-y-1.5 text-xs text-slate-600">
              <li>Scripts with <code className="rounded-md bg-slate-100 px-1 font-mono">type=&quot;text/plain&quot;</code> are ignored by the browser until the SDK restores them.</li>
              <li>Tracker rules come from the config endpoint, including domain, identifier, and required purposeKey.</li>
              <li>When consent changes, the SDK re-evaluates all tagged scripts via <code className="rounded-md bg-slate-100 px-1 font-mono">window.CMP.onConsentChange(fn)</code>.</li>
              <li>Untagged scripts are not blocked — add them to your{" "}
                <Link href="/dashboard/trackers" className="font-medium underline underline-offset-2 hover:text-slate-900">Trackers</Link>{" "}
                list and tag them to enable enforcement.</li>
            </ul>
          </div>
        </section>

        {/* Step 4 — Verify */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Step 4 — Verify installation</h2>
          <p className="mb-3 text-sm text-slate-500">
            Confirm that the SDK config endpoint resolves correctly for your site key.
          </p>
          <VerifyInstallation siteKey={website.siteKey} />
        </section>

        {/* Next steps */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Next steps</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <Link href={`/dashboard/policies/new?websiteId=${website.id}`}
                className="font-medium text-slate-900 underline underline-offset-2 transition hover:text-indigo-600">
                Create a consent policy
              </Link>{" "}if you haven&apos;t already.
            </li>
            <li>
              <Link
                href={activePolicy ? `/dashboard/policies/${activePolicy.id}` : "#"}
                className={`font-medium underline underline-offset-2 transition ${activePolicy ? "text-slate-900 hover:text-indigo-600" : "pointer-events-none text-slate-400"}`}
              >
                Configure the banner appearance
              </Link>{" "}in the Banner Studio on your policy page.
            </li>
            <li>
              <Link href={`/dashboard/websites/${website.id}/settings`}
                className="font-medium text-slate-900 underline underline-offset-2 transition hover:text-indigo-600">
                Update website settings
              </Link>{" "}to set the default language and region.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
