"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "#product" },
      { label: "Features", href: "#features" },
      { label: "Integrations", href: "#resources" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "#" },
      { label: "Roadmap", href: "#" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "By Industry", href: "#solutions" },
      { label: "By Use Case", href: "#solutions" },
      { label: "For Startups", href: "#solutions" },
      { label: "For Enterprise", href: "#solutions" },
      { label: "For Developers", href: "#resources" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "#" },
      { label: "Guides", href: "#" },
      { label: "Help Center", href: "#" },
      { label: "Documentation", href: "#resources" },
      { label: "Webinars", href: "#" },
      { label: "Privacy Dictionary", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#company", badge: null },
      { label: "Careers", href: "#", badge: "We're Hiring!" },
      { label: "Partners", href: "#" },
      { label: "Customers", href: "#" },
      { label: "Contact Us", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Data Processing Agreement", href: "#" },
      { label: "Cookie Policy", href: "#" },
      { label: "Security", href: "#security" },
      { label: "Trust Center", href: "#" },
    ],
  },
];

function ShieldLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#5850EC" />
      <path
        d="M20 10.2l7.2 2.8v5.8c0 4.4-2.9 8.4-7.2 9.9-4.3-1.5-7.2-5.5-7.2-9.9v-5.8L20 10.2z"
        fill="white"
      />
      <path
        d="M16.2 20.1l2.4 2.4 5.2-5.2"
        stroke="#5850EC"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SocialIcon({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href="#"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F2937] text-white/80 transition hover:bg-[#374151] hover:text-white"
    >
      {children}
    </a>
  );
}

