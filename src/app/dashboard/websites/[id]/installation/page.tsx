import Link from "next/link";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { requireTenantWebsite } from "@/lib/tenant-website";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import {
  CodeBlock,
  VerifyInstallation,
} from "@/components/sdk/copy-snippet";
import { buildEmbedSnippet } from "@/lib/sdk/cmp-sdk-script";
import { publicOriginFromRequestHeaders } from "@/lib/sdk/public-origin";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { Card, CardContent } from "@/components/ui/card";

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

  const [publishedPolicy] = await db
    .select({
      id: consentPolicies.id,
      name: consentPolicies.name,
      version: consentPolicyVersions.version,
    })
    .from(consentPolicyVersions)
    .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
    .where(
      and(
        eq(consentPolicies.websiteId, website.id),
        eq(consentPolicyVersions.isPublished, true),
      ),
    )
    .limit(1);

  // Absolute CMP origin so customer sites load the script from this app,
  // not from their own hostname. Override with CMP_PUBLIC_ORIGIN when the
  // dashboard is opened on localhost but the snippet will run in production.
  const h = await headers();
  const appOrigin = publicOriginFromRequestHeaders(h);
  const originLooksLocal = /localhost|127\.0\.0\.1/.test(appOrigin);

  const sdkScriptUrl = `${appOrigin}/api/sdk/script`;
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

  const reactSnippet = `<!-- public/index.html — place first in <head>, before the React bundle and trackers -->
<script src="${sdkScriptUrl}" data-site-key="${website.siteKey}"></script>

<!-- Do not inject the CMP from useEffect; that runs after page scripts may execute. -->`;

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

<!-- Same-origin application code is not treated as an unknown tracker -->
<script src="/your-essential-app.js"></script>

<!-- Third-party resources must be registered and reviewed before marking their tracker record essential. -->

