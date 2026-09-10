import Link from "next/link";

export type GetLiveStep = {
  id: string;
  label: string;
  href: string;
  done: boolean;
  hint: string;
};

export function GetLiveStrip({ steps }: { steps: GetLiveStep[] }) {
  const remaining = steps.filter((step) => !step.done).length;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Get live</p>
          <h2 className="mt-1 text-base font-semibold text-[var(--foreground)]">
            Website → Purposes → Vendors → Policy → Publish → Install
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {remaining === 0
              ? "Core setup is complete. Keep mapping new trackers after each scan."
              : `${remaining} step${remaining === 1 ? "" : "s"} left before the banner can go live.`}
          </p>
        </div>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
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
    </section>
  );
}
