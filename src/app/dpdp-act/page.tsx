import type { Metadata } from "next";
import { DpdpJourney } from "@/components/dpdp-journey/DpdpJourney";
import { JourneyPage } from "@/components/dpdp-journey/JourneyPage";
import { DPDP_PAGE_DESCRIPTION, DPDP_PAGE_PATH, DPDP_PAGE_TITLE } from "@/content/dpdp-act";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: DPDP_PAGE_TITLE,
  description: DPDP_PAGE_DESCRIPTION,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates(DPDP_PAGE_PATH),
  ...socialMetadata({
    title: `${DPDP_PAGE_TITLE} — Consent Management & Privacy Compliance`,
    description: DPDP_PAGE_DESCRIPTION,
    path: DPDP_PAGE_PATH,
  }),
};

export default function DpdpActPage() {
  return (
    <JourneyPage
      path={DPDP_PAGE_PATH}
      title={`${DPDP_PAGE_TITLE} — Consent Management & Privacy Compliance`}
      description={DPDP_PAGE_DESCRIPTION}
      crumb="DPDP Act"
      legislation={{ name: "Digital Personal Data Protection Act, 2023", jurisdiction: "IN" }}
      language="en-IN"
    >
      <DpdpJourney />
    </JourneyPage>
  );
}