export function HomeFooter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok">("idle");

  function onSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("ok");
    setEmail("");
  }

  return (
    <>
      <section id="resources" className="home-section bg-white px-5 py-10 sm:px-8 sm:py-12">
        <div
          className="home-fade-item relative mx-auto max-w-[1200px] overflow-hidden rounded-2xl px-6 py-8 sm:px-8 lg:px-10"
          style={{
            background:
              "linear-gradient(180deg, #F4F3FF 0%, #EEF2FF 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-50"
            style={{
              background:
                "repeating-linear-gradient(115deg, transparent 0 16px, rgba(88,80,236,0.08) 16px 18px)",
            }}
            aria-hidden="true"
          />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E0E7FF]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M3.75 7.5 12 12.75 20.25 7.5M4.5 18h15A1.5 1.5 0 0 0 21 16.5v-9A1.5 1.5 0 0 0 19.5 6h-15A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18Z"
                    stroke="#4338CA"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16.5 17.25 18 18.75l3-3"
                    stroke="#5850EC"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-balance text-2xl font-bold tracking-tight text-[#111827] sm:text-[1.7rem]">
                  Stay updated on privacy and{" "}
                  <span className="text-[#5850EC]">product updates</span>
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-[#6B7280]">
                  Subscribe to our newsletter and get the latest insights, regulation updates, and
                  product news.
                </p>
              </div>
            </div>

            <div>
              <form onSubmit={onSubscribe} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Email address</span>
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#9CA3AF]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M3.75 7.5 12 12.75 20.25 7.5M4.5 18h15A1.5 1.5 0 0 0 21 16.5v-9A1.5 1.5 0 0 0 19.5 6h-15A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm text-[#111827] outline-none ring-[#5850EC]/30 placeholder:text-[#9CA3AF] focus:ring-2"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#5850EC] px-5 text-sm font-semibold text-white transition hover:bg-[#4F46E5]"
                >
                  Subscribe
                  <span aria-hidden="true">→</span>
                </button>
              </form>
              <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75Z"
                    stroke="#5850EC"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.75 12.5l1.5 1.5 3-3"
                    stroke="#5850EC"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {status === "ok" ? "Thanks — you are on the list." : "No spam. Unsubscribe anytime."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer id="site-footer" className="home-section bg-[#0B1220] text-white">
        <div className="home-fade-item mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.35fr_repeat(5,minmax(0,1fr))]">
            <div id="company" className="max-w-sm">
              <Link href="/" className="inline-flex items-center gap-3" aria-label="ConsentFlow home">
                <ShieldLogo />
                <span className="flex flex-col">
                  <span className="text-[17px] font-bold leading-none">ConsentFlow</span>
                  <span className="mt-1 text-[11px] font-medium text-white/55">
                    Consent Management Platform
                  </span>
                </span>
              </Link>
              <p className="mt-4 text-sm leading-6 text-white/60">
                The all-in-one consent management platform that helps businesses collect, manage and
                analyze user consent while staying compliant with global privacy laws.
              </p>
              <div className="mt-5 flex items-center gap-2.5">
                <SocialIcon label="LinkedIn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M6.5 9H3.75v11.25H6.5V9ZM5.12 3.75a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM13.1 9h-2.7v11.25h2.7v-5.9c0-1.55.75-2.55 2.15-2.55 1.3 0 1.95.9 1.95 2.55v5.9h2.7v-6.55C19.9 10.1 18.2 9 16.2 9c-1.35 0-2.35.55-2.9 1.5h-.05V9H13.1Z" />
                  </svg>
                </SocialIcon>
                <SocialIcon label="Twitter">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.6 4.5h2.55l-5.58 6.38L21.5 19.5h-5.5l-4.3-5.63L6.7 19.5H4.15l5.97-6.82L2.75 4.5h5.64l3.9 5.15L17.6 4.5Zm-.9 13.5h1.41L7.52 5.93H6.01L16.7 18Z" />
                  </svg>
                </SocialIcon>
                <SocialIcon label="GitHub">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.4c-5.3 0-9.6 4.3-9.6 9.6 0 4.25 2.75 7.85 6.55 9.12.48.09.65-.21.65-.46v-1.62c-2.66.58-3.22-1.13-3.22-1.13-.44-1.1-1.07-1.4-1.07-1.4-.87-.6.07-.59.07-.59.96.07 1.47.99 1.47.99.86 1.47 2.26 1.05 2.81.8.09-.62.34-1.05.61-1.29-2.12-.24-4.36-1.06-4.36-4.73 0-1.05.37-1.9.98-2.57-.1-.24-.43-1.22.09-2.54 0 0 .8-.26 2.63.98a9.1 9.1 0 0 1 4.79 0c1.82-1.24 2.62-.98 2.62-.98.52 1.32.2 2.3.1 2.54.61.67.98 1.52.98 2.57 0 3.68-2.24 4.48-4.38 4.72.35.3.65.88.65 1.78v2.64c0 .25.17.55.66.46A9.61 9.61 0 0 0 21.6 12c0-5.3-4.3-9.6-9.6-9.6Z" />
                  </svg>
                </SocialIcon>
                <SocialIcon label="YouTube">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M21.5 8.1a2.8 2.8 0 0 0-2-2C17.7 5.7 12 5.7 12 5.7s-5.7 0-7.5.4a2.8 2.8 0 0 0-2 2A29.4 29.4 0 0 0 2.1 12a29.4 29.4 0 0 0 .4 3.9 2.8 2.8 0 0 0 2 2c1.8.4 7.5.4 7.5.4s5.7 0 7.5-.4a2.8 2.8 0 0 0 2-2 29.4 29.4 0 0 0 .4-3.9 29.4 29.4 0 0 0-.4-3.9ZM10.1 14.9V9.1L15.2 12l-5.1 2.9Z" />
                  </svg>
                </SocialIcon>
              </div>
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
                        {"badge" in link && link.badge ? (
                          <span className="rounded-full bg-[#5850EC] px-2 py-0.5 text-[10px] font-semibold text-white">
                            {link.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            id="pricing"
            className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/50 lg:flex-row lg:items-center lg:justify-between"
          >
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-white/70 transition hover:bg-white/5 hover:text-white"
              aria-label="Language: English"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="M3 12h18M12 3c2.5 2.7 3.75 5.7 3.75 9S14.5 18.3 12 21c-2.5-2.7-3.75-5.7-3.75-9S9.5 5.7 12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
              English
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <p className="text-center">&copy; 2025 ConsentFlow. All rights reserved.</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold tracking-[0.04em] text-white/70 lg:justify-end">
              <span className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                GDPR COMPLIANT
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path d="M9.75 12.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                CCPA COMPLIANT
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="5.25" y="10.5" width="13.5" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8.25 10.5V7.5a3.75 3.75 0 0 1 7.5 0v3" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                ISO 27001 CERTIFIED
              </span>
            </div>
          </div>
          <div id="security" className="sr-only" aria-hidden="true" />
        </div>
      </footer>
    </>
  );
}
