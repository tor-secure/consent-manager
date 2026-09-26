import type { Metadata } from "next";

import { landingMetadata, SeoLandingView } from "@/components/public/seo-landing-view";
import { getSeoLanding } from "@/content/seo-landings";

const page = getSeoLanding("/privacy-compliance");

export const metadata: Metadata = landingMetadata(page);

export default function PrivacyCompliancePage() {
  return <SeoLandingView page={page} />;
}
