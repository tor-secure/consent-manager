import type { Metadata } from "next";
import Link from "next/link";

import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";
import { NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: { absolute: "Page not found — Consent Guru" },
  description: "This page is not on Consent Guru. Browse the consent platform, pricing, or resources.",
  robots: NOINDEX_ROBOTS,
};

const links = [
  { href: "/", label: "Home" },
  { href: "/consent-management-platform", label: "Consent management platform" },
  { href: "/cookie-consent-manager", label: "Cookie consent manager" },
  { href: "/privacy-compliance", label: "Privacy compliance" },
  { href: "/developers", label: "Developers" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Resources" },
];

export default function NotFound() {
  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <main id="main-content" className="mx-auto max-w-[760px] px-5 py-20 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A88F]">404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#0B2C4A]">Page not found</h1>
        <p className="mt-4 text-[15px] leading-7 text-[#4B5563]">
          That address is not a public Consent Guru page. The link may be out of date, or the page may
          sit behind a workspace login.
        </p>
        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm font-semibold text-[#0B2C4A] hover:border-[#00C4A7]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <HomeFooter />
    </div>
  );
}
