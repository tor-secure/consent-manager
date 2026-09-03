"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

const navItems: Array<{
  label: string;
  href: string;
  hasDropdown?: boolean;
}> = [
  { label: "Product", href: "#product", hasDropdown: true },
  { label: "Solutions", href: "#solutions", hasDropdown: true },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#resources", hasDropdown: true },
  { label: "Developers", href: "#resources" },
];

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ml-1 opacity-70">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#5850EC" />
      <path
        d="M20 8.5l9 3.5v7.2c0 5.4-3.6 10.3-9 12.1-5.4-1.8-9-6.7-9-12.1v-7.2L20 8.5z"
        fill="white"
        fillOpacity="0.22"
      />
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

export function HomeNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoaded, isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white">
      <nav
        aria-label="Primary"
        className="mx-auto flex min-h-[72px] max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8"
      >
        <Link href="/" className="flex items-center gap-3" aria-label="ConsentFlow home">
          <ShieldLogo />
          <span className="flex min-w-0 flex-col">
            <span className="text-[17px] font-bold leading-none tracking-tight text-[#111827]">
              ConsentFlow
            </span>
            <span className="mt-1 hidden text-[11px] font-medium leading-none text-[#6B7280] sm:block">
              Consent Management Platform
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              data-smooth-anchor
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center rounded-lg px-3 py-2 text-[14px] font-medium text-[#374151] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
            >
              {item.label}
              {item.hasDropdown ? <ChevronDown /> : null}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {!isLoaded ? (
            <span aria-hidden="true" className="h-10 w-44 rounded-lg bg-[#F3F4F6]" />
          ) : isSignedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#5850EC] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4F46E5]"
            >
              Open workspace
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#374151] transition hover:text-[#111827]"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#5850EC] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4F46E5]"
              >
                Get Started Free
                <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
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
        className={`grid border-t border-[#E5E7EB] bg-white transition-[grid-template-rows,opacity] duration-300 lg:hidden ${
          mobileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-5 py-4 sm:px-8">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                data-smooth-anchor
                className="rounded-lg px-3 py-3 text-sm font-medium text-[#374151]"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-[#E5E7EB] pt-4 sm:grid-cols-2">
              {!isLoaded ? (
                <span aria-hidden="true" className="h-10 rounded-lg bg-[#F3F4F6] sm:col-span-2" />
              ) : isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#5850EC] px-4 text-sm font-semibold text-white sm:col-span-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Open workspace
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#374151]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#5850EC] px-4 text-sm font-semibold text-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
