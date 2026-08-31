import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import Link from "next/link";

const consentMetrics = [
  { label: "Consent rate", value: "84%" },
  { label: "Active policies", value: "12" },
  { label: "Vendors mapped", value: "48" },
];

const heroShowcaseCards = [
  { label: "Consent Banner", value: "Published", tone: "bg-indigo-50 text-indigo-700" },
  { label: "Purposes", value: "8 active", tone: "bg-teal-50 text-teal-700" },
  { label: "Vendors", value: "32 mapped", tone: "bg-slate-100 text-slate-700" },
  { label: "Analytics", value: "84% opt-in", tone: "bg-emerald-50 text-emerald-700" },
];

const features = [
  {
    title: "Consent Management",
    description:
      "Launch polished consent banners, preference centers, and policy versions that are easy to maintain.",
    icon: (
      <path d="M9 12.75 11.25 15 15 9.75M12 3.75l6 2.25v4.5c0 3.7-2.45 7.15-6 8.25-3.55-1.1-6-4.55-6-8.25V6l6-2.25Z" />
    ),
  },
  {
    title: "Purpose & Vendor Management",
    description:
      "Map purposes, vendors, data uses, and legal context in one organized governance layer.",
    icon: (
      <path d="M7.5 7.5h9M7.5 12h9M7.5 16.5h5.25M5.25 3.75h13.5c.83 0 1.5.67 1.5 1.5v13.5c0 .83-.67 1.5-1.5 1.5H5.25c-.83 0-1.5-.67-1.5-1.5V5.25c0-.83.67-1.5 1.5-1.5Z" />
    ),
  },
  {
    title: "Tracker Scanner",
    description:
      "Discover scripts, pixels, cookies, and third-party trackers before they create compliance risk.",
    icon: (
      <path d="M10.5 18.75a8.25 8.25 0 1 1 5.83-14.08 8.25 8.25 0 0 1-5.83 14.08ZM16.5 16.5l3.75 3.75M8.25 10.5h4.5M10.5 8.25v4.5" />
    ),
  },
  {
    title: "Consent Analytics",
    description:
      "Track consent rates, preference trends, policy performance, and audit activity over time.",
    icon: (
      <path d="M5.25 18.75V12m6.75 6.75V5.25m6.75 13.5v-9M3.75 20.25h16.5" />
    ),
  },
  {
    title: "SDK",
    description:
      "Embed a lightweight browser SDK that loads notices, applies consent state, and enforces controls.",
    icon: (
      <path d="m8.25 8.25-4.5 3.75 4.5 3.75M15.75 8.25l4.5 3.75-4.5 3.75M13.5 5.25l-3 13.5" />
    ),
  },
  {
    title: "Privacy Controls",
    description:
      "Centralize retention, rights requests, grievance contacts, and evidence needed for privacy operations.",
    icon: (
      <path d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75ZM9 12l2 2 4-4" />
    ),
  },
];

const workflowSteps = [
  {
    title: "Website",
    description: "Add each property that needs a compliant consent experience.",
    icon: (
      <path d="M4.5 6.75h15M6 18.75h12A1.5 1.5 0 0 0 19.5 17.25v-10.5A1.5 1.5 0 0 0 18 5.25H6a1.5 1.5 0 0 0-1.5 1.5v10.5A1.5 1.5 0 0 0 6 18.75ZM8.25 9.75h3M8.25 12.75h7.5" />
    ),
  },
  {
    title: "Configure Policy",
    description: "Define notice copy, purposes, vendors, regions, and preference behavior.",
    icon: (
      <path d="M8.25 6.75h7.5M8.25 10.5h7.5M8.25 14.25h4.5M6.75 3.75h10.5A1.5 1.5 0 0 1 18.75 5.25v13.5l-3-1.5-3 1.5-3-1.5-3 1.5V5.25A1.5 1.5 0 0 1 6.75 3.75Z" />
    ),
  },
  {
    title: "Install SDK",
    description: "Place one lightweight script on your site to load and enforce consent.",
    icon: (
      <path d="m8.25 9-3.75 3 3.75 3M15.75 9l3.75 3-3.75 3M13.5 6l-3 12" />
    ),
  },
  {
    title: "Visitor Consent",
    description: "Visitors see a polished banner and choose the purposes they allow.",
    icon: (
      <path d="M7.5 12.75 10.5 15.75 16.5 8.25M12 21a8.25 8.25 0 1 0 0-16.5A8.25 8.25 0 0 0 12 21Z" />
    ),
  },
  {
    title: "Manage Results",
    description: "Review consent records, scan findings, analytics, and operational controls.",
    icon: (
      <path d="M5.25 18.75h13.5M6.75 15.75v-4.5M12 15.75V6M17.25 15.75v-7.5" />
    ),
  },
];

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Product", href: "#product" },
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#resources" },
      { label: "SDK Guide", href: "#resources" },
      { label: "Compliance Hub", href: "#resources" },
      { label: "Support", href: "#resources" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#company" },
      { label: "Customers", href: "#company" },
      { label: "Contact", href: "#company" },
      { label: "Sign In", href: "/sign-in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#legal" },
      { label: "Terms", href: "#legal" },
      { label: "Security", href: "#legal" },
      { label: "Sign Up", href: "/sign-up" },
    ],
  },
];

