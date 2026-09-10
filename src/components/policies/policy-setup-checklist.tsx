import Link from "next/link";

export type SetupCheck = {
  id: string;
  label: string;
  done: boolean;
  href: string;
  hint: string;
};

export function PolicySetupChecklist({ items }: { items: SetupCheck[] }) {
  const remaining = items.filter((item) => !item.done).length;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Get this policy live</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {remaining === 0
              ? "Setup looks complete. Validate below, then publish."
              : `${remaining} step${remaining === 1 ? "" : "s"} left before a clean publish.`}
          </p>
        </div>
      </div>
      <ol className="mt-4 space-y-2">
        {items.map((item, index) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-4 py-3 transition hover:bg-[var(--hover)]"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  item.done
                    ? "bg-[var(--success-soft)] text-[var(--success)]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {item.done ? "✓" : index + 1}
              </span>
              <span>
                <span className="block text-sm font-medium text-[var(--foreground)]">{item.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">{item.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
