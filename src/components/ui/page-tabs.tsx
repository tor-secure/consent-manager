import type { ReactNode } from "react";
import Link from "next/link";

export type PageTab = {
  href: string;
  label: string;
  active?: boolean;
};

export function PageTabs({
  tabs,
  children,
}: {
  tabs: PageTab[];
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]">
      <nav aria-label="Page sections" className="-mb-px flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={[
              "inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors",
              tab.active
                ? "border-[var(--primary)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children ? <div className="pb-2">{children}</div> : null}
    </div>
  );
}
