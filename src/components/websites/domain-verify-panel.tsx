"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { CopyButton } from "@/components/sdk/copy-snippet";
import {
  SITE_VERIFICATION_META_NAME,
  SITE_VERIFICATION_TXT_PREFIX,
  SITE_VERIFICATION_WELL_KNOWN_PATH,
} from "@/lib/website-domain-verify-constants";

export function DomainVerifyPanel({
  websiteId,
  domain,
  token,
  verified,
  verifiedAt,
}: {
  websiteId: string;
  domain: string;
  token: string;
  verified: boolean;
  verifiedAt: Date | null;
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [error, setError] = useState("");

  const txtRecord = `${SITE_VERIFICATION_TXT_PREFIX}${token}`;
  const metaTag = `<meta name="${SITE_VERIFICATION_META_NAME}" content="${token}" />`;
  const fileUrl = `https://${domain}${SITE_VERIFICATION_WELL_KNOWN_PATH}`;

  async function handleVerify() {
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        `/api/websites/${websiteId}/verify`,
        { method: "POST" },
        {
          successMessage: "Domain verified",
          errorFallback: "Unable to verify this domain yet.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-800">
            {verified ? "This domain is verified" : "Prove you control this domain"}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {verified
              ? verifiedAt
                ? `Verified ${new Date(verifiedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}.`
                : "Ownership was confirmed with a token on this domain."
              : "Add one of the tokens below on the live site, then click Verify. We look up DNS and fetch the public homepage — we do not mark it verified from this form alone."}
          </p>
        </div>
        <Button type="button" onClick={handleVerify} loading={pending} disabled={pending}>
          {pending ? "Checking…" : verified ? "Re-check" : "Verify domain"}
        </Button>
      </div>

      {error ? (
        <Alert variant="error" role="alert">
          {error}
        </Alert>
      ) : null}

      <ol className="space-y-3 text-sm">
        <li className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-slate-800">1. DNS TXT record</p>
            <CopyButton text={txtRecord} />
          </div>
          <p className="mt-1 text-slate-500">
            Host <span className="font-mono text-xs">@</span> on{" "}
            <span className="font-mono text-xs">{domain}</span>
          </p>
          <code className="mt-2 block break-all font-mono text-xs text-slate-700">{txtRecord}</code>
        </li>
        <li className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-slate-800">2. Homepage meta tag</p>
            <CopyButton text={metaTag} />
          </div>
          <p className="mt-1 text-slate-500">Paste into the &lt;head&gt; of the homepage.</p>
          <code className="mt-2 block break-all font-mono text-xs text-slate-700">{metaTag}</code>
        </li>
        <li className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-slate-800">3. Well-known file</p>
            <CopyButton text={token} />
          </div>
          <p className="mt-1 text-slate-500">
            Serve the token as plain text at{" "}
            <span className="font-mono text-xs">{fileUrl}</span>
          </p>
        </li>
      </ol>
    </div>
  );
}
