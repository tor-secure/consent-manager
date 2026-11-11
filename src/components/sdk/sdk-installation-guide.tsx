import Link from "next/link";

import { CodeBlock, VerifyInstallation } from "@/components/sdk/copy-snippet";
import { StatusBanner } from "@/components/ui/status-banner";
import { Card, CardContent } from "@/components/ui/card";
import { buildInstallStackSnippets } from "@/lib/sdk/install-snippets";
import {
  buildClerkSubjectBridgeRouteExample,
  buildSubjectBridgeSnippet,
} from "@/lib/sdk/subject-bridge-script";

export type SdkInstallationGuideWebsite = {
  id: string;
  name: string;
  domain: string;
  siteKey: string;
};

export type SdkInstallationGuidePolicy = {
  id: string;
  name: string;
  version?: number | string;
};

export function SdkInstallationGuide({
  website,
  appOrigin,
  activePolicy,
  publishedPolicy,
}: {
  website: SdkInstallationGuideWebsite;
  appOrigin: string;
  activePolicy: SdkInstallationGuidePolicy | null;
  publishedPolicy: SdkInstallationGuidePolicy | null;
}) {
  const originLooksLocal = /localhost|127\.0\.0\.1/.test(appOrigin);
  const sdkScriptUrl = `${appOrigin}/api/sdk/script`;
  const configUrlAbsolute = `${appOrigin}/api/sdk/${website.siteKey}/config`;

  const stackSnippets = buildInstallStackSnippets({
    siteKey: website.siteKey,
    cdnUrl: sdkScriptUrl,
  });

  const subjectBridgeSnippet = buildSubjectBridgeSnippet({
    bridgeScriptUrl: `${appOrigin}/api/sdk/subject-bridge`,
    bridgeUrl: "/api/cmp/subject",
    websiteId: website.id,
  });

  const subjectBridgeRoute = buildClerkSubjectBridgeRouteExample({
    consentGuruOrigin: appOrigin,
    websiteId: website.id,
  });

  const configEndpointNote = `GET ${configUrlAbsolute}
# Returns: banner config, purposes, vendors, trackerRules for site key ${website.siteKey}
# Public endpoint — no authentication required.
# CORS: Access-Control-Allow-Origin: *
# Cache-Control: public, max-age=300`;

  const enforceSnippet = `<!-- Optional JavaScript stays inert until the matching purpose is confirmed -->
<script type="text/plain" data-cmp-purpose="analytics" src="https://www.google-analytics.com/analytics.js"></script>

<!-- Inert GTM loader. The CMP creates the real loader only after analytics consent. -->
<script type="text/plain" data-cmp-purpose="analytics" data-cmp-src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"></script>

<!-- Optional iframe: do not set src until consent -->
<iframe data-cmp-purpose="marketing" data-cmp-src="https://www.youtube.com/embed/example" title="Video"></iframe>

<!-- Optional pixel: do not set src until consent -->
<img data-cmp-purpose="marketing" data-cmp-src="https://ad.doubleclick.net/pixel" alt="" width="1" height="1">

<!-- Pause an inline script until "marketing" consent is granted -->
<script type="text/plain" data-cmp-purpose="marketing">
  // Your marketing pixel code here
</script>

<!-- Same-origin application code stays available when it does not match a tracker rule -->
<script src="/your-essential-app.js"></script>

<!-- A same-origin file that matches a tracker rule is still optional -->
<script type="text/plain" data-cmp-purpose="analytics" src="/analytics.js"></script>

<!-- Third-party resources must be registered and reviewed before marking their tracker record essential. -->`;

  const preferenceSyncReceiver = `import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const SITE_ID = "${website.id}";
const SECRET = process.env.CMP_PREFERENCE_SYNC_SECRET!; // whsec_…

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-cmp-timestamp") ?? "";
  const signatureHeader = request.headers.get("x-cmp-signature") ?? "";
  const provided = signatureHeader.replace(/^sha256=/, "");
  const expected = createHmac("sha256", SECRET)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    id: string;
    type: string;
    data: {
      siteId: string;
      subjectKey: string;
      eventId: string;
      preferenceRevision: number;
      changeKind: "established" | "updated";
      preferences: Array<{ kind: string; id: string; name: string; granted: boolean }>;
      changes: Array<{
        kind: string;
        id: string;
        name: string;
        previousGranted: boolean;
        currentGranted: boolean;
      }>;
    };
  };

  if (event.data.siteId !== SITE_ID) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // TODO: upsert prefs if preferenceRevision >= stored revision
  // TODO: if changeKind === "updated", alert owner once per eventId
  return NextResponse.json({ ok: true });
}`;

  return (
    <div className="space-y-6">
      {!publishedPolicy ? (
        <StatusBanner variant="warning" role="alert">
          <p>
            <strong className="font-semibold">No published policy — the banner will not appear.</strong>{" "}
            The SDK config endpoint returns 404 until a version is published.{" "}
            {activePolicy ? (
              <Link
                href={`/dashboard/policies/${activePolicy.id}`}
                className="font-medium underline underline-offset-2 hover:text-[var(--warning)]"
              >
                Open “{activePolicy.name}” and publish →
              </Link>
            ) : (
              <Link
                href={`/dashboard/policies/new?websiteId=${website.id}`}
                className="font-medium underline underline-offset-2 hover:text-[var(--warning)]"
              >
                Create a policy →
              </Link>
            )}
          </p>
        </StatusBanner>
      ) : (
        <StatusBanner variant="success">
          <p>
            <strong className="font-semibold">Published policy:</strong> “{publishedPolicy.name}”
            {publishedPolicy.version != null ? ` v${publishedPolicy.version}` : ""} is live for this
            site key.{" "}
            <Link
              href={`/dashboard/policies/${publishedPolicy.id}`}
              className="font-medium underline underline-offset-2 hover:text-[var(--success)]"
            >
              Open policy →
            </Link>
          </p>
        </StatusBanner>
      )}

      {originLooksLocal ? (
        <StatusBanner variant="warning" role="alert">
          <p>
            <strong className="font-semibold">This snippet points at {appOrigin}.</strong> HTTPS
            websites cannot load a localhost script (mixed content). Set{" "}
            <code className="rounded-lg bg-[var(--warning-soft)] px-1.5 py-0.5 font-mono text-xs">
              CMP_PUBLIC_ORIGIN
            </code>{" "}
            to your deployed Consent Guru URL, then copy the snippet again.
          </p>
        </StatusBanner>
      ) : null}

      <Card className="max-w-3xl">
        <CardContent className="space-y-8 pt-6">
          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
              Step 1 — Your site key
            </h2>
            <p className="mb-3 text-sm text-[var(--muted-foreground)]">
              Unique identifier for{" "}
              <strong className="text-[var(--foreground)]">{website.domain}</strong>. Safe to include
              in client-side code.
            </p>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3">
              <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm text-[var(--foreground)]">
                {website.siteKey}
              </code>
              <span className="shrink-0 text-xs text-[var(--muted-foreground)]">site key</span>
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-base font-semibold text-[var(--foreground)]">
              Step 2 — Add the snippet
            </h2>
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              Paste the HTML snippet as the first script in{" "}
              <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                &lt;head&gt;
              </code>
              , before Google Tag Manager, gtag, Meta Pixel, analytics, and advertising tags.
            </p>
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">HTML / static sites</p>
              <CodeBlock code={stackSnippets.html} language="html" />
            </div>
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                Next.js (App Router)
              </p>
              <CodeBlock code={stackSnippets.nextjs} language="tsx" label="app/layout.tsx" />
            </div>
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">React (CRA / Vite)</p>
              <CodeBlock code={stackSnippets.react} language="html" label="public/index.html" />
            </div>
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">PHP</p>
              <CodeBlock code={stackSnippets.php} language="html" label="partials/cmp-install.php" />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">.NET (ASP.NET)</p>
              <CodeBlock
                code={stackSnippets.dotnet}
                language="html"
                label="Views/Shared/_CmpInstall.cshtml"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
              Step 3 — How the SDK works
            </h2>
            <ol className="list-inside list-decimal space-y-2 text-sm text-[var(--muted-foreground)]">
              <li>
                Loads synchronously before optional trackers, establishes blocked state, then fetches
                configuration from{" "}
                <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                  {configUrlAbsolute}
                </code>
                .
              </li>
              <li>Shows the banner if no stored consent is found.</li>
              <li>
                On visitor choice, calls{" "}
                <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                  POST /api/consent/record
                </code>{" "}
                and stores the{" "}
                <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                  consentId
                </code>{" "}
                in{" "}
                <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                  localStorage
                </code>
                .
              </li>
              <li>On subsequent visits, stored consent is respected until it expires.</li>
              <li>Visitors can reopen the Preference Center at any time to update or withdraw consent.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
              Config API endpoint
            </h2>
            <p className="mb-3 text-sm text-[var(--muted-foreground)]">
              Public endpoint — call it directly to inspect the active configuration.
            </p>
            <CodeBlock code={configEndpointNote} language="text" label="endpoint" />
          </section>

          <section>
            <h2 className="mb-1 text-base font-semibold text-[var(--foreground)]">
              Script enforcement
            </h2>
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              Tag third-party scripts with{" "}
              <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                data-cmp-purpose
              </code>{" "}
              and{" "}
              <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                type=&quot;text/plain&quot;
              </code>
              . The SDK pauses them until consent is granted.
            </p>
            <CodeBlock code={enforceSnippet} language="html" label="enforcement" />
          </section>

          <section>
            <h2 className="mb-1 text-base font-semibold text-[var(--foreground)]">
              Google Tag Manager
            </h2>
            <p className="mb-3 text-sm text-[var(--muted-foreground)]">
              Allowing the GTM loader does not automatically grant consent to every tag inside the
              GTM container. Add consent checks on each optional tag.
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-sm text-[var(--muted-foreground)]">
              <li>
                Load the CMP snippet in{" "}
                <code className="rounded-md bg-[var(--secondary)] px-1 font-mono text-xs">
                  &lt;head&gt;
                </code>{" "}
                before GTM.
              </li>
              <li>Enable Google Consent Mode when you use gtag / GTM Consent Mode.</li>
              <li>
                Map discovered GTM / gtag trackers in{" "}
                <Link
                  href="/dashboard/trackers"
                  className="font-medium underline underline-offset-2 hover:text-[var(--foreground)]"
                >
                  Trackers
                </Link>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 text-base font-semibold text-[var(--foreground)]">
              Step 4 — Signed-in sync (optional)
            </h2>
            <p className="mb-3 text-sm text-[var(--muted-foreground)]">
              For sites with login (Clerk, Auth.js, etc.). Guests still work with Step 2 alone. Your
              API key stays on your server.
            </p>
            <ol className="mb-4 list-inside list-decimal space-y-2 text-sm text-[var(--muted-foreground)]">
              <li>
                Create an API key in{" "}
                <Link
                  href="/dashboard/developers/api-keys"
                  className="font-medium text-[var(--foreground)] underline underline-offset-2 hover:text-[var(--primary)]"
                >
                  API keys
                </Link>
                .
              </li>
              <li>Add the server route below on your website (Next.js + Clerk example).</li>
              <li>Paste the bridge script after the CMP snippet.</li>
              <li>
                On logout call{" "}
                <code className="rounded-md bg-[var(--secondary)] px-1 font-mono text-xs">
                  window.CMPSubjectBridge?.logout()
                </code>
                .
              </li>
            </ol>
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                A — Server route on your site
              </p>
              <CodeBlock code={subjectBridgeRoute} language="tsx" />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                B — Bridge script (browser)
              </p>
              <CodeBlock code={subjectBridgeSnippet} language="html" />
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-base font-semibold text-[var(--foreground)]">
              Step 5 — Preference sync (optional)
            </h2>
            <p className="mb-3 text-sm text-[var(--muted-foreground)]">
              After a signed-in subject saves preferences, Consent Guru POSTs a signed webhook to
              your site. Configure the URL under Website settings → Preference sync.
            </p>
            <ol className="mb-4 list-inside list-decimal space-y-2 text-sm text-[var(--muted-foreground)]">
              <li>
                Open{" "}
                <Link
                  href={`/dashboard/websites/${website.id}/settings`}
                  className="font-medium text-[var(--foreground)] underline underline-offset-2 hover:text-[var(--primary)]"
                >
                  Website settings
                </Link>{" "}
                → Preference sync and copy the{" "}
                <code className="rounded-md bg-[var(--secondary)] px-1 font-mono text-xs">whsec_…</code>{" "}
                secret once.
              </li>
              <li>
                Verify{" "}
                <code className="rounded-md bg-[var(--secondary)] px-1 font-mono text-xs">
                  X-CMP-Signature
                </code>{" "}
                over{" "}
                <code className="rounded-md bg-[var(--secondary)] px-1 font-mono text-xs">
                  {"${timestamp}.${rawBody}"}
                </code>
                .
              </li>
              <li>
                Reject wrong{" "}
                <code className="rounded-md bg-[var(--secondary)] px-1 font-mono text-xs">
                  data.siteId
                </code>{" "}
                (
                <code className="rounded-md bg-[var(--secondary)] px-1 font-mono text-xs">
                  {website.id}
                </code>
                ).
              </li>
              <li>
                Upsert by{" "}
                <code className="rounded-md bg-[var(--secondary)] px-1 font-mono text-xs">
                  subjectKey
                </code>{" "}
                when{" "}
                <code className="rounded-md bg-[var(--secondary)] px-1 font-mono text-xs">
                  preferenceRevision
                </code>{" "}
                ≥ stored revision; dedupe owner alerts by{" "}
                <code className="rounded-md bg-[var(--secondary)] px-1 font-mono text-xs">
                  eventId
                </code>
                .
              </li>
            </ol>
            <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">Next.js receiver stub</p>
            <CodeBlock language="tsx" code={preferenceSyncReceiver} />
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
              Step 6 — Verify installation
            </h2>
            <p className="mb-3 text-sm text-[var(--muted-foreground)]">
              Confirm that the SDK config endpoint resolves correctly for your site key.
            </p>
            <VerifyInstallation siteKey={website.siteKey} />
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Next steps</h2>
            <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <li>
                <Link
                  href={`/dashboard/policies/new?websiteId=${website.id}`}
                  className="font-medium text-[var(--foreground)] underline underline-offset-2 transition hover:text-[var(--primary)]"
                >
                  Create a consent policy
                </Link>{" "}
                if you haven&apos;t already.
              </li>
              <li>
                <Link
                  href={activePolicy ? `/dashboard/policies/${activePolicy.id}` : "#"}
                  className={`font-medium underline underline-offset-2 transition ${
                    activePolicy
                      ? "text-[var(--foreground)] hover:text-[var(--primary)]"
                      : "pointer-events-none text-[var(--muted-foreground)]"
                  }`}
                >
                  Configure the banner appearance
                </Link>{" "}
                in the Banner Studio on your policy page.
              </li>
              <li>
                <Link
                  href={`/dashboard/websites/${website.id}/settings`}
                  className="font-medium text-[var(--foreground)] underline underline-offset-2 transition hover:text-[var(--primary)]"
                >
                  Update website settings
                </Link>{" "}
                to set language, region, and preference sync.
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
