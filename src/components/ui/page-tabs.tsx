"use client";

import { useId, type ReactNode } from "react";
import { LayoutGroup, m } from "motion/react";
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
  const group = useId();
  return (
    <LayoutGroup id={group}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]">
      <nav aria-label="Page sections" className="-mb-px flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={[
              "relative inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors",
              tab.active
                ? "border-[var(--primary)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            {tab.label}
            {tab.active && <m.span layoutId="active-tab" className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-[var(--primary)]" />}
          </Link>
        ))}
      </nav>
      {children ? <div className="pb-2">{children}</div> : null}
    </div></LayoutGroup>
  );
}
