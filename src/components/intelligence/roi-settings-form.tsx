"use client";

import { useState } from "react";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type RoiValues = {
  monthlySessions?: number | null;
  valuePerConversion?: number | null;
  valuePerConsent?: number | null;
  implementationCost?: number | null;
  recurringMonthlyCost?: number | null;
  currency?: string | null;
  targetScore?: number | null;
};

export function RoiSettingsForm({ websiteId, initialValues = {} }: { websiteId: string; initialValues?: RoiValues }) {
  const [message, setMessage] = useState("");
  const { pending, run } = useAsyncAction();

  async function submit(formData: FormData) {
    const numberOrNull = (key: string) => {
      const value = String(formData.get(key) ?? "").trim();
      return value ? Number(value) : null;
    };
    await run(async () => {
      setMessage("");
      const response = await dashboardFetch("/api/intelligence/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "roi", websiteId,
          monthlySessions: numberOrNull("monthlySessions"),
          valuePerConversion: numberOrNull("valuePerConversion"),
          valuePerConsent: numberOrNull("valuePerConsent"),
          implementationCost: numberOrNull("implementationCost"),
          recurringMonthlyCost: numberOrNull("recurringMonthlyCost"),
          currency: String(formData.get("currency") || "USD").toUpperCase(),
          targetScore: numberOrNull("targetScore") ?? 85,
        }),
      }, {
        successMessage: "Business assumptions saved",
        errorFallback: "Could not save business assumptions.",
        onValidation: setMessage,
      });
      if (response.ok) setMessage("Saved. Re-run the advisory or refresh to update projections.");
    });
  }

  return (
    <form action={submit} className="grid gap-3 sm:grid-cols-2">
      {[
        ["monthlySessions", "Monthly sessions"],
        ["valuePerConversion", "Value per conversion"],
        ["valuePerConsent", "Value per consent"],
        ["implementationCost", "Implementation cost"],
        ["recurringMonthlyCost", "Recurring monthly cost"],
        ["targetScore", "Target score"],
      ].map(([name, label]) => (
        <Field key={name} label={label} htmlFor={`roi-${name}`}>
          <Input id={`roi-${name}`} name={name} type="number" min="0" max={name === "targetScore" ? 100 : undefined} step="any" defaultValue={initialValues[name as keyof RoiValues] ?? ""} />
        </Field>
      ))}
      <Field label="Currency" htmlFor="roi-currency">
        <Input id="roi-currency" name="currency" defaultValue={initialValues.currency ?? "USD"} maxLength={3} pattern="[A-Za-z]{3}" />
      </Field>
      <div className="flex items-end"><Button loading={pending} type="submit">{pending ? "Saving…" : "Save assumptions"}</Button></div>
      {message ? <Alert className="sm:col-span-2" variant={message.startsWith("Saved") ? "success" : "error"}>{message}</Alert> : null}
    </form>
  );
}
