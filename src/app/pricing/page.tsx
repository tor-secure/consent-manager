import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { PricingEnquiryForm } from "@/components/public/pricing-enquiry-form";
import { SkipLink } from "@/components/ui/skip-link";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "Pricing";
const description =
  "Compare Consent Guru Silver, Gold, and Platinum plans, then send an enquiry for a quote.";

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
        <section className="relative overflow-hidden bg-[#F8FAFF]">
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full border-[40px] border-[#6D28D9]/10"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-[1200px] px-5 py-12 sm:px-8 lg:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6D28D9]">Pricing</p>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight text-[#0B2C4A] sm:text-5xl">
              Choose the plan that fits. Ask us for a quote.
            </h1>
            <p className="mt-5 max-w-2xl text-justify text-[15px] leading-7 text-[#4B5563]">
              Silver, Gold, and Platinum cover different scales of banners, domains, and support.
              Prices are quoted after we understand your sites and traffic. Use the form below to
              request a plan.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {tiers.map((tier) => (
                <article
                  key={tier.id}
                  className={`flex flex-col rounded-2xl border bg-white p-6 ${
                    "featured" in tier
                      ? "border-[#F59E0B] shadow-[0_16px_40px_-24px_rgba(245,158,11,0.65)]"
                      : "border-[#E5E7EB]"
                  }`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6D28D9]">
                    {tier.badge}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-[#111827]">{tier.name}</h2>
                  <p className="mt-2 text-justify text-sm text-[#4B5563]">{tier.detail}</p>
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
                  <a
                    href={`/pricing?plan=${tier.id}#enquiry`}
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#0B2C4A] px-4 text-sm font-semibold text-white transition hover:bg-[#00C4A7]"
                  >
                    Request a quote
                  </a>
                </article>
              ))}
            </div>
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
              <PricingEnquiryForm />
            </Suspense>
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
