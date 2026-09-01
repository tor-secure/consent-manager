import * as React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "neutral" | "primary" | "purple";
type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--muted)] text-[var(--secondary-foreground)] ring-1 ring-[var(--border)]",
  success: "bg-[var(--success-soft)] text-[var(--success)] ring-1 ring-[color-mix(in_srgb,var(--success)_22%,transparent)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] ring-1 ring-[color-mix(in_srgb,var(--warning)_22%,transparent)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-[color-mix(in_srgb,var(--danger)_22%,transparent)]",
  neutral: "bg-[var(--muted)] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]",
  primary: "bg-[var(--info-soft)] text-[var(--primary)] ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]",
  purple: "bg-[var(--muted)] text-[var(--purple)] ring-1 ring-[var(--border)]",
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
        "inline-flex items-center rounded-full leading-none transition-colors duration-200",
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
