import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GetLiveStep } from "@/lib/dashboard/get-live-path";

export type { GetLiveStep };

export function GetLiveStrip({
  steps,
  onDismiss,
}: {
  steps: GetLiveStep[];
  onDismiss?: () => void;
}) {
  const remaining = steps.filter((step) => !step.done).length;
  return (
    <Card id="get-live">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Get live</p>
        <CardTitle>
          Website → Purposes → Vendors → Policy → Publish → Install
        </CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          {remaining === 0
            ? "Core setup is complete. Keep mapping new trackers after each scan."
            : `${remaining} step${remaining === 1 ? "" : "s"} left before the banner can go live.`}
        </p>
          </div>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 text-xs font-medium text-[var(--muted-foreground)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {steps.map((step, index) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex h-full flex-col rounded-xl border border-[var(--border)] px-3 py-3 transition hover:bg-[var(--hover)]"
              >
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      step.done
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    {step.done ? "✓" : index + 1}
                  </span>
                  {step.label}
                </span>
                <span className="mt-2 text-xs text-[var(--muted-foreground)]">{step.hint}</span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
