import Link from "next/link";

import type { DashboardNavigationItem } from "@/config/navigation";
import { FeatureIcon } from "@/components/dashboard/feature-icons";

export function FeatureHoverCard({ feature }: { feature: DashboardNavigationItem }) {
  return (
    <Link
      href={feature.href}
      className="workspace-feature-link"
      aria-label={`${feature.title}. ${feature.description}`}
    >
      <span className="workspace-feature-icon">
          <FeatureIcon href={feature.href} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">{feature.title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{feature.description}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="mt-1 shrink-0 text-[var(--muted-foreground)]"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
    </Link>
  );
}
