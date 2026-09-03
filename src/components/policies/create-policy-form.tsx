"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { TemplateTile } from "@/components/dashboard/create-page-header";
import { Field, FormActions, FormCard } from "@/components/ui/field";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import {
  POLICY_TEMPLATES,
  getPolicyTemplate,
  purposeTemplatesForPolicy,
} from "@/lib/templates/policy-templates";

export type WebsiteOption = {
  id: string;
  name: string;
  domain: string;
};

export function CreatePolicyForm({
  websites,
  defaultWebsiteId,
}: {
  websites: WebsiteOption[];
  defaultWebsiteId?: string;
}) {
  const router = useRouter();

  const [websiteId, setWebsiteId] = useState(
    defaultWebsiteId ?? websites[0]?.id ?? "",
  );
  const [templateId, setTemplateId] = useState("custom");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [purposeKeys, setPurposeKeys] = useState<string[]>([]);

  const selectedTemplate = getPolicyTemplate(templateId) ?? POLICY_TEMPLATES[0];
  const templatePurposes = purposeTemplatesForPolicy(selectedTemplate);

  function applyTemplate(id: string) {
    const next = getPolicyTemplate(id) ?? POLICY_TEMPLATES[0];
    setTemplateId(next.id);
    setPurposeKeys([...next.purposeKeys]);
    if (next.id === "custom") return;
    setName(next.name);
    setDescription(next.description);
  }

  function togglePurpose(key: string) {
    setPurposeKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const { pending: saving, run } = useAsyncAction();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        "/api/policies",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            websiteId,
            name,
            description: description.trim() || null,
            isDefault,
            templateId,
            purposeKeys,
          }),
        },
        {
          successMessage: "Policy created successfully",
          errorFallback: "Unable to save policy.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      const policyId =
        typeof result.data === "object" &&
        result.data !== null &&
        "policy" in result.data &&
        typeof (result.data as { policy?: { id?: unknown } }).policy?.id === "string"
          ? (result.data as { policy: { id: string } }).policy.id
          : null;
      if (policyId) router.push(`/dashboard/policies/${policyId}`);
      else router.push("/dashboard/policies");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={saving}>
      <FormCard
        title="Start from a template"
        description="Pick a ready-made policy, then edit the name, copy, and purposes before you create it."
      >
        <div className="grid items-stretch gap-3 sm:grid-cols-2">
          {POLICY_TEMPLATES.map((tpl) => (
            <TemplateTile
              key={tpl.id}
              active={templateId === tpl.id}
              eyebrow={tpl.regionLabel}
              title={tpl.name}
              summary={tpl.summary}
              onClick={() => applyTemplate(tpl.id)}
            />
          ))}
        </div>
      </FormCard>

      <FormCard
        title="Policy details"
        description="A new policy starts as a draft. You can still change purposes and publish later."
      >
        <Field label="Website" htmlFor="policy-website">
          {websites.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No websites found. Add a website before creating a policy.
            </p>
          ) : (
            <Select
              id="policy-website"
              value={websiteId}
              onChange={(e) => setWebsiteId(e.target.value)}
              required
            >
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.domain})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Policy name" htmlFor="policy-name">
          <Input
            id="policy-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            placeholder="Default consent policy"
          />
        </Field>
        <Field label="Description (optional)" htmlFor="policy-description">
          <Textarea
            id="policy-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What this policy covers for visitors"
          />
        </Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
          />
          <span className="text-sm text-[var(--secondary-foreground)]">
            Set as the default policy for this website
          </span>
        </label>

        {templatePurposes.length > 0 ? (
          <div className="space-y-2">
            <p className="field-label mb-0">Purposes in this template</p>
            <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
              Uncheck any you do not need. Missing purposes are created in your organization; existing ones with the same key are reused.
            </p>
            <div className="space-y-2">
              {templatePurposes.map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] px-4 py-3"
                >
                  <input
                    type="checkbox"
                    checked={purposeKeys.includes(p.key)}
                    onChange={() => togglePurpose(p.key)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">
                      {p.name}
                      {p.isRequired ? (
                        <span className="ml-2 text-[11px] font-semibold uppercase text-indigo-600">Required</span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{p.summary}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        ) : null}
        <FormActions>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={websites.length === 0} loading={saving}>
            {saving ? "Saving policy..." : "Create policy"}
          </Button>
        </FormActions>
      </FormCard>
    </form>
  );
}
