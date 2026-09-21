import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import Script from "next/script";

import { FaqAccordion } from "@/components/public/faq-accordion";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";
import { FAQ_DISCLAIMER, FAQS } from "@/content/faqs";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "FAQs";
const description =
  "Answers to common questions about ConsentGuru: consent management, cookies, DPDP, GDPR, banners, evidence, and plans.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/faqs"),
  ...socialMetadata({
    title: `${title} — Consent Guru`,
    description,
    path: "/faqs",
  }),
};

export default async function FaqsPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <Script
        id="faqs-jsonld"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main id="main-content">
        <section className="relative overflow-hidden border-b border-[#D3E0DE] bg-[#F3FAF8]">
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full border-[40px] border-[#00C4A7]/10"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A88F]">Help</p>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight text-[#0B2C4A] sm:text-5xl">
              Frequently asked questions
            </h1>
            <p className="mt-5 max-w-2xl text-justify text-base leading-7 text-[#4B5563] sm:text-lg">
              Quick answers about ConsentGuru, consent workflows, cookies, regulations, and how the
              platform fits your organisation.
            </p>
          </div>
        </section>
        <section className="bg-white px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-[800px]">
            <FaqAccordion items={FAQS} />
            <aside className="mt-10 rounded-2xl border border-[#D3E0DE] bg-[#F3FAF8] p-6">
              <h2 className="text-lg font-bold text-[#0B2C4A]">FAQ disclaimer</h2>
              <p className="mt-3 text-justify text-sm leading-7 text-[#4B5563]">{FAQ_DISCLAIMER}</p>
              <p className="mt-4 text-sm text-[#5D6B73]">
                See also our{" "}
                <Link
                  href="/disclaimer"
                  className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2 hover:text-[#00A88F]"
                >
                  comparison disclaimer
                </Link>
                .
              </p>
            </aside>
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
