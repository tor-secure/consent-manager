import type { DashboardNavigationItem } from "@/config/navigation";
import { FeatureHoverCard } from "@/components/dashboard/feature-hover-card";
import { PageHeader } from "@/components/ui/page-header";

export function SectionHub({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: DashboardNavigationItem[];
}) {
  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader title={title} description={description} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(11.5rem,11.5rem))] justify-start gap-4 px-1 py-2">
        {features.map((feature) => (
          <FeatureHoverCard key={feature.href} feature={feature} />
        ))}
      </div>
    </div>
  );
}