<!-- Optional iframe remains blank until marketing is confirmed -->
<iframe data-cmp-purpose="marketing" data-cmp-tracker="Video embed"
  src="https://www.youtube.com/embed/example"></iframe>`;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/websites" className="transition hover:text-[var(--foreground)]">Websites</Link>
        <span className="text-[var(--border)]" aria-hidden="true">/</span>
        <Link href={`/dashboard/websites/${website.id}`} className="transition hover:text-[var(--foreground)]">{website.name}</Link>
        <span className="text-[var(--border)]" aria-hidden="true">/</span>
        <span className="text-[var(--foreground)]">Installation</span>
      </nav>

      <PageHeader
        title="SDK Installation"
        description={
          <>
            Add the CMP banner to{" "}
            <span className="font-medium text-[var(--foreground)]">{website.domain}</span>{" "}
            using the snippet below.
          </>
        }
      />

      {!publishedPolicy ? (
        <StatusBanner variant="warning" role="alert">
          <p>
            <strong className="font-semibold">No published policy — the banner will not appear.</strong>{" "}
            The SDK config endpoint returns 404 until a version is published.{" "}
            {activePolicy ? (
              <Link href={`/dashboard/policies/${activePolicy.id}`}
                className="font-medium underline underline-offset-2 hover:text-[var(--warning)]">
                Open “{activePolicy.name}” and publish →
              </Link>
            ) : (
              <Link href={`/dashboard/policies/new?websiteId=${website.id}`}
                className="font-medium underline underline-offset-2 hover:text-[var(--warning)]">
                Create a policy →
              </Link>
            )}
          </p>
        </StatusBanner>
      ) : (
        <StatusBanner variant="success">
          <p>
            <strong className="font-semibold">Published policy:</strong>{" "}
            &ldquo;{publishedPolicy.name}&rdquo; v{publishedPolicy.version} is live for this site key.{" "}
            <Link href={`/dashboard/policies/${publishedPolicy.id}`}
              className="font-medium underline underline-offset-2 hover:text-[var(--success)]">
              Open policy →
            </Link>
          </p>
        </StatusBanner>
      )}

      {originLooksLocal ? (
        <StatusBanner variant="warning" role="alert">
          <p>
            <strong className="font-semibold">This snippet points at {appOrigin}.</strong>{" "}
            HTTPS websites cannot load a localhost script (mixed content). Set{" "}
            <code className="rounded-lg bg-[var(--warning-soft)] px-1.5 py-0.5 font-mono text-xs">CMP_PUBLIC_ORIGIN</code>{" "}
            to your deployed ConsentFlow URL, then copy the snippet again.
          </p>
        </StatusBanner>
      ) : null}

      <Card className="max-w-3xl">
      <CardContent className="space-y-8 pt-6">

        {/* Step 1 — Site key */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Step 1 — Your site key</h2>
          <p className="mb-3 text-sm text-[var(--muted-foreground)]">
            Unique identifier for <strong className="text-[var(--foreground)]">{website.domain}</strong>. Safe to include in client-side code.
          </p>
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3">
            <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm text-[var(--foreground)]">
              {website.siteKey}
            </code>
            <span className="shrink-0 text-xs text-[var(--muted-foreground)]">site key</span>
          </div>
        </section>

        {/* Step 2 — Add the snippet */}
        <section>
          <h2 className="mb-1 text-base font-semibold text-[var(--foreground)]">Step 2 — Add the snippet</h2>
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            Paste the snippet as high in the{" "}
            <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">&lt;head&gt;</code>{" "}
            as possible, before any analytics or advertising scripts.
          </p>

          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">HTML / static sites</p>
            <CodeBlock code={htmlSnippet} language="html" />
          </div>
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">Next.js (App Router / Pages Router)</p>
            <CodeBlock code={nextjsSnippet} language="tsx" />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">React (CRA / Vite)</p>
            <CodeBlock code={reactSnippet} language="tsx" />
          </div>
        </section>

        {/* Step 3 — How it works */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Step 3 — How the SDK works</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-[var(--muted-foreground)]">
            <li>Loads synchronously before optional trackers, establishes blocked state, then fetches configuration from <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">{configUrlAbsolute}</code>.</li>
            <li>Shows the banner if no stored consent is found.</li>
            <li>On visitor choice, calls <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">POST /api/consent/record</code> and stores the <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">consentId</code> in <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">localStorage</code>.</li>
            <li>On subsequent visits, stored consent is respected until it expires.</li>
            <li>Visitors can reopen the Preference Center at any time to update or withdraw consent.</li>
          </ol>
        </section>

        {/* Config endpoint */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Config API endpoint</h2>
          <p className="mb-3 text-sm text-[var(--muted-foreground)]">
            Public endpoint — call it directly to inspect the active configuration.
          </p>
          <CodeBlock code={configEndpointNote} language="text" label="endpoint" />
        </section>

        {/* Script enforcement */}
        <section>
          <h2 className="mb-1 text-base font-semibold text-[var(--foreground)]">Script enforcement</h2>
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            Tag third-party scripts with{" "}
            <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">data-cmp-purpose</code>{" "}
            and <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">type=&quot;text/plain&quot;</code>.
            The SDK pauses them until consent is granted.
          </p>
          <CodeBlock code={enforceSnippet} language="html" label="enforcement" />

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-5 py-4">
            <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">How it works</p>
            <ul className="list-inside list-disc space-y-1.5 text-xs text-[var(--muted-foreground)]">
              <li>Scripts with <code className="rounded-md bg-[var(--secondary)] px-1 font-mono">type=&quot;text/plain&quot;</code> are ignored by the browser until the SDK restores them.</li>
              <li>Tracker rules come from the config endpoint, including domain, identifier, and required purposeKey.</li>
              <li>When consent changes, the SDK re-evaluates all tagged scripts via <code className="rounded-md bg-[var(--secondary)] px-1 font-mono">window.CMP.onConsentChange(fn)</code>.</li>
              <li>Known registry domains and dynamically inserted third-party scripts/iframes are evaluated even without attributes. Add discovered resources to{" "}
                <Link href="/dashboard/trackers" className="font-medium underline underline-offset-2 hover:text-[var(--foreground)]">Trackers</Link>{" "}
                and keep static parser-loaded optional scripts inert with CMP attributes.</li>
              <li>JavaScript cannot undo requests that occurred before this SDK loaded or remove HttpOnly/third-party cookies. Use CSP, GTM consent checks, and server-side tagging for stronger coverage.</li>
            </ul>
          </div>
        </section>

        {/* Step 4 — Verify */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Step 4 — Verify installation</h2>
          <p className="mb-3 text-sm text-[var(--muted-foreground)]">
            Confirm that the SDK config endpoint resolves correctly for your site key.
          </p>
          <VerifyInstallation siteKey={website.siteKey} />
        </section>

        {/* Next steps */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Next steps</h2>
          <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
            <li>
              <Link href={`/dashboard/policies/new?websiteId=${website.id}`}
                className="font-medium text-[var(--foreground)] underline underline-offset-2 transition hover:text-[var(--primary)]">
                Create a consent policy
              </Link>{" "}if you haven&apos;t already.
            </li>
            <li>
              <Link
                href={activePolicy ? `/dashboard/policies/${activePolicy.id}` : "#"}
                className={`font-medium underline underline-offset-2 transition ${activePolicy ? "text-[var(--foreground)] hover:text-[var(--primary)]" : "pointer-events-none text-[var(--muted-foreground)]"}`}
              >
                Configure the banner appearance
              </Link>{" "}in the Banner Studio on your policy page.
            </li>
            <li>
              <Link href={`/dashboard/websites/${website.id}/settings`}
                className="font-medium text-[var(--foreground)] underline underline-offset-2 transition hover:text-[var(--primary)]">
                Update website settings
              </Link>{" "}to set the default language and region.
            </li>
          </ul>
        </section>
      </CardContent>
      </Card>
    </div>
  );
}
