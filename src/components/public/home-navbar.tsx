"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "Platform", href: "#features" },
  { label: "Workflow", href: "#how-it-works" },
  { label: "Security", href: "#solutions" },
  { label: "Developers", href: "#resources" },
];

export function HomeNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoaded, isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="public-container flex min-h-20 items-center justify-between gap-4 py-3"
      >
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg text-[var(--foreground)] transition hover:text-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)]"
          aria-label="CMP home"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--primary)] text-[13px] font-semibold tracking-[0.08em] text-[var(--primary-foreground)]">
            CMP
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold leading-none tracking-tight">Consent Manager</span>
            <span className="mt-1 hidden text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)] sm:block">
              Privacy operations
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              data-smooth-anchor
              className="rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-[var(--muted-foreground)] transition duration-200 ease-out hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          {!isLoaded ? (
            <span aria-hidden="true" className="h-11 w-40 rounded-lg bg-[var(--muted)]" />
          ) : isSignedIn ? (
            <Link href="/dashboard" className="btn btn-primary min-h-11 rounded-lg px-5">
              Open workspace
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg px-3.5 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition duration-200 ease-out hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                Sign In
              </Link>
              <Link href="/sign-up" className="btn btn-primary min-h-11 rounded-lg px-5">
                Get Started
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle className="hidden sm:inline-flex" />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
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
        </div>
      </nav>

      <div
        id="mobile-navigation"
        className={`grid border-t border-[var(--border)] bg-[var(--card)] transition-[grid-template-rows,opacity] duration-300 ease-out lg:hidden ${
          mobileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="public-container flex flex-col gap-1 py-5">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                data-smooth-anchor
                className="rounded-lg px-3 py-3 text-sm font-medium text-[var(--secondary-foreground)] transition duration-200 ease-out hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4 sm:hidden">
              <p className="text-sm text-[var(--muted-foreground)]">Appearance</p>
              <ThemeToggle />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {!isLoaded ? (
                <span aria-hidden="true" className="h-11 rounded-lg bg-[var(--muted)] sm:col-span-2" />
              ) : isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="btn btn-primary min-h-11 rounded-lg sm:col-span-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Open workspace
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="btn btn-secondary min-h-11 rounded-lg"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="btn btn-primary min-h-11 rounded-lg"
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
