import Link from "next/link";

const featureCards = [
  {
    title: "Customizable Consent Banner",
    description:
      "Create beautiful, brand-aligned banners that provide clear choices to your users.",
    href: "#product",
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#5850EC]",
    icon: (
      <path d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75ZM9.75 12.5l1.6 1.6 3.4-3.4" />
    ),
  },
  {
    title: "Granular Consent Management",
    description:
      "Collect consent for cookies, categories, purposes and vendors with ease.",
    href: "/dashboard/purposes",
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#2563EB]",
    icon: (
      <>
        <path d="M4.5 7.5h15M7.5 7.5v3M16.5 7.5v5" />
        <path d="M4.5 16.5h15M10.5 16.5v-4M13.5 16.5v2" />
      </>
    ),
  },
  {
    title: "Global Compliance",
    description:
      "Stay compliant with GDPR, CCPA, LGPD, PIPEDA and other privacy regulations.",
    href: "#solutions",
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#059669]",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.75 5.7 3.75 9S14.5 18.3 12 21c-2.5-2.7-3.75-5.7-3.75-9S9.5 5.7 12 3Z" />
      </>
    ),
  },
  {
    title: "Easy Integration",
    description:
      "Integrate in minutes with our SDKs, plugins and APIs for any platform.",
    href: "#resources",
    iconBg: "bg-[#F5F3FF]",
    iconColor: "text-[#7C3AED]",
    icon: <path d="m8.25 8.25-4.5 3.75 4.5 3.75M15.75 8.25l4.5 3.75-4.5 3.75" />,
  },
  {
    title: "Analytics & Insights",
    description:
      "Track consent rates, user preferences and performance with detailed reports.",
    href: "/dashboard/analytics",
    iconBg: "bg-[#FDF2F8]",
    iconColor: "text-[#DB2777]",
    icon: <path d="M5.25 18.75V12m6.75 6.75V5.25m6.75 13.5v-9" />,
  },
  {
    title: "Secure & Reliable",
    description:
      "Enterprise-grade security, scalability and 99.99% uptime you can trust.",
    href: "#security",
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#2563EB]",
    icon: (
      <>
        <rect x="5.25" y="10.5" width="13.5" height="10.5" rx="2" />
        <path d="M8.25 10.5V7.5a3.75 3.75 0 0 1 7.5 0v3" />
      </>
    ),
  },
];

function AirbnbMark() {
  return (
    <span className="inline-flex items-center gap-2 text-[#FF5A5F]">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.001 2.5c1.2 1.55 2.95 3.95 4.35 6.55.9 1.65 1.55 3.15 1.9 4.35.35 1.2.4 2.15.1 2.95-.35.95-1.2 1.55-2.35 1.55-1.05 0-2.15-.55-3.15-1.4-.35.45-.7.85-1.05 1.15-.4.35-.75.5-1.05.5-.3 0-.7-.18-1.15-.55-.35-.3-.75-.75-1.15-1.3-1.05.9-2.2 1.5-3.35 1.5-1.1 0-1.95-.55-2.35-1.45-.35-.85-.25-1.85.15-3.1.35-1.2 1-2.7 1.9-4.4C6.85 6.4 8.7 3.95 12 2.5Zm0 4.35c-1.55 1.85-3.05 4.1-3.9 6.1-.55 1.25-.75 2.05-.6 2.45.1.25.3.4.65.4.55 0 1.3-.4 2.15-1.1.2-.55.45-1.15.7-1.8.35-.9.75-1.9 1-2.55.25.65.65 1.65 1 2.55.25.65.5 1.25.7 1.8.85.7 1.6 1.1 2.15 1.1.35 0 .55-.15.65-.4.15-.4-.05-1.2-.6-2.45-.85-2-2.35-4.25-3.9-6.1Z" />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight">airbnb</span>
    </span>
  );
}

