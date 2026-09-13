"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SkipLink } from "@/components/ui/skip-link";
import { ArrowButton } from "@/components/ui/arrow-button";
import { BrandLogo } from "@/components/brand/brand-logo";

export const clerkAuthAppearance = {
  variables: {
    colorPrimary: "#0B2C4A",
    colorText: "#111827",
    colorTextSecondary: "#6B7280",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#111827",
    colorNeutral: "#374151",
    colorDanger: "#DC2626",
    colorSuccess: "#059669",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "cmp-auth-root w-full",
    cardBox: "w-full shadow-none",
    card:
      "cmp-auth-form-card w-full rounded-2xl border border-solid border-[#E5E7EB] bg-white px-6 py-7 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.28)] sm:px-8 sm:py-8",
    headerTitle: "!text-[#111827] text-[1.75rem] font-bold tracking-tight",
    headerSubtitle: "!text-[#6B7280] text-sm",
    socialButtonsBlockButton:
      "!bg-white !text-[#111827] h-11 rounded-xl border border-solid !border-[#D1D5DB] text-sm font-semibold hover:!bg-[#F9FAFB]",
    socialButtonsBlockButtonText: "!text-[#111827] font-semibold",
    lastAuthenticationStrategyBadge: "!bg-[#E6F9F5] !text-[#0B2C4A]",
    dividerLine: "!bg-[#E5E7EB]",
    dividerText: "!text-[#6B7280] text-xs font-medium",
    formFieldLabel: "!text-[#111827] text-sm font-semibold",
    formFieldInput:
      "!bg-white !text-[#111827] !border-[#D1D5DB] h-11 rounded-xl border border-solid text-sm placeholder:!text-[#9CA3AF] focus:!border-[#0B2C4A] focus:!ring-[#0B2C4A]",
    formButtonPrimary:
      "arrow-btn !w-full justify-center !bg-[#0B2C4A] !text-white hover:!bg-[#00C4A7] shadow-none",
    footerAction: "hidden",
    footerActionText: "hidden",
    footerActionLink: "hidden",
    identityPreviewText: "!text-[#111827]",
    identityPreviewEditButton: "!text-[#0B2C4A]",
    formFieldAction: "!text-[#0B2C4A]",
    footer: "!bg-transparent",
  },
} as const;

const features = [
  {
    title: "Secure & Compliant",
    description: "Enterprise-grade security built for GDPR, CCPA, and global privacy laws.",
    iconBg: "bg-[#E6F9F5]",
    iconColor: "text-[#0B2C4A]",
    icon: (
      <path d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75ZM9.75 12.5l1.5 1.5 3-3" />
    ),
  },
  {
    title: "Powerful Insights",
    description: "Track consent rates and preferences in real time from one dashboard.",
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#2563EB]",
    icon: <path d="M5.25 18.75V12m6.75 6.75V5.25m6.75 13.5v-9" />,
  },
  {
    title: "Seamless Integration",
    description: "Drop-in SDK and APIs that connect with the tools you already use.",
    iconBg: "bg-[#E6F9F5]",
    iconColor: "text-[#00C4A7]",
    icon: (
      <path d="M9.75 8.25 6 12l3.75 3.75M14.25 8.25 18 12l-3.75 3.75M13.5 6l-3 12" />
    ),
  },
];

