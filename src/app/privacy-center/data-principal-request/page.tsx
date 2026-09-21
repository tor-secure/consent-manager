import type { Metadata } from "next";
import { Suspense } from "react";

import { DataPrincipalPortal } from "@/components/public/data-principal-portal";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "Data Principal Request";
const description =
  "Submit and track a Data Principal request under the Digital Personal Data Protection Act, 2023. Access, correction, erasure, nomination, and grievance redressal.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/privacy-center/data-principal-request"),
  ...socialMetadata({
    title: `${title} — Consent Guru`,
    description,
    path: "/privacy-center/data-principal-request",
  }),
};

export default function DataPrincipalRequestPage() {
  return (
    <div className="public-page min-h-screen bg-[#F3F6F8] text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <main id="main-content">
        <Suspense fallback={<div className="mx-auto max-w-[760px] px-5 py-16 text-sm text-[#6B7280]">Loading form…</div>}>
          <DataPrincipalPortal />
        </Suspense>
      </main>
      <HomeFooter />
    </div>
  );
}
