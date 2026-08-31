import * as React from "react";

type AlertVariant = "error" | "success" | "warning" | "info";

const styles: Record<AlertVariant, string> = {
  error: "bg-rose-50 text-rose-800 border-rose-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  info: "bg-indigo-50 text-indigo-800 border-indigo-200",
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
