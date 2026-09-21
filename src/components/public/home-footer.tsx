import Link from "next/link";
import { ArrowButton } from "@/components/ui/arrow-button";
import { BrandLogo } from "@/components/brand/brand-logo";

const offices = [
  {
    city: "Ajman",
    region: "United Arab Emirates",
    address: "FL.H-01418 B1 Building Ajman Free Zone, Ajman, United Arab Emirates",
  },
  {
    city: "Mangaluru",
    region: "India",
    address: "Manasa Tower, #9, II Floor, PVS Junction, Mangaluru, Karnataka 575003",
  },
  {
    city: "Bengaluru",
    region: "India",
    address:
      "2nd Floor, #108, 27th Main Road, Sector 2, HSR Layout, Bengaluru-560102 Karnataka, India",
  },
  {
    city: "Jeddah",
    region: "Saudi Arabia",
    address: "7834 Awn Bin Jafar, Ash Sharafiyah Dist., Unit No 39 Jeddah 22234 - 4932, KSA",
  },
  {
    city: "Al-Jubail",
    region: "Saudi Arabia",
    address: "Prince Mashoor Street, Behind Max, Al Marqb District, Al-Jubail 35514, Saudi Arabia",
  },
];

function LocationPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-5.6 7-11.2A7 7 0 1 0 5 9.8C5 15.4 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.8" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/#product" },
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Why us", href: "/#comparison" },
      { label: "E learning", href: "/e-learning" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "By Industry", href: "/#industries" },
      { label: "By Use Case", href: "/#use-cases" },
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
      { label: "About us", href: "/about" },
      { label: "Blogs", href: "/blogs" },
      { label: "News", href: "/news" },
      { label: "FAQs", href: "/faqs" },
      { label: "E learning", href: "/e-learning" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Centre", href: "/privacy-center" },
      { label: "Privacy Policy", href: "/privacy-center/privacy-policy" },
      { label: "Cookie Policy", href: "/privacy-center/cookie-policy" },
      { label: "Data Processing Agreement", href: "/privacy-center/data-processing-agreement" },
      { label: "Disclaimer", href: "/disclaimer" },
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
                <p className="mt-2 max-w-lg text-justify text-sm leading-6 text-[#6B7280]">
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
        <div className="home-fade-item w-full px-6 py-14 sm:px-10 lg:px-12 lg:py-16 xl:px-16">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
            <div id="company" className="w-full shrink-0 text-left lg:max-w-[280px]">
              <Link href="/" className="inline-flex items-center" aria-label="Consent Guru home">
                <BrandLogo tone="on-dark" height={42} />
              </Link>
              <p className="mt-4 text-left text-sm leading-6 text-white/60">
                The all-in-one consent management platform that helps businesses collect, manage and
                analyze user consent while staying compliant with global privacy laws.
              </p>
              <p className="mt-5 text-sm text-white/55">
                <Link href="/sign-up" className="font-medium text-white hover:underline">
                  Create a workspace
                </Link>
              </p>
            </div>

            <nav
              aria-label="Footer"
              className="grid w-full flex-1 grid-cols-2 items-start gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-10"
            >
              {footerColumns.map((column) => (
                <div key={column.title} id={column.title === "Legal" ? "legal" : undefined}>
                  <h2 className="text-sm font-semibold text-white">{column.title}</h2>
                  <ul className="mt-4 space-y-2.5">
                    {column.links.map((link) => (
                      <li key={`${column.title}-${link.label}`}>
                        <Link
                          href={link.href}
                          className="text-sm leading-5 text-white/55 transition hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="mt-12 border-t border-white/10 pt-8">
            <h2 className="text-sm font-semibold text-white">Offices</h2>
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {offices.map((office) => (
                <li key={office.city} className="flex items-start gap-3 text-left">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#00C4A7]">
                    <LocationPin />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {office.city}
                      <span className="ml-1.5 font-medium text-white/50">{office.region}</span>
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/55">{office.address}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p className="sm:w-1/3">English</p>
            <p className="sm:w-1/3 sm:text-center">&copy; 2026 Consent Guru. All rights reserved.</p>
            <p className="text-[11px] font-semibold tracking-[0.04em] text-white/70 sm:w-1/3 sm:text-right">
              Built for GDPR, CCPA, and DPDP workflows
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
