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
    body: "Paste one script in your site head and verify the published config.",
    scene: "install",
  },
] as const;

function Scene({ scene, playing }: { scene: (typeof steps)[number]["scene"]; playing: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#071525] p-4 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)]">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
        <span className="ml-3 truncate rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
          consentguru.com
        </span>
      </div>

      {scene === "domain" ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5EEAD4]">Website</p>
          <div className="rounded-xl bg-white/10 px-3 py-2 font-mono text-sm text-white">
            shop.example.com
          </div>
          <div className={`h-2 overflow-hidden rounded-full bg-white/10 ${playing ? "how-it-works-bar" : ""}`}>
            <div className="h-full w-2/3 rounded-full bg-[#00C4A7]" />
          </div>
          <p className="text-xs text-white/60">Domain verified · India region</p>
        </div>
      ) : null}

      {scene === "policy" ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5EEAD4]">Policy</p>
          {["DPDP 2023 template", "Analytics (optional)", "Advertising (optional)"].map((line, i) => (
            <div
              key={line}
              className="flex items-center justify-between rounded-lg bg-white/8 px-3 py-2 text-sm text-white"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {line}
              <span className="text-[#34D399]">✓</span>
            </div>
          ))}
        </div>
      ) : null}

      {scene === "banner" ? (
        <div className="rounded-xl bg-[#F8FAFC] p-4 text-[#0F172A]">
          <p className="text-sm font-bold">We use cookies to remember your choices</p>
          <p className="mt-1 text-xs text-[#64748B]">Analytics and ads stay off until you accept.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-lg bg-[#0B2C4A] px-3 py-1.5 text-xs font-semibold text-white">Accept</span>
            <span className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-xs font-semibold">Reject</span>
          </div>
        </div>
      ) : null}

      {scene === "publish" ? (
        <div className="space-y-3 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5EEAD4]">Go live</p>
          <div className="rounded-xl border border-[#00C4A7]/40 bg-[#00C4A7]/10 px-4 py-6 text-center">
            <p className={`text-3xl font-extrabold text-[#5EEAD4] ${playing ? "how-it-works-pulse" : ""}`}>LIVE</p>
            <p className="mt-1 text-sm text-white/70">Published to shop.example.com</p>
          </div>
        </div>
      ) : null}

      {scene === "install" ? (
        <pre className="overflow-x-auto rounded-xl bg-black/40 p-3 text-[11px] leading-5 text-[#A5F3FC]">
{`<script src="https://consentguru.com/sdk.js"
  data-site="shop.example.com"
  async></script>`}
        </pre>
      ) : null}
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
            <Scene scene={step.scene} playing={!paused} />
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
