"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { CodeBlock } from "@/components/sdk/copy-snippet";
import { Button } from "@/components/ui/button";
import {
  INSTALL_STACK_TABS,
  installStackMeta,
  type InstallStack,
} from "@/lib/sdk/install-snippet-meta";

export type SnippetInstallWebsite = {
  id: string;
  name: string;
  domain: string;
  siteKey: string;
  verified: boolean;
  hasPublishedPolicy: boolean;
};

export type SnippetInstallSnippets = {
  html: string;
  react: string;
  nextjs: string;
  php: string;
  dotnet: string;
};

function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
      {n}
    </span>
  );
}

function BrowserIllustration() {
  return (
    <svg
      viewBox="0 0 180 120"
      className="h-24 w-36 text-[var(--primary)] opacity-90 sm:h-28 sm:w-44"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="28"
        y="8"
        width="120"
        height="78"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.35"
      />
      <rect
        x="40"
        y="20"
        width="120"
        height="78"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <rect x="52" y="32" width="120" height="78" rx="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M52 48h120" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="64" cy="40" r="2" fill="var(--accent)" />
      <circle cx="72" cy="40" r="2" fill="currentColor" opacity="0.35" />
      <circle cx="80" cy="40" r="2" fill="currentColor" opacity="0.35" />
      <text
        x="112"
        y="78"
        textAnchor="middle"
        fill="var(--accent)"
        fontSize="22"
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
      >
        {"</>"}
      </text>
    </svg>
  );
}

