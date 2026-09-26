import type { Metadata } from "next";

import { landingMetadata, SeoLandingView } from "@/components/public/seo-landing-view";
import { getSeoLanding } from "@/content/seo-landings";

const page = getSeoLanding("/consent-api");

export const metadata: Metadata = landingMetadata(page);

export default function ConsentApiPage() {
  return <SeoLandingView page={page} />;
}
