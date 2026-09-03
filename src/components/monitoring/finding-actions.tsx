"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";

export function FindingActions({
  findingId,
  status,
}: {
  findingId: string;
  status: string;
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "resolved" && status !== "reviewed" && (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          loading={pending}
          onClick={() =>
            run(async () => {
              const result = await dashboardFetch(
                `/api/monitoring/findings/${findingId}/review`,
                { method: "POST" },
                {
                  successMessage: "Finding marked as reviewed.",
                  errorFallback: "Unable to review this finding.",
                },
              );
              if (result.ok) router.refresh();
            })
          }
        >
          Mark reviewed
        </Button>
      )}
      {status !== "resolved" && (
        <Button
          type="button"
          disabled={pending}
          loading={pending}
          onClick={() =>
            run(async () => {
              const result = await dashboardFetch(
                `/api/monitoring/findings/${findingId}/resolve`,
                { method: "POST" },
                {
                  successMessage: "Finding marked as resolved.",
                  errorFallback: "Unable to resolve this finding.",
                },
              );
              if (result.ok) router.refresh();
            })
          }
        >
          Resolve
        </Button>
      )}
    </div>
  );
}
