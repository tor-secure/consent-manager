"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { PolicyListItem } from "@/components/policies/policy-list";
import { SiteFavicon } from "@/components/websites/website-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";

export type PolicyWebsiteOption = {
  id: string;
  name: string;
  domain: string;
  iconUrl?: string | null;
  policyCount: number;
};

const STEPS = ["website", "policies"] as const;

function PolicyMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "draft") return "Draft";
  if (status === "archived") return "Archived";
  return status;
}

export function PoliciesWorkspace({
  websites,
  policies,
  initialWebsiteId,
}: {
  websites: PolicyWebsiteOption[];
  policies: PolicyListItem[];
  initialWebsiteId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const validIds = useMemo(() => new Set(websites.map((site) => site.id)), [websites]);
  const fromUrl = searchParams.get("websiteId");
  const preferred =
    (fromUrl && validIds.has(fromUrl) ? fromUrl : null) ||
    (initialWebsiteId && validIds.has(initialWebsiteId) ? initialWebsiteId : null) ||
    "";

  const [websiteId, setWebsiteId] = useState(preferred);
  const [policyId, setPolicyId] = useState("");
  const [step, setStep] = useState(preferred ? 1 : 0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState("");

  const current = STEPS[step] ?? "website";
  const selected = websites.find((site) => site.id === websiteId) ?? null;
  const sitePolicies = useMemo(
    () => policies.filter((policy) => policy.website?.id === websiteId),
    [policies, websiteId],
  );

  function syncUrl(nextId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextId) params.set("websiteId", nextId);
    else params.delete("websiteId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function goBack() {
    setError("");
    if (step === 0) {
      router.push("/dashboard/consent-management");
      return;
    }
    setDirection(-1);
    setPolicyId("");
    setStep(0);
  }

  function continueFromWebsite() {
    if (!websiteId) {
      setError("Select a website to continue.");
      return;
    }
    setError("");
    setDirection(1);
    setStep(1);
    setPolicyId("");
    syncUrl(websiteId);
  }

  function continueFromPolicies() {
    if (sitePolicies.length === 0) {
      router.push(`/dashboard/policies/new?websiteId=${encodeURIComponent(websiteId)}`);
      return;
    }
    if (!policyId) {
      setError("Select a policy to open, or create another one.");
      return;
    }
    router.push(`/dashboard/policies/${policyId}`);
  }

  if (websites.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md">
        <EmptyState
          title="No websites yet"
          description="Add a website before creating consent policies."
          actionLabel="Add a website"
          actionHref="/dashboard/websites/new"
        />
      </div>
    );
  }

  const copy =
    current === "website"
      ? {
          title: "Which website?",
          description: "Choose the site these policies belong to.",
          hint: "One website can have more than one policy.",
        }
      : {
          title: sitePolicies.length === 0 ? "Create a policy" : "Which policy?",
          description:
            sitePolicies.length === 0
              ? `No policies yet for ${selected?.name ?? "this site"}. Create the first one.`
              : `Open a policy for ${selected?.name ?? "this site"}, or create another.`,
          hint: selected ? selected.domain : "",
        };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center overflow-x-hidden text-center">
      <PolicyMark />

      <div
        key={current}
        className="site-step-in mt-6 flex w-full flex-col items-center"
        style={{ "--site-step-x": direction > 0 ? "28px" : "-28px" } as CSSProperties}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)]">{copy.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{copy.description}</p>

        <div className="mt-8 w-full text-left">
          {current === "website" ? (
            <div className="grid gap-2" role="radiogroup" aria-label="Website">
              {websites.map((site) => {
                const isSelected = websiteId === site.id;
                return (
                  <button
                    key={site.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setWebsiteId(site.id);
                      setError("");
                    }}
                    className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-3 text-left ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--info-soft)] text-[var(--foreground)] ring-1 ring-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                    }`}
                  >
                    <SiteFavicon
                      domain={site.domain}
                      iconUrl={site.iconUrl}
                      className="h-10 w-10 rounded-lg text-sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{site.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">
                        {site.domain}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-[var(--muted-foreground)]">
                      {site.policyCount}
                    </span>
                    {isSelected ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[var(--primary)]">
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {current === "policies" && selected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-3">
                <SiteFavicon
                  domain={selected.domain}
                  iconUrl={selected.iconUrl}
                  className="h-10 w-10 rounded-lg text-sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{selected.name}</p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">{selected.domain}</p>
                </div>
              </div>

              {sitePolicies.length > 0 ? (
                <div className="grid gap-2" role="radiogroup" aria-label="Policy">
                  {sitePolicies.map((policy) => {
                    const isSelected = policyId === policy.id;
                    return (
                      <button
                        key={policy.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setPolicyId(policy.id);
                          setError("");
                        }}
                        className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--info-soft)] text-[var(--foreground)] ring-1 ring-[var(--primary)]"
                            : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold">{policy.name}</span>
                            {policy.isDefault ? (
                              <Badge variant="primary" size="sm">
                                Default
                              </Badge>
                            ) : null}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                            <span>{statusLabel(policy.status)}</span>
                            <span aria-hidden="true">·</span>
                            <span>v{policy.latestVersion}</span>
                            {policy.hasPublished ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Published</span>
                              </>
                            ) : null}
                          </span>
                        </span>
                        {isSelected ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[var(--primary)]">
                            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {copy.hint ? (
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">{copy.hint}</p>
          ) : null}
          {error ? (
            <Alert variant="error" role="alert" className="mt-3">
              {error}
            </Alert>
          ) : null}
        </div>

        <Button type="button" className="mt-6 w-full" onClick={current === "website" ? continueFromWebsite : continueFromPolicies}>
          {current === "website"
            ? "Continue"
            : sitePolicies.length === 0
              ? "Create policy"
              : "Open policy"}
        </Button>

        {current === "policies" && sitePolicies.length > 0 ? (
          <button
            type="button"
            onClick={() => router.push(`/dashboard/policies/new?websiteId=${encodeURIComponent(websiteId)}`)}
            className="mt-3 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
          >
            Create another policy
          </button>
        ) : null}

        <button
          type="button"
          onClick={goBack}
          className="mt-4 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
        >
          {step === 0 ? "Cancel" : "Back"}
        </button>
      </div>
    </div>
  );
}
