import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
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
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  const [website] = await db
    .select({
      id: websites.id,
      name: websites.name,
      domain: websites.domain,
      siteKey: websites.siteKey,
      status: websites.status,
    })
    .from(websites)
    .where(
      and(
        eq(websites.id, id),
        eq(websites.organizationId, localOrg.id),
      ),
    )
    .limit(1);

  if (!website) notFound();

  // Check if there is at least one active policy to warn if not.
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
    <div className="p-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-sm text-neutral-500"
      >
        <Link href="/dashboard/websites" className="hover:text-neutral-900">
          Websites
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/dashboard/websites/${website.id}`}
          className="hover:text-neutral-900"
        >
          {website.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-900">Installation</span>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          SDK Installation
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Add the CMP banner to{" "}
          <span className="font-medium text-neutral-700">{website.domain}</span>{" "}
          using the snippet below.
        </p>
      </div>

      {/* No active policy warning */}
      {!activePolicy && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>No active consent policy.</strong> Create and activate a policy for this
          website before deploying the SDK so the banner has content to display.{" "}
          <Link
            href={`/dashboard/policies/new?websiteId=${website.id}`}
            className="underline underline-offset-2"
          >
            Create policy →
          </Link>
        </div>
      )}

      {activePolicy && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <strong>Active policy:</strong> &ldquo;{activePolicy.name}&rdquo; is configured for
          this website. The SDK will load this policy on page visit.
        </div>
      )}

      <div className="space-y-8 max-w-3xl">

        {/* Step 1 — Site key */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-neutral-900">
            Step 1 — Your site key
          </h2>
          <p className="mb-3 text-sm text-neutral-500">
            This is the unique identifier for{" "}
            <strong>{website.domain}</strong>. It is safe to include in
            client-side code.
          </p>
          <div className="flex items-center gap-3 rounded-lg border bg-neutral-50 px-4 py-3">
            <code className="flex-1 font-mono text-sm text-neutral-900">
              {website.siteKey}
            </code>
            <span className="text-xs text-neutral-400">site key</span>
          </div>
        </section>

        {/* Step 2 — Add the snippet */}
        <section>
          <h2 className="mb-1 text-base font-semibold text-neutral-900">
            Step 2 — Add the snippet
          </h2>
          <p className="mb-4 text-sm text-neutral-500">
            Paste the snippet as high in the{" "}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs">&lt;head&gt;</code>{" "}
            as possible, before any analytics or advertising scripts. This ensures the
            banner loads before other tracking begins.
          </p>

          {/* HTML */}
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-neutral-700">HTML / static sites</p>
            <CodeBlock code={htmlSnippet} language="html" />
          </div>

          {/* Next.js */}
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-neutral-700">Next.js (App Router / Pages Router)</p>
            <CodeBlock code={nextjsSnippet} language="tsx" />
          </div>

          {/* React */}
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">React (CRA / Vite)</p>
            <CodeBlock code={reactSnippet} language="tsx" />
          </div>
        </section>

        {/* Step 3 — How it works */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-neutral-900">
            Step 3 — How the SDK works
          </h2>
          <ol className="space-y-2 text-sm text-neutral-600 list-decimal list-inside">
            <li>
              The SDK script loads asynchronously and calls{" "}
              <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
                {configUrlAbsolute}
              </code>{" "}
              to fetch the active banner configuration.
            </li>
            <li>
              If the visitor has no stored consent, the banner is shown based on
              the configured layout, position, and text.
            </li>
            <li>
              When the visitor makes a choice, the SDK calls{" "}
              <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
                POST /api/consent/record
              </code>{" "}
              and stores the <code className="rounded bg-neutral-100 px-1 font-mono text-xs">consentId</code>{" "}
              in <code className="rounded bg-neutral-100 px-1 font-mono text-xs">localStorage</code>.
            </li>
            <li>
              On subsequent visits, stored consent is respected until it expires
              (configured in the banner settings).
            </li>
            <li>
              Visitors can reopen the Preference Center at any time to update or
              withdraw consent.
            </li>
          </ol>
        </section>

        {/* Config endpoint reference */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-neutral-900">
            Config API endpoint
          </h2>
          <p className="mb-3 text-sm text-neutral-500">
            The SDK loads configuration from this public endpoint. You can also
            call it directly to inspect the active configuration.
          </p>
          <CodeBlock code={configEndpointNote} language="text" label="endpoint" />
        </section>

        {/* Enforcement — data-cmp-purpose */}
        <section>
          <h2 className="mb-1 text-base font-semibold text-neutral-900">
            Script enforcement
          </h2>
          <p className="mb-4 text-sm text-neutral-500">
            Tag third-party scripts with{" "}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
              data-cmp-purpose
            </code>{" "}
            and set{" "}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
              type=&quot;text/plain&quot;
            </code>
            . The SDK will pause them until the visitor grants the required
            purpose and restore execution automatically. Essential scripts
            (no{" "}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
              data-cmp-purpose
            </code>
            ) are never blocked.
          </p>
          <CodeBlock code={enforceSnippet} language="html" label="enforcement" />

          <div className="mt-4 rounded-md border bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            <p className="font-medium text-neutral-700 mb-1">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                Scripts tagged with <code className="rounded bg-neutral-100 px-1 font-mono">type=&quot;text/plain&quot;</code> are ignored by the browser until the SDK changes their type.
              </li>
              <li>
                The SDK reads the tracker rules from{" "}
                <code className="rounded bg-neutral-100 px-1 font-mono">{configUrlAbsolute}</code>{" "}
                which includes domain, identifier, and required purposeKey for each tracker.
              </li>
              <li>
                When consent changes, the SDK calls <code className="rounded bg-neutral-100 px-1 font-mono">window.CMP.onConsentChange(fn)</code> and re-evaluates all tagged scripts.
              </li>
              <li>
                Untagged third-party scripts are not blocked. Add them to your{" "}
                <Link href={`/dashboard/trackers`} className="underline underline-offset-2 hover:text-neutral-900">
                  Trackers
                </Link>{" "}
                list and tag them to enable enforcement.
              </li>
            </ul>
          </div>
        </section>

        {/* Step 4 — Verify */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-neutral-900">
            Step 4 — Verify installation
          </h2>
          <p className="mb-3 text-sm text-neutral-500">
            Click the button below to confirm that the SDK config endpoint
            resolves correctly for your site key.
          </p>
          <VerifyInstallation siteKey={website.siteKey} />
        </section>

        {/* Next steps */}
        <section className="rounded-lg border bg-neutral-50 p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Next steps
          </h2>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li>
              <Link
                href={`/dashboard/policies/new?websiteId=${website.id}`}
                className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Create a consent policy
              </Link>{" "}
              if you haven&apos;t already.
            </li>
            <li>
              <Link
                href={`/dashboard/policies/${activePolicy?.id ?? ""}`}
                className={`font-medium underline underline-offset-2 ${activePolicy ? "text-neutral-900 hover:text-neutral-700" : "pointer-events-none text-neutral-400"}`}
              >
                Configure the banner appearance
              </Link>{" "}
              in the Banner Configuration section of your policy.
            </li>
            <li>
              <Link
                href={`/dashboard/websites/${website.id}/settings`}
                className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Update website settings
              </Link>{" "}
              to set the default language and region.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
