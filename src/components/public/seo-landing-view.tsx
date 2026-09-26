import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { ArrowButton } from "@/components/ui/arrow-button";
import { SkipLink } from "@/components/ui/skip-link";
import type { SeoLanding } from "@/content/seo-landings";
import { buildPageMetadata, SITE_NAME } from "@/lib/site-metadata";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  softwareApplicationSchema,
  webPageSchema,
} from "@/lib/structured-data";

export function landingMetadata(page: SeoLanding): Metadata {
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
  });
}

export function SeoLandingView({ page }: { page: SeoLanding }) {
  const crumbs = [{ name: "Home", path: "/" }, ...page.breadcrumb];
  const schema = graphSchema([
    webPageSchema({
      path: page.path,
      name: `${page.title} — ${SITE_NAME}`,
      description: page.description,
    }),
    breadcrumbSchema(crumbs),
    faqSchema(page.faqs),
    ...(page.software ? [softwareApplicationSchema()] : []),
  ]);

  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <JsonLd id={`jsonld-${page.path.replaceAll("/", "")}`} data={schema} />
      <SkipLink />
      <HomeNavbar />
      <main id="main-content">
        <section className="border-b border-[#D3E0DE] bg-[#F3FAF8]">
          <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-12">
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
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#00A88F]">{page.kicker}</p>
            <h1 className="mt-3 max-w-3xl text-balance text-[clamp(1.85rem,1.1rem+2.4vw,3.15rem)] font-bold leading-[1.12] tracking-tight text-[#0B2C4A]">
              {page.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#4B5563] sm:text-base">{page.lede}</p>
            <div className="mt-7 flex flex-col gap-2.5 min-[480px]:flex-row">
              <ArrowButton href="/sign-up">Create a workspace</ArrowButton>
              <Link
                href="/pricing"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#00C4A7]/40 bg-white px-4 text-sm font-semibold text-[#0B2C4A] transition hover:border-[#00C4A7] hover:bg-[#E6F9F5]"
              >
                View consent platform pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16">
          <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">{page.problemTitle}</h2>
          <div className="mt-4 max-w-3xl space-y-4 text-[15px] leading-7 text-[#4B5563]">
            {page.problem.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section id={page.path === "/resources" ? "guides" : undefined} className="bg-[#F3FAF8]">
          <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16">
            <h2 className="text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">{page.howTitle}</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-2">
              {page.steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-[#D3E0DE] bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00A88F]">Step {index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#0B2C4A]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Key capabilities</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {page.features.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-[#E5E7EB] p-5">
                <h3 className="text-lg font-semibold text-[#0B2C4A]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4B5563]">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#0B2C4A] text-white">
          <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">What teams use it for</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {page.benefits.map((benefit) => (
                <li key={benefit} className="rounded-xl bg-white/5 px-4 py-3 text-sm leading-6 text-white/80">
                  {benefit}
                </li>
              ))}
            </ul>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {page.useCases.map((item) => (
                <article key={item.title}>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/70">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Privacy considerations</h2>
          <div className="mt-4 max-w-3xl space-y-4 text-[15px] leading-7 text-[#4B5563]">
            {page.considerations.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {page.technical ? (
            <div className="mt-10">
              <h2 className="text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Technical capabilities</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {page.technical.map((item) => (
                  <article key={item.title} className="rounded-2xl bg-[#F3FAF8] p-5">
                    <h3 className="text-lg font-semibold text-[#0B2C4A]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#4B5563]">{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="bg-[#F3FAF8]">
          <div className="mx-auto max-w-[860px] px-5 py-14 sm:px-8 sm:py-16">
            <h2 className="text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Questions</h2>
            <div className="mt-6">
              <FaqAccordion items={page.faqs} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-[#0B2C4A] sm:text-3xl">Related pages</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {page.related.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block h-full rounded-2xl border border-[#E5E7EB] p-5 transition hover:border-[#00C4A7]"
                >
                  <span className="text-base font-semibold text-[#0B2C4A]">{link.label}</span>
                  <span className="mt-2 block text-sm leading-6 text-[#4B5563]">{link.text}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-3xl text-sm leading-6 text-[#6B7280]">
            This page describes how Consent Guru supports privacy operations. It is not legal advice, and using the
            product does not by itself make an organization compliant with GDPR, CCPA, CPRA, the DPDP Act, or any other law.
          </p>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
