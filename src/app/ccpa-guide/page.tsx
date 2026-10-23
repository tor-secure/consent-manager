import type { Metadata } from "next";
import { CcpaJourney } from "@/components/dpdp-journey/CcpaJourney";
import { JourneyPage } from "@/components/dpdp-journey/JourneyPage";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const PATH = "/ccpa-guide";
const TITLE = "CCPA and CPRA Explained: Follow Your Data";
const DESCRIPTION =
  "An interactive guide to the California Consumer Privacy Act as amended by the CPRA: notice at collection, opting out of sale and sharing, Global Privacy Control, consumer rights, minors and sensitive personal information. Informational only — not legal advice.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates(PATH),
  ...socialMetadata({ title: TITLE, description: DESCRIPTION, path: PATH }),
};

export default function CcpaGuidePage() {
  return (
    <JourneyPage
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      crumb="CCPA guide"
      legislation={{ name: "California Consumer Privacy Act of 2018, as amended by the California Privacy Rights Act", jurisdiction: "US-CA" }}
      language="en-US"
    >
      <CcpaJourney />
    </JourneyPage>
  );
}
