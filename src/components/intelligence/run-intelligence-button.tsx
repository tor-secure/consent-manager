"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function RunIntelligenceButton(props: {
  websiteId: string;
  engine: "autopilot" | "digital_twin" | "roi" | "negotiation";
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const { pending, run: runAction } = useAsyncAction();

  async function run() {
    await runAction(async () => {
      setStatus("");
      setFailed(false);
      const response = await dashboardFetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      }, {
        successMessage: "Audited advisory generated",
        errorFallback: "Unable to generate the advisory.",
        onValidation: (message) => {
          setFailed(true);
          setStatus(message);
        },
      });
      if (!response.ok) return;
      const body = response.data as { run?: { aiEnrichment?: { summary?: string } } };
      setStatus(body.run?.aiEnrichment?.summary ?? "Advisory run recorded.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" onClick={run} loading={pending}>
        {pending ? "Generating advisory…" : "Generate audited advisory"}
      </Button>
      {status ? <Alert variant={failed ? "error" : "info"} role={failed ? "alert" : "status"}>{status}</Alert> : null}
    </div>
  );
}
