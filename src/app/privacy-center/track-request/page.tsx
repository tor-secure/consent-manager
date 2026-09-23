import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { TrackRequestPortal } from "@/components/public/track-request-portal";
import { SkipLink } from "@/components/ui/skip-link";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "Track a request";
const description =
  "Track a Data Principal Rights submission (DPR-) or a grievance (GRV-) using your ticket ID and email.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/privacy-center/track-request"),
  ...socialMetadata({
    title: `${title} — Consent Guru`,
    description,
    path: "/privacy-center/track-request",
  }),
};

export default function TrackRequestPage() {
  return (
    <div className="public-page min-h-screen bg-[#F3F6F8] text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <main id="main-content">
        <Suspense fallback={<div className="mx-auto max-w-[760px] px-5 py-16 text-sm text-[#6B7280]">Loading tracker…</div>}>
          <TrackRequestPortal />
        </Suspense>
      </main>
      <HomeFooter />
    </div>
  );
}
