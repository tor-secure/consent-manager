import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import Script from "next/script";
import type { ReactNode } from "react";

import { FaqAccordion } from "@/components/public/faq-accordion";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { ArrowButton } from "@/components/ui/arrow-button";
import { SkipLink } from "@/components/ui/skip-link";
import {
  CMP_CAPABILITIES,
  CONSENT_LIFECYCLE,
  DPDP_CONCEPTS,
  DPDP_CONSENT_POINTS,
  DPDP_DISCLAIMER,
  DPDP_DUTIES,
  DPDP_FACTS,
  DPDP_FAQS,
  DPDP_NOTICE_POINTS,
  DPDP_PAGE_DESCRIPTION,
  DPDP_PAGE_PATH,
  DPDP_PAGE_TITLE,
  DPDP_RIGHTS,
  DPDP_SECTIONS,
} from "@/content/dpdp-act";
import { INDEXABLE_ROBOTS, SITE_NAME, SITE_URL, pageAlternates, socialMetadata } from "@/lib/site-metadata";

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

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A88F]">{children}</p>;
}

function GuideSection({
  id,
  kicker,
  title,
  intro,
  children,
  tone = "white",
}: {
  id: string;
  kicker: string;
  title: string;
  intro?: string;
  children: ReactNode;
  tone?: "white" | "mint";
}) {
  return (
    <section id={id} className={`scroll-mt-24 ${tone === "mint" ? "bg-[#F3FAF8]" : "bg-white"}`}>
      <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
        <SectionLabel>{kicker}</SectionLabel>
        <h2 className="mt-3 max-w-3xl text-balance text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-4xl">
          {title}
        </h2>
        {intro ? (
          <p className="mt-4 max-w-3xl text-justify text-[15px] leading-7 text-[#4B5563] sm:text-base">{intro}</p>
        ) : null}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export default async function DpdpActPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const pageUrl = `${SITE_URL}${DPDP_PAGE_PATH}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${DPDP_PAGE_TITLE} — Consent Management & Privacy Compliance`,
        description: DPDP_PAGE_DESCRIPTION,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
        inLanguage: "en-IN",
        about: {
          "@type": "Legislation",
          name: "Digital Personal Data Protection Act, 2023",
          legislationJurisdiction: "IN",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "DPDP Act", item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: DPDP_FAQS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <Script
        id="dpdp-act-jsonld"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content">
        <section className="relative overflow-x-clip border-b border-[#D3E0DE] bg-[#F3FAF8]">
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full border-[40px] border-[#00C4A7]/10"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-[#5D6B73]">
              <Link href="/" className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2 hover:text-[#00A88F]">
                Home
              </Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">DPDP Act</span>
            </nav>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#00A88F]">India · Digital personal data</p>
            <h1 className="mt-4 max-w-4xl text-balance text-[clamp(1.85rem,1.1rem+3vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-[#0B2C4A]">
              Digital Personal Data Protection Act
            </h1>
            <p className="mt-5 max-w-3xl text-justify text-base leading-7 text-[#4B5563] sm:text-lg sm:leading-8">
              The DPDP Act, 2023 is India&apos;s law for digital personal data. It tells organisations when they may process that data, what a valid consent looks like, and which rights people can exercise. This guide maps those ideas onto consent operations. It is not a legal opinion, and publishing a banner with ConsentGuru does not by itself make an organisation compliant.
            </p>
            <p className="mt-4 max-w-3xl text-justify text-[15px] leading-7 text-[#4B5563] sm:text-base">
              Organisations need a working way to explain purposes, collect a real choice, keep the record, and let people change their mind. That operational layer is what a consent management platform is for. The legal duty stays with the Data Fiduciary.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ArrowButton href="/sign-up" size="lg" className="w-full sm:w-auto">
                Start a workspace
              </ArrowButton>
              <Link
                href="/e-learning"
                className="inline-flex h-12 items-center justify-center rounded-lg px-4 text-sm font-semibold text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-4 hover:text-[#00A88F] sm:h-auto sm:justify-start"
              >
                Open the DPDP learning modules
              </Link>
            </div>
          </div>
        </section>

        <section id="overview" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-14">
            <SectionLabel>Quick overview</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Four facts before the detail</h2>
            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              {DPDP_FACTS.map((fact) => (
                <div key={fact.term} className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB] p-6">
                  <dt className="text-base font-bold text-[#0B2C4A]">{fact.term}</dt>
                  <dd className="mt-2 text-justify text-sm leading-6 text-[#4B5563]">{fact.detail}</dd>
                </div>
              ))}
            </dl>
            <nav aria-label="On this page" className="mt-8 rounded-2xl border border-[#D3E0DE] bg-white p-5 sm:p-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#00A88F]">On this page</h2>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {DPDP_SECTIONS.filter((section) => section.id !== "overview").map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-sm font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/40 underline-offset-2 hover:text-[#00A88F]"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </section>

        <GuideSection
          id="what-is-the-dpdp-act"
          kicker="Introduction"
          title="What is the DPDP Act?"
          tone="mint"
          intro="The Digital Personal Data Protection Act, 2023 regulates the processing of digital personal data. It is meant to recognise both a person's right to protect their personal data and an organisation's need to process personal data for lawful purposes."
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <article className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-white p-6">
              <h3 className="text-lg font-bold text-[#0B2C4A]">Purpose of the legislation</h3>
              <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">
                The Act sets a national framework for consent, notice, purpose limitation, security, breach intimation, and the rights people can exercise against a Data Fiduciary. The Data Protection Board hears breaches of the Act and can impose penalties after inquiry.
              </p>
            </article>
            <article className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-white p-6">
              <h3 className="text-lg font-bold text-[#0B2C4A]">Who it applies to</h3>
              <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">
                Processing of digital personal data inside India is in scope. Processing outside India can also be in scope when it is connected with offering goods or services to people in India. Exemptions exist. They are specific, and they should be read from the Act rather than assumed.
              </p>
            </article>
            <article className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-white p-6">
              <h3 className="text-lg font-bold text-[#0B2C4A]">Why responsible processing matters</h3>
              <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">
                People hand over identifiers, account details, and behaviour on the understanding that the organisation will use them for a stated reason. A consent banner that nobody can withdraw, or a notice that does not name the purpose, breaks that understanding and the legal test that goes with it.
              </p>
            </article>
          </div>
          <p className="mt-6 max-w-3xl text-justify text-sm leading-6 text-[#5D6B73]">
            Rules notified under the Act prescribe forms, timelines, and safeguards. Some obligations take effect on dates the Central Government notifies. Check the official text and the latest notification before you treat a paragraph on this page as the rule that binds you today.
          </p>
        </GuideSection>

        <GuideSection
          id="key-concepts"
          kicker="Definitions"
          title="Key concepts"
          intro="These are the terms the rest of the Act uses. The short descriptions below follow the statute. They are not a substitute for the definitions section."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DPDP_CONCEPTS.map((concept) => (
              <article key={concept.title} className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB] p-6">
                <h3 className="text-lg font-bold text-[#0B2C4A]">{concept.title}</h3>
                <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">{concept.body}</p>
              </article>
            ))}
          </div>
        </GuideSection>

        <GuideSection
          id="consent"
          kicker="Section 6"
          title="Consent under the DPDP Act"
          tone="mint"
          intro="When an organisation relies on consent, every part of the test matters. A banner that is easy to accept and hard to refuse, or that bundles unrelated purposes into one switch, is a product problem and a legal one."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {DPDP_CONSENT_POINTS.map((point) => (
              <article key={point.title} className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-white p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00A88F]">{point.label}</p>
                <h3 className="mt-2 text-lg font-bold text-[#0B2C4A]">{point.title}</h3>
                <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">{point.body}</p>
              </article>
            ))}
          </div>
        </GuideSection>

        <GuideSection
          id="consent-management"
          kicker="Operations"
          title="Consent management"
          intro="The Act describes what valid consent is. A consent programme is how an organisation asks, stores, and honours that consent across websites, apps, and vendors. The two layers should not be blurred."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB] p-6 sm:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00A88F]">Required by the DPDP framework</p>
              <h3 className="mt-2 text-xl font-bold text-[#0B2C4A]">What the law is aiming at</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#4B5563]">
                <li>Consent, where it is the ground you rely on, meets the statutory test and is tied to a specified purpose.</li>
                <li>The person can withdraw consent as easily as they gave it.</li>
                <li>Processing based on that consent stops after withdrawal, unless another ground applies.</li>
                <li>The organisation can show what was requested and what was agreed.</li>
              </ul>
            </article>
            <article className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB] p-6 sm:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00A88F]">What a CMP can help implement</p>
              <h3 className="mt-2 text-xl font-bold text-[#0B2C4A]">What software can carry</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#4B5563]">
                <li>Present the notice and collect a choice on the page where tracking would otherwise start.</li>
                <li>Split purposes so analytics, advertising, and essential operations are not one switch.</li>
                <li>Store the decision, the policy version, and later changes, including withdrawal.</li>
                <li>Tell tags, apps, and downstream systems which purposes are allowed.</li>
              </ul>
            </article>
          </div>
          <p className="mt-6 max-w-3xl text-justify text-sm leading-6 text-[#5D6B73]">
            A platform cannot decide that your purpose is lawful, that your vendor contract is valid, or that your security safeguards are reasonable. Those remain the Data Fiduciary&apos;s duties.
          </p>
        </GuideSection>

        <GuideSection
          id="notice"
          kicker="Transparency"
          title="Notice and transparency"
          tone="mint"
          intro="Consent is only informed if the notice is understandable at the moment of choice. A privacy policy buried in the footer does not replace the itemised notice the Act expects alongside a consent request."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {DPDP_NOTICE_POINTS.map((point) => (
              <article key={point.title} className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-white p-6">
                <h3 className="text-lg font-bold text-[#0B2C4A]">{point.title}</h3>
                <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">{point.body}</p>
              </article>
            ))}
          </div>
        </GuideSection>

        <GuideSection
          id="rights"
          kicker="Data Principal"
          title="Data Principal rights"
          intro="The rights below are the ones the Act provides. Each has conditions, and several depend on the manner and timelines prescribed in the Rules. This summary does not add rights from other privacy laws."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {DPDP_RIGHTS.map((right) => (
              <article key={right.title} className="min-w-0 border-t border-[#D3E0DE] pt-5">
                <h3 className="font-bold text-[#0B2C4A]">{right.title}</h3>
                <p className="mt-2 text-justify text-sm leading-6 text-[#5D6B73]">{right.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-justify text-sm leading-6 text-[#5D6B73]">
            People exercise these rights with the Data Fiduciary, and grievances can go onward to the Board. ConsentGuru&apos;s public Privacy Centre accepts access, correction, erasure, nomination, and grievance requests for ConsentGuru&apos;s own processing. A customer organisation runs its own rights queue inside the workspace for the sites it controls.
          </p>
        </GuideSection>

        <GuideSection
          id="duties"
          kicker="Data Fiduciary"
          title="Data Fiduciary responsibilities"
          tone="mint"
          intro="Consent is one duty among several. A complete banner does not answer security, retention, processor contracts, or breach intimation."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {DPDP_DUTIES.map((duty) => (
              <article key={duty.title} className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-white p-6">
                <h3 className="text-lg font-bold text-[#0B2C4A]">{duty.title}</h3>
                <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">{duty.body}</p>
              </article>
            ))}
          </div>
          <aside className="mt-6 rounded-2xl border border-[#D3E0DE] bg-white p-6">
            <h3 className="text-lg font-bold text-[#0B2C4A]">Penalties are decided by the Board</h3>
            <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">
              The Schedule to the Act sets monetary penalties. The highest amount stated for specified failures, including failure to observe reasonable security safeguards and failure to observe the obligations in relation to children, is up to two hundred and fifty crore rupees. Other breaches have lower ceilings. A penalty follows an inquiry. It is not an automatic fine for a missing cookie category. Reading the Schedule with counsel matters more than quoting the ceiling on a marketing page.
            </p>
          </aside>
        </GuideSection>

        <GuideSection
          id="children"
          kicker="Section 9"
          title="Children's data"
          intro="A child is a person under eighteen. Before processing a child's personal data, the Data Fiduciary must obtain verifiable consent of the parent or lawful guardian. The same verifiable-consent rule applies before processing personal data of a person with a disability who has a lawful guardian."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB] p-6">
              <h3 className="font-bold text-[#0B2C4A]">Verifiable guardian consent</h3>
              <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">
                The manner of verification is prescribed. Do not invent a method and treat it as sufficient. A self-declared age is a weak signal. Where the Rules require a particular check, follow that check.
              </p>
            </article>
            <article className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB] p-6">
              <h3 className="font-bold text-[#0B2C4A]">Restricted processing</h3>
              <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">
                A fiduciary must not undertake processing that is likely to cause any detrimental effect on the well-being of a child, and must not undertake tracking, behavioural monitoring, or targeted advertising directed at children. Exemptions, where they exist, are prescribed. They are not a default.
              </p>
            </article>
            <article className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB] p-6">
              <h3 className="font-bold text-[#0B2C4A]">What ConsentGuru implements</h3>
              <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">
                Child-directed websites can require age assurance and a guardian-consent workflow so optional purposes stay off until a parent or guardian is verified. That is a product control. It does not certify that a given verification method meets the Rules.
              </p>
            </article>
          </div>
        </GuideSection>

        <GuideSection
          id="consent-manager"
          kicker="Statutory role"
          title="Consent Manager"
          tone="mint"
          intro="The Act uses “Consent Manager” for a registered person, accountable to the Data Principal, through whom the principal may give, manage, review, and withdraw consent. Interoperability is part of that role: the principal should not have to negotiate a different locked door at every company."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Consent requests", "The principal can issue a consent for a specified purpose through the Consent Manager, instead of only through each fiduciary's own form."],
              ["Consent records", "The platform has to let the principal see and manage the consents they have given. A record that only the company can see misses the point of the role."],
              ["Withdrawal", "Review and withdrawal sit in the same platform as the original consent, so withdrawal is not a slower path than acceptance."],
              ["Interoperability", "The Act calls for an interoperable platform. How systems exchange consent is a standards and registration question, not a claim a single vendor can settle alone."],
            ].map(([title, body]) => (
              <article key={title} className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-white p-6">
                <h3 className="text-lg font-bold text-[#0B2C4A]">{title}</h3>
                <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">{body}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-justify text-sm leading-6 text-[#4B5563]">
            ConsentGuru is a consent management platform a Data Fiduciary can deploy on its own properties: banners, a preference center, records, and signals to integrated systems. Using it does not register anyone with the Data Protection Board, and it does not make ConsentGuru or its customer a Consent Manager under the Act. If your model depends on that registration, confirm the current Rules and the Board&apos;s registration process separately.
          </p>
        </GuideSection>

        <GuideSection
          id="cmp"
          kicker="Product"
          title="How ConsentGuru helps with DPDP workflows"
          intro="These are capabilities already in the product. They help an organisation operate notices, choices, evidence, and enforcement. They do not complete the Act's duties on their own, and they are not a representation that a particular configuration is lawful."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CMP_CAPABILITIES.map((item) => (
              <article key={item.title} className="min-w-0 rounded-2xl border border-[#D3E0DE] bg-[#F8FCFB] p-6">
                <h3 className="text-base font-bold text-[#0B2C4A]">{item.title}</h3>
                <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">{item.body}</p>
              </article>
            ))}
          </div>
        </GuideSection>

        <section id="lifecycle" className="scroll-mt-24 bg-[#0B2C4A] text-white">
          <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
            <SectionLabel>Consent lifecycle</SectionLabel>
            <h2 className="mt-3 max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              From notice to an updated choice
            </h2>
            <p className="mt-4 max-w-3xl text-justify text-sm leading-7 text-white/75 sm:text-base">
              This is the path ConsentGuru runs when a visitor meets a banner. It shows a consent workflow. It is not a complete map of every DPDP duty.
            </p>
            <ol className="mt-10 max-w-3xl">
              {CONSENT_LIFECYCLE.map((step, index) => (
                <li key={step.title} className="relative flex min-w-0 gap-4 pb-8 last:pb-0">
                  {index < CONSENT_LIFECYCLE.length - 1 ? (
                    <span
                      className="absolute bottom-0 left-5 top-10 w-px bg-[#00C4A7]/40"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#00C4A7]/50 bg-[#0B2C4A] text-sm font-bold text-[#7DE4D4]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 pt-1">
                    <h3 className="text-base font-bold sm:text-lg">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/75">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-[800px] px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-4xl">Questions about the DPDP Act</h2>
            <p className="mt-4 text-justify text-[15px] leading-7 text-[#4B5563] sm:text-base">
              Short answers for privacy, product, and engineering teams. They follow the topics above and stay general on purpose.
            </p>
            <div className="mt-8">
              <FaqAccordion items={DPDP_FAQS} />
            </div>
            <aside className="mt-10 rounded-2xl border border-[#D3E0DE] bg-[#F3FAF8] p-6">
              <h2 className="text-lg font-bold text-[#0B2C4A]">Legal notice</h2>
              <p className="mt-3 text-justify text-sm leading-7 text-[#4B5563]">{DPDP_DISCLAIMER}</p>
              <p className="mt-4 text-sm text-[#5D6B73]">
                Related reading:{" "}
                <Link href="/e-learning" className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2 hover:text-[#00A88F]">
                  DPDP e-learning
                </Link>
                ,{" "}
                <Link href="/faqs" className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2 hover:text-[#00A88F]">
                  product FAQs
                </Link>
                , and the{" "}
                <Link href="/disclaimer" className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2 hover:text-[#00A88F]">
                  disclaimer
                </Link>
                .
              </p>
            </aside>
          </div>
        </section>

        <section className="bg-[#E6F9F5] px-5 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-[800px] text-center">
            <SectionLabel>Next step</SectionLabel>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-[#0B2C4A] sm:text-4xl">
              Put the notice, the choice, and the record in one place
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-justify text-sm leading-7 text-[#4B5563] sm:text-center sm:text-base">
              Create a workspace, add a site, and publish a policy when your purposes and notice text are ready. The workspace is the product. Compliance is still your programme.
            </p>
            <div className="mt-8 flex justify-center">
              <ArrowButton href="/sign-up" size="lg">
                Create a workspace
              </ArrowButton>
            </div>
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
