"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { WebsiteDomainInput } from "@/components/websites/website-domain-input";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { LocaleSelect } from "@/components/i18n/locale-select";

const REGIONS = [
  { value: "IN", label: "India" },
  { value: "EU", label: "European Union" },
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
] as const;

const STEPS = ["name", "domain", "language", "region"] as const;

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

function domainError(value: string) {
  const domain = normalizeDomain(value);
  if (!domain) return "Enter a domain to continue.";
  if (domain.length > 253) return "Domain must be 253 characters or fewer.";
  if (!/^[a-z0-9]([a-z0-9\-.]*[a-z0-9])?$/.test(domain)) {
    return "Enter a valid hostname, such as example.com.";
  }
  return "";
}

export function CreateWebsiteForm({
  cancelHref = "/dashboard/websites",
}: {
  cancelHref?: string;
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [language, setLanguage] = useState("en");
  const [region, setRegion] = useState("IN");
  const [error, setError] = useState("");

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function validateCurrent() {
    if (current === "name") {
      const trimmed = name.trim();
      if (!trimmed) return "Enter a site name to continue.";
      if (trimmed.length > 255) return "Site name must be 255 characters or fewer.";
    }
    if (current === "domain") return domainError(domain);
    return "";
  }

  async function createSite() {
    const fieldError = validateCurrent();
    if (fieldError) {
      setError(fieldError);
      return;
    }
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        "/api/websites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            domain: normalizeDomain(domain),
            language,
            region,
          }),
        },
        {
          successMessage: "Website added successfully",
          errorFallback: "Unable to add website. Please try again.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      const websiteId =
        typeof result.data === "object" &&
        result.data !== null &&
        "website" in result.data &&
        typeof (result.data as { website?: { id?: unknown } }).website?.id === "string"
          ? (result.data as { website: { id: string } }).website.id
          : null;
      router.push(
        websiteId
          ? `/dashboard/policies/new?websiteId=${encodeURIComponent(websiteId)}`
          : "/dashboard/policies/new",
      );
      router.refresh();
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldError = validateCurrent();
    if (fieldError) {
      setError(fieldError);
      return;
    }
    if (!isLast) {
      setError("");
      setDirection(1);
      setStep((value) => value + 1);
      return;
    }
    void createSite();
  }

  function goBack() {
    setError("");
    if (step === 0) {
      router.push(cancelHref);
      return;
    }
    setDirection(-1);
    setStep((value) => value - 1);
  }

  const copy = {
    name: {
      title: "Create a site",
      description: "Sites track consent for your web properties.",
      hint: "Shown in the dashboard and consent records.",
    },
    domain: {
      title: "What is the domain?",
      description: "Visitors on this domain will see the consent banner.",
      hint: "You can add more domains later in site settings.",
    },
    language: {
      title: "Which language should the banner use?",
      description: "Visitors see this language first. You can change it later.",
      hint: "",
    },
    region: {
      title: "Which region applies first?",
      description: "This sets the default privacy region for the site.",
      hint: "",
    },
  }[current];

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col items-center overflow-x-hidden text-center"
      aria-busy={pending}
      noValidate
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 8h18" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="6.5" cy="6" r="0.7" fill="currentColor" />
          <circle cx="9" cy="6" r="0.7" fill="currentColor" />
        </svg>
      </div>

      <div
        key={step}
        className="site-step-in mt-6 flex w-full flex-col items-center"
        style={{ "--site-step-x": direction > 0 ? "28px" : "-28px" } as React.CSSProperties}
      >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
        Step {step + 1} of {STEPS.length}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)]">{copy.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{copy.description}</p>

      <div className="mt-8 w-full text-left">
        {current === "name" ? (
          <Input
            key="website-name"
            id="website-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="Site name"
            aria-label="Site name"
            maxLength={255}
            autoComplete="organization"
            autoFocus
            required
          />
        ) : null}

        {current === "domain" ? (
          <>
            <label htmlFor="website-domain" className="sr-only">
              Domain
            </label>
            <WebsiteDomainInput
              key="website-domain"
              id="website-domain"
              value={domain}
              onChange={(value) => {
                setDomain(value);
                setError("");
              }}
              placeholder="example.com"
              required
              autoFocus
            />
          </>
        ) : null}

        {current === "language" ? (
          <>
            <label htmlFor="website-language" className="sr-only">
              Default language
            </label>
            <LocaleSelect
              id="website-language"
              value={language}
              onChange={(value) => {
                setLanguage(value);
                setError("");
              }}
              includeCurrent={language}
            />
          </>
        ) : null}

        {current === "region" ? (
          <div className="grid gap-2" role="radiogroup" aria-label="Default region">
            {REGIONS.map((item) => {
              const selected = region === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRegion(item.value)}
                  className={`flex h-12 items-center justify-between rounded-xl border px-4 text-sm font-semibold ${
                    selected
                      ? "border-[var(--primary)] bg-[var(--info-soft)] text-[var(--foreground)] ring-1 ring-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                  }`}
                >
                  <span>{item.label}</span>
                  {selected ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              );
            })}
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

      <Button type="submit" className="mt-6 w-full" loading={pending} disabled={pending}>
        {pending ? "Creating site..." : isLast ? "Create site" : "Continue"}
      </Button>
      <button
        type="button"
        onClick={goBack}
        disabled={pending}
        className="mt-4 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)] disabled:opacity-50"
      >
        {step === 0 ? "Cancel" : "Back"}
      </button>
      </div>
    </form>
  );
}
