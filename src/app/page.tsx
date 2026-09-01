import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { HomeProductPreview } from "@/components/public/home-product-preview";
import Link from "next/link";

const productFacts = [
  "Tenant-scoped workspaces",
  "Consent records and audit history",
  "Browser SDK, APIs, and webhooks",
];

const valueProps = [
  {
    title: "Publish notices companies can maintain",
    description:
      "Configure banners, preference centers, and policy versions from one workspace instead of ad-hoc site code.",
  },
  {
    title: "Govern purposes, vendors, and trackers",
    description:
      "Map what you collect, who processes it, and which scripts appear on each property.",
  },
  {
    title: "Keep operational evidence close",
    description:
      "Review consent activity, scans, rights requests, and administrative changes without leaving the product.",
  },
];

const features = [
  {
    title: "Consent Management",
    description:
      "Launch consent banners, preference centers, and policy versions that privacy teams can update without a release cycle for every copy change.",
    icon: (
      <path d="M9 12.75 11.25 15 15 9.75M12 3.75l6 2.25v4.5c0 3.7-2.45 7.15-6 8.25-3.55-1.1-6-4.55-6-8.25V6l6-2.25Z" />
    ),
  },
  {
    title: "Purpose & Vendor Management",
    description:
      "Organize purposes, vendors, and legal context so notices stay aligned with how the business actually uses data.",
    icon: (
      <path d="M7.5 7.5h9M7.5 12h9M7.5 16.5h5.25M5.25 3.75h13.5c.83 0 1.5.67 1.5 1.5v13.5c0 .83-.67 1.5-1.5 1.5H5.25c-.83 0-1.5-.67-1.5-1.5V5.25c0-.83.67-1.5 1.5-1.5Z" />
    ),
  },
  {
    title: "Tracker Scanner",
    description:
      "Scan a site for scripts, pixels, cookies, and third-party tags, then review findings against the vendors you already manage.",
    icon: (
      <path d="M10.5 18.75a8.25 8.25 0 1 1 5.83-14.08 8.25 8.25 0 0 1-5.83 14.08ZM16.5 16.5l3.75 3.75M8.25 10.5h4.5M10.5 8.25v4.5" />
    ),
  },
  {
    title: "Consent Analytics",
    description:
      "Inspect consent activity, purpose trends, and workspace reporting from the same control center used to publish notices.",
    icon: (
      <path d="M5.25 18.75V12m6.75 6.75V5.25m6.75 13.5v-9M3.75 20.25h16.5" />
    ),
  },
  {
    title: "SDK & enforcement",
    description:
      "Install a lightweight browser SDK that loads notices, records choices, and applies preference state on the property.",
    icon: (
      <path d="m8.25 8.25-4.5 3.75 4.5 3.75M15.75 8.25l4.5 3.75-4.5 3.75M13.5 5.25l-3 13.5" />
    ),
  },
  {
    title: "Privacy operations",
    description:
      "Handle rights requests, retention settings, grievance contacts, and audit logs alongside consent configuration.",
    icon: (
      <path d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75ZM9 12l2 2 4-4" />
    ),
  },
];

const workflowSteps = [
  {
    title: "Add a website",
    description: "Register each property that needs a consent experience.",
  },
  {
    title: "Configure policy",
    description: "Define notice copy, purposes, vendors, regions, and preference behavior.",
  },
  {
    title: "Install the SDK",
    description: "Place one script so the site can load and enforce consent state.",
  },
  {
    title: "Collect visitor choices",
    description: "Visitors see the banner or preference center and record their decisions.",
  },
  {
    title: "Operate the workspace",
    description: "Review records, scans, analytics, and requests from the dashboard.",
  },
];

const privacyControls = [
  {
    title: "Tenant isolation",
    description: "Organization data stays scoped to the signed-in workspace.",
  },
  {
    title: "Audit history",
    description: "Keep operational records of consent activity and administrative changes.",
  },
  {
    title: "Rights requests",
    description: "Intake and track data-subject requests from a dedicated workspace queue.",
  },
  {
    title: "Retention controls",
    description: "Configure how long consent and related records are kept in the organization.",
  },
];

