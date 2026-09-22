import type { Metadata } from "next";
import { Suspense } from "react";

import { GrievancePortal } from "@/components/public/grievance-portal";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "File a Grievance";
const description =
  "File and track a grievance with Consent Guru under Section 13 of the Digital Personal Data Protection Act, 2023.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/privacy-center/grievance"),
  ...socialMetadata({
    title: `${title} — Consent Guru`,
    description,
    path: "/privacy-center/grievance",
  }),
};

export default function GrievancePage() {
  return (
    <div className="public-page min-h-screen bg-[#F3F6F8] text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <main id="main-content">
        <Suspense fallback={<div className="mx-auto max-w-[760px] px-5 py-16 text-sm text-[#6B7280]">Loading grievance portal…</div>}>
          <GrievancePortal />
        </Suspense>
      </main>
      <HomeFooter />
    </div>
  );
}
