"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";

const NAV: Array<{
  href: string;
  label: string;
  exact?: boolean;
  icon: "overview" | "learners" | "certs" | "vouchers" | "coupons";
}> = [
  { href: "/elearning-admin", label: "Overview", exact: true, icon: "overview" },
  { href: "/elearning-admin/learners", label: "Learners", icon: "learners" },
  { href: "/elearning-admin/certificates", label: "Certificates", icon: "certs" },
  { href: "/elearning-admin/vouchers", label: "Vouchers", icon: "vouchers" },
  { href: "/elearning-admin/coupons", label: "Coupons", icon: "coupons" },
];

function NavIcon({ name }: { name: (typeof NAV)[number]["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (name === "overview") {
    return (
      <svg {...common}>
        <path d="M4 13h6V4H4v9Zm10 7h6V4h-6v16ZM4 20h6v-5H4v5Z" />
      </svg>
    );
  }
  if (name === "learners") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.74" />
      </svg>
    );
  }
  if (name === "certs") {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 15l2 2 4-4" />
      </svg>
    );
  }
  if (name === "vouchers") {
    return (
      <svg {...common}>
        <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9Z" />
        <path d="M9 7v10" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20.6 5.6a2 2 0 0 0-2.8 0L9 14.4 6.2 11.6a2 2 0 1 0-2.8 2.8l4.2 4.2a2 2 0 0 0 2.8 0L20.6 8.4a2 2 0 0 0 0-2.8Z" />
    </svg>
  );
}

export function AdminShell({ children, username }: { children: ReactNode; username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/elearning-admin/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      /* navigate anyway */
    }
    router.replace("/elearning-admin/login");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold motion-safe:transition-colors ${
              active
                ? "bg-[#0B2C4A] text-white shadow-[0_10px_24px_-16px_rgba(11,44,74,0.9)]"
                : "text-[#36505c] hover:bg-[#E6F9F5]"
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-svh bg-[#f3f7f6] text-[#0B2C4A]">
      {/* Desktop sidebar: fixed width, never grows into the content area */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden border-r border-[#e4eeec] bg-white lg:flex">
        <div className="shrink-0 border-b border-[#eef4f3] px-4 py-5">
          <BrandLogo height={28} className="max-w-full" />
          <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[#0B2C4A]">
            E-learning admin
          </p>
        </div>
        {nav}
        <div className="mt-auto shrink-0 border-t border-[#eef4f3] p-4">
          <p className="truncate text-xs text-[#4d6570]" title={username}>
            {username}
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={pending}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#d5e3e0] text-sm font-semibold hover:border-[#0B2C4A] disabled:opacity-60"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[#e4eeec] bg-white/95 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4 sm:py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d5e3e0]"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <p className="min-w-0 truncate text-center text-[10px] font-bold uppercase tracking-[0.16em] sm:text-[11px] sm:tracking-[0.18em]">
            E-learning admin
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={pending}
            className="inline-flex h-10 shrink-0 items-center rounded-xl border border-[#d5e3e0] px-2.5 text-xs font-semibold disabled:opacity-60 sm:px-3 sm:text-sm"
          >
            Log out
          </button>
        </header>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[#0B2C4A]/40"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(16rem,88vw)] flex-col overflow-hidden bg-white shadow-xl">
              <div className="flex shrink-0 items-center justify-between border-b border-[#eef4f3] px-4 py-4">
                <BrandLogo height={26} className="max-w-[10rem]" />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d5e3e0] text-lg leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              {nav}
              <div className="mt-auto shrink-0 border-t border-[#eef4f3] p-4">
                <p className="truncate text-xs text-[#4d6570]" title={username}>
                  {username}
                </p>
              </div>
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
