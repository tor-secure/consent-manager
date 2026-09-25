"use client";

import { useEffect, useState } from "react";

const steps = [
  {
    n: "01",
    title: "Add your website",
    body: "Register the domain you will install on.",
    scene: "domain",
  },
  {
    n: "02",
    title: "Create a policy",
    body: "Start from a DPDP or GDPR template and attach purposes.",
    scene: "policy",
  },
  {
    n: "03",
    title: "Design the banner",
    body: "Pick a Banner Studio template and save the draft.",
    scene: "banner",
  },
  {
    n: "04",
    title: "Publish",
    body: "Fix the short checklist, then publish so the SDK can serve it.",
    scene: "publish",
  },
  {
    n: "05",
    title: "Install the snippet",
    body: "Paste the ConsentGuru block first in your site head.",
    scene: "install",
  },
] as const;

const INSTALL_SNIPPET = `<meta name="cmp-site-verification" content="your-verification-token" />

<!-- Consent Management Platform. Keep this as the first script in <head>. -->
<!-- Optional tags must use type="text/plain" and data-cmp-purpose. -->
<link rel="preconnect" href="https://www.consentguru.com" crossorigin>
<link rel="dns-prefetch" href="https://www.consentguru.com">
<script>
  gtag("consent", "default", {
    ad_storage: "denied",
    analytics_storage: "denied",
    wait_for_update: 500
  });
</script>
<script src="https://www.consentguru.com/api/sdk/script"
  data-site-key="site_your_site_key"></script>
<!-- /CMP -->`;

function SiteCanvas({ scene, playing }: { scene: (typeof steps)[number]["scene"]; playing: boolean }) {
  const showBanner = scene === "banner" || scene === "publish" || scene === "install";
  const showSnippet = scene === "install";

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_28px_70px_-32px_rgba(11,44,74,0.45)]">
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
        <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1 text-[12px] text-[#334155]">
          <span className="text-[#00A88F]" aria-hidden="true">●</span>
          <span className="truncate font-medium">https://shop.example.com</span>
          {scene === "publish" || scene === "install" ? (
            <span className={`ml-auto rounded-full bg-[#E6F9F5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0B2C4A] ${playing && scene === "publish" ? "how-it-works-pulse" : ""}`}>
              Live
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-[22rem] bg-[#F7FBFA]">
        {showSnippet ? (
          <div className="max-h-44 overflow-auto border-b border-[#0B2C4A] bg-[#071525] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5EEAD4]">head · ConsentGuru snippet</p>
            <pre className="mt-2 overflow-x-auto text-[11px] leading-5 text-[#A5F3FC]">{INSTALL_SNIPPET}</pre>
          </div>
        ) : null}

        <div className={`px-4 py-4 sm:px-5 ${scene === "domain" ? "opacity-40" : ""}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold tracking-tight text-[#0B2C4A]">Northwind Shop</p>
            <p className="text-[11px] text-[#64748B]">New arrivals</p>
          </div>
          <div className="mt-3 rounded-xl bg-gradient-to-r from-[#0B2C4A] to-[#0E7490] px-4 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#99F6E4]">This season</p>
            <p className="mt-1 text-lg font-bold">Linen, made to last</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["Shirt", "Tote", "Lamp"].map((item) => (
              <div key={item} className="rounded-lg border border-[#E5E7EB] bg-white p-2">
                <div className="h-10 rounded-md bg-[#E6F9F5]" />
                <p className="mt-1.5 text-[11px] font-semibold text-[#0F172A]">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {scene === "domain" ? (
          <div className="absolute inset-x-4 top-16 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-lg sm:inset-x-10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#00A88F]">Add website</p>
            <p className="mt-2 rounded-lg border border-[#D1D5DB] bg-[#F8FAFC] px-3 py-2 font-mono text-sm text-[#0F172A]">shop.example.com</p>
            <div className={`mt-3 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB] ${playing ? "how-it-works-bar" : ""}`}>
              <div className="h-full w-2/3 rounded-full bg-[#00C4A7]" />
            </div>
            <p className="mt-2 text-xs text-[#64748B]">Domain verified · India region</p>
          </div>
        ) : null}

        {scene === "policy" ? (
          <div className="absolute inset-y-3 right-3 w-[min(100%,14rem)] rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#00A88F]">Policy</p>
            <ul className="mt-2 space-y-1.5">
              {["DPDP 2023 template", "Analytics, optional", "Advertising, optional"].map((line) => (
                <li key={line} className="flex items-center justify-between rounded-lg bg-[#F8FAFC] px-2.5 py-2 text-[12px] text-[#0F172A]">
                  {line}
                  <span className="text-[#00A88F]" aria-hidden="true">✓</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showBanner ? (
          <div className="absolute inset-x-3 bottom-3 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-[0_12px_30px_-16px_rgba(11,44,74,0.45)]">
            <p className="text-sm font-bold text-[#0F172A]">We use cookies to remember your choices</p>
            <p className="mt-0.5 text-[11px] text-[#64748B]">Analytics and ads stay off until you accept.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-lg bg-[#0B2C4A] px-3 py-1.5 text-[11px] font-semibold text-white">Accept</span>
              <span className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-[11px] font-semibold text-[#0F172A]">Reject</span>
              <span className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#0B2C4A]">Preferences</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HomeHowItWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      setActive((index) => (index + 1) % steps.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [paused]);

  const step = steps[active] ?? steps[0];

  return (
    <section id="how-it-works" className="overflow-x-clip bg-white">
      <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 py-[clamp(3.5rem,6vw,5rem)] min-[400px]:px-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00C4A7]">How it works</p>
        <h2 className="mt-2 text-[clamp(1.6rem,1.15rem+2vw,2.25rem)] font-bold tracking-tight text-[#111827]">
          Live in five steps
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5563] sm:text-base">
          Watch the path you follow in the dashboard: website, policy, banner, publish, then install.
        </p>

        <div className="mt-10 grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <ol className="space-y-2">
            {steps.map((item, index) => {
              const selected = index === active;
              return (
                <li key={item.n}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(index);
                      setPaused(true);
                    }}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-[#00C4A7] bg-[#E6F9F5] shadow-sm"
                        : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        selected ? "bg-[#00C4A7] text-[#0B2C4A]" : "bg-[#F3F4F6] text-[#6B7280]"
                      }`}
                    >
                      {item.n}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[#111827]">{item.title}</span>
                      <span className="mt-0.5 block text-justify text-[13px] leading-5 text-[#6B7280]">{item.body}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <SiteCanvas scene={step.scene} playing={!paused} />
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {steps.map((item, index) => (
                <span
                  key={item.n}
                  className={`h-1.5 flex-1 rounded-full ${index === active ? "bg-[#00C4A7]" : "bg-[#E5E7EB]"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
