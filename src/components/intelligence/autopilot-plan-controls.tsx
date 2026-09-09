"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SafeStep = { id: string; title: string; applied: boolean };

export function AutopilotPlanControls({
  planId,
  status,
  rollbackAvailable,
  safeSteps,
}: {
  planId: string;
  status: string;
  rollbackAvailable: boolean;
  safeSteps: SafeStep[];
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [message, setMessage] = useState("");

  async function act(action: "approve" | "apply" | "rollback", stepId?: string) {
    const detail = action === "apply"
      ? `Apply “${safeSteps.find((step) => step.id === stepId)?.title ?? "this step"}”? A rollback checkpoint will be recorded.`
      : action === "rollback"
        ? "Rollback this plan to its previous checkpoint? Review any downstream effects after rollback."
        : "Approve this advisory plan for safe, reversible step application?";
    if (!window.confirm(detail)) return;
    await run(async () => {
      setMessage("");
      const response = await dashboardFetch(`/api/intelligence/autopilot/${planId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, stepId, confirmed: true }),
      }, {
        successMessage: action === "rollback" ? "Plan rolled back" : action === "approve" ? "Plan approved" : "Plan step applied",
        errorFallback: `Unable to ${action} the plan.`,
        onValidation: setMessage,
      });
      if (response.ok) router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4" aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">Latest audited plan</h3>
          <p className="text-xs text-[var(--muted-foreground)]">Only non-legal, reversible steps can be applied here.</p>
        </div>
        <Badge variant={status === "approved" || status === "partially_applied" ? "success" : status === "rolled_back" ? "neutral" : "warning"}>{status.replaceAll("_", " ")}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? <Button type="button" loading={pending} onClick={() => act("approve")}>Approve plan</Button> : null}
        {safeSteps.filter((step) => !step.applied).map((step) => (
          <Button key={step.id} type="button" variant="secondary" disabled={status !== "approved" && status !== "partially_applied"} loading={pending} onClick={() => act("apply", step.id)}>
            Apply {step.title}
          </Button>
        ))}
        {rollbackAvailable ? <Button type="button" variant="danger" loading={pending} onClick={() => act("rollback")}>Rollback plan</Button> : null}
      </div>
      {message ? <Alert variant="error" role="alert">{message}</Alert> : null}
    </section>
  );
}
