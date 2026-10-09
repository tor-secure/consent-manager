import type { Metadata } from "next";

import { landingMetadata, SeoLandingView } from "@/components/public/seo-landing-view";
import { getSeoLanding } from "@/content/seo-landings";

const page = getSeoLanding("/compare/consent-management-platforms");

export const metadata: Metadata = landingMetadata(page);

export default function CompareConsentPlatformsPage() {
  return <SeoLandingView page={page} />;
}
