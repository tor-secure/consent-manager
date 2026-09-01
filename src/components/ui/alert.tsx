import * as React from "react";

type AlertVariant = "error" | "success" | "warning" | "info";

const styles: Record<AlertVariant, string> = {
  error: "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_28%,transparent)]",
  success: "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_28%,transparent)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_28%,transparent)]",
  info: "bg-[var(--info-soft)] text-[var(--info)] border-[color-mix(in_srgb,var(--info)_28%,transparent)]",
};

export function Alert({
  variant = "info",
  children,
  className = "",
  role = "status",
}: {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      className={[
        "rounded-xl border px-3.5 py-2.5 text-sm animate-fade-in",
        styles[variant],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
