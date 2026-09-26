import type { Metadata } from "next";

import { landingMetadata, SeoLandingView } from "@/components/public/seo-landing-view";
import { getSeoLanding } from "@/content/seo-landings";

const page = getSeoLanding("/gdpr");

export const metadata: Metadata = landingMetadata(page);

export default function GdprPage() {
  return <SeoLandingView page={page} />;
}
