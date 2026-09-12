"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions, FormCard } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { normalizeLawfulBasis } from "@/lib/compliance/types";

export type PurposeEditorModel = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  status: string;
  dataCategories: string[] | null;
  retentionPeriod: string | null;
  legalBasis: string | null;
};

const LEGAL_BASIS_OPTIONS = [
  { value: "consent", label: "Consent" },
  { value: "contract", label: "Contract" },
  { value: "legitimate_interests", label: "Legitimate interests" },
  { value: "legal_obligation", label: "Legal obligation" },
  { value: "vital_interests", label: "Vital interests" },
  { value: "public_task", label: "Public task" },
] as const;

export function EditPurposeForm({ purpose }: { purpose: PurposeEditorModel }) {
  const router = useRouter();
  const [name, setName] = useState(purpose.name);
  const [description, setDescription] = useState(purpose.description ?? "");
  const [isRequired, setIsRequired] = useState(purpose.isRequired);
  const [status, setStatus] = useState<"active" | "inactive">(
    purpose.status === "inactive" ? "inactive" : "active",
  );
  const [dataCategories, setDataCategories] = useState(
    (purpose.dataCategories ?? []).join(", "),
  );
  const [retentionPeriod, setRetentionPeriod] = useState(purpose.retentionPeriod ?? "");
  const [legalBasis, setLegalBasis] = useState(
    normalizeLawfulBasis(purpose.legalBasis) || "consent",
  );
  const { pending: saving, run } = useAsyncAction();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      setError("");
      const categories = dataCategories
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const result = await dashboardFetch(
        `/api/purposes/${purpose.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: description.trim() || null,
            isRequired,
            status,
            dataCategories: categories.length > 0 ? categories : null,
            retentionPeriod: retentionPeriod.trim() || null,
            legalBasis,
          }),
        },
        {
          successMessage: "Purpose updated",
          errorFallback: "Unable to update purpose. Please try again.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      router.push("/dashboard/purposes");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={saving}>
      <FormCard
        title="Purpose details"
        description="Key stays fixed so published policies and consent records keep the same identity."
      >
        <Field label="Name" htmlFor="purpose-name">
          <Input
            id="purpose-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={150}
          />
        </Field>
        <Field label="Key" htmlFor="purpose-key" hint="Cannot be changed after creation.">
          <Input id="purpose-key" value={purpose.key} disabled className="font-mono" />
        </Field>
        <Field label="Description" htmlFor="purpose-description" hint="Shown to visitors. Required before publish.">
          <Textarea
            id="purpose-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </Field>
        <Field label="Status" htmlFor="purpose-status">
          <Select
            id="purpose-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <Checkbox
          align="start"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3 text-sm"
          checked={isRequired}
          onChange={(e) => setIsRequired(e.target.checked)}
        >
          This purpose is required (visitor cannot decline)
        </Checkbox>
      </FormCard>

      <FormCard
        title="Notice information"
        description="Lawful basis and data categories are checked when you publish a policy that uses this purpose."
      >
        <Field label="Personal data categories" htmlFor="purpose-categories" hint="Comma-separated labels.">
          <Input
            id="purpose-categories"
            value={dataCategories}
            onChange={(e) => setDataCategories(e.target.value)}
            placeholder="IP address, Cookie identifiers"
          />
        </Field>
        <Field label="Retention period" htmlFor="purpose-retention">
          <Input
            id="purpose-retention"
            value={retentionPeriod}
            onChange={(e) => setRetentionPeriod(e.target.value)}
            maxLength={255}
            placeholder="12 months"
          />
        </Field>
        <Field label="Legal basis" htmlFor="purpose-legal-basis">
          <Select
            id="purpose-legal-basis"
            value={legalBasis}
            onChange={(e) => setLegalBasis(e.target.value)}
          >
            {LEGAL_BASIS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </FormCard>

      {error ? (
        <Alert variant="error" role="alert">
          {error}
        </Alert>
      ) : null}

      <FormActions>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {saving ? "Saving purpose..." : "Save purpose"}
        </Button>
      </FormActions>
    </form>
  );
}
