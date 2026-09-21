import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalBlocks,
  PrivacyCentreLayout,
  PrivacyPartNav,
} from "@/components/public/privacy-centre-shell";
import {
  PRIVACY_CENTRE_INTRO,
  PRIVACY_CENTRE_ORG,
  PRIVACY_CENTRE_PARTS,
} from "@/content/privacy-centre";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "Privacy Centre";
const description =
  "Privacy Policy, Cookie Policy and Data Processing Agreement for ConsentGuru. Learn how we handle personal data, cookies and customer processing.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/privacy-center"),
  ...socialMetadata({
    title: `${title} — Consent Guru`,
    description,
    path: "/privacy-center",
  }),
};

export default function PrivacyCenterPage() {
  const org = PRIVACY_CENTRE_ORG;

  return (
    <PrivacyCentreLayout
      kicker="ConsentGuru Privacy Centre"
      title="Privacy Policy, Cookie Policy and Data Processing Agreement"
      intro="Privacy should be simple, transparent and within your control. These documents explain how ConsentGuru handles personal data, cookies, consent and privacy preferences."
    >
      <section className="bg-white px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-[800px]">
          <PrivacyPartNav current="/privacy-center" />
          <LegalBlocks blocks={PRIVACY_CENTRE_INTRO} />

          <div className="mt-10 grid gap-4">
            {PRIVACY_CENTRE_PARTS.map((part) => (
              <Link
                key={part.href}
                href={part.href}
                className="rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB] p-6 transition hover:-translate-y-0.5 hover:border-[#00C4A7] hover:shadow-[0_16px_30px_-20px_rgba(11,44,74,0.4)]"
              >
                <h2 className="text-xl font-bold text-[#0B2C4A]">{part.title}</h2>
                <p className="mt-2 text-justify text-sm leading-6 text-[#4B5563]">{part.description}</p>
                <p className="mt-4 text-sm font-semibold text-[#00A88F]">Read {part.title} →</p>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-[#D3E0DE] p-6">
            <h2 className="text-lg font-bold text-[#0B2C4A]">Who we are</h2>
            <p className="mt-3 font-semibold text-[#0B2C4A]">{org.name}</p>
            {org.addressLines.map((line) => (
              <p key={line} className="text-sm leading-6 text-[#4B5563]">
                {line}
              </p>
            ))}
            <p className="mt-4 text-sm leading-6 text-[#4B5563]">
              General privacy contact:{" "}
              <a className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2" href={`mailto:${org.supportEmail}`}>
                {org.supportEmail}
              </a>
            </p>
            <p className="text-sm leading-6 text-[#4B5563]">
              Data Protection Officer: {org.dpoName},{" "}
              <a className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2" href={`mailto:${org.dpoEmail}`}>
                {org.dpoEmail}
              </a>
            </p>
          </div>
        </div>
      </section>
    </PrivacyCentreLayout>
  );
}
