import type { Metadata } from "next";

import { LegalDocument, PrivacyCentreLayout } from "@/components/public/privacy-centre-shell";
import { COOKIE_POLICY_SECTIONS } from "@/content/privacy-centre";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "Cookie Policy";
const description =
  "ConsentGuru Cookie Policy: how cookies and similar technologies work, the categories we may use, and how you can manage preferences.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/privacy-center/cookie-policy"),
  ...socialMetadata({
    title: `${title} — Consent Guru Privacy Centre`,
    description,
    path: "/privacy-center/cookie-policy",
  }),
};

export default function CookiePolicyPage() {
  return (
    <PrivacyCentreLayout
      kicker="Privacy Centre"
      title="Cookie Policy"
      intro="How ConsentGuru and organisations using our technology may use cookies, pixels, local storage, SDKs, tags and similar technologies."
    >
      <LegalDocument sections={COOKIE_POLICY_SECTIONS} current="/privacy-center/cookie-policy" />
    </PrivacyCentreLayout>
  );
}
