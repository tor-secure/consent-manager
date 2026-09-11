import { SectionHub } from "@/components/dashboard/section-hub";
import { dashboardSectionHubs } from "@/config/navigation";

const hub = dashboardSectionHubs.find((item) => item.href === "/dashboard/discovery");

export default function DiscoveryHubPage() {
  if (!hub) return null;
  return <SectionHub title={hub.title} description={hub.description} features={hub.features} />;
}
