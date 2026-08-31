"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Resources", href: "#resources" },
  { label: "Pricing", href: "#pricing" },
];

export function HomeNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoaded, isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl text-slate-950 transition hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500"
          aria-label="CMP home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm">
            CMP
          </span>
          <span className="text-sm font-semibold tracking-normal">Consent Manager</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              data-smooth-anchor
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {!isLoaded ? (
            <span
              aria-hidden="true"
              className="h-10 w-36 rounded-xl bg-slate-100"
            />
          ) : isSignedIn ? (
            <Link href="/dashboard" className="btn btn-primary min-h-10 rounded-xl px-4">
              Dashboard
            </Link>
          ) : (
            <>
            <Link
              href="/sign-in"
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Sign In
            </Link>
            <Link href="/sign-up" className="btn btn-primary min-h-10 rounded-xl px-4">
              Get Started
            </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 lg:hidden"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="mobile-navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true" className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition duration-200 ${
                mobileOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition duration-200 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition duration-200 ${
                mobileOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </nav>

      <div
        id="mobile-navigation"
        className={`grid border-t border-slate-200/80 bg-white transition-[grid-template-rows,opacity] duration-300 ease-out lg:hidden ${
          mobileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                data-smooth-anchor
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition duration-200 ease-out hover:translate-x-1 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2">
              {!isLoaded ? (
                <span
                  aria-hidden="true"
                  className="h-11 rounded-xl bg-slate-100 sm:col-span-2"
                />
              ) : isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="btn btn-primary min-h-11 rounded-xl sm:col-span-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                <Link
                  href="/sign-in"
                  className="btn btn-secondary min-h-11 rounded-xl"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="btn btn-primary min-h-11 rounded-xl"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started
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
