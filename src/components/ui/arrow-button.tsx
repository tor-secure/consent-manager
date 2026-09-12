import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ArrowButtonShared = {
  children: ReactNode;
  className?: string;
  size?: "md" | "lg";
  tone?: "default" | "inverse";
};

export type ArrowButtonProps = ArrowButtonShared &
  (
    | ({ href: string; onClick?: () => void } & Omit<ButtonHTMLAttributes<HTMLAnchorElement>, "href" | "onClick" | "children" | "className">)
    | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
  );

function arrowClassName(size: "md" | "lg", tone: "default" | "inverse", className: string) {
  return ["arrow-btn", size === "lg" ? "arrow-btn-lg" : "", tone === "inverse" ? "arrow-btn-inverse" : "", className]
    .filter(Boolean)
    .join(" ");
}

function ArrowMark() {
  return (
    <span className="arrow-btn-wrapper" aria-hidden="true">
      <span className="arrow-btn-arrow" />
    </span>
  );
}

export function ArrowButton({
  children,
  className = "",
  size = "md",
  tone = "default",
  href,
  ...rest
}: ArrowButtonProps) {
  const classNames = arrowClassName(size, tone, className);

  if (href) {
    return (
      <Link href={href} className={classNames} {...(rest as Omit<ButtonHTMLAttributes<HTMLAnchorElement>, "href">)}>
        {children}
        <ArrowMark />
      </Link>
    );
  }

  return (
    <button type="button" className={classNames} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
      <ArrowMark />
    </button>
  );
}
