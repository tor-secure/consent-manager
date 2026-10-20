"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { ArrowButton } from "@/components/ui/arrow-button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { WhatsAppFloat } from "@/components/public/whatsapp-float";
import { primaryNav, type PrimaryGroup, type PrimaryLink } from "@/content/primary-nav";

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

function leavesMarketingSite(href: string) {
  return href === "/e-learning" || href.startsWith("/e-learning/");
}

function SiteLink({
  href,
  className,
  onClick,
  children,
  current,
  smoothAnchor,
}: {
  href: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
  current?: boolean;
  smoothAnchor?: boolean;
}) {
  if (leavesMarketingSite(href)) {
    return (
      <a href={href} className={className} aria-current={current ? "page" : undefined} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className={className}
      aria-current={current ? "page" : undefined}
      data-smooth-anchor={smoothAnchor ? true : undefined}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

function isPathActive(href: string, pathname: string) {
  if (!href.startsWith("/") || href.startsWith("/#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(group: PrimaryGroup, pathname: string) {
  if (isPathActive(group.href, pathname)) return true;
  return group.items.some((item) => isPathActive(item.href, pathname));
}

function isPlainLinkActive(item: PrimaryLink, pathname: string) {
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

function LearningAuthButtons({
  signedIn,
  mobile,
  onNavigate,
}: {
  signedIn: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  if (!signedIn) {
    return (
      <>
        <ArrowButton href="/e-learning/sign-in" onClick={onNavigate} className={mobile ? "w-full" : undefined}>
          Log in
        </ArrowButton>
        <ArrowButton href="/e-learning/sign-up" onClick={onNavigate} className={mobile ? "w-full" : undefined}>
          Sign up
        </ArrowButton>
      </>
    );
  }
  return (
    <>
      <Link
        href="/e-learning"
        onClick={onNavigate}
        className={
          mobile
            ? "inline-flex h-10 items-center justify-center rounded-lg bg-[#0B2C4A] px-4 text-sm font-semibold text-white"
            : "inline-flex h-10 items-center rounded-lg bg-[#0B2C4A] px-4 text-sm font-semibold text-white"
        }
      >
        Your course
      </Link>
      <form action="/api/learning/sign-out" method="post" className={mobile ? "inline-flex" : "inline-flex"}>
        <button
          type="submit"
          onClick={onNavigate}
          className={mobile ? "inline-flex h-10 items-center justify-center text-sm font-semibold text-[#0B2C4A]" : "text-sm font-semibold text-[#0B2C4A]"}
        >
          Log out
        </button>
      </form>
    </>
  );
}

function AuthButtons({
  mobile,
  onNavigate,
  learningAuth,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
  learningAuth?: { signedIn: boolean };
}) {
  const pathname = usePathname();
  // Path-based fallback so e-learning never hydrates into the workspace /sign-in links.
  const onLearning = Boolean(learningAuth) || pathname === "/e-learning" || pathname.startsWith("/e-learning/");
  if (onLearning) {
    return <LearningAuthButtons signedIn={learningAuth?.signedIn ?? false} mobile={mobile} onNavigate={onNavigate} />;
  }
  if (!clerkPublishableKey) {
    return <GuestAuthButtons mobile={mobile} onNavigate={onNavigate} />;
  }
  return <ClerkAuthButtons mobile={mobile} onNavigate={onNavigate} />;
}

export function HomeNavbar({ learningAuth }: { learningAuth?: { signedIn: boolean } } = {}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByHover = useRef(false);
  const pathname = usePathname();

  function closeMobile() {
    setMobileOpen(false);
    setOpenMenu(null);
  }

  function openMenuNow(label: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu((current) => {
      if (current !== label) openedByHover.current = true;
      return label;
    });
  }

  function toggleMenu(label: string) {
    if (openedByHover.current) {
      openedByHover.current = false;
      return;
    }
    setOpenMenu((current) => (current === label ? null : label));
  }

  function closeMenuSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 220);
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
            {primaryNav.map((entry) => {
              if (entry.type === "link") {
                const active = isPlainLinkActive(entry, pathname);
                return (
                  <SiteLink
                    key={entry.label}
                    href={linkHref(entry, pathname)}
                    smoothAnchor={Boolean(entry.hash)}
                    className={`${navLinkClass} ${active ? "bg-[#F3F4F6] text-[#111827]" : "text-[#374151]"}`}
                    current={active}
                    onClick={() => setOpenMenu(null)}
                  >
                    {entry.label}
                  </SiteLink>
                );
              }

              const active = isGroupActive(entry, pathname);
              const menuOpen = openMenu === entry.label;
              return (
                <div
                  key={entry.label}
                  className="relative flex items-center"
                  onMouseEnter={() => openMenuNow(entry.label)}
                  onMouseLeave={closeMenuSoon}
                >
                  <SiteLink
                    href={entry.href}
                    className={`${navLinkClass} ${
                      active || menuOpen ? "bg-[#F3F4F6] text-[#111827]" : "text-[#374151]"
                    }`}
                    current={active}
                    onClick={() => setOpenMenu(null)}
                  >
                    {entry.label}
                  </SiteLink>
                  <button
                    type="button"
                    className={`inline-flex h-9 w-6 items-center justify-center rounded-md text-[#374151] hover:bg-[#F3F4F6] ${
                      active || menuOpen ? "bg-[#F3F4F6] text-[#111827]" : ""
                    }`}
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                    aria-label={`${entry.label} pages`}
                    onClick={() => toggleMenu(entry.label)}
                  >
                    <Chevron open={menuOpen} />
                  </button>
                  <div
                    className={`absolute top-full z-50 min-w-[13.5rem] max-w-[calc(100vw-1.5rem)] pt-1 ${
                      entry.label === "About" ? "right-0" : "left-0"
                    } ${menuOpen ? "visible opacity-100" : "invisible pointer-events-none opacity-0"}`}
                  >
                    <div className="rounded-xl border border-[#E5E7EB] bg-white py-2 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)]">
                      <p className="px-3 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                        {entry.label}
                      </p>
                      {entry.items.map((item) => (
                        <SiteLink
                          key={item.label}
                          href={linkHref(item, pathname)}
                          smoothAnchor={Boolean(item.hash)}
                          className="block px-3 py-2 text-sm text-[#374151] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
                          onClick={() => setOpenMenu(null)}
                        >
                          {item.label}
                        </SiteLink>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden shrink-0 items-center gap-3 xl:flex">
            <AuthButtons learningAuth={learningAuth} />
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
              {primaryNav.map((entry) => {
                if (entry.type === "link") {
                  return (
                    <SiteLink
                      key={entry.label}
                      href={linkHref(entry, pathname)}
                      smoothAnchor={Boolean(entry.hash)}
                      className="rounded-lg px-3 py-3 text-sm font-semibold text-[#111827]"
                      onClick={closeMobile}
                    >
                      {entry.label}
                    </SiteLink>
                  );
                }

                return (
                  <div key={entry.label} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
                    <SiteLink
                      href={entry.href}
                      className="block rounded-lg px-3 py-3 text-sm font-semibold text-[#111827]"
                      onClick={closeMobile}
                    >
                      {entry.label}
                    </SiteLink>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between border-t border-[#E5E7EB] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280] [&::-webkit-details-marker]:hidden">
                        More in {entry.label}
                        <Chevron />
                      </summary>
                      <div className="border-t border-[#E5E7EB] bg-white px-1 py-1">
                        {entry.items.map((item) => (
                          <SiteLink
                            key={item.label}
                            href={linkHref(item, pathname)}
                            smoothAnchor={Boolean(item.hash)}
                            className="block rounded-md px-3 py-2.5 text-sm text-[#374151]"
                            onClick={closeMobile}
                          >
                            {item.label}
                          </SiteLink>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })}
              <div className="mt-2 grid gap-2 border-t border-[#E5E7EB] pt-4 sm:grid-cols-2">
                <AuthButtons mobile onNavigate={closeMobile} learningAuth={learningAuth} />
              </div>
            </div>
          </div>
        </div>
      </header>
      <WhatsAppFloat />
    </>
  );
}
