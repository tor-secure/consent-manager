import type { Metadata } from "next";

import { landingMetadata, SeoLandingView } from "@/components/public/seo-landing-view";
import { getSeoLanding } from "@/content/seo-landings";

const page = getSeoLanding("/dpdp-consent-requirements");

export const metadata: Metadata = landingMetadata(page);

export default function DpdpConsentRequirementsPage() {
  return <SeoLandingView page={page} />;
}
