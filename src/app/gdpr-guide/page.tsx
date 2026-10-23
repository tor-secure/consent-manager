import type { Metadata } from "next";
import { GdprJourney } from "@/components/dpdp-journey/GdprJourney";
import { JourneyPage } from "@/components/dpdp-journey/JourneyPage";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const PATH = "/gdpr-guide";
const TITLE = "GDPR Explained: Follow Your Data";
const DESCRIPTION =
  "An interactive guide to the EU General Data Protection Regulation: lawful bases, valid consent, cookies, withdrawal, data subject rights, controller duties, children and special category data. Informational only — not legal advice.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates(PATH),
  ...socialMetadata({ title: TITLE, description: DESCRIPTION, path: PATH }),
};

export default function GdprGuidePage() {
  return (
    <JourneyPage
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      crumb="GDPR guide"
      legislation={{ name: "General Data Protection Regulation (EU) 2016/679", jurisdiction: "EU" }}
      language="en"
    >
      <GdprJourney />
    </JourneyPage>
  );
}
