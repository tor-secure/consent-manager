import Link from "next/link";

import type { DashboardNavigationItem } from "@/config/navigation";
import { FeatureIcon } from "@/components/dashboard/feature-icons";

export function FeatureHoverCard({ feature }: { feature: DashboardNavigationItem }) {
  return (
    <Link
      href={feature.href}
      className="feature-flip-card"
      aria-label={`${feature.title}. ${feature.description}`}
    >
      <span className="feature-flip-card-front">
        <span className="feature-flip-card-icon">
          <FeatureIcon href={feature.href} />
        </span>
        <span className="feature-flip-card-name">{feature.title}</span>
      </span>
      <div className="feature-flip-card-content">
        <p className="feature-flip-card-title">{feature.title}</p>
        <p className="feature-flip-card-description">{feature.description}</p>
      </div>
    </Link>
  );
}
