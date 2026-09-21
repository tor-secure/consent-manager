import type { Metadata } from "next";

import { LegalDocument, PrivacyCentreLayout } from "@/components/public/privacy-centre-shell";
import { DPA_SECTIONS } from "@/content/privacy-centre";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "Data Processing Agreement";
const description =
  "ConsentGuru Data Processing Agreement: processor responsibilities, security, sub-processors, and Customer Data safeguards under DPDP, GDPR and CCPA/CPRA.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/privacy-center/data-processing-agreement"),
  ...socialMetadata({
    title: `${title} — Consent Guru Privacy Centre`,
    description,
    path: "/privacy-center/data-processing-agreement",
  }),
};

export default function DataProcessingAgreementPage() {
  return (
    <PrivacyCentreLayout
      kicker="Privacy Centre"
      title="Data Processing Agreement"
      intro="This DPA applies where ConsentGuru processes Personal Data on behalf of a Customer and is intended to support DPDP, GDPR, UK GDPR, CCPA/CPRA and other applicable privacy laws."
    >
      <LegalDocument sections={DPA_SECTIONS} current="/privacy-center/data-processing-agreement" />
    </PrivacyCentreLayout>
  );
}
