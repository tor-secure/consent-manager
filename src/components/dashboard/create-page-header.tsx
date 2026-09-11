import Link from "next/link";
import type { ReactNode } from "react";

export function CreatePageHeader({
  backHref,
  backLabel,
  current,
  title,
  description,
}: {
  backHref: string;
  backLabel: string;
  current: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href={backHref} className="transition hover:text-[var(--foreground)]">
          {backLabel}
        </Link>
        <span className="text-[var(--border)]" aria-hidden="true">
          /
        </span>
        <span className="font-medium text-[var(--foreground)]">{current}</span>
      </nav>
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
    </div>
  );
}

export function TemplateTile({
  active,
  title,
  eyebrow,
  summary,
  onClick,
}: {
  active: boolean;
  title: string;
  eyebrow?: string;
  summary: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full min-h-[8.25rem] flex-col rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[var(--ring)] bg-[var(--info-soft)] ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]"
          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border)] hover:bg-[var(--muted)]"
      }`}
    >
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{eyebrow}</p>
      ) : null}
      <p className={`text-sm font-semibold leading-snug text-[var(--foreground)] ${eyebrow ? "mt-1" : ""}`}>
        {title}
      </p>
      <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-[var(--muted-foreground)]">{summary}</p>
    </button>
  );
}

export function CreateFormShell({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  if (!aside) {
    return <div className="mx-auto w-full max-w-3xl">{children}</div>;
  }
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
      <div className="min-w-0">{children}</div>
      <aside className="hidden lg:block">{aside}</aside>
    </div>
  );
}