export default function Home() {
  return (
    <div className="public-page min-h-screen overflow-hidden text-slate-950">
      <HomeInteractions />
      <HomeNavbar />
      <main>
        <section className="public-section public-section-flow relative">
          <div className="public-gradient-accent absolute left-1/2 top-8 h-72 w-[min(48rem,80vw)] -translate-x-1/2 rounded-full blur-3xl" />
          <div className="public-parallax-slow absolute right-[8%] top-28 hidden h-24 w-24 rounded-3xl border border-white/70 bg-white/40 shadow-sm backdrop-blur md:block" />
          <div className="public-parallax-fast absolute left-[4%] bottom-20 hidden h-16 w-16 rounded-full border border-indigo-100 bg-indigo-100/45 shadow-sm md:block" />

          <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-24 xl:gap-16">
          <div className="public-reveal max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-indigo-100 bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.12em] text-indigo-600 shadow-sm">
              Consent management platform
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              Build trust with consent infrastructure that feels effortless.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              CMP helps SaaS teams launch compliant consent experiences, govern
              vendors, monitor trackers, and keep audit-ready records across every
              website from one polished workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className="btn btn-primary min-h-12 rounded-xl px-5">
                Get Started
              </Link>
              <Link
                href="#product"
                className="btn min-h-12 rounded-xl border border-slate-200 bg-white px-5 text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950"
              >
                See How It Works
              </Link>
            </div>
          </div>

          <div
            id="product"
            className="public-scale-reveal relative mx-auto w-full max-w-2xl lg:max-w-none"
            aria-label="Consent Manager product overview"
          >
            <div className="public-parallax-slow absolute -left-8 top-10 h-32 w-32 rounded-full bg-teal-200/35 blur-3xl" />
            <div className="public-parallax-fast absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-indigo-200/45 blur-3xl" />
            <div className="public-float-card relative rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.55)] backdrop-blur">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Workspace</p>
                    <p className="text-sm font-semibold text-slate-950">Privacy Control Center</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Live
                  </span>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-3">
                  {consentMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 p-4 pt-0 lg:grid-cols-[1fr_0.78fr]">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-950">Consent performance</p>
                      <p className="text-xs font-medium text-slate-500">Last 30 days</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        ["Necessary", "100%"],
                        ["Analytics", "76%"],
                        ["Marketing", "58%"],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-600">
                            <span>{label}</span>
                            <span>{value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-indigo-600"
                              style={{ width: value }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
                    <p className="text-sm font-semibold">Tracker scan</p>
                    <p className="mt-1 text-xs text-slate-400">shop.example.com</p>
                    <div className="mt-5 space-y-3">
                      {["Analytics vendor mapped", "Marketing pixel blocked", "Policy version published"].map(
                        (item) => (
                          <div key={item} className="flex items-center gap-3 text-xs text-slate-200">
                            <span className="h-2 w-2 rounded-full bg-teal-400" />
                            <span>{item}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-7 left-4 right-4 hidden grid-cols-2 gap-3 lg:grid">
              {heroShowcaseCards.map((card, index) => (
                <div
                  key={card.label}
                  className="public-float rounded-2xl border border-white/80 bg-white/90 p-3 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.55)] backdrop-blur"
                  style={{ animationDelay: `${index * 180}ms` }}
                >
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${card.tone}`}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          </div>
        </section>

        <section id="features" className="public-section public-section-flow border-t border-slate-200/80 bg-white">
          <div className="public-parallax-slow absolute right-0 top-20 h-56 w-56 rounded-full bg-indigo-100/45 blur-3xl" />
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="public-reveal max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-indigo-600">
                Features
              </p>
              <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-4xl">
                Everything your team needs to run consent with confidence.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                CMP brings consent UX, tracker discovery, governance workflows, and
                reporting into a simple operating layer for privacy-focused teams.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className="public-reveal public-float-card rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      {feature.icon}
                    </svg>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-normal text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="public-section public-section-flow border-t border-slate-200/80 bg-[#f6f7fb]">
          <div className="public-parallax-fast absolute left-[-3rem] top-24 h-64 w-64 rounded-full bg-teal-100/55 blur-3xl" />
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="public-reveal mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-indigo-600">
                How it works
              </p>
              <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-4xl">
                From website setup to consent insight in five focused steps.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                A simple operating flow helps teams publish, enforce, and monitor
                consent without stitching together separate tools.
              </p>
            </div>

            <div className="mt-12 grid gap-4 lg:grid-cols-5">
              {workflowSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="public-reveal public-float-card relative rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm"
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  {index < workflowSteps.length - 1 ? (
                    <div
                      aria-hidden="true"
                      className="absolute left-1/2 top-full hidden h-4 w-px bg-slate-200 lg:left-auto lg:right-[-0.5rem] lg:top-10 lg:block lg:h-px lg:w-4"
                    />
                  ) : null}
                  <div className="flex items-start gap-4 lg:block">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        {step.icon}
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 lg:mt-5">
                        <span className="text-xs font-semibold text-indigo-600">
                          Step {index + 1}
                        </span>
                        {index < workflowSteps.length - 1 ? (
                          <span className="text-xs font-medium text-slate-400 lg:hidden">
                            -&gt;
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-1.5 text-base font-semibold tracking-normal text-slate-950">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="public-scale-reveal mt-8 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur sm:p-5">
              <div className="flex flex-col gap-3 text-sm font-medium text-slate-600 sm:flex-row sm:items-center sm:justify-center">
                {workflowSteps.map((step, index) => (
                  <div key={step.title} className="flex items-center gap-3">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                      {step.title}
                    </span>
                    {index < workflowSteps.length - 1 ? (
                      <span aria-hidden="true" className="hidden text-slate-300 sm:inline">
                        -&gt;
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="public-section border-t border-slate-200/80 bg-white">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="public-scale-reveal relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 px-6 py-12 text-center shadow-[0_30px_100px_-48px_rgba(15,23,42,0.78)] sm:px-10 lg:px-16">
              <div className="public-gradient-accent absolute inset-x-10 top-0 h-28 rounded-full blur-3xl" />
              <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-indigo-200">
                Ready to launch
              </p>
              <h2 className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-normal text-white sm:text-4xl">
                Start managing consent, vendors, and privacy controls from one focused workspace.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Give your team the tools to publish compliant notices, enforce preferences,
                and keep every consent decision audit-ready.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="btn min-h-12 rounded-xl bg-white px-5 text-slate-950 shadow-sm hover:bg-slate-100"
                >
                  Get Started
                </Link>
                <Link
                  href="/sign-in"
                  className="btn min-h-12 rounded-xl border border-white/15 bg-white/10 px-5 text-white hover:bg-white/15"
                >
                  Sign In
                </Link>
              </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="site-footer" className="public-section border-t border-slate-200/80 bg-white">
        <div className="public-parallax-slow absolute bottom-0 right-8 h-44 w-44 rounded-full bg-indigo-100/35 blur-3xl" />
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-3 rounded-xl text-slate-950 transition hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500"
                aria-label="CMP home"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm">
                  CMP
                </span>
                <span className="text-sm font-semibold tracking-normal">Consent Manager</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
                Consent infrastructure for SaaS teams that need clean visitor
                experiences and reliable privacy operations.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/sign-in" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
                  Sign In
                </Link>
                <span aria-hidden="true" className="text-slate-300">
                  /
                </span>
                <Link href="/sign-up" className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700">
                  Sign Up
                </Link>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {footerGroups.map((group) => (
                <div key={group.title}>
                  <h2 className="text-sm font-semibold text-slate-950">{group.title}</h2>
                  <ul className="mt-4 space-y-3">
                    {group.links.map((link) => (
                      <li key={`${group.title}-${link.label}`}>
                        <Link
                          href={link.href}
                          className="text-sm text-slate-600 transition hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; 2026 Consent Manager. All rights reserved.</p>
            <p>Built for privacy-first teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