function BrandPanel({
  badge,
  title,
  description,
  showPlus,
}: {
  badge: string;
  title: string;
  description: string;
  showPlus?: boolean;
}) {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[#F3FAF8] px-7 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,196,167,0.18) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden="true"
      />

      <div className="relative">
        <span className="inline-flex rounded-full border border-[#B7EDE4] bg-white px-3 py-1 text-[12px] font-semibold text-[#0B2C4A]">
          {badge}
        </span>
        <p className="mt-4 max-w-md text-balance text-[1.85rem] font-bold leading-tight tracking-tight text-[#111827] sm:text-[2.05rem]">
          {title}
        </p>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#4B5563]">{description}</p>

        <ul className="mt-8 space-y-4">
          {features.map((item) => (
            <li key={item.title} className="cmp-auth-fade-item flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg} ${item.iconColor}`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {item.icon}
                </svg>
              </span>
              <span>
                <span className="block text-sm font-bold text-[#111827]">{item.title}</span>
                <span className="mt-0.5 block text-[13px] leading-5 text-[#6B7280]">
                  {item.description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-10 hidden lg:block" aria-hidden="true">
        <div className="relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.3)]">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FCA5A5]" />
            <span className="h-2 w-2 rounded-full bg-[#FDE68A]" />
            <span className="h-2 w-2 rounded-full bg-[#86EFAC]" />
            <span className="ml-2 text-[10px] font-medium text-[#9CA3AF]">
              dashboard.consentguru.app
            </span>
          </div>
          <div className="grid grid-cols-[1fr_0.85fr] gap-3">
            <div className="rounded-xl bg-[#F8FAFC] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                Consent rate
              </p>
              <p className="mt-1 text-xl font-bold text-[#111827]">92.6%</p>
              <svg viewBox="0 0 180 56" className="mt-2 h-12 w-full">
                <path
                  d="M0 40 C 30 34, 45 28, 70 30 C 100 33, 120 18, 145 14 C 160 12, 170 16, 180 10"
                  fill="none"
                  stroke="#0B2C4A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex items-center justify-center rounded-xl bg-[#E6F9F5] p-3">
              <svg viewBox="0 0 36 36" className="h-16 w-16">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E0E7FF" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#0B2C4A"
                  strokeWidth="4"
                  strokeDasharray="62 26"
                  transform="rotate(-90 18 18)"
                />
              </svg>
            </div>
          </div>
          <div
            className={`absolute -right-2 -top-3 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg ${
              showPlus ? "bg-[#0B2C4A]" : "bg-[#0B2C4A]"
            }`}
          >
            {showPlus ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="white"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75Z"
                  fill="white"
                />
                <path
                  d="M9.75 12.5l1.5 1.5 3-3"
                  stroke="#0B2C4A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const modeCopy = {
  "sign-in": {
    badge: "Welcome back 👋",
    title: "Log in to your Consent Guru account",
    description: "Access your dashboard and manage consent with confidence.",
    showPlus: false,
  },
  "sign-up": {
    badge: "Create your account ✨",
    title: "Get started with Consent Guru",
    description: "Create your account and start managing consent the right way.",
    showPlus: true,
  },
  "create-org": {
    badge: "Name your workspace",
    title: "Create a Consent Guru organization",
    description: "Add a workspace so you can create websites, publish a policy, and install the banner.",
    showPlus: true,
  },
} as const;

export function AuthPageShell({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: "sign-in" | "sign-up" | "create-org";
}) {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
    return () => {
      if (hadDark) {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      }
    };
  }, []);

  const copy = modeCopy[mode];

  return (
    <div
      className="cmp-auth-page min-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      style={{
        background:
          "radial-gradient(ellipse 55% 35% at 15% 0%, rgba(0,196,167,0.14), transparent 55%), linear-gradient(180deg, #F3F4F6 0%, #E6F9F5 100%)",
      }}
    >
      <SkipLink href="#auth-form" />
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1100px] flex-col">
        <div className="flex flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-[#E5E7EB] bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.4)]">
          <header className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4 sm:px-8">
            <Link href="/" className="inline-flex items-center" aria-label="Consent Guru home">
              <BrandLogo height={36} />
            </Link>

            {mode === "sign-in" ? (
              <div className="flex items-center gap-3">
                <p className="hidden text-sm text-[#4B5563] sm:block">Don&apos;t have an account?</p>
                <ArrowButton href="/sign-up">Sign up</ArrowButton>
              </div>
            ) : mode === "sign-up" ? (
              <div className="flex items-center gap-3">
                <p className="hidden text-sm text-[#4B5563] sm:block">Already have an account?</p>
                <ArrowButton href="/sign-in">Log in</ArrowButton>
              </div>
            ) : (
              <p className="text-sm text-[#4B5563]">
                Already have a workspace?{" "}
                <Link href="/dashboard" className="font-semibold text-[#0B2C4A] hover:text-[#00C4A7]">
                  Open dashboard
                </Link>
              </p>
            )}
          </header>

          <div className="grid flex-1 lg:grid-cols-[0.95fr_1.05fr]">
            <BrandPanel
              badge={copy.badge}
              title={copy.title}
              description={copy.description}
              showPlus={copy.showPlus}
            />

            <div className="flex items-center justify-center bg-[#F9FAFB] px-5 py-8 sm:px-8 lg:px-10">
              <div id="auth-form" key={mode} className="cmp-auth-form-enter w-full max-w-[420px]" tabIndex={-1}>
                {children}
                <p className="mt-5 flex items-start gap-2 text-[12px] leading-5 text-[#6B7280]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[#0B2C4A]"
                  >
                    <path
                      d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M9.75 12.5l1.5 1.5 3-3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                  Your workspace data stays in your organization. Do not share API keys or site keys.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-[#6B7280]">
          By continuing, you start a Consent Guru workspace for consent management.{" "}
          <Link href="/#how-it-works" className="font-medium text-[#0B2C4A] hover:underline">
            See how it works
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
