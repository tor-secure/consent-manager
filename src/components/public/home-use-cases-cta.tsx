import Link from "next/link";

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
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#2563EB]",
    accent: "bg-[#3B82F6]",
    icon: (
      <path d="M6 16.5a4.5 4.5 0 0 1 .7-8.95A6 6 0 0 1 18 9.75a3.75 3.75 0 0 1 .15 7.5H6.75" />
    ),
  },
  {
    title: "Media & Publishing",
    description:
      "Balance reader privacy with analytics and advertising partners.",
    iconBg: "bg-[#F5F3FF]",
    iconColor: "text-[#7C3AED]",
    accent: "bg-[#8B5CF6]",
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
    title: "& More",
    description:
      "Flexible consent workflows that adapt to any industry or use case.",
    iconBg: "bg-[#F3F4F6]",
    iconColor: "text-[#4B5563]",
    accent: "bg-[#9CA3AF]",
    icon: (
      <>
        <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

export function HomeUseCasesCta() {
  return (
    <section
      id="solutions"
      className="home-section relative overflow-hidden bg-[#F8FAFC]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(88,80,236,0.12) 1px, transparent 0)",
        backgroundSize: "26px 26px",
      }}
    >
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="text-center">
          <span className="home-fade-item inline-flex rounded-full bg-[#EEF2FF] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#4338CA]">
            Use Cases
          </span>
          <h2 className="home-fade-item mt-4 text-balance text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
            Built for every industry
          </h2>
          <p className="home-fade-item mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-[#6B7280] sm:text-base">
            Whether you&apos;re a startup or an enterprise, ConsentFlow adapts to your needs.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 lg:gap-3">
          {useCases.map((item) => (
            <article
              key={item.title}
              className="home-fade-item flex flex-col rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-3.5 text-center shadow-[0_6px_18px_-12px_rgba(15,23,42,0.28)]"
            >
              <div
                className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${item.iconBg} ${item.iconColor}`}
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
              <h3 className="mt-2.5 text-[13px] font-bold tracking-tight text-[#0F172A]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-[11px] leading-4 text-[#6B7280]">
                {item.description}
              </p>
              <span className={`mx-auto mt-2.5 h-0.5 w-7 rounded-full ${item.accent}`} aria-hidden="true" />
            </article>
          ))}
        </div>

        <div
          className="home-fade-item relative mt-12 overflow-hidden rounded-2xl px-6 py-8 sm:px-8 sm:py-9 lg:px-10"
          style={{
            background:
              "linear-gradient(105deg, #4F46E5 0%, #5850EC 45%, #6366F1 78%, #7C3AED 100%)",
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
                    stroke="#5850EC"
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
                  Join thousands of businesses using ConsentFlow to manage consent the right way.
                </p>
              </div>
            </div>

            <div className="shrink-0 lg:text-right">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#4338CA] shadow-sm transition hover:bg-[#F8FAFC]"
              >
                Get Started Free
                <span aria-hidden="true">→</span>
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/90 lg:justify-end">
                <span className="inline-flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  No credit card required
                </span>
                <span className="hidden h-3 w-px bg-white/35 sm:block" aria-hidden="true" />
                <span className="inline-flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  14-day free trial
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
