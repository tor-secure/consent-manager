import { ContextDescription } from "@/components/ui/context-description";
import type { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={[
        "page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      ].join(" ")}
    >
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {description ? <ContextDescription>{description}</ContextDescription> : null}
        {eyebrow ? <div className="page-context">{eyebrow}</div> : null}
      </div>
      {action ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:pt-0.5">{action}</div>
      ) : null}
    </header>
  );
}

export function PageHeaderLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="btn btn-primary">
      {children}
    </Link>
  );
}
