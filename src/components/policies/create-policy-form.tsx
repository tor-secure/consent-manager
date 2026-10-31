"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { CountryFlag } from "@/components/dashboard/country-flag";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { POLICY_TEMPLATES, getPolicyTemplate } from "@/lib/templates/policy-templates";

const DESCRIPTION_MAX = 500;

export type WebsiteOption = {
  id: string;
  name: string;
  domain: string;
};

type TemplateVisual = {
  iconBg: string;
  iconColor: string;
  /** ISO 3166-1 alpha-2 (or `eu`) — shown as a real flag */
  flagCode?: string;
  icon?: React.ReactNode;
};

/** Country / regional templates use real flags; “Any” templates keep icons. */
const TEMPLATE_VISUALS: Record<string, TemplateVisual> = {
  custom: {
    iconBg: "bg-[#E6F9F5]",
    iconColor: "text-[#00A88F]",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  "gdpr-standard": {
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#4338CA]",
    flagCode: "eu",
  },
  "dpdp-india": {
    iconBg: "bg-[#FFF7ED]",
    iconColor: "text-[#EA580C]",
    flagCode: "in",
  },
  "us-opt-out": {
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#2563EB]",
    flagCode: "us",
  },
  "analytics-only": {
    iconBg: "bg-[#F5F3FF]",
    iconColor: "text-[#7C3AED]",
    icon: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
  },
  "uk-gdpr": {
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#4338CA]",
    flagCode: "gb",
  },
  "canada-pipeda": {
    iconBg: "bg-[#FEF2F2]",
    iconColor: "text-[#DC2626]",
    flagCode: "ca",
  },
  "australia-privacy": {
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#059669]",
    flagCode: "au",
  },
  ecommerce: {
    iconBg: "bg-[#FFF7ED]",
    iconColor: "text-[#EA580C]",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    ),
  },
  "content-site": {
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#2563EB]",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z"
      />
    ),
  },
};

function SectionCard({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 lg:p-6">
      <div className="mb-4 sm:mb-5">
        <h2 className="text-base font-semibold text-[#0B2C4A] sm:text-[1.05rem]">
          <span className="text-[#6B7280]">{step}. </span>
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#6B7280]">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function CreatePolicyForm({
  websites,
  defaultWebsiteId,
}: {
  websites: WebsiteOption[];
  defaultWebsiteId?: string;
}) {
  const router = useRouter();
  const lockedWebsite =
    Boolean(defaultWebsiteId) && websites.some((site) => site.id === defaultWebsiteId);

  const [websiteId, setWebsiteId] = useState(defaultWebsiteId ?? websites[0]?.id ?? "");
  const [templateId, setTemplateId] = useState("custom");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [purposeKeys, setPurposeKeys] = useState<string[]>([]);

  const { pending: saving, run } = useAsyncAction();
  const [error, setError] = useState("");

  function applyTemplate(id: string) {
    const next = getPolicyTemplate(id) ?? POLICY_TEMPLATES[0];
    setTemplateId(next.id);
    setPurposeKeys([...next.purposeKeys]);
    if (next.id === "custom") {
      setName("");
      setDescription("");
      return;
    }
    setName(next.name);
    setDescription(next.description.slice(0, DESCRIPTION_MAX));
  }

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
      else router.push(`/dashboard/policies?websiteId=${encodeURIComponent(websiteId)}`);
      router.refresh();
    });
  }

  const selectedWebsite = websites.find((site) => site.id === websiteId);

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[72rem] space-y-4 sm:space-y-5" aria-busy={saving}>
      <SectionCard
        step={1}
        title="Start from a template"
        description="Pick a ready-made policy for your region or industry, then edit the details below."
      >
        <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 xl:grid-cols-3">
          {POLICY_TEMPLATES.map((tpl) => {
            const active = templateId === tpl.id;
            const visual = TEMPLATE_VISUALS[tpl.id] ?? TEMPLATE_VISUALS.custom;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl.id)}
                className={`relative flex h-full min-h-[7.75rem] gap-3 rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[#00C4A7] bg-[#F0FDF9] shadow-[0_0_0_1px_rgba(0,196,167,0.35)]"
                    : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
                }`}
              >
                {active ? (
                  <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#00C4A7] text-white">
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path
                        d="M2.5 6.2 4.8 8.5 9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                ) : null}

                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visual.iconBg} ${visual.iconColor}`}
                >
                  {visual.flagCode ? (
                    <CountryFlag code={visual.flagCode} size="md" />
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden>
                      {visual.icon}
                    </svg>
                  )}
                </span>

                <span className="min-w-0 flex-1 pr-5">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
                    {tpl.regionLabel}
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-snug text-[#111827]">
                    {tpl.name}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#6B7280]">
                    {tpl.summary}
                    {tpl.summary.endsWith(".") ? "" : "."}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        step={2}
        title="Policy details"
        description="A new policy starts as a draft. You can still change purposes and publish later."
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="policy-website" className="mb-1.5 block text-sm font-medium text-[#111827]">
              Website
            </label>
            {websites.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No websites found. Add a website before creating a policy.</p>
            ) : lockedWebsite ? (
              <>
                <input type="hidden" name="websiteId" value={websiteId} />
                <div
                  id="policy-website"
                  className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3 text-sm text-[#111827]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#6B7280] ring-1 ring-[#E5E7EB]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                      />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium">{selectedWebsite?.name}</span>{" "}
                    <span className="text-[#6B7280]">({selectedWebsite?.domain})</span>
                  </span>
                </div>
              </>
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
            <p className="mt-1.5 text-xs text-[#6B7280]">
              This policy will be added to the selected website. A site can have more than one policy.
            </p>
          </div>

          <div>
            <label htmlFor="policy-name" className="mb-1.5 block text-sm font-medium text-[#111827]">
              Policy name
            </label>
            <Input
              id="policy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              placeholder="Default consent policy"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="policy-description" className="text-sm font-medium text-[#111827]">
                Description <span className="font-normal text-[#9CA3AF]">(optional)</span>
              </label>
              <span className="tabular-nums text-[11px] text-[#9CA3AF]">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              id="policy-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
              rows={3}
              maxLength={DESCRIPTION_MAX}
              placeholder="What this policy covers for visitors"
            />
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3 sm:px-4">
            <Checkbox
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              align="start"
              className="w-full"
            >
              <span className="block text-sm font-medium text-[#111827]">
                Set as the default policy for this website
              </span>
              <span className="mt-0.5 block text-xs text-[#6B7280]">
                This policy will be applied to new visitors by default.
              </span>
            </Checkbox>
          </div>

          {error ? (
            <Alert variant="error" role="alert">
              {error}
            </Alert>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-end min-[420px]:gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={websites.length === 0} loading={saving}>
              {saving ? "Saving policy…" : "Create policy"}
            </Button>
          </div>
        </div>
      </SectionCard>
    </form>
  );
}
