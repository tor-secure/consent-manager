import type { Metadata } from "next";

import { landingMetadata, SeoLandingView } from "@/components/public/seo-landing-view";
import { getSeoLanding } from "@/content/seo-landings";

const page = getSeoLanding("/consent-analytics");

export const metadata: Metadata = landingMetadata(page);

export default function ConsentAnalyticsPage() {
  return <SeoLandingView page={page} />;
}
