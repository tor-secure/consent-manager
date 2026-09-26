import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { SkipLink } from "@/components/ui/skip-link";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { CertificationLogos } from "@/components/public/certification-logos";
import { HomeProductPreview } from "@/components/public/home-product-preview";
import { HomeTrustedFeatures } from "@/components/public/home-trusted-features";
import { HomeUseCasesCta } from "@/components/public/home-use-cases-cta";
import { HomeHowItWorks } from "@/components/public/home-how-it-works";
import { HomeComparison } from "@/components/public/home-comparison";
import { ArrowButton } from "@/components/ui/arrow-button";
import { PenaltyCallout } from "@/components/public/penalty-callout";
import Link from "next/link";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  INDEXABLE_ROBOTS,
  pageAlternates,
  socialMetadata,
} from "@/lib/site-metadata";
import { graphSchema, softwareApplicationSchema, webPageSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { absolute: DEFAULT_TITLE },
  description: DEFAULT_DESCRIPTION,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/"),
  ...socialMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
  }),
};

const topicLinks = [
  { href: "/consent-management", label: "User consent management", text: "Collect choices and keep consent records." },
  { href: "/cookie-consent-manager", label: "Cookie consent manager", text: "Discover cookies and apply category choices." },
  { href: "/cookie-banner", label: "Cookie consent banner", text: "Publish accept, reject, and purpose-level choices." },
  { href: "/privacy-preference-center", label: "Privacy preference center", text: "Let people review and withdraw a choice." },
  { href: "/privacy-compliance", label: "Privacy compliance", text: "Operate GDPR, CCPA/CPRA, and DPDP workflows." },
  { href: "/dpdp", label: "DPDP compliance", text: "Purpose-bound consent for India’s DPDP Act." },
  { href: "/gdpr", label: "GDPR consent management", text: "Records and withdrawal for consent-based processing." },
  { href: "/dsar", label: "DSAR management", text: "Intake access, correction, and erasure requests." },
  { href: "/consent-analytics", label: "Consent analytics", text: "Review rates without replacing the audit trail." },
  { href: "/integrations", label: "Consent integrations", text: "Google Consent Mode, tags, and webhooks." },
  { href: "/developers", label: "Consent SDK", text: "Install the banner on a verified domain." },
  { href: "/consent-api", label: "Consent management API", text: "Keys and signed webhooks for your systems." },
  { href: "/pricing", label: "Platform pricing", text: "Compare Silver, Gold, and Platinum, then ask for a quote." },
  { href: "/security", label: "Security", text: "Access control, evidence, and retention." },
  { href: "/resources", label: "Resources", text: "Guides and articles on consent and cookies." },
];

const trustItems = [
  {
    label: "Free workspace. Billing is not enabled",
    icon: (
      <path d="M3.75 8.25h16.5M5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v10.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5Z" />
    ),
  },
  {
    label: "Publish a banner and install the SDK",
    icon: (
      <path d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75ZM9.75 12.75l1.5 1.5 3.75-3.75" />
    ),
  },
  {
    label: "Built for DPDP, GDPR, and global laws",
    icon: (
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c2.5 2.7 3.75 5.7 3.75 9S14.5 18.3 12 21c-2.5-2.7-3.75-5.7-3.75-9S9.5 5.7 12 3Z" />
    ),
  },
];

export default function Home() {
  return (
    <div className="home-page public-page min-h-screen overflow-x-clip bg-white text-[#111827]">
      <JsonLd
        id="home-jsonld"
        data={graphSchema([
          softwareApplicationSchema(),
          webPageSchema({ path: "/", name: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION }),
        ])}
      />
      <SkipLink />
      <HomeInteractions />
      <HomeNavbar />
      <main id="main-content" className="home-copy">
        <section
          className="home-section relative flex min-h-[calc(100svh-73px)] flex-col"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 85% 15%, rgba(0,196,167,0.16), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(11,44,74,0.08), transparent 50%), linear-gradient(180deg, #ffffff 0%, #F3FAF8 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(0,196,167,0.22) 1px, transparent 0)",
              backgroundSize: "28px 28px",
              maskImage:
                "radial-gradient(ellipse 60% 50% at 80% 20%, black, transparent), radial-gradient(ellipse 40% 35% at 8% 92%, black, transparent)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto grid w-full min-w-0 max-w-[1200px] flex-1 content-center items-center gap-6 px-4 pt-3 pb-2 min-[400px]:px-5 sm:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-8 xl:gap-10">
            <div className="home-fade-item min-w-0 max-w-xl lg:max-w-none">
              <h1 className="text-balance text-[clamp(1.55rem,1.05rem+2.6vw,2.6rem)] font-bold leading-[1.12] tracking-tight text-[#111827]">
                Build trust. Collect consent.{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #0B2C4A 0%, #00C4A7 70%)",
                  }}
                >
                  Stay compliant.
                </span>
              </h1>

              <p className="mt-3 max-w-lg text-[14px] leading-6 text-[#4B5563] sm:text-[15px]">
                Consent Guru is a consent management platform for cookie consent, privacy preferences,
                and consent records across websites and apps.
              </p>
              <p className="mt-2 max-w-lg text-[13px] leading-6 text-[#6B7280]">
                Publish a cookie banner, review consent analytics, and connect a consent API, with
                workflows for GDPR, CCPA/CPRA, and India&apos;s DPDP Act.
              </p>

              <div className="mt-5 flex flex-col gap-2.5 min-[480px]:flex-row min-[480px]:items-center">
                <ArrowButton href="/sign-up" size="md" className="w-full justify-center min-[480px]:w-auto">
                  Sign up
                </ArrowButton>
                <Link
                  href="/#comparison"
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#00C4A7]/40 bg-white px-4 text-center text-sm font-semibold text-[#0B2C4A] transition hover:border-[#00C4A7] hover:bg-[#E6F9F5] min-[480px]:w-auto"
                >
                  Compare capabilities
                </Link>
              </div>

              <PenaltyCallout className="mt-4 w-full max-w-lg" />

              <ul className="mt-4 flex min-w-0 flex-col gap-2 text-[12px] text-[#6B7280] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1.5">
                {trustItems.map((item) => (
                  <li key={item.label} className="inline-flex min-w-0 items-start gap-2 sm:items-center">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="shrink-0 text-[#9CA3AF]"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {item.icon}
                    </svg>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <HomeProductPreview />
          </div>
        </section>

        <section className="home-section border-t border-[#E5E7EB]/70 bg-[#F3FAF8]">
          <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 py-10 min-[400px]:px-5 sm:px-8 sm:py-12">
            <CertificationLogos compact />
          </div>
        </section>

        <HomeTrustedFeatures />
        <HomeComparison />
        <HomeHowItWorks />
        <section className="home-section border-t border-[#E5E7EB] bg-white" aria-labelledby="platform-map-heading">
          <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 py-12 min-[400px]:px-5 sm:px-8 sm:py-16">
            <h2 id="platform-map-heading" className="max-w-2xl text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">
              Explore the consent platform
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5563]">
              Each page covers a different part of consent collection, cookie management, or privacy operations.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topicLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block h-full rounded-2xl border border-[#E5E7EB] px-4 py-4 transition hover:border-[#00C4A7]"
                  >
                    <span className="text-sm font-semibold text-[#0B2C4A]">{item.label}</span>
                    <span className="mt-1 block text-sm leading-6 text-[#6B7280]">{item.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <HomeUseCasesCta />
      </main>

      <HomeFooter />
    </div>
  );
}
