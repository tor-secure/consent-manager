import type { ReactNode } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { PageTabs } from "@/components/ui/page-tabs";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";

const TABS = [
  { href: "/dashboard/developers", label: "Overview", match: "exact" as const },
  { href: "/dashboard/developers/install", label: "Install SDK", match: "prefix" as const },
  { href: "/dashboard/developers/api-keys", label: "API keys", match: "prefix" as const },
  { href: "/dashboard/developers/api", label: "API reference", match: "prefix" as const },
  { href: "/dashboard/developers/webhooks", label: "Webhooks", match: "prefix" as const },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DevelopersShell({
  pathname,
  title,
  description,
  action,
  children,
}: {
  pathname: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/developer">Developer</SectionEyebrow>}
        title={title}
        description={description}
        action={action}
      />

      <PageTabs
        tabs={TABS.map((tab) => ({
          href: tab.href,
          label: tab.label,
          active: isActive(pathname, tab.href, tab.match),
        }))}
      />

      {children}
    </div>
  );
}

export function DevelopersStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p> : null}
    </div>
  );
}

export function DevelopersQuickLink({
  href,
  title,
  description,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:bg-[var(--muted)]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)]">
          {title}
        </h3>
        <span aria-hidden className="text-[var(--muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[var(--primary)]">
          →
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
      {meta ? <p className="mt-3 text-xs font-medium text-[var(--muted-foreground)]">{meta}</p> : null}
    </Link>
  );
}
