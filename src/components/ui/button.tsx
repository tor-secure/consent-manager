import * as React from "react";

import { ShieldLoader } from "@/components/ui/shield-loader";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  outline: "btn-outline",
  danger: "btn-danger",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
  icon: "btn-icon",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      disabled,
      loading = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={["btn", variantStyles[variant], sizeStyles[size], className]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading && <ShieldLoader />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
