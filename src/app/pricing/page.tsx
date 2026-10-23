import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { PricingExplorer } from "@/components/public/pricing-explorer";
import { PricingEnquiryForm } from "@/components/public/pricing-enquiry-form";
import { recaptchaSiteKey } from "@/lib/recaptcha";
import { SkipLink } from "@/components/ui/skip-link";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "Pricing";
const description =
  "Compare Consent Guru Silver, Gold, and Platinum plans for consent banners, records, and enforcement. Request a quote — list prices are not published online.";

const tiers = [
  {
    id: "silver",
    name: "Silver",
    badge: "Essential Compliance",
    detail: "Perfect for startups and small businesses getting started with privacy.",
    points: [
      "10 core features (1–10)",
      "Consent banner and preference center",
      "Cookie / SDK / tracker scanner",
      "AI regulation and geo-legal engine",
      "Up to 5 domains",
      "Up to 100K pageviews / month",
      "Standard support",
    ],
  },
  {
    id: "gold",
    name: "Gold",
    badge: "Most popular · Advanced Privacy",
    detail: "Ideal for growing businesses that need more control and intelligence.",
    featured: true,
    points: [
      "20 features (1–20)",
      "All 10 Silver features",
      "Consent quality score and autopilot",
      "Digital twin and ROI engine",
      "Up to 25 domains",
      "Up to 1M pageviews / month",
      "Priority email and chat support",
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    badge: "Complete Privacy Platform",
    detail: "For enterprises that want the full power of AI-driven consent management.",
    points: [
      "All 30 features (1–30)",
      "AI-agent permissioning",
      "Real-time data redaction",
      "Unlimited domains and pageviews",
      "Dedicated account manager",
      "24/7 priority support",
      "Custom integrations on request",
    ],
  },
] as const;

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/pricing"),
  ...socialMetadata({
    title: `${title} — Consent Guru`,
    description,
    path: "/pricing",
  }),
};

export default function PricingPage() {
  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <main id="main-content">
        <section className="pricing-hero relative overflow-x-clip overflow-y-visible bg-[#F8FAFF]">
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full border-[40px] border-[#6D28D9]/10"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-[1200px] px-5 py-12 sm:px-8 lg:py-16">
            <h1 className="mt-4 max-w-3xl text-balance text-[clamp(1.75rem,1.2rem+2.4vw,3rem)] font-bold leading-[1.08] tracking-tight text-[#0B2C4A]">
              Choose the plan that fits. Ask us for a quote.
            </h1>
            <p className="mt-5 max-w-2xl text-justify text-[15px] leading-7 text-[#4B5563]">
              Silver, Gold, and Platinum cover different scales of banners, domains, and support.
              Prices are quoted after we understand your sites and traffic. Use the form below to
              request a plan.
            </p>

            <PricingExplorer plans={tiers} />
          </div>
        </section>

        <section id="enquiry" className="border-t border-[#E5E7EB] bg-white">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:py-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[#0B2C4A]">Contact us for pricing</h2>
              <p className="mt-4 text-justify text-[15px] leading-7 text-[#4B5563]">
                Tell us which plan you are looking at and how you run consent today. We will reply
                with a quote. Checkout is not enabled on this page.
              </p>
            </div>
            <Suspense fallback={<div className="h-96 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFF]" />}>
              <PricingEnquiryForm siteKey={recaptchaSiteKey()} />
            </Suspense>
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