function AtlassianMark() {
  return (
    <span className="inline-flex items-center gap-2 text-[#2684FF]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2.5 17.5 10.2 3.8c.45-.8 1.55-.8 2 0l2.1 3.7-7.5 13.3c-.45.8-1.55.7-1.95-.15L2.5 17.5Z" fill="#2684FF" />
        <path d="M13.3 7.5 21.5 17.5c.45.8-.1 1.85-1.05 1.85H11.2c-.95 0-1.5-1.05-1.05-1.85l3.15-10Z" fill="#0052CC" />
      </svg>
      <span className="text-[16px] font-semibold tracking-tight text-[#172B4D]">Atlassian</span>
    </span>
  );
}

function MicrosoftMark() {
  return (
    <span className="inline-flex items-center gap-2 text-[#5E5E5E]">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
        <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
        <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
        <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
      </svg>
      <span className="text-[16px] font-semibold tracking-tight">Microsoft</span>
    </span>
  );
}

function SamsungMark() {
  return (
    <span className="text-[15px] font-bold tracking-[0.18em] text-[#1428A0]">
      SAMSUNG
    </span>
  );
}

function TwilioMark() {
  return (
    <span className="inline-flex items-center gap-2 text-[#F22F46]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <circle cx="9" cy="10" r="1.6" fill="white" />
        <circle cx="15" cy="10" r="1.6" fill="white" />
        <circle cx="9" cy="15" r="1.6" fill="white" />
        <circle cx="15" cy="15" r="1.6" fill="white" />
      </svg>
      <span className="text-[16px] font-semibold tracking-tight">twilio</span>
    </span>
  );
}

function HubSpotMark() {
  return (
    <span className="inline-flex items-center gap-2 text-[#FF7A59]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="18" cy="6" r="2.2" />
        <path d="M14.8 7.8 9.7 10.2a3.8 3.8 0 1 0 1.1 2.5l5.3-2.5a3.2 3.2 0 1 0-1.3-2.4Z" />
      </svg>
      <span className="text-[16px] font-semibold tracking-tight">HubSpot</span>
    </span>
  );
}

const logos = [
  { name: "Airbnb", node: <AirbnbMark /> },
  { name: "Atlassian", node: <AtlassianMark /> },
  { name: "Microsoft", node: <MicrosoftMark /> },
  { name: "Samsung", node: <SamsungMark /> },
  { name: "Twilio", node: <TwilioMark /> },
  { name: "HubSpot", node: <HubSpotMark /> },
];

export function HomeTrustedFeatures() {
  const track = [...logos, ...logos];

  return (
    <section id="features" className="home-section bg-[#F9FAFB]">
      <div className="py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1200px] px-5 text-center sm:px-8">
          <p className="home-fade-item text-[15px] font-medium text-[#4B5563]">
            Trusted by innovative companies worldwide
          </p>
        </div>

        <div className="logo-marquee home-fade-item relative mt-8 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#F9FAFB] to-transparent sm:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#F9FAFB] to-transparent sm:w-24" />
          <div className="logo-marquee-track flex w-max items-center gap-12 sm:gap-16" aria-hidden="true">
            {track.map((logo, index) => (
              <div
                key={`${logo.name}-${index}`}
                className="flex h-10 shrink-0 items-center opacity-90"
                aria-label={logo.name}
              >
                {logo.node}
              </div>
            ))}
          </div>
          <span className="sr-only">
            Trusted by Airbnb, Atlassian, Microsoft, Samsung, Twilio, and HubSpot.
          </span>
        </div>

        <div className="mx-auto mt-16 max-w-[1200px] px-5 text-center sm:mt-20 sm:px-8">
          <span className="home-fade-item inline-flex rounded-full bg-[#DBEAFE] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]">
            Features
          </span>
          <h2 className="home-fade-item mx-auto mt-4 max-w-3xl text-balance text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
            Everything you need to manage consent
          </h2>
          <p className="home-fade-item mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-[#6B7280] sm:text-base">
            Powerful features to help you collect, manage and analyze consent while staying
            compliant with global privacy laws.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-[1200px] gap-5 px-5 sm:grid-cols-2 sm:px-8 lg:mt-12 lg:grid-cols-3">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className="home-fade-item rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#D1D5DB] hover:shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)]"
            >
              <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {card.icon}
                </svg>
              </div>
              <h3 className="mt-5 text-[17px] font-bold tracking-tight text-[#0F172A]">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">{card.description}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#2563EB] transition hover:text-[#1D4ED8]"
              >
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
