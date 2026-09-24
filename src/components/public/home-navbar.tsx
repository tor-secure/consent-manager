"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowButton } from "@/components/ui/arrow-button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { WhatsAppFloat } from "@/components/public/whatsapp-float";

type NavLink = {
  label: string;
  href: string;
  hash?: string;
};

type NavGroup = {
  type: "group";
  label: string;
  href: string;
  hash?: string;
  items: NavLink[];
};

type NavEntry =
  | ({ type: "link" } & NavLink)
  | NavGroup;

const navItems: NavEntry[] = [
  { type: "link", label: "Home", href: "/" },
  {
    type: "group",
    label: "Product",
    href: "/#product",
    hash: "#product",
    items: [
      { label: "Overview", href: "/#product", hash: "#product" },
      { label: "Features", href: "/#features", hash: "#features" },
      { label: "How it works", href: "/#how-it-works", hash: "#how-it-works" },
      { label: "Why us", href: "/#comparison", hash: "#comparison" },
    ],
  },
  {
    type: "group",
    label: "Solutions",
    href: "/#solutions",
    hash: "#solutions",
    items: [
      { label: "By Industry", href: "/#industries", hash: "#industries" },
      { label: "By Use Case", href: "/#use-cases", hash: "#use-cases" },
    ],
  },
  { type: "link", label: "Pricing", href: "/pricing" },
  { type: "link", label: "About", href: "/about" },
  {
    type: "group",
    label: "Company",
    href: "/blogs",
    items: [
      { label: "Blogs", href: "/blogs" },
      { label: "News", href: "/news" },
      { label: "FAQs", href: "/faqs" },
      { label: "E learning", href: "/e-learning" },
    ],
  },
];

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`transition ${open ? "rotate-180" : "group-hover:rotate-180 group-focus-within:rotate-180 group-open:rotate-180"}`}
    >
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function linkHref(item: { href: string; hash?: string }, pathname: string) {
  if (item.hash && pathname === "/") {
    return item.hash;
  }
  return item.href;
}

function isGroupActive(group: NavGroup, pathname: string) {
  return group.items.some((item) => {
    if (!item.href.startsWith("/") || item.href.startsWith("/#")) {
      return false;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });
}

function isPlainLinkActive(item: NavLink, pathname: string) {
  if (item.href === "/") {
    return pathname === "/";
  }
  if (item.hash) {
    return false;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const navLinkClass =
  "inline-flex items-center rounded-lg px-3 py-2 text-[14px] font-medium transition hover:bg-[#F3F4F6] hover:text-[#111827]";

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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pathname = usePathname();

  function closeMobile() {
    setMobileOpen(false);
    setOpenMenu(null);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white">
        <nav
          aria-label="Primary"
          className="mx-auto flex min-h-[72px] w-full min-w-0 max-w-[1200px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-8"
        >
          <Link href="/" className="flex min-w-0 shrink items-center" aria-label="Consent Guru home">
            <BrandLogo height={40} priority />
          </Link>

          <div className="hidden min-w-0 items-center gap-0.5 xl:flex">
            {navItems.map((entry) => {
              if (entry.type === "link") {
                const active = isPlainLinkActive(entry, pathname);
                return (
                  <Link
                    key={entry.label}
                    href={linkHref(entry, pathname)}
                    data-smooth-anchor={entry.hash ? true : undefined}
                    className={`${navLinkClass} ${active ? "bg-[#F3F4F6] text-[#111827]" : "text-[#374151]"}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpenMenu(null)}
                  >
                    {entry.label}
                  </Link>
                );
              }

              const active = isGroupActive(entry, pathname);
              return (
                <div
                  key={entry.label}
                  className="group relative"
                  onMouseEnter={() => setOpenMenu(entry.label)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button
                    type="button"
                    className={`${navLinkClass} gap-1.5 ${
                      active || openMenu === entry.label ? "bg-[#F3F4F6] text-[#111827]" : "text-[#374151]"
                    }`}
                    aria-expanded={openMenu === entry.label}
                    aria-haspopup="true"
                    onClick={() => setOpenMenu((current) => (current === entry.label ? null : entry.label))}
                  >
                    {entry.label}
                    <Chevron open={openMenu === entry.label} />
                  </button>
                  <div
                    className={`absolute top-full z-50 min-w-[13.5rem] max-w-[calc(100vw-1.5rem)] pt-1 transition ${
                      entry.label === "Company" ? "right-0" : "left-0"
                    } ${
                      openMenu === entry.label
                        ? "visible opacity-100"
                        : "invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                    }`}
                  >
                    <div className="rounded-xl border border-[#E5E7EB] bg-white py-2 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)]">
                      <p className="px-3 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                        {entry.label}
                      </p>
                      {entry.items.map((item) => (
                        <Link
                          key={item.label}
                          href={linkHref(item, pathname)}
                          data-smooth-anchor={item.hash ? true : undefined}
                          className="block px-3 py-2 text-sm text-[#374151] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
                          onClick={() => setOpenMenu(null)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden shrink-0 items-center gap-3 xl:flex">
            <AuthButtons />
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#111827] xl:hidden"
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
          className={`grid border-t border-[#E5E7EB] bg-white transition-[grid-template-rows,opacity] duration-300 xl:hidden ${
            mobileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-4 sm:px-8">
              {navItems.map((entry) => {
                if (entry.type === "link") {
                  return (
                    <Link
                      key={entry.label}
                      href={linkHref(entry, pathname)}
                      data-smooth-anchor={entry.hash ? true : undefined}
                      className="rounded-lg px-3 py-3 text-sm font-semibold text-[#111827]"
                      onClick={closeMobile}
                    >
                      {entry.label}
                    </Link>
                  );
                }

                return (
                  <details key={entry.label} className="group rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-sm font-semibold text-[#111827] [&::-webkit-details-marker]:hidden">
                      {entry.label}
                      <Chevron />
                    </summary>
                    <div className="border-t border-[#E5E7EB] bg-white px-1 py-1">
                      {entry.items.map((item) => (
                        <Link
                          key={item.label}
                          href={linkHref(item, pathname)}
                          data-smooth-anchor={item.hash ? true : undefined}
                          className="block rounded-md px-3 py-2.5 text-sm text-[#374151]"
                          onClick={closeMobile}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                );
              })}
              <div className="mt-2 grid gap-2 border-t border-[#E5E7EB] pt-4 sm:grid-cols-2">
                <AuthButtons mobile onNavigate={closeMobile} />
              </div>
            </div>
          </div>
        </div>
      </header>
      <WhatsAppFloat />
    </>
  );
}
