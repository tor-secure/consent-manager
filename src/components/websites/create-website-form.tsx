"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions, FormCard } from "@/components/ui/field";
import { WebsiteDomainInput } from "@/components/websites/website-domain-input";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { LocaleSelect } from "@/components/i18n/locale-select";

export function CreateWebsiteForm() {
  const router = useRouter();
  const { pending, run } = useAsyncAction();

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [language, setLanguage] = useState("en");
  const [region, setRegion] = useState("IN");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        "/api/websites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, domain, language, region }),
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={pending} noValidate={false}>
      <FormCard
        title="Website details"
        description="These values identify the site in your CMP and in the visitor banner."
      >
        <Field label="Website name" htmlFor="website-name" hint="Shown in the dashboard and consent records.">
          <Input
            id="website-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme marketing site"
            required
            maxLength={255}
            autoComplete="organization"
          />
        </Field>
        <Field
          label="Domain"
          htmlFor="website-domain"
          hint="Enter the apex or subdomain only. The https:// prefix is shown for you and is not stored."
        >
          <WebsiteDomainInput
            id="website-domain"
            value={domain}
            onChange={setDomain}
            placeholder="example.com"
            required
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Default language" htmlFor="website-language">
            <LocaleSelect
              id="website-language"
              value={language}
              onChange={setLanguage}
              includeCurrent={language}
            />
          </Field>
          <Field label="Default region" htmlFor="website-region">
            <Select
              id="website-region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              <option value="IN">India</option>
              <option value="EU">European Union</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
            </Select>
          </Field>
        </div>
        {error ? (
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        ) : null}
        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/websites")}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {pending ? "Adding website..." : "Add website"}
          </Button>
        </FormActions>
      </FormCard>
    </form>
  );
}
