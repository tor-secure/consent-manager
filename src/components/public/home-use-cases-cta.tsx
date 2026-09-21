import { ArrowButton } from "@/components/ui/arrow-button";

const useCases = [
  {
    title: "E-commerce",
    description:
      "Build trust with shoppers and stay compliant across global markets.",
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#059669]",
    accent: "bg-[#10B981]",
    icon: (
      <path d="M3.75 6.75h1.8l1.2 9.3a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.2l1.05-6.3H7.05M9 20.25h.008M16.5 20.25h.008" />
    ),
  },
  {
    title: "SaaS",
    description:
      "Manage consent seamlessly across your product and marketing sites.",
    iconBg: "bg-[#E6F9F5]",
    iconColor: "text-[#0B2C4A]",
    accent: "bg-[#0B2C4A]",
    icon: (
      <path d="M6 16.5a4.5 4.5 0 0 1 .7-8.95A6 6 0 0 1 18 9.75a3.75 3.75 0 0 1 .15 7.5H6.75" />
    ),
  },
  {
    title: "Media & Publishing",
    description:
      "Balance reader privacy with analytics and advertising partners.",
    iconBg: "bg-[#E6F9F5]",
    iconColor: "text-[#00C4A7]",
    accent: "bg-[#00C4A7]",
    icon: (
      <path d="M6.75 4.5h10.5A1.5 1.5 0 0 1 18.75 6v13.5L12 16.5l-6.75 3V6A1.5 1.5 0 0 1 6.75 4.5Z" />
    ),
  },
  {
    title: "Healthcare",
    description:
      "Protect patient data and meet strict healthcare privacy requirements.",
    iconBg: "bg-[#FDF2F8]",
    iconColor: "text-[#DB2777]",
    accent: "bg-[#EC4899]",
    icon: (
      <path d="M12 20.25s-6.75-4.05-6.75-9A3.75 3.75 0 0 1 12 8.1a3.75 3.75 0 0 1 6.75 3.15c0 4.95-6.75 9-6.75 9ZM12 10.5v4.5M9.75 12.75h4.5" />
    ),
  },
  {
    title: "Finance",
    description:
      "Meet regulatory expectations while securing customer financial data.",
    iconBg: "bg-[#FFF7ED]",
    iconColor: "text-[#EA580C]",
    accent: "bg-[#F97316]",
    icon: (
      <path d="M3.75 9.75 12 4.5l8.25 5.25M5.25 9.75v8.25h3v-4.5h4.5v4.5h3V9.75M3.75 18.75h16.5" />
    ),
  },
  {
    title: "Education",
    description:
      "Manage student and parent consent across portals and learning tools.",
    iconBg: "bg-[#F0FDFA]",
    iconColor: "text-[#0D9488]",
    accent: "bg-[#14B8A6]",
    icon: (
      <path d="M3 9.75 12 4.5l9 5.25-9 5.25L3 9.75Zm4.5 4.05v3.45c0 .9 2.1 2.25 4.5 2.25s4.5-1.35 4.5-2.25v-3.45" />
    ),
  },
  {
    title: "Travel & Hospitality",
    description:
      "Capture booking and marketing consent across brands, properties, and regions.",
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#4F46E5]",
    accent: "bg-[#6366F1]",
    icon: (
      <path d="M3.75 12h16.5M6 18.75h12M8.25 12V6.75A2.25 2.25 0 0 1 10.5 4.5h3A2.25 2.25 0 0 1 15.75 6.75V12" />
    ),
  },
  {
    title: "Telecom",
    description:
      "Align app, web, and storefront consent with purpose-level vendor controls.",
    iconBg: "bg-[#F5F3FF]",
    iconColor: "text-[#7C3AED]",
    accent: "bg-[#8B5CF6]",
    icon: (
      <>
        <path d="M5 19h14" />
        <path d="M8 16a8 8 0 0 1 8 0M10.5 13a4.5 4.5 0 0 1 3 0" />
        <circle cx="12" cy="10" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    title: "Public sector",
    description:
      "Record evidence, honor withdrawals, and keep notices versioned for audits.",
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#B45309]",
    accent: "bg-[#F59E0B]",
    icon: (
      <path d="M4.5 19.5h15M6 19.5V9.75L12 6l6 3.75V19.5M10 19.5v-4.5h4v4.5" />
    ),
  },
  {
    title: "Marketplaces",
    description:
      "Separate seller, buyer, and advertising purposes without forked banners.",
    iconBg: "bg-[#ECFEFF]",
    iconColor: "text-[#0E7490]",
    accent: "bg-[#06B6D4]",
    icon: (
      <path d="M4.5 8.25 12 4.5l7.5 3.75v7.5L12 19.5 4.5 15.75v-7.5ZM12 4.5v15M4.5 8.25 12 12l7.5-3.75" />
    ),
  },
  {
    title: "Gaming",
    description:
      "Gate optional tracking, age-gate child accounts, and keep SDKs in sync.",
    iconBg: "bg-[#FDF2F8]",
    iconColor: "text-[#BE185D]",
    accent: "bg-[#EC4899]",
    icon: (
      <path d="M7.5 15.75h9A3.75 3.75 0 0 0 20.25 12 6.75 6.75 0 0 0 7.2 9.3 4.5 4.5 0 0 0 7.5 15.75ZM9.75 12h.008M14.25 10.5v3M12.75 12h3" />
    ),
  },
  {
    title: "Agencies",
    description:
      "Run multiple client sites from one workspace with shared purposes and vendors.",
    iconBg: "bg-[#F3F4F6]",
    iconColor: "text-[#374151]",
    accent: "bg-[#6B7280]",
    icon: (
      <path d="M4.5 19.5V6.75A1.5 1.5 0 0 1 6 5.25h4.5v14.25M12 19.5V9h6A1.5 1.5 0 0 1 19.5 10.5V19.5M3.75 19.5h16.5" />
    ),
  },
];

const workspaceCapabilities = [
  {
    title: "Websites & SDK install",
    description: "Register domains, publish a banner, and drop one snippet that enforces purposes at runtime.",
  },
  {
    title: "Policies & Banner Studio",
    description: "Version notices, map purposes, and ship GDPR, DPDP, or US templates without a code freeze.",
  },
  {
    title: "Scanner & tracker inventory",
    description: "Discover pixels, compare them to approved vendors, and fail closed until legal maps them.",
  },
  {
    title: "Rights requests & evidence",
    description: "Intake access, deletion, and withdrawal with consent IDs, policy snapshots, and exports.",
  },
  {
    title: "Child protection",
    description: "Age assurance, guardian flows, and restricted processing so kids never inherit adult opt-ins.",
  },
  {
    title: "Vendors, TCF & GPP",
    description: "IAB vendor lists, Google Consent Mode, and jurisdiction rules from one purpose catalog.",
  },
  {
    title: "Analytics & experiments",
    description: "Consent rates, quality scores, A/B tests, and ROI views that legal and growth can share.",
  },
  {
    title: "AI, firewall & redaction",
    description: "Autopilot, agent permissioning, consent firewall, and real-time redaction when choice changes.",
  },
];

export function HomeUseCasesCta() {
  return (
    <section
      id="solutions"
      className="home-section relative overflow-hidden bg-[#F8FAFC]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(0,196,167,0.16) 1px, transparent 0)",
        backgroundSize: "26px 26px",
      }}
    >
      <div className="mx-auto max-w-[1200px] px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="text-center">
          <span className="home-fade-item inline-flex rounded-full bg-[#E6F9F5] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0B2C4A]">
            Use Cases
          </span>
          <h2 className="home-fade-item mt-4 text-balance text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
            Built for every industry
          </h2>
          <p className="home-fade-item mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-[#6B7280] sm:text-base">
            Whether you&apos;re a startup or an enterprise, Consent Guru adapts to your needs.
          </p>
        </div>
      </div>

      <div
        id="industries"
        className="industry-marquee mt-10 scroll-mt-24"
        aria-label="Industries Consent Guru supports"
      >
          <div className="industry-marquee-track">
            {[...useCases, ...useCases].map((item, index) => {
              const duplicate = index >= useCases.length;
              return (
                <article
                  key={`${item.title}-${index}`}
                  className="industry-card flex flex-col rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 text-left shadow-[0_6px_18px_-12px_rgba(15,23,42,0.28)] sm:px-5"
                  aria-hidden={duplicate}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${item.iconBg} ${item.iconColor}`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {item.icon}
                    </svg>
                  </div>
                  <h3 className="mt-2.5 text-[15px] font-bold tracking-tight text-[#0F172A]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-justify text-[13px] leading-5 text-[#6B7280]">
                    {item.description}
                  </p>
                  <span className={`mt-2.5 h-0.5 w-7 rounded-full ${item.accent}`} aria-hidden="true" />
                </article>
              );
            })}
          </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8 sm:pb-20">
        <div id="use-cases" className="mt-14 scroll-mt-24">
          <h3 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
            What you actually run in the workspace
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280] sm:text-[15px]">
            Same product surfaces your team already uses after sign-up, not a separate marketing
            stack.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {workspaceCapabilities.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm"
              >
                <h4 className="text-sm font-bold text-[#0F172A]">{item.title}</h4>
                <p className="mt-1.5 text-justify text-sm leading-6 text-[#6B7280]">{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div
          className="relative mt-12 overflow-hidden rounded-2xl px-6 py-8 sm:px-8 sm:py-9 lg:px-10"
          style={{
            background:
              "linear-gradient(105deg, #0B2C4A 0%, #0E3D5C 42%, #00C4A7 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.35), transparent 55%), repeating-linear-gradient(115deg, transparent 0 14px, rgba(255,255,255,0.08) 14px 16px)",
            }}
            aria-hidden="true"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 sm:items-center">
              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:flex">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3.5 4.75 6.2v5.4c0 4.5 3 8.3 7.25 9.5 4.25-1.2 7.25-5 7.25-9.5V6.2L12 3.5Z"
                    fill="white"
                    fillOpacity="0.95"
                  />
                  <path
                    d="M9.6 12.2l1.7 1.7 3.4-3.5"
                    stroke="#00C4A7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-balance text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
                  Ready to build trust and stay compliant?
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/85 sm:text-[15px]">
                  Create a workspace, publish a template policy, and install the SDK when you are ready.
                </p>
              </div>
            </div>

            <div className="shrink-0 lg:text-right">
              <ArrowButton href="/sign-up" size="lg" tone="inverse">
                Sign up
              </ArrowButton>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/90 lg:justify-end">
                <span className="inline-flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Free workspace
                </span>
                <span className="hidden h-3 w-px bg-white/35 sm:block" aria-hidden="true" />
                <span className="inline-flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Billing is not enabled yet
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
