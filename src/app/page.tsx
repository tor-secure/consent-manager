import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { SkipLink } from "@/components/ui/skip-link";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { PrivacyFlowPreview } from "@/components/public/privacy-flow-preview";
import { HomeProductPreview } from "@/components/public/home-product-preview";
import { HomeTrustedFeatures } from "@/components/public/home-trusted-features";
import { HomeUseCasesCta } from "@/components/public/home-use-cases-cta";
import { HomeHowItWorks } from "@/components/public/home-how-it-works";
import { HomeComparison } from "@/components/public/home-comparison";
import { ArrowButton } from "@/components/ui/arrow-button";
import { PenaltyCallout } from "@/components/public/penalty-callout";
import Link from "next/link";
import { sitelinkPages } from "@/content/primary-nav";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  INDEXABLE_ROBOTS,
  pageAlternates,
  socialMetadata,
} from "@/lib/site-metadata";
import { faqSchema, graphSchema, softwareApplicationSchema, webPageSchema } from "@/lib/structured-data";

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
  { href: "/consent-management-platform", label: "Consent management platform", text: "Collect choices, store records, and apply them." },
  { href: "/consent-management", label: "Consent management", text: "Collect a choice, keep the history, and honor withdrawal." },
  { href: "/consent-records", label: "Consent records", text: "Identifiers, notice snapshots, receipts, and an audit trail." },
  { href: "/consent-enforcement", label: "Consent enforcement", text: "Apply the recorded choice to mapped scripts." },
  { href: "/cookie-consent-manager", label: "Cookie consent management", text: "Discover cookies and apply category choices." },
  { href: "/cookie-banner", label: "Cookie consent banner", text: "Publish accept, reject, and purpose-level choices." },
  { href: "/privacy-preference-center", label: "Privacy preference center", text: "Let people review and withdraw a choice." },
  { href: "/consent-analytics", label: "Consent analytics", text: "Review rates without replacing the audit trail." },
  { href: "/privacy-compliance", label: "Privacy compliance", text: "Operate GDPR, CCPA/CPRA, and DPDP workflows." },
  { href: "/dpdp-compliance", label: "DPDP compliance", text: "Operational steps for India’s DPDP Act." },
  { href: "/dpdp-consent-requirements", label: "DPDP consent requirements", text: "What a valid notice and consent need to cover." },
  { href: "/gdpr", label: "GDPR consent management", text: "Records and withdrawal for consent-based processing." },
  { href: "/enterprise-consent-management", label: "Enterprise consent management", text: "Multiple sites, roles, an API, and an SDK." },
  { href: "/compare/consent-management-platforms", label: "Compare platforms", text: "A checklist for records, enforcement, and DPDP fit." },
  { href: "/e-learning", label: "DPDP Act training", text: "A 30-module course and a certificate of completion." },
];

const homeFaqs = [
  {
    question: "What is a Consent Management Platform?",
    answer:
      "A Consent Management Platform (CMP) is software that helps organizations collect, manage, store, communicate, and enforce user consent and privacy preferences across websites and apps. Consent Guru is that platform. Using it does not by itself make an organization legally compliant.",
  },
  {
    question: "What does consent management software do?",
    answer:
      "It publishes the notice you configure, records the person’s choice against specific purposes, lets them change or withdraw that choice, and applies the current choice to the cookies, tags, and systems you have connected.",
  },
  {
    question: "How does Consent Guru support DPDP consent management?",
    answer:
      "Teams can publish a purpose-bound notice, store the Data Principal’s choice with the notice version, offer withdrawal from a preference center, and intake Data Principal requests. The product helps operationalize those steps. It is not a Consent Manager registered with the Data Protection Board, and it does not guarantee DPDP compliance.",
  },
  {
    question: "Does the platform guarantee privacy compliance?",
    answer:
      "No. Consent Guru helps organizations manage and operationalize consent requirements for workflows such as DPDP, GDPR, and CCPA/CPRA. Compliance still depends on your processing, your configuration, and the law that applies.",
  },
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
    label: "Workflows for DPDP, GDPR, and other privacy laws",
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
          faqSchema(homeFaqs),
        ])}
      />
      <SkipLink />
      <HomeInteractions />
      <HomeNavbar />
      <main id="main-content" className="home-copy">
        <section className="home-section public-hero">
          <div className="public-hero-layout">
            <div>
              <h1>Build trust.<br />Collect consent.<br /><span>Stay compliant.</span></h1>
              <p className="public-hero-description">Consent Guru is a consent management platform for cookie consent, privacy preferences, and consent records across websites and apps.</p>
              <p className="public-hero-detail">Publish a cookie banner, review consent analytics, and connect a consent API, with workflows for GDPR, CCPA/CPRA, and India&apos;s DPDP Act.</p>
              <div className="public-hero-actions"><ArrowButton href="/sign-up">Create a workspace</ArrowButton><Link href="/#comparison" className="public-hero-secondary">Compare capabilities</Link></div>
              <nav aria-label="Key pages" className="public-hero-sitelinks">{sitelinkPages.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
            </div>
            <PrivacyFlowPreview />
          </div>
          <ul className="public-hero-trust">{trustItems.map((item) => <li key={item.label}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>{item.label}</li>)}</ul>
        </section>
        <section className="home-section border-b border-[#dce4e9] bg-white"><div className="public-preview-section px-5 sm:px-8"><div><h2>A clear view of your consent operations.</h2><p>Review consent records, manage preferences, and inspect the evidence behind your privacy decisions.</p><Link className="mt-6 inline-flex text-sm font-semibold text-[#087f72] hover:underline" href="/developers">Explore the SDK and API</Link><PenaltyCallout className="mt-6" /></div><HomeProductPreview /></div></section>

        <HomeTrustedFeatures />
        <HomeComparison />
        <HomeHowItWorks />
        <section className="home-section border-t border-[#E5E7EB] bg-white" aria-labelledby="platform-map-heading">
          <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 py-12 min-[400px]:px-5 sm:px-8 sm:py-16">
            <h2 id="platform-map-heading" className="max-w-2xl text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">
              Explore the consent platform
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5563]">
              Start with consent collection, then follow the record through enforcement, analytics, and the privacy law you operate under.
            </p>
            <ul className="platform-index">
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
        <section className="home-section border-t border-[#E5E7EB] bg-[#F3FAF8]" aria-labelledby="home-faq-heading">
          <div className="mx-auto w-full min-w-0 max-w-[860px] px-4 py-12 min-[400px]:px-5 sm:px-8 sm:py-16">
            <h2 id="home-faq-heading" className="text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">
              Common questions
            </h2>
            <div className="mt-6">
              <FaqAccordion items={homeFaqs} />
            </div>
          </div>
        </section>
        <HomeUseCasesCta />
      </main>

      <HomeFooter />
    </div>
  );
}
