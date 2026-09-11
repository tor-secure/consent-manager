import { SectionHub } from "@/components/dashboard/section-hub";
import { dashboardSectionHubs } from "@/config/navigation";

const hub = dashboardSectionHubs.find((item) => item.href === "/dashboard/intelligence");

export default function IntelligenceHubPage() {
  if (!hub) return null;
  return <SectionHub title={hub.title} description={hub.description} features={hub.features} />;
}
