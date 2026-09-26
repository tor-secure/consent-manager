import Link from "next/link";
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
      { label: "Consent management", href: "/consent-management" },
      { label: "Cookie manager", href: "/cookie-consent-manager" },
      { label: "Cookie banner", href: "/cookie-banner" },
      { label: "Preference center", href: "/privacy-preference-center" },
      { label: "Consent analytics", href: "/consent-analytics" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Compliance",
    links: [
      { label: "GDPR consent", href: "/gdpr" },
      { label: "CCPA and CPRA", href: "/ccpa" },
      { label: "DPDP Act", href: "/dpdp" },
      { label: "DSAR requests", href: "/dsar" },
      { label: "Privacy compliance", href: "/privacy-compliance" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Consent API", href: "/consent-api" },
      { label: "SDK", href: "/developers" },
      { label: "Integrations", href: "/integrations" },
      { label: "Google Consent Mode", href: "/google-consent-mode" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Security", href: "/security" },
      { label: "Blog", href: "/blogs" },
      { label: "Guides", href: "/resources#guides" },
      { label: "FAQs", href: "/faqs" },
      { label: "News", href: "/news" },
      { label: "E-learning", href: "/e-learning" },
      { label: "DPDP tools", href: "/tools" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Centre", href: "/privacy-center" },
      { label: "Privacy Policy", href: "/privacy-center/privacy-policy" },
      { label: "Cookie Policy", href: "/privacy-center/cookie-policy" },
      { label: "Data Processing Agreement", href: "/privacy-center/data-processing-agreement" },
      { label: "Data Principal Rights", href: "/privacy-center/data-principal-request" },
      { label: "File a Grievance", href: "/privacy-center/grievance" },
      { label: "Track a request", href: "/privacy-center/track-request" },
      { label: "Manage Preferences", href: "/privacy-center/consent-preferences" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
];

export function HomeFooter() {
  return (
      <footer id="site-footer" className="home-section bg-[#0B1220] text-white">
        <div className="home-fade-item w-full min-w-0 px-4 py-14 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-10 lg:px-12 lg:py-16 xl:px-16">
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
              className="grid w-full min-w-0 flex-1 grid-cols-1 items-start gap-x-8 gap-y-10 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-10"
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
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
  );
}
