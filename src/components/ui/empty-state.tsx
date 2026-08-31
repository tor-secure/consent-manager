import * as React from "react";
import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white card-shadow px-6 py-12 sm:px-10 sm:py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon ?? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
          </svg>
        )}
      </div>
      <p className="mt-4 text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-1.5 mx-auto max-w-md text-sm text-slate-500">{description}</p>
      {actionLabel && actionHref ? (
        <div className="mt-5">
          <Link href={actionHref} className="btn btn-primary">
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
