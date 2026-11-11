import { headers } from "next/headers";

import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { ApiEndpointCard } from "@/components/developers/api-endpoint-card";
import { DevelopersShell } from "@/components/developers/developers-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/sdk/copy-snippet";
import { publicOriginFromRequestHeaders } from "@/lib/sdk/public-origin";

export default async function DevelopersApiReferencePage() {
  await requireDashboardContext();
  const h = await headers();
  const origin = publicOriginFromRequestHeaders(h);

  return (
    <DevelopersShell
      pathname="/dashboard/developers/api"
      title="API reference"
      description="Server-to-server endpoints for signed-in consent, evaluation, and redaction. Authenticate with an organisation API key."
    >
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Send your API key on every v1 request. Create keys under{" "}
            <strong className="font-medium text-[var(--foreground)]">API keys</strong>.
          </p>
          <CodeBlock
            language="bash"
            label="header"
            code={`Authorization: Bearer cmp_live_••••••••\nContent-Type: application/json\n\nBase URL: ${origin}`}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["consent:subject", "Mint and revoke subject sessions"],
              ["consent:evaluate", "Evaluate consent decisions"],
              ["data:redact", "Redact personal data payloads"],
            ].map(([scope, blurb]) => (
              <div
                key={scope}
                className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3"
              >
                <code className="font-mono text-xs font-semibold text-[var(--foreground)]">
                  {scope}
                </code>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{blurb}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Signed-in consent
        </h2>

        <ApiEndpointCard
          method="POST"
          path="/api/v1/consent/subject"
          title="Establish subject session"
          description="Create or update a website-isolated subject and return a short-lived subjectSessionToken for the browser SDK."
          auth="API key"
          scopes={["consent:subject"]}
          notes={[
            "subjectKey is your stable user id (for example Clerk userId).",
            "email is optional notification metadata — never the ownership key.",
            "Pass the token to CMP.setSubjectSession on the client.",
          ]}
          example={`curl -X POST ${origin}/api/v1/consent/subject \\
  -H "Authorization: Bearer $CONSENT_GURU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "websiteId": "YOUR_WEBSITE_ID",
    "subjectKey": "user_abc123",
    "email": "user@example.com"
  }'`}
        />

        <ApiEndpointCard
          method="POST"
          path="/api/v1/consent/subject/logout"
          title="Revoke subject session"
          description="Invalidate a subject session after logout or account switch."
          auth="API key"
          scopes={["consent:subject"]}
          notes={[
            "Send subjectSessionToken and/or websiteId + subjectKey.",
            "Also call CMP.clearSubjectSession() in the browser.",
          ]}
          example={`curl -X POST ${origin}/api/v1/consent/subject/logout \\
  -H "Authorization: Bearer $CONSENT_GURU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "websiteId": "YOUR_WEBSITE_ID",
    "subjectKey": "user_abc123"
  }'`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Browser helpers
        </h2>

        <ApiEndpointCard
          method="GET"
          path="/api/consent/account"
          title="Load account consent"
          description="Used by the CMP SDK after setSubjectSession. Authenticated with the subject session token, not your API key."
          auth="X-CMP-Subject-Session or Bearer css_…"
          notes={[
            "Do not call this with your organisation API key from the browser.",
            "Prefer the Installation Step 4 bridge so customers never handle tokens manually.",
          ]}
        />

        <ApiEndpointCard
          method="POST"
          path="/api/consent/account"
          title="Save account consent"
          description="Create or update signed-in preferences with optimistic concurrency (expectedStateVersion)."
          auth="X-CMP-Subject-Session or Bearer css_…"
          notes={["Guest consentId APIs remain available for anonymous / static sites."]}
        />

        <ApiEndpointCard
          method="GET"
          path="/api/sdk/subject-bridge"
          title="Subject bridge script"
          description="Tiny drop-in script that calls your same-origin bridge URL, then CMP.setSubjectSession."
          auth="Public script"
          notes={[
            "Pair with a server route on your site that holds the API key.",
            "Copy the ready-made snippets from each website’s Installation page.",
          ]}
          example={`<script
  src="${origin}/api/sdk/subject-bridge"
  data-cmp-subject-bridge
  data-bridge-url="/api/cmp/subject"
  data-website-id="YOUR_WEBSITE_ID"
  defer
></script>`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Preference sync webhooks
        </h2>

        <Card>
          <CardHeader>
            <CardTitle>consent.preferences.updated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Per-website signed webhook after logged-in account preference saves (including
              full withdrawal). Configure the URL and{" "}
              <code className="font-mono text-xs">whsec_…</code> secret under Website settings →
              Preference sync. Org-level consent webhooks for guests are unchanged.
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-sm text-[var(--muted-foreground)]">
              <li>
                Headers:{" "}
                <code className="font-mono text-xs">X-CMP-Signature</code>,{" "}
                <code className="font-mono text-xs">X-CMP-Timestamp</code>,{" "}
                <code className="font-mono text-xs">X-CMP-Event-Id</code>,{" "}
                <code className="font-mono text-xs">X-CMP-Event-Type</code>
              </li>
              <li>
                HMAC-SHA256 over{" "}
                <code className="font-mono text-xs">{"${timestamp}.${rawBody}"}</code> using the
                signing secret
              </li>
              <li>
                Reject wrong{" "}
                <code className="font-mono text-xs">data.siteId</code>; upsert by{" "}
                <code className="font-mono text-xs">subjectKey</code> when{" "}
                <code className="font-mono text-xs">preferenceRevision</code> ≥ stored revision
              </li>
              <li>
                Dedupe owner alerts by{" "}
                <code className="font-mono text-xs">eventId</code>;{" "}
                <code className="font-mono text-xs">changeKind: established</code> is baseline only
                (no change alert)
              </li>
            </ul>
            <CodeBlock
              language="json"
              label="payload"
              code={`{
  "id": "<eventId>",
  "type": "consent.preferences.updated",
  "organizationId": "<uuid>",
  "data": {
    "siteId": "<websiteId>",
    "subjectKey": "<client user id>",
    "eventId": "<same as id>",
    "occurredAt": "<ISO>",
    "preferenceRevision": 3,
    "changeKind": "updated",
    "preferences": [
      { "kind": "purpose", "id": "...", "name": "Analytics", "granted": true }
    ],
    "changes": [
      {
        "kind": "purpose",
        "id": "...",
        "name": "Marketing",
        "previousGranted": true,
        "currentGranted": false
      }
    ]
  }
}`}
            />
            <p className="text-sm text-[var(--muted-foreground)]">
              Copy-paste receiver stub and setup steps live on each website’s Installation page
              (Step 5).
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Other v1 APIs
        </h2>

        <ApiEndpointCard
          method="POST"
          path="/api/v1/consent/evaluate"
          title="Evaluate consent"
          description="Programmatically evaluate whether processing is allowed for a consent context."
          auth="API key"
          scopes={["consent:evaluate"]}
        />

        <ApiEndpointCard
          method="POST"
          path="/api/v1/redact"
          title="Redact payload"
          description="Redact personal data fields from a JSON payload using organisation redaction rules."
          auth="API key"
          scopes={["data:redact"]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Browser SDK methods</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            language="js"
            label="CMP"
            code={`CMP.setSubjectSession({ token, websiteId, expiresAt?, subjectKey? })
CMP.clearSubjectSession()
CMP.getConsentContext() // { mode: 'guest'|'account', ... }

// Optional bridge helper after install Step 4:
window.CMPSubjectBridge?.sync()
window.CMPSubjectBridge?.logout()`}
          />
        </CardContent>
      </Card>
    </DevelopersShell>
  );
}