const platformCapabilities = [
  {
    title: "Browser SDK",
    description: "Load notices, record consent, and apply preference state from a lightweight script.",
  },
  {
    title: "API keys",
    description: "Issue organization-scoped keys for dashboard-adjacent developer workflows.",
  },
  {
    title: "Webhooks",
    description: "Subscribe to consent and operational events for downstream systems.",
  },
  {
    title: "Tracker scanner",
    description: "Scan a site for scripts, pixels, cookies, and third-party tags your team already manages.",
  },
];

const monitoringItems = [
  {
    title: "Consent activity",
    description: "See granted and withdrawn records in the analytics workspace.",
  },
  {
    title: "Scan findings",
    description: "Review detected trackers against mapped vendors and purposes.",
  },
  {
    title: "Notifications",
    description: "Stay current on operational events from inside the product.",
  },
];

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "#product" },
      { label: "Platform", href: "#features" },
      { label: "Workflow", href: "#how-it-works" },
      { label: "Get started", href: "#pricing" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Security", href: "#solutions" },
      { label: "Developers", href: "#resources" },
      { label: "Analytics", href: "#monitoring" },
      { label: "Sign In", href: "/sign-in" },
    ],
  },
  {
    title: "Workspace",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Sign Up", href: "/sign-up" },
      { label: "About", href: "#company" },
    ],
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
}) {
  return (
    <div className={["public-reveal max-w-2xl", align === "center" ? "mx-auto text-center" : ""].join(" ")}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-[2.15rem]">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="public-page min-h-screen text-[var(--foreground)]">
      <HomeInteractions />
      <HomeNavbar />
      <main>
        <section className="public-hero public-section-flow">
          <div className="public-container grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16 lg:py-24 xl:py-28">
            <div className="max-w-xl">
              <p className="animate-fade-up hero-stagger-1 mb-5 inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                Consent management platform
              </p>
              <h1 className="animate-fade-up hero-stagger-2 text-balance text-[2.15rem] font-semibold leading-[1.12] tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-[3.35rem]">
                Privacy operations for companies that need consent they can actually run.
              </h1>
              <p className="animate-fade-up hero-stagger-3 mt-6 max-w-lg text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
                Consent Manager helps privacy, legal, and engineering teams publish notices,
                collect visitor choices, map vendors and trackers, and keep records in one
                tenant-scoped workspace.
              </p>
              <div className="animate-fade-up hero-stagger-4 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/sign-up" className="btn btn-primary min-h-12 rounded-lg px-5">
                  Get Started
                </Link>
                <Link href="#how-it-works" className="btn btn-secondary min-h-12 rounded-lg px-5">
                  See the workflow
                </Link>
              </div>
              <ul className="animate-fade-up hero-stagger-5 mt-8 space-y-2 text-sm text-[var(--muted-foreground)]">
                {productFacts.map((fact) => (
                  <li key={fact} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
            <HomeProductPreview />
          </div>
        </section>

        <section className="public-section public-section-flow public-section-alt border-t border-[var(--border)]">
          <div className="public-container py-16 sm:py-20 lg:py-24">
            <SectionHeading
              eyebrow="Why it exists"
              title="A control center for consent, not a pile of disconnected tools."
              description="The product is built for companies that need banners, vendor maps, scans, and records in the same operating layer."
            />
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {valueProps.map((item) => (
                <article
                  key={item.title}
                  className="public-reveal border-t border-[var(--border)] pt-6"
                >
                  <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="public-section public-section-flow public-section-deep border-t border-[var(--border)]">
          <div className="public-container py-16 sm:py-20 lg:py-24">
            <SectionHeading
              align="center"
              eyebrow="Workflow"
              title="From website setup to operational insight."
              description="A linear path: register the property, configure policy, install the SDK, collect choices, then manage the results."
            />
            <ol className="mt-12 grid gap-4 lg:grid-cols-5">
              {workflowSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="public-reveal rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                    0{index + 1}
                  </p>
                  <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="public-section public-section-flow public-section-alt border-t border-[var(--border)]">
          <div className="public-container py-16 sm:py-20 lg:py-24">
            <SectionHeading
              eyebrow="Platform"
              title="The capabilities already in the workspace."
              description="Consent UX, governance, scanning, analytics, SDK enforcement, and privacy operations share one visual and data model."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="public-reveal public-float-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--primary)]">
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
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-[var(--foreground)]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="solutions" className="public-section public-section-flow border-t border-[var(--border)]">
          <div className="public-container py-16 sm:py-20 lg:py-24">
            <SectionHeading
              eyebrow="Security & privacy"
              title="Built around control, isolation, and records."
              description="Consent Manager is organized around tenant-scoped workspaces and operational history. It does not replace legal advice or claim certifications that are not documented here."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {privacyControls.map((item) => (
                <article
                  key={item.title}
                  className="public-reveal rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
                >
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="resources" className="public-section public-section-flow public-section-alt border-t border-[var(--border)]">
          <div className="public-container grid items-start gap-12 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
            <SectionHeading
              eyebrow="Developers"
              title="SDK, keys, webhooks, and scans in the same product."
              description="These are existing modules in the workspace, not a partner marketplace or implied certifications."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {platformCapabilities.map((item) => (
                <article
                  key={item.title}
                  className="public-reveal rounded-xl border border-[var(--border)] bg-[var(--background)] p-5"
                >
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="monitoring" className="public-section public-section-flow public-section-deep border-t border-[var(--border)]">
          <div className="public-container py-16 sm:py-20 lg:py-24">
            <SectionHeading
              eyebrow="Monitoring"
              title="See what visitors chose and what the site is loading."
              description="Analytics, scanner results, and in-product notifications stay inside the same shell used to configure consent."
            />
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {monitoringItems.map((item) => (
                <article
                  key={item.title}
                  className="public-reveal rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
                >
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="public-section border-t border-[var(--border)]">
          <div className="public-container py-16 sm:py-20 lg:py-24">
            <div className="public-scale-reveal relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[#10192b] px-6 py-14 text-center sm:px-10 lg:px-16">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_70%)]" />
              <div className="relative">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,white_70%,var(--accent))]">
                  Start in the workspace
                </p>
                <h2 className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                  Run consent, vendors, and privacy operations from one product.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/65">
                  Create an organization, add a website, and configure the notice your visitors will see.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/sign-up" className="btn min-h-12 rounded-lg bg-white px-5 text-[#10192b] hover:bg-white/90">
                    Get Started
                  </Link>
                  <Link
                    href="/sign-in"
                    className="btn min-h-12 rounded-lg border border-white/15 bg-white/5 px-5 text-white hover:bg-white/10"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="site-footer" className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="public-container py-14">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_1.85fr]">
            <div id="company">
              <Link
                href="/"
                className="inline-flex items-center gap-3 rounded-lg text-[var(--foreground)] transition hover:text-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)]"
                aria-label="CMP home"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)] text-[12px] font-semibold text-[var(--primary-foreground)]">
                  CMP
                </span>
                <span className="text-sm font-semibold">Consent Manager</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">
                Consent infrastructure for teams that need clear visitor experiences and
                reliable privacy operations.
              </p>
            </div>
            <div id="legal" className="grid gap-8 sm:grid-cols-3">
              {footerGroups.map((group) => (
                <div key={group.title}>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">{group.title}</h2>
                  <ul className="mt-4 space-y-3">
                    {group.links.map((link) => (
                      <li key={`${group.title}-${link.label}`}>
                        <Link
                          href={link.href}
                          className="text-sm text-[var(--muted-foreground)] transition hover:text-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
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
          <div className="mt-12 flex flex-col gap-3 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; 2026 Consent Manager. All rights reserved.</p>
            <p>Privacy, security, and consent operations.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
