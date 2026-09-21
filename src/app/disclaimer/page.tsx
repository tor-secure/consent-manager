import type { Metadata } from "next";

import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "Disclaimer";
const description =
  "ConsentGuru comparison disclaimer: informational purposes only. This content is not legal, regulatory, compliance, or professional advice.";

export const DISCLAIMER_TEXT =
  "This comparison is provided for general informational purposes only and does not constitute legal, regulatory, compliance, or professional advice, or any endorsement or certification by ConsentGuru. Information is based on publicly available or provider-supplied sources and may change without notice. ConsentGuru makes no representation or warranty as to the accuracy, completeness, or currentness of the information and shall not be liable for any loss, claim, or damage arising from reliance on this comparison. Users should independently verify the information and obtain appropriate professional advice before making any decision.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/disclaimer"),
  ...socialMetadata({
    title: `${title} — Consent Guru`,
    description,
    path: "/disclaimer",
  }),
};

export default function DisclaimerPage() {
  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <main id="main-content">
        <section className="relative overflow-hidden border-b border-[#D3E0DE] bg-[#F3FAF8]">
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full border-[40px] border-[#00C4A7]/10"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A88F]">Legal</p>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight text-[#0B2C4A] sm:text-5xl">
              Disclaimer
            </h1>
          </div>
        </section>
        <section className="bg-white px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-[800px]">
            <p className="text-justify text-[15px] leading-7 text-[#4B5563] sm:text-base sm:leading-8">
              {DISCLAIMER_TEXT}
            </p>
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
