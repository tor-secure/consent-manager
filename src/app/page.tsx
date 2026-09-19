import { SkipLink } from "@/components/ui/skip-link";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { HomeProductPreview } from "@/components/public/home-product-preview";
import { HomeTrustedFeatures } from "@/components/public/home-trusted-features";
import { HomeUseCasesCta } from "@/components/public/home-use-cases-cta";
import { HomeHowItWorks } from "@/components/public/home-how-it-works";
import { HomePricing } from "@/components/public/home-pricing";
import { HomeComparison } from "@/components/public/home-comparison";
import { ArrowButton } from "@/components/ui/arrow-button";
import { PenaltyCallout } from "@/components/public/penalty-callout";
import Link from "next/link";

const trustItems = [
  {
    label: "Free workspace — billing not enabled",
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
    label: "Built for DPDP, GDPR, and global laws",
    icon: (
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c2.5 2.7 3.75 5.7 3.75 9S14.5 18.3 12 21c-2.5-2.7-3.75-5.7-3.75-9S9.5 5.7 12 3Z" />
    ),
  },
];

export default function Home() {
  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeInteractions />
      <HomeNavbar />
      <main id="main-content">
        <section
          className="home-section relative overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 85% 15%, rgba(0,196,167,0.16), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(11,44,74,0.08), transparent 50%), linear-gradient(180deg, #ffffff 0%, #F3FAF8 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(0,196,167,0.22) 1px, transparent 0)",
              backgroundSize: "28px 28px",
              maskImage:
                "radial-gradient(ellipse 60% 50% at 80% 20%, black, transparent), radial-gradient(ellipse 40% 35% at 8% 92%, black, transparent)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-3 sm:px-8 sm:py-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:py-8">
            <div className="home-fade-item max-w-xl">
              <h1 className="text-balance text-[2.35rem] font-bold leading-[1.08] tracking-tight text-[#111827] sm:text-5xl lg:text-[3.4rem]">
                Build trust. Collect consent.{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #0B2C4A 0%, #00C4A7 70%)",
                  }}
                >
                  Stay compliant.
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-[15px] leading-7 text-[#4B5563] sm:text-base">
                Consent Guru helps you manage user consent transparently across web, mobile and apps
                — all in one powerful platform.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ArrowButton href="/sign-up" size="lg">
                  Sign up
                </ArrowButton>
                <Link
                  href="/#comparison"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#00C4A7]/40 bg-white px-5 text-sm font-semibold text-[#0B2C4A] transition hover:border-[#00C4A7] hover:bg-[#E6F9F5]"
                >
                  See why we are better
                </Link>
              </div>

              <PenaltyCallout className="mt-6 max-w-lg" />

              <ul className="mt-8 flex flex-col gap-3 text-[13px] text-[#6B7280] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
                {trustItems.map((item) => (
                  <li key={item.label} className="inline-flex items-center gap-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="shrink-0 text-[#9CA3AF]"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {item.icon}
                    </svg>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <HomeProductPreview />
          </div>
        </section>

        <HomeTrustedFeatures />
        <HomeComparison />
        <HomeHowItWorks />
        <HomeUseCasesCta />
        <HomePricing />
      </main>

      <HomeFooter />
    </div>
  );
}
