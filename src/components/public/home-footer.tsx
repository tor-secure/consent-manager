import Link from "next/link";
import { ArrowButton } from "@/components/ui/arrow-button";
import { BrandLogo } from "@/components/brand/brand-logo";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/#product" },
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Why us", href: "/#comparison" },
      { label: "E learning", href: "/e-learning" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "By Industry", href: "/#solutions" },
      { label: "By Use Case", href: "/#solutions" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Sign up", href: "/sign-up" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#company" },
      { label: "Blogs", href: "/blogs" },
      { label: "E learning", href: "/e-learning" },
    ],
  },
];

export function HomeFooter() {
  return (
    <>
      <section id="resources" className="home-section bg-white px-5 py-10 sm:px-8 sm:py-12">
        <div
          className="home-fade-item relative mx-auto max-w-[1200px] overflow-hidden rounded-2xl px-6 py-8 sm:px-8 lg:px-10"
          style={{
            background:
              "linear-gradient(180deg, #E6F9F5 0%, #F3FAF8 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-50"
            style={{
              background:
                "repeating-linear-gradient(115deg, transparent 0 16px, rgba(0,196,167,0.12) 16px 18px)",
            }}
            aria-hidden="true"
          />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E6F9F5]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M3.75 7.5 12 12.75 20.25 7.5M4.5 18h15A1.5 1.5 0 0 0 21 16.5v-9A1.5 1.5 0 0 0 19.5 6h-15A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18Z"
                    stroke="#0B2C4A"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16.5 17.25 18 18.75l3-3"
                    stroke="#00C4A7"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-balance text-2xl font-bold tracking-tight text-[#111827] sm:text-[1.7rem]">
                  Start a workspace and{" "}
                  <span className="text-[#00C4A7]">go live</span>
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-[#6B7280]">
                  Create an account, add a website, and publish a consent banner. A public mailing
                  list is not open yet.
                </p>
              </div>
            </div>

            <div>
              <ArrowButton href="/sign-up" size="lg">
                Sign up
              </ArrowButton>
              <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75Z"
                    stroke="#00C4A7"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.75 12.5l1.5 1.5 3-3"
                    stroke="#00C4A7"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Product updates ship in the workspace. A public mailing list is not open yet.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer id="site-footer" className="home-section bg-[#0B1220] text-white">
        <div className="home-fade-item mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
            <div id="company" className="max-w-sm">
              <Link href="/" className="inline-flex items-center" aria-label="Consent Guru home">
                <BrandLogo tone="on-dark" height={42} />
              </Link>
              <p className="mt-4 text-sm leading-6 text-white/60">
                The all-in-one consent management platform that helps businesses collect, manage and
                analyze user consent while staying compliant with global privacy laws.
              </p>
              <p className="mt-5 text-sm text-white/55">
                <Link href="/sign-up" className="font-medium text-white hover:underline">
                  Create a workspace
                </Link>
              </p>
            </div>

            {footerColumns.map((column) => (
              <div key={column.title} id={column.title === "Legal" ? "legal" : undefined}>
                <h2 className="text-sm font-semibold text-white">{column.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="inline-flex flex-wrap items-center gap-2 text-sm text-white/55 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/50 lg:flex-row lg:items-center lg:justify-between">
            <p>English</p>
            <p className="text-center">&copy; 2026 Consent Guru. All rights reserved.</p>
            <p className="text-[11px] font-semibold tracking-[0.04em] text-white/70">
              Built for GDPR, CCPA, and DPDP workflows
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
