import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { JsonLd } from "@/components/seo/json-ld";
import { DpoEnquiryForm } from "@/components/public/dpo-enquiry-form";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { ArrowButton } from "@/components/ui/arrow-button";
import { SkipLink } from "@/components/ui/skip-link";
import {
  DPO_KICKER,
  DPO_PAGE_DESCRIPTION,
  DPO_PAGE_TITLE,
  DPO_PATH,
  dpoFaqs,
  meaningPoints,
  platformCapabilities,
  problems,
  regulations,
  services,
  steps,
  tiers,
} from "@/content/dpo-as-service";
import { recaptchaSiteKey } from "@/lib/recaptcha";
import { SITE_NAME } from "@/lib/site-metadata";
import { breadcrumbSchema, faqSchema, graphSchema, webPageSchema } from "@/lib/structured-data";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "DPO-as-a-Service", path: DPO_PATH },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A88F]">{children}</p>;
}

function OutlineButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#00C4A7]/40 bg-white px-4 text-center text-sm font-semibold text-[#0B2C4A] transition hover:border-[#00C4A7] hover:bg-[#E6F9F5] min-[480px]:w-auto"
    >
      {children}
    </Link>
  );
}

function ServiceIcon({ index }: { index: number }) {
  const paths = [
    "M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75Z",
    "M9 12h6M12 9v6M4.5 7.5h15v12h-15z",
    "M4.5 6.75h15M4.5 12h15M4.5 17.25h9",
    "M8.25 9.75 10.5 12l5.25-5.25M6 19.5h12a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 18 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5Z",
    "M16.5 6.75v-1.5A1.5 1.5 0 0 0 15 3.75h-6A1.5 1.5 0 0 0 7.5 5.25v1.5M4.5 6.75h15v12.75h-15z",
    "M7.5 4.5h9v15h-9zM10.5 8.25h3M10.5 12h3M10.5 15.75h2.25",
    "M12 9v3.75l2.25 1.5M12 3.75a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Z",
    "M4.5 19.5 12 4.5l7.5 15H4.5ZM12 10.5v3M12 16.5h.008",
    "M12 14.25A2.25 2.25 0 1 0 12 9.75a2.25 2.25 0 0 0 0 4.5ZM6 18.75a6 6 0 0 1 12 0",
    "M5.25 18.75V12m6.75 6.75V5.25m6.75 13.5v-9",
  ];
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#00A88F]" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[index] ?? paths[0]} />
    </svg>
  );
}

