import type { Metadata } from "next";

import { LegalDocument, PrivacyCentreLayout } from "@/components/public/privacy-centre-shell";
import { PRIVACY_POLICY_SECTIONS } from "@/content/privacy-centre";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "Privacy Policy";
const description =
  "ConsentGuru Privacy Policy: what personal data we collect, how we use it, how we protect it, and how you can exercise your rights.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/privacy-center/privacy-policy"),
  ...socialMetadata({
    title: `${title} — Consent Guru Privacy Centre`,
    description,
    path: "/privacy-center/privacy-policy",
  }),
};

export default function PrivacyPolicyPage() {
  return (
    <PrivacyCentreLayout
      kicker="Privacy Centre"
      title="Privacy Policy"
      intro="This Privacy Policy applies to the ConsentGuru website, platform, applications, APIs and related services operated through www.consentguru.com."
    >
      <LegalDocument sections={PRIVACY_POLICY_SECTIONS} current="/privacy-center/privacy-policy" />
    </PrivacyCentreLayout>
  );
}
