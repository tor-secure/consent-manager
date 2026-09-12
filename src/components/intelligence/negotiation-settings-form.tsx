"use client";

import { useState } from "react";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function NegotiationSettingsForm({ websiteId }: { websiteId: string }) {
  const [message, setMessage] = useState("");
  const { pending, run } = useAsyncAction();
  async function submit(formData: FormData) {
    const enabled = formData.get("enabled") === "on";
    const key = String(formData.get("key") ?? "").trim();
    await run(async () => {
      setMessage("");
      const response = await dashboardFetch("/api/intelligence/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "negotiation", websiteId, enabled,
          offers: key ? [{
            key,
            title: String(formData.get("title") ?? ""),
            description: String(formData.get("description") ?? ""),
            actionLabel: String(formData.get("actionLabel") ?? ""),
            purposeKeys: String(formData.get("purposeKeys") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
          }] : [],
        }),
      }, {
        successMessage: "Visitor offer saved",
        errorFallback: "Could not save visitor offer settings.",
        onValidation: setMessage,
      });
      if (response.ok) setMessage("Offer settings saved. SDK delivery still excludes required purposes.");
    });
  }
  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      <Checkbox
        name="enabled"
        className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 text-sm sm:col-span-2"
      >
        <span className="font-medium text-[var(--foreground)]">Enable transparent visitor offers</span>
        <span className="block text-xs text-[var(--muted-foreground)]">Offers remain optional and never replace reject or customize controls.</span>
      </Checkbox>
      <Field label="Offer key" htmlFor="offer-key" hint="Stable SDK identifier."><Input id="offer-key" name="key" placeholder="analytics-lite" /></Field>
      <Field label="Action label" htmlFor="offer-action"><Input id="offer-action" name="actionLabel" placeholder="Choose this option" /></Field>
      <Field label="Title" htmlFor="offer-title"><Input id="offer-title" name="title" placeholder="Allow limited analytics" /></Field>
      <Field label="Optional purpose keys" htmlFor="offer-purposes" hint="Comma-separated; required purposes are removed at delivery."><Input id="offer-purposes" name="purposeKeys" placeholder="analytics, personalization" /></Field>
      <div className="sm:col-span-2"><Field label="Description" htmlFor="offer-description"><Textarea id="offer-description" name="description" placeholder="Plain-language explanation of this optional choice" /></Field></div>
      <div><Button loading={pending} type="submit">{pending ? "Saving…" : "Save visitor offer"}</Button></div>
      {message ? <Alert className="sm:col-span-2" variant={message.startsWith("Offer") ? "success" : "error"}>{message}</Alert> : null}
    </form>
  );
}
