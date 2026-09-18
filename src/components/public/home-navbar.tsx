"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowButton } from "@/components/ui/arrow-button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { WhatsAppFloat } from "@/components/public/whatsapp-float";

const navItems: Array<{
  label: string;
  href: string;
  hash?: string;
}> = [
  { label: "Product", href: "/#product", hash: "#product" },
  { label: "How it works", href: "/#how-it-works", hash: "#how-it-works" },
  { label: "Solutions", href: "/#solutions", hash: "#solutions" },
  { label: "Why us", href: "/#comparison", hash: "#comparison" },
  { label: "Blogs", href: "/blogs" },
  { label: "E learning", href: "/e-learning" },
  { label: "Pricing", href: "/#pricing", hash: "#pricing" },
];

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

function GuestAuthButtons({
  mobile,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <ArrowButton href="/sign-in" onClick={onNavigate} className={mobile ? "w-full" : undefined}>
        Log in
      </ArrowButton>
      <ArrowButton href="/sign-up" onClick={onNavigate} className={mobile ? "w-full" : undefined}>
        Sign up
      </ArrowButton>
    </>
  );
}

function ClerkAuthButtons({
  mobile,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <span
        aria-hidden="true"
        className={mobile ? "h-10 rounded-lg bg-[#F3F4F6] sm:col-span-2" : "h-10 w-44 rounded-lg bg-[#F3F4F6]"}
      />
    );
  }

  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={
          mobile
            ? "inline-flex h-10 items-center justify-center rounded-lg bg-[#0B2C4A] px-4 text-sm font-semibold text-white sm:col-span-2"
            : "inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#0B2C4A] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00C4A7]"
        }
      >
        Open workspace
        {mobile ? null : <span aria-hidden="true">→</span>}
      </Link>
    );
  }

  return <GuestAuthButtons mobile={mobile} onNavigate={onNavigate} />;
}

function AuthButtons({
  mobile,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  if (!clerkPublishableKey) {
    return <GuestAuthButtons mobile={mobile} onNavigate={onNavigate} />;
  }
  return <ClerkAuthButtons mobile={mobile} onNavigate={onNavigate} />;
}

export function HomeNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  function itemHref(item: (typeof navItems)[number]) {
    if (item.hash && pathname === "/") {
      return item.hash;
    }
    return item.href;
  }

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white">
      <nav
        aria-label="Primary"
        className="mx-auto flex min-h-[72px] max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8"
      >
        <Link href="/" className="flex items-center" aria-label="Consent Guru home">
          <BrandLogo height={40} priority />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={itemHref(item)}
              data-smooth-anchor={item.hash ? true : undefined}
              onClick={() => setMobileOpen(false)}
              className={`inline-flex items-center rounded-lg px-3 py-2 text-[14px] font-medium transition hover:bg-[#F3F4F6] hover:text-[#111827] ${
                (item.href === "/blogs" && pathname.startsWith("/blogs")) ||
                (item.href === "/e-learning" && pathname.startsWith("/e-learning"))
                  ? "bg-[#F3F4F6] text-[#111827]"
                  : "text-[#374151]"
              }`}
              aria-current={
                (item.href === "/blogs" && pathname.startsWith("/blogs")) ||
                (item.href === "/e-learning" && pathname.startsWith("/e-learning"))
                  ? "page"
                  : undefined
              }
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <AuthButtons />
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#111827] lg:hidden"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="mobile-navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true" className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition ${
                mobileOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition ${
                mobileOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </nav>

      <div
        id="mobile-navigation"
        hidden={!mobileOpen}
        className={`grid border-t border-[#E5E7EB] bg-white transition-[grid-template-rows,opacity] duration-300 lg:hidden ${
          mobileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-5 py-4 sm:px-8">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={itemHref(item)}
                data-smooth-anchor={item.hash ? true : undefined}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[#374151]"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-[#E5E7EB] pt-4 sm:grid-cols-2">
              <AuthButtons mobile onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      </div>
    </header>
    <WhatsAppFloat />
    </>
  );
}
