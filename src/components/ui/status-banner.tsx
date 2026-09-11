import type { ReactNode } from "react";

type StatusBannerVariant = "success" | "warning" | "danger" | "info";

const styles: Record<StatusBannerVariant, string> = {
  success:
    "border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] text-[var(--success)]",
  warning:
    "border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[var(--warning-soft)] text-[var(--warning)]",
  danger:
    "border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]",
  info:
    "border-[color-mix(in_srgb,var(--info)_28%,transparent)] bg-[var(--info-soft)] text-[var(--info)]",
};

export function StatusBanner({
  variant = "info",
  children,
  className = "",
  role = "status",
}: {
  variant?: StatusBannerVariant;
  children: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      className={[
        "flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm",
        styles[variant],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
