import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="field-label mb-0">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormCard({
  title,
  description,
  titleExtra,
  children,
}: {
  title?: string;
  description?: ReactNode;
  titleExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] card-shadow">
      {(title || description) && (
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
          {title ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                {title}
              </h2>
              {titleExtra}
            </div>
          ) : null}
          {description ? (
            <p className={`text-sm leading-relaxed text-[var(--muted-foreground)] ${title ? "mt-1" : ""}`}>
              {description}
            </p>
          ) : null}
        </div>
      )}
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end pt-1">
      {children}
    </div>
  );
}
