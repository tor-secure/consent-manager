import type { Metadata } from "next";
import { SkipLink } from "@/components/ui/skip-link";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { DpdpCourse } from "@/components/e-learning/dpdp-course";

import { socialMetadata, INDEXABLE_ROBOTS, pageAlternates } from "@/lib/site-metadata";

const elearningTitle = "E-learning — DPDP Act";
const elearningDescription =
  "Ten modules on India’s Digital Personal Data Protection Act. Sign in to learn; progress stays in your browser.";

export const metadata: Metadata = {
  title: elearningTitle,
  description: elearningDescription,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/e-learning"),
  ...socialMetadata({
    title: `${elearningTitle} — Consent Guru`,
    description: elearningDescription,
    path: "/e-learning",
  }),
};

export default function ELearningPage() {
  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeInteractions />
      <HomeNavbar />
      <main id="main-content">
        <DpdpCourse />
      </main>
      <HomeFooter />
    </div>
  );
}
