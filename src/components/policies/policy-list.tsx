import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconText } from "@/components/ui/icon-text";

export type PolicyListItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  isDefault: boolean;
  createdAt: Date;
  website: { id: string; name: string; domain: string } | null;
  latestVersion: number;
  hasPublished: boolean;
};

function IconPolicy() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

function PolicyStatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "success" | "warning" | "neutral"> = {
    active: "success",
    draft: "neutral",
    archived: "warning",
  };
  const label: Record<string, string> = {
    active: "Active",
    draft: "Draft",
    archived: "Archived",
  };
  return (
    <Badge variant={variantMap[status] ?? "neutral"} size="sm">
      {label[status] ?? status}
    </Badge>
  );
}

export function PolicyList({
  policies,
  hideWebsiteColumn = false,
}: {
  policies: PolicyListItem[];
  hideWebsiteColumn?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="table-scroll scrollbar-thin">
        <table className={`w-full border-collapse text-sm ${hideWebsiteColumn ? "min-w-[44rem]" : "min-w-[56rem]"}`}>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                Policy
              </th>
              {hideWebsiteColumn ? null : (
                <th className="w-[14rem] px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                  Website
                </th>
              )}
              <th className="w-[7.5rem] px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                Status
              </th>
              <th className="w-[11rem] px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                Version
              </th>
              <th className="w-[8.5rem] px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                Created
              </th>
              <th className="w-12 px-4 py-3.5">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr
                key={policy.id}
                className="group border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--muted)]/55"
              >
                <td className="relative px-5 py-4 align-middle">
                  <Link
                    href={`/dashboard/policies/${policy.id}`}
                    className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
                    aria-label={`Open ${policy.name}`}
                  />
                  <div className="relative z-10 pointer-events-none">
                    <IconText
                      size="sm"
                      icon={<IconPolicy />}
                      iconClassName="bg-[var(--info-soft)] text-[var(--primary)]"
                      title={
                        <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                          <span className="font-semibold leading-snug text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">
                            {policy.name}
                          </span>
                          {policy.isDefault ? (
                            <Badge variant="primary" size="sm">
                              Default
                            </Badge>
                          ) : null}
                        </span>
                      }
                      description={
                        policy.description ? (
                          <p className="mt-0.5 line-clamp-1 max-w-[28rem] text-xs leading-5 text-[var(--muted-foreground)]">
                            {policy.description}
                          </p>
                        ) : undefined
                      }
                    />
                  </div>
                </td>
                {hideWebsiteColumn ? null : (
                  <td className="relative px-5 py-4 align-middle">
                    {policy.website ? (
                      <Link
                        href={`/dashboard/websites/${policy.website.id}`}
                        className="relative z-10 block min-w-0 rounded-md outline-none transition-colors hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                      >
                        <p className="truncate font-medium text-[var(--foreground)]">{policy.website.name}</p>
                        <p className="truncate text-xs text-[var(--muted-foreground)]">{policy.website.domain}</p>
                      </Link>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">—</span>
                    )}
                  </td>
                )}
                <td className="relative z-10 px-5 py-4 align-middle">
                  <PolicyStatusBadge status={policy.status} />
                </td>
                <td className="relative z-10 px-5 py-4 align-middle">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="neutral" size="sm">
                      v{policy.latestVersion}
                    </Badge>
                    {policy.hasPublished ? (
                      <Badge variant="success" size="sm">
                        Published
                      </Badge>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">Not published</span>
                    )}
                  </div>
                </td>
                <td className="relative z-10 px-5 py-4 align-middle tabular-nums text-[var(--muted-foreground)]">
                  {policy.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="relative z-10 px-4 py-4 align-middle">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors group-hover:bg-[var(--card)] group-hover:text-[var(--primary)]">
                    <IconChevron />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
