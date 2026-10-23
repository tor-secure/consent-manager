import Link from "next/link";
import type { ReactNode } from "react";
import { DpdpGuide } from "./dpdp-guide";

import { FaqAccordion } from "./faq-accordion";
import { CMP_CAPABILITIES, CONSENT_LIFECYCLE, DPDP_CONCEPTS, DPDP_CONSENT_POINTS, DPDP_DISCLAIMER, DPDP_DUTIES, DPDP_FACTS, DPDP_FAQS, DPDP_NOTICE_POINTS, DPDP_RIGHTS, DPDP_SECTIONS } from "@/content/dpdp-act";

function LegalTopics({ items }: { items: readonly { title: string; body: string; label?: string }[]; label: string; sequential?: boolean }) { return <dl className="act-legal-topics">{items.map(item => <div key={item.title}><dt>{item.title}</dt><dd>{item.label && <span>{item.label}. </span>}{item.body}</dd></div>)}</dl>; }

function GuideSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  intro?: string;
  children: ReactNode;
  tone?: "white" | "mint";
}) {
  return (
    <section data-chapter={id} className="dpdp-guide-chapter">
      <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
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

export function DpdpGuideContent() { return (<DpdpGuide chapters={[
{ id: "overview", label: DPDP_SECTIONS.find(section => section.id === "overview")!.label, content: (<section className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-14">
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Four facts before the detail</h2>
            <LegalTopics label="The essentials" items={DPDP_FACTS.map(fact => ({ title: fact.term, body: fact.detail }))} />
          </div>
        </section>) },
{ id: "what-is-the-dpdp-act", label: DPDP_SECTIONS.find(section => section.id === "what-is-the-dpdp-act")!.label, content: (<GuideSection
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
        </GuideSection>) },
{ id: "key-concepts", label: DPDP_SECTIONS.find(section => section.id === "key-concepts")!.label, content: (<GuideSection
          id="key-concepts"
          kicker="Definitions"
          title="Key concepts"
          intro="These are the terms the rest of the Act uses. The short descriptions below follow the statute. They are not a substitute for the definitions section."
        >
          <LegalTopics label="Key concepts" items={DPDP_CONCEPTS} />
        </GuideSection>) },
{ id: "consent", label: DPDP_SECTIONS.find(section => section.id === "consent")!.label, content: (<GuideSection
          id="consent"
          kicker="Section 6"
          title="Consent under the DPDP Act"
          tone="mint"
          intro="When an organisation relies on consent, every part of the test matters. A banner that is easy to accept and hard to refuse, or that bundles unrelated purposes into one switch, is a product problem and a legal one."
        >
          <LegalTopics label="Valid consent" items={DPDP_CONSENT_POINTS} />
        </GuideSection>) },
{ id: "consent-management", label: DPDP_SECTIONS.find(section => section.id === "consent-management")!.label, content: (<GuideSection
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
        </GuideSection>) },
{ id: "notice", label: DPDP_SECTIONS.find(section => section.id === "notice")!.label, content: (<GuideSection
          id="notice"
          kicker="Transparency"
          title="Notice and transparency"
          tone="mint"
          intro="Consent is only informed if the notice is understandable at the moment of choice. A privacy policy buried in the footer does not replace the itemised notice the Act expects alongside a consent request."
        >
          <LegalTopics label="A clear notice" items={DPDP_NOTICE_POINTS} />
        </GuideSection>) },
{ id: "rights", label: DPDP_SECTIONS.find(section => section.id === "rights")!.label, content: (<GuideSection
          id="rights"
          kicker="Data Principal"
          title="Data Principal rights"
          intro="The rights below are the ones the Act provides. Each has conditions, and several depend on the manner and timelines prescribed in the Rules. This summary does not add rights from other privacy laws."
        >
          <LegalTopics label="Your rights" items={DPDP_RIGHTS} />
          <p className="mt-8 max-w-3xl text-justify text-sm leading-6 text-[#5D6B73]">
            People exercise these rights with the Data Fiduciary, and grievances can go onward to the Board. ConsentGuru&apos;s public Privacy Centre accepts access, correction, erasure, nomination, and grievance requests for ConsentGuru&apos;s own processing. A customer organisation runs its own rights queue inside the workspace for the sites it controls.
          </p>
        </GuideSection>) },
{ id: "duties", label: DPDP_SECTIONS.find(section => section.id === "duties")!.label, content: (<GuideSection
          id="duties"
          kicker="Data Fiduciary"
          title="Data Fiduciary responsibilities"
          tone="mint"
          intro="Consent is one duty among several. A complete banner does not answer security, retention, processor contracts, or breach intimation."
        >
          <LegalTopics label="Responsibilities" items={DPDP_DUTIES} />
          <aside className="mt-6 rounded-2xl border border-[#D3E0DE] bg-white p-6">
            <h3 className="text-lg font-bold text-[#0B2C4A]">Penalties are decided by the Board</h3>
            <p className="mt-3 text-justify text-sm leading-6 text-[#4B5563]">
              The Schedule to the Act sets monetary penalties. The highest amount stated for specified failures, including failure to observe reasonable security safeguards and failure to observe the obligations in relation to children, is up to two hundred and fifty crore rupees. Other breaches have lower ceilings. A penalty follows an inquiry. It is not an automatic fine for a missing cookie category. Reading the Schedule with counsel matters more than quoting the ceiling on a marketing page.
            </p>
          </aside>
        </GuideSection>) },
{ id: "children", label: DPDP_SECTIONS.find(section => section.id === "children")!.label, content: (<GuideSection
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
        </GuideSection>) },
{ id: "consent-manager", label: DPDP_SECTIONS.find(section => section.id === "consent-manager")!.label, content: (<GuideSection
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
        </GuideSection>) },
{ id: "cmp", label: DPDP_SECTIONS.find(section => section.id === "cmp")!.label, content: (<GuideSection
          id="cmp"
          kicker="Product"
          title="How ConsentGuru helps with DPDP workflows"
          intro="These are capabilities already in the product. They help an organisation operate notices, choices, evidence, and enforcement. They do not complete the Act's duties on their own, and they are not a representation that a particular configuration is lawful."
        >
          <LegalTopics label="Product capabilities" items={CMP_CAPABILITIES} />
        </GuideSection>) },
{ id: "lifecycle", label: DPDP_SECTIONS.find(section => section.id === "lifecycle")!.label, content: (<section className="scroll-mt-24 bg-[#0B2C4A] text-white">
          <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
            <h2 className="mt-3 max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              From notice to an updated choice
            </h2>
            <p className="mt-4 max-w-3xl text-justify text-sm leading-7 text-white/75 sm:text-base">
              This is the path ConsentGuru runs when a visitor meets a banner. It shows a consent workflow. It is not a complete map of every DPDP duty.
            </p>
            <LegalTopics label="Consent lifecycle" items={CONSENT_LIFECYCLE} sequential />
          </div>
        </section>) },
{ id: "faq", label: DPDP_SECTIONS.find(section => section.id === "faq")!.label, content: (<section className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-[800px] px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
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
        </section>) }
]} />); }
