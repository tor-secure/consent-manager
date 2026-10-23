import type { ReactNode } from "react";

export function FormSection({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={[
        "form-section workflow-form-section",
        tone === "danger" ? "rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-4 py-5" : "",
      ].join(" ")}
    >
      <div className="workflow-form-heading">
        <h2 className="form-section-title">{title}</h2>
        {description ? <p className="form-section-desc">{description}</p> : null}
      </div>
      <div className="workflow-form-fields grid gap-4">{children}</div>
    </section>
  );
}
