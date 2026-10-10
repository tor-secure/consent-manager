import type { Metadata } from "next";

import { landingMetadata, SeoLandingView } from "@/components/public/seo-landing-view";
import { getSeoLanding } from "@/content/seo-landings";

const page = getSeoLanding("/consent-records");

export const metadata: Metadata = landingMetadata(page);

export default function ConsentRecordsPage() {
  return <SeoLandingView page={page} />;
}