export function SnippetInstallationPanel({
  websites,
  selectedWebsiteId,
  snippets,
}: {
  websites: SnippetInstallWebsite[];
  selectedWebsiteId: string;
  snippets: SnippetInstallSnippets;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<InstallStack>("html");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [verifyMessage, setVerifyMessage] = useState("");

  const selected =
    websites.find((site) => site.id === selectedWebsiteId) ?? websites[0] ?? null;
  const stackMeta = installStackMeta(tab);
  const activeSnippet = snippets[tab];

  function onSelectWebsite(id: string) {
    startTransition(() => {
      router.push(`/dashboard/developers/install?websiteId=${id}`);
    });
    const next = websites.find((site) => site.id === id);
    setVerifyUrl(next ? `https://${next.domain}` : "");
    setVerifyStatus("idle");
    setVerifyMessage("");
  }

  async function checkConnection() {
    if (!selected) return;
    setVerifyStatus("checking");
    setVerifyMessage("");
    try {
      const res = await fetch(`/api/sdk/${selected.siteKey}/config`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setVerifyStatus("error");
        setVerifyMessage(data.message ?? "Configuration not found. Publish a policy first.");
        return;
      }
      const hasPurposes = Array.isArray(data.purposes) && data.purposes.length > 0;
      if (!hasPurposes) {
        setVerifyStatus("error");
        setVerifyMessage(
          "Config loaded but no purposes are attached. Add purposes and publish before deploying.",
        );
        return;
      }
      setVerifyStatus("ok");
      setVerifyMessage(
        `Connected. Policy “${data.policy.name}” v${data.policy.version}${
          data.policy.isPublished ? " (published)" : ""
        } with ${data.purposes.length} purpose${data.purposes.length === 1 ? "" : "s"}.`,
      );
    } catch {
      setVerifyStatus("error");
      setVerifyMessage("Request failed. Check your network and try again.");
    }
  }

  if (!selected) return null;

  const displayVerifyUrl = verifyUrl || `https://${selected.domain}`;

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <div className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_8%,var(--card)),color-mix(in_srgb,var(--accent)_10%,var(--card)),var(--card))] px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Guides / Getting started
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Snippet installation
            </h1>
            <p className="text-base text-[var(--muted-foreground)]">
              Connect{" "}
              <span className="font-medium text-[var(--foreground)]">{selected.domain}</span> to
              Consent Guru with a single script.
            </p>

            <label className="block max-w-md pt-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Website
              </span>
              <select
                className="field-input"
                value={selected.id}
                onChange={(e) => onSelectWebsite(e.target.value)}
              >
                {websites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} — {site.domain}
                    {!site.verified ? " (unverified)" : ""}
                    {site.hasPublishedPolicy ? "" : " (draft)"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <BrowserIllustration />
        </div>
      </div>

      <div className="space-y-10 px-6 py-8 sm:px-8">
        {!selected.verified ? (
          <div
            role="alert"
            className="rounded-2xl border border-[color-mix(in_srgb,var(--warning)_35%,var(--border))] bg-[var(--warning-soft)] px-5 py-4 text-sm text-[var(--warning)]"
          >
            <p className="font-semibold text-[var(--foreground)]">
              Step 0 — Verify this domain before production install
            </p>
            <p className="mt-1">
              Production Consent Guru APIs reject requests whose Origin does not match a{" "}
              <strong className="font-medium">verified</strong> website domain (
              <code className="rounded bg-[var(--card)] px-1 font-mono text-xs">{selected.domain}</code>
              ). Verify the domain, then return here to copy the snippet.
            </p>
            <Link
              href={`/dashboard/websites/${selected.id}/settings`}
              className="mt-3 inline-flex font-medium text-[var(--foreground)] underline underline-offset-2"
            >
              Open website settings to verify →
            </Link>
          </div>
        ) : null}

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
          {INSTALL_STACK_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`-mb-px shrink-0 px-4 py-2.5 text-sm font-medium transition ${
                tab === id
                  ? "border-b-2 border-[var(--accent)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="space-y-3">
          <div className="flex items-start gap-3">
            <StepBadge n={1} />
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Copy your snippet</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Use the script below to load Consent Guru on your site. Site key{" "}
                <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
                  {selected.siteKey}
                </code>
              </p>
            </div>
          </div>
          <CodeBlock
            code={activeSnippet}
            language={stackMeta.language}
            label={stackMeta.label}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-start gap-3">
            <StepBadge n={2} />
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Add it to your website
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{stackMeta.stepTwo}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-start gap-3">
            <StepBadge n={3} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Verify installation</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Check that Consent Guru can resolve the published config for this website.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--muted-foreground)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                      <path
                        d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <input
                    className="field-input pl-10"
                    value={displayVerifyUrl}
                    onChange={(e) => setVerifyUrl(e.target.value)}
                    placeholder="https://your-site.com"
                    aria-label="Website URL"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => void checkConnection()}
                  disabled={verifyStatus === "checking"}
                  className="shrink-0"
                >
                  {verifyStatus === "checking" ? "Checking…" : "Check connection"}
                </Button>
              </div>
              {verifyStatus === "ok" ? (
                <p className="mt-3 text-sm text-[var(--success)]">{verifyMessage}</p>
              ) : null}
              {verifyStatus === "error" ? (
                <p className="mt-3 text-sm text-[var(--danger)]">{verifyMessage}</p>
              ) : null}
              {!selected.verified ? (
                <p className="mt-3 text-sm text-[var(--warning)]">
                  Domain is not verified — production hosts will get Origin 403 until you{" "}
                  <Link
                    href={`/dashboard/websites/${selected.id}/settings`}
                    className="font-medium underline underline-offset-2"
                  >
                    verify {selected.domain}
                  </Link>
                  .
                </p>
              ) : null}
              {!selected.hasPublishedPolicy ? (
                <p className="mt-3 text-sm text-[var(--warning)]">
                  This website has no published policy yet — verification will fail until you{" "}
                  <Link
                    href={`/dashboard/policies/new?websiteId=${selected.id}`}
                    className="font-medium underline underline-offset-2"
                  >
                    publish a policy
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 px-5 py-4">
          <p className="text-sm font-medium text-[var(--foreground)]">Need signed-in sync?</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            After the guest snippet works, add the subject bridge and preference sync receiver from
            the full install guide.
          </p>
          <Link
            href={`/dashboard/websites/${selected.id}/installation`}
            className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Open advanced installation →
          </Link>
        </section>
      </div>
    </div>
  );
}
