"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type HoverGlassCardProps = {
  children: ReactNode;
  href?: string;
  className?: string;
  interactive?: boolean;
};

export function HoverGlassCard({
  children,
  href,
  className = "",
  interactive = true,
}: HoverGlassCardProps) {
  const classes = [
    "hover-glass-card",
    interactive ? "" : "hover-glass-card-static",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}
