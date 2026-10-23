"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";

export function DeleteWebsiteButton({
  websiteId,
  name,
  domain,
  layout = "card",
}: {
  websiteId: string;
  name: string;
  domain: string;
  layout?: "card" | "plain";
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function removeWebsite() {
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        `/api/websites/${websiteId}`,
        { method: "DELETE" },
        {
          successMessage: "Website deleted",
          errorFallback: "Unable to delete this website.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      router.push("/dashboard/websites");
      router.refresh();
    });
  }

  const body = (
      <div className="space-y-4">
        {error ? (
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        ) : null}
        {open ? (
          <div className="space-y-3" role="alertdialog" aria-labelledby="delete-website-confirm">
            <p id="delete-website-confirm" className="text-sm font-medium text-[var(--foreground)]">
              Are you sure you are deleting {name}? This removes {domain} from your dashboard.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="danger"
                loading={pending}
                disabled={pending}
                onClick={removeWebsite}
              >
                {pending ? "Deleting..." : "Yes, delete this site"}
              </Button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="danger" onClick={() => setOpen(true)}>
            Delete website
          </Button>
        )}
      </div>
  );

  if (layout === "plain") {
    return (
      <section className="space-y-3 border-t border-[var(--border)] pt-8">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Delete website</h2>
        <p className="text-sm leading-5 text-[var(--muted-foreground)]">
          Remove {name} from your dashboard. The domain can be added again later.
        </p>
        {body}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--card)] card-shadow">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Delete website</h2>
        <p className="mt-0.5 text-sm leading-5 text-[var(--muted-foreground)]">
          Remove {name} from your dashboard. The domain can be added again later.
        </p>
      </div>
      <div className="px-6 py-5">{body}</div>
    </section>
  );
}
