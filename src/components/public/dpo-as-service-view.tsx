import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { JsonLd } from "@/components/seo/json-ld";
import { DpoEnquiryForm } from "@/components/public/dpo-enquiry-form";
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
  regulations,
} from "@/content/dpo-as-service";
import { recaptchaSiteKey } from "@/lib/recaptcha";
import { SITE_NAME } from "@/lib/site-metadata";
import { breadcrumbSchema, graphSchema, webPageSchema } from "@/lib/structured-data";

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

export function DpoAsServiceView() {
  const schema = graphSchema([
    webPageSchema({
      path: DPO_PATH,
      name: DPO_PAGE_TITLE,
      description: DPO_PAGE_DESCRIPTION,
    }),
    breadcrumbSchema(crumbs),
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
            <ul className="mt-8 grid gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3">
              {regulations.map((item) => (
                <li key={item.name} className="home-fade-item rounded-2xl border border-[#D3E0DE] bg-white px-4 py-4">
                  <p className="font-semibold text-[#0B2C4A]">{item.name}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{item.note}</p>
                </li>
              ))}
            </ul>
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
      </main>
      <HomeFooter />
    </div>
  );
}
