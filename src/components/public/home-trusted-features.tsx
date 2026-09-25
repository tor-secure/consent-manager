import Link from "next/link";

const featureCards = [
  {
    title: "Customizable Consent Banner",
    description:
      "Create beautiful, brand-aligned banners that provide clear choices to your users.",
    href: "#product",
    iconBg: "bg-[#E6F9F5]",
    iconColor: "text-[#00C4A7]",
    icon: (
      <path d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75ZM9.75 12.5l1.6 1.6 3.4-3.4" />
    ),
  },
  {
    title: "Granular Consent Management",
    description:
      "Collect consent for cookies, categories, purposes and vendors with ease.",
    href: "#how-it-works",
    iconBg: "bg-[#E6F9F5]",
    iconColor: "text-[#0B2C4A]",
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
    href: "#how-it-works",
    iconBg: "bg-[#E6F9F5]",
    iconColor: "text-[#00C4A7]",
    icon: <path d="m8.25 8.25-4.5 3.75 4.5 3.75M15.75 8.25l4.5 3.75-4.5 3.75" />,
  },
  {
    title: "Analytics & Insights",
    description:
      "Track consent rates, user preferences and performance with detailed reports.",
    href: "#features",
    iconBg: "bg-[#E6F9F5]",
    iconColor: "text-[#0B2C4A]",
    icon: <path d="M5.25 18.75V12m6.75 6.75V5.25m6.75 13.5v-9" />,
  },
  {
    title: "Secure & Reliable",
    description:
      "Enterprise-grade security, scalability and 99.99% uptime you can trust.",
    href: "#features",
    iconBg: "bg-[#E6F9F5]",
    iconColor: "text-[#0B2C4A]",
    icon: (
      <>
        <rect x="5.25" y="10.5" width="13.5" height="10.5" rx="2" />
        <path d="M8.25 10.5V7.5a3.75 3.75 0 0 1 7.5 0v3" />
      </>
    ),
  },
];

export function HomeTrustedFeatures() {
  return (
    <section id="features" className="home-section bg-[#F3FAF8]">
      <div className="pt-12 pb-4 sm:pt-16 sm:pb-6">
        <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 text-center min-[400px]:px-5 sm:px-8">
          <span className="home-fade-item inline-flex rounded-full bg-[#DBEAFE] px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]">
            Features
          </span>
          <h2 className="home-fade-item mx-auto mt-2.5 max-w-3xl text-balance text-[clamp(1.4rem,1.05rem+1.6vw,1.9rem)] font-bold tracking-tight text-[#0F172A]">
            Everything you need to manage consent
          </h2>
          <p className="home-fade-item mx-auto mt-2 max-w-2xl text-[13px] leading-5 text-[#6B7280] sm:text-sm">
            Powerful features to help you collect, manage and analyze consent while staying
            compliant with global privacy laws.
          </p>
        </div>

        <div className="mx-auto mt-6 grid w-full min-w-0 max-w-[1200px] grid-cols-1 gap-3 px-4 min-[400px]:px-5 min-[600px]:grid-cols-2 sm:px-8 lg:mt-7 lg:grid-cols-3">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className="home-fade-item min-w-0 rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#D1D5DB] hover:shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)] sm:p-4"
            >
              <div
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor}`}
              >
                <svg
                  width="16"
                  height="16"
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
              <h3 className="mt-2.5 text-[14px] font-bold tracking-tight text-[#0F172A]">
                {card.title}
              </h3>
              <p className="mt-1 text-justify text-[12px] leading-5 text-[#6B7280]">{card.description}</p>
              <Link
                href={card.href}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#0B2C4A] transition hover:text-[#00C4A7]"
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
