import type { ReactNode } from "react";

type IconTextProps = {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  iconClassName?: string;
  /** Optical nudge for icon tiles next to multi-line text */
  size?: "sm" | "md" | "lg";
};

const iconSizeClasses = {
  sm: "h-8 w-8 rounded-xl",
  md: "h-10 w-10 rounded-xl",
  lg: "h-11 w-11 rounded-2xl sm:h-12 sm:w-12",
} as const;

/**
 * Icon + title (+ optional description) aligned to the first text line.
 * Prefer this over `items-center` when the text stack is 2+ lines.
 */
export function IconText({
  icon,
  title,
  description,
  trailing,
  className = "",
  iconClassName = "bg-[var(--muted)] text-[var(--primary)]",
  size = "sm",
}: IconTextProps) {
  return (
    <div className={["flex items-start gap-3 min-w-0", className].join(" ")}>
      <div
        className={[
          "mt-0.5 flex shrink-0 items-center justify-center",
          iconSizeClasses[size],
          iconClassName,
        ].join(" ")}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {typeof title === "string" ? (
            <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">{title}</p>
          ) : (
            title
          )}
          {trailing}
        </div>
        {description ? (
          typeof description === "string" ? (
            <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">{description}</p>
          ) : (
            description
          )
        ) : null}
      </div>
    </div>
  );
}
