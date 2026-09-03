import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { HomeProductPreview } from "@/components/public/home-product-preview";
import { HomeTrustedFeatures } from "@/components/public/home-trusted-features";
import { HomeUseCasesCta } from "@/components/public/home-use-cases-cta";
import Link from "next/link";

const trustItems = [
  {
    label: "No credit card required",
    icon: (
      <path d="M3.75 8.25h16.5M5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v10.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5Z" />
    ),
  },
  {
    label: "14-day free trial",
    icon: (
      <path d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75ZM9.75 12.75l1.5 1.5 3.75-3.75" />
    ),
  },
  {
    label: "Cancel anytime",
    icon: (
      <path d="M12 6v6l3.75 2.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    ),
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <HomeInteractions />
      <HomeNavbar />
      <main>
        <section
          className="home-section relative overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 85% 15%, rgba(88,80,236,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(99,102,241,0.08), transparent 50%), linear-gradient(180deg, #ffffff 0%, #F8FAFF 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(88,80,236,0.18) 1px, transparent 0)",
              backgroundSize: "28px 28px",
              maskImage:
                "radial-gradient(ellipse 60% 50% at 80% 20%, black, transparent), radial-gradient(ellipse 40% 35% at 8% 92%, black, transparent)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:py-20">
            <div className="home-fade-item max-w-xl">
              <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-[#E5E7EB] bg-white/90 px-3 py-1.5 text-[12px] shadow-sm backdrop-blur">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0 text-[#5850EC]"
                >
                  <path
                    d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.75 12.5l1.6 1.6 3.4-3.4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="font-semibold text-[#5850EC]">GDPR, CCPA, LGPD & more</span>
                <span className="text-[#9CA3AF]" aria-hidden="true">
                  •
                </span>
                <span className="truncate text-[#6B7280]">Compliance made simple</span>
              </div>

              <h1 className="text-balance text-[2.35rem] font-bold leading-[1.08] tracking-tight text-[#111827] sm:text-5xl lg:text-[3.4rem]">
                Build trust. Collect consent.{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #3B82F6 0%, #5850EC 55%, #7C3AED 100%)",
                  }}
                >
                  Stay compliant.
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-[15px] leading-7 text-[#4B5563] sm:text-base">
                ConsentFlow helps you manage user consent transparently across web, mobile and apps
                — all in one powerful platform.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/sign-up"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#5850EC] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(88,80,236,0.8)] transition hover:bg-[#4F46E5]"
                >
                  Get Started Free
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="#solutions"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#5850EC]/40 bg-white px-5 text-sm font-semibold text-[#5850EC] transition hover:border-[#5850EC] hover:bg-[#EEF2FF]"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#5850EC]/35">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M8 5.5v13l11-6.5L8 5.5Z" />
                    </svg>
                  </span>
                  Book a Demo
                </Link>
              </div>

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
        <HomeUseCasesCta />
      </main>

      <HomeFooter />
    </div>
  );
}