export function DpoAsServiceView() {
  const schema = graphSchema([
    webPageSchema({
      path: DPO_PATH,
      name: DPO_PAGE_TITLE,
      description: DPO_PAGE_DESCRIPTION,
    }),
    breadcrumbSchema(crumbs),
    faqSchema(dpoFaqs),
  ]);

  return (
    <div className="home-page public-page min-h-screen overflow-x-clip bg-white text-[#111827]">
      <JsonLd id="jsonld-dpo-as-service" data={schema} />
      <SkipLink />
      <HomeInteractions />
      <HomeNavbar />
      <main id="main-content" className="home-copy">
        <section
          className="home-section relative overflow-x-clip"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 85% 15%, rgba(0,196,167,0.16), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(11,44,74,0.08), transparent 50%), linear-gradient(180deg, #ffffff 0%, #F3FAF8 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,196,167,0.22) 1px, transparent 0)",
              backgroundSize: "28px 28px",
              maskImage:
                "radial-gradient(ellipse 60% 50% at 80% 20%, black, transparent), radial-gradient(ellipse 40% 35% at 8% 92%, black, transparent)",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto grid w-full min-w-0 max-w-[1200px] items-center gap-10 px-4 py-12 min-[400px]:px-5 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-16">
            <div className="home-fade-item min-w-0">
              <nav aria-label="Breadcrumb">
                <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#5D6B73]">
                  {crumbs.map((crumb, index) => {
                    const last = index === crumbs.length - 1;
                    return (
                      <li key={crumb.path} className="inline-flex items-center gap-2">
                        {index > 0 ? <span aria-hidden="true">/</span> : null}
                        {last ? (
                          <span className="font-medium text-[#0B2C4A]" aria-current="page">
                            {crumb.name}
                          </span>
                        ) : (
                          <Link href={crumb.path} className="hover:text-[#0B2C4A] hover:underline">
                            {crumb.name}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>
              <SectionLabel>{DPO_KICKER}</SectionLabel>
              <h1 className="mt-3 max-w-3xl text-balance text-[clamp(1.55rem,1.05rem+2.6vw,2.6rem)] font-bold leading-[1.12] tracking-tight text-[#111827]">
                Your Privacy Program.{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg, #0B2C4A 0%, #00C4A7 70%)" }}
                >
                  Backed by Experts.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#4B5563] sm:text-base">
                Get access to experienced privacy professionals who help your organisation manage data protection,
                strengthen compliance, and stay prepared as privacy requirements evolve.
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#6B7280]">
                Get expert privacy leadership without the cost of building a full-time privacy function. Whether a DPO
                is required depends on applicable regulations and your organisation&apos;s circumstances.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 min-[480px]:flex-row min-[480px]:items-center">
                <ArrowButton href={`${DPO_PATH}?interest=business#enquiry`} className="w-full justify-center min-[480px]:w-auto">
                  Get a DPO
                </ArrowButton>
                <OutlineButton href={`${DPO_PATH}?interest=professional#enquiry`}>Join as a DPO</OutlineButton>
              </div>
            </div>

            <aside className="home-fade-item rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-[0_16px_40px_-28px_rgba(11,44,74,0.45)] sm:p-6" aria-label="What this service is">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00A88F]">What you get</p>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-sm font-semibold text-[#0B2C4A]">What</dt>
                  <dd className="mt-1 text-sm leading-6 text-[#4B5563]">DPO-as-a-Service from {SITE_NAME}.</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-[#0B2C4A]">Who</dt>
                  <dd className="mt-1 text-sm leading-6 text-[#4B5563]">
                    Businesses that need dedicated privacy expertise, and privacy professionals who want to join the network.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-[#0B2C4A]">Why</dt>
                  <dd className="mt-1 text-sm leading-6 text-[#4B5563]">
                    Expertise without building a full-time privacy function, backed by Consent Guru technology.
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section className="home-section border-t border-[#E5E7EB]/70 bg-[#F3FAF8]">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-12 min-[400px]:px-5 sm:px-8 sm:py-14">
            <SectionLabel>Regulatory environment</SectionLabel>
            <h2 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">
              Privacy expertise aligned to your regulatory environment.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#4B5563]">
              Support is scoped to the laws that apply to you. A DPO assignment does not automatically cover every
              jurisdiction.
            </p>
            <ul className="mt-8 grid gap-3 min-[400px]:grid-cols-2 lg:grid-cols-5">
              {regulations.map((item) => (
                <li key={item.name} className="home-fade-item rounded-2xl border border-[#D3E0DE] bg-white px-4 py-4">
                  <p className="font-semibold text-[#0B2C4A]">{item.name}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{item.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="home-section mx-auto w-full max-w-[1200px] px-4 py-14 min-[400px]:px-5 sm:px-8 sm:py-16">
          <SectionLabel>The problem</SectionLabel>
          <h2 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">
            Privacy compliance shouldn&apos;t be a part-time responsibility.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map((item) => (
              <article key={item.title} className="home-fade-item rounded-2xl border border-[#E5E7EB] p-5">
                <h3 className="text-base font-semibold text-[#0B2C4A]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4B5563]">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section bg-[#F3FAF8]">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 min-[400px]:px-5 sm:px-8 sm:py-16">
            <SectionLabel>The model</SectionLabel>
            <h2 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">
              Expert privacy leadership, without the full-time overhead.
            </h2>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#4B5563]">
              Instead of hiring and building an entire internal privacy function, organisations can access dedicated
              privacy expertise through Consent Guru — with technology already in the loop.
            </p>
            <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="How support is delivered">
              {["Business", "Consent Guru", "Privacy expert / DPO", "Continuous privacy management"].map(
                (label, index) => (
                  <li key={label} className="home-fade-item relative flex flex-col rounded-2xl border border-[#D3E0DE] bg-white p-4">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#00A88F]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="mt-2 text-sm font-semibold text-[#0B2C4A]">{label}</span>
                    {index < 3 ? (
                      <span className="mt-3 text-sm font-semibold text-[#00A88F]" aria-hidden="true">
                        <span className="lg:hidden">↓</span>
                        <span className="hidden lg:inline">→</span>
                      </span>
                    ) : null}
                  </li>
                ),
              )}
            </ol>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {meaningPoints.map((item) => (
                <li key={item.title} className="rounded-2xl bg-white p-5">
                  <h3 className="text-base font-semibold text-[#0B2C4A]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="home-section mx-auto w-full max-w-[1200px] px-4 py-14 min-[400px]:px-5 sm:px-8 sm:py-16">
          <SectionLabel>Services</SectionLabel>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Privacy work, scoped clearly.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {services.map((service, index) => (
              <article key={service.title} className="home-fade-item rounded-2xl border border-[#E5E7EB] p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6F9F5]">
                  <ServiceIcon index={index} />
                </span>
                <h3 className="mt-3 text-base font-semibold text-[#0B2C4A]">{service.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4B5563]">{service.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="home-section bg-[#F3FAF8]">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 min-[400px]:px-5 sm:px-8 sm:py-16">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Four steps to a working model.</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-2">
              {steps.map((step) => (
                <li key={step.n} className="home-fade-item rounded-2xl border border-[#D3E0DE] bg-white p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00A88F]">{step.n}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#0B2C4A]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="home-section mx-auto w-full max-w-[1200px] px-4 py-14 min-[400px]:px-5 sm:px-8 sm:py-16">
          <SectionLabel>Service levels</SectionLabel>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Choose a starting point. Then talk to us.</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#4B5563]">
            Names below are placeholders. We quote after we understand your organisation. There is no published list
            price on this page.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {tiers.map((tier) => (
              <article
                key={tier.id}
                className={`flex flex-col rounded-2xl border bg-white p-6 ${
                  "featured" in tier && tier.featured
                    ? "border-[#00C4A7] shadow-[0_16px_40px_-24px_rgba(0,196,167,0.65)]"
                    : "border-[#E5E7EB]"
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#00A88F]">{tier.badge}</p>
                <h3 className="mt-2 text-lg font-semibold text-[#111827]">{tier.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4B5563]">{tier.detail}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-[#4B5563]">
                  {tier.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="text-[#00C4A7]" aria-hidden="true">
                        ✓
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`${DPO_PATH}?interest=business&tier=${tier.id}#enquiry`}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#0B2C4A] px-4 text-sm font-semibold text-white transition hover:bg-[#00C4A7]"
                >
                  Talk to us
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section bg-[#0B2C4A] text-white">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 min-[400px]:px-5 sm:px-8 sm:py-16">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#99F6E4]">Consent Guru advantage</p>
            <h2 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
              Human expertise plus privacy technology.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/75">
              Your DPO shouldn&apos;t have to work with spreadsheets and disconnected tools. Consent Guru brings
              privacy expertise and privacy technology together.
            </p>
            <div className="mt-8 flex max-w-md flex-col items-center gap-2 text-center" aria-hidden="true">
              <div className="w-full rounded-2xl bg-white/5 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#99F6E4]">Privacy expert</p>
              </div>
              <p className="text-lg font-semibold text-[#99F6E4]">+</p>
              <div className="w-full rounded-2xl bg-white/5 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#99F6E4]">Consent Guru</p>
              </div>
              <p className="text-lg font-semibold text-[#99F6E4]">↓</p>
              <div className="w-full rounded-2xl border border-[#00C4A7]/40 bg-[#00C4A7]/10 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em]">Privacy operating layer</p>
              </div>
            </div>
            <p className="sr-only">
              Privacy expert plus Consent Guru form a privacy operating layer for consent, rights, assessments, and
              evidence.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {platformCapabilities.map((item) => (
                <li key={item.title}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-white/90">
                      {item.title}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="home-section mx-auto w-full max-w-[1200px] px-4 py-14 min-[400px]:px-5 sm:px-8 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#D3E0DE] bg-[#F3FAF8] p-6 sm:p-8">
              <SectionLabel>For businesses</SectionLabel>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B2C4A]">Need a DPO or privacy expert?</h2>
              <p className="mt-4 text-[15px] leading-7 text-[#4B5563]">
                Tell us about your organisation and privacy requirements. Our team will help determine the right level
                of support for you.
              </p>
              <div className="mt-6">
                <ArrowButton href={`${DPO_PATH}?interest=business#enquiry`}>Get a DPO</ArrowButton>
              </div>
            </article>
            <article className="rounded-2xl border border-[#E5E7EB] p-6 sm:p-8">
              <SectionLabel>For professionals</SectionLabel>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B2C4A]">Are you a privacy professional?</h2>
              <p className="mt-4 text-[15px] leading-7 text-[#4B5563]">
                Join the Consent Guru DPO network and connect your expertise with organisations looking for trusted
                privacy professionals. This is an application, not a marketplace.
              </p>
              <div className="mt-6">
                <OutlineButton href={`${DPO_PATH}?interest=professional#enquiry`}>Join as a DPO</OutlineButton>
              </div>
            </article>
          </div>
        </section>

        <section id="enquiry" className="home-section border-t border-[#E5E7EB] bg-white">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 min-[400px]:px-5 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:py-16">
            <div>
              <SectionLabel>Talk to us</SectionLabel>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">
                Start with an enquiry.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[#4B5563]">
                Businesses and privacy professionals can use the same form. We will reply by email. There is no
                checkout, matching engine, or DPO marketplace on this page.
              </p>
            </div>
            <Suspense fallback={<div className="h-96 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFF]" aria-hidden="true" />}>
              <DpoEnquiryForm siteKey={recaptchaSiteKey()} />
            </Suspense>
          </div>
        </section>

        <section className="home-section bg-[#F3FAF8]">
          <div className="mx-auto max-w-[860px] px-4 py-14 min-[400px]:px-5 sm:px-8 sm:py-16">
            <h2 className="text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Questions</h2>
            <div className="mt-6">
              <FaqAccordion items={dpoFaqs} />
            </div>
          </div>
        </section>

        <section className="home-section mx-auto w-full max-w-[1200px] px-4 py-14 min-[400px]:px-5 sm:px-8 sm:py-16">
          <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">
            Build a privacy program that keeps moving.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#4B5563]">
            Combine expert privacy guidance with the technology to manage, monitor, and evidence your privacy program.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 min-[480px]:flex-row">
            <ArrowButton href={`${DPO_PATH}?interest=business#enquiry`}>Get a DPO</ArrowButton>
            <OutlineButton href={`${DPO_PATH}?interest=professional#enquiry`}>Join as a DPO</OutlineButton>
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-6 text-[#6B7280]">
            This page describes a professional services offering alongside Consent Guru software. It is not legal advice.
            Using Consent Guru or engaging a privacy professional does not by itself make an organisation compliant with
            GDPR, CCPA, CPRA, the DPDP Act, or any other law.
          </p>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
