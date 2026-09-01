import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] active:scale-[0.98]",
  secondary:
    "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--hover)]",
  ghost:
    "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
  outline:
    "bg-[var(--card)] text-[var(--secondary-foreground)] border border-[var(--border)] hover:bg-[var(--muted)]",
  danger:
    "bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:opacity-90 active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 min-h-9 px-3 text-xs rounded-lg",
  md: "h-10 min-h-10 px-4 text-sm rounded-xl",
  lg: "h-11 min-h-11 px-5 text-sm rounded-xl",
  icon: "h-11 w-11 min-h-11 min-w-11 rounded-xl",
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
        className={[
          "inline-flex items-center justify-center gap-2 font-medium select-none",
          "transition-[background-color,box-shadow,color,transform,opacity] duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
