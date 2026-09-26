import type { Metadata } from "next";

import { landingMetadata, SeoLandingView } from "@/components/public/seo-landing-view";
import { getSeoLanding } from "@/content/seo-landings";

const page = getSeoLanding("/google-consent-mode");

export const metadata: Metadata = landingMetadata(page);

export default function GoogleConsentModePage() {
  return <SeoLandingView page={page} />;
}
