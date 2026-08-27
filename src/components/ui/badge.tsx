import * as React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "neutral" | "primary" | "purple";
type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-500/20",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-500/20",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  primary: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20",
  purple: "bg-violet-50 text-violet-700 ring-1 ring-violet-500/20",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px] font-medium",
  md: "px-2.5 py-1 text-xs font-medium",
};

export function Badge({
  className = "",
  variant = "default",
  size = "sm",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full leading-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
