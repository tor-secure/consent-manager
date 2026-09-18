import type { Metadata } from "next";
import { SkipLink } from "@/components/ui/skip-link";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { DpdpCourse } from "@/components/e-learning/dpdp-course";

export const metadata: Metadata = {
  title: "E-learning — DPDP Act | Consent Guru",
  description:
    "Ten modules on India’s Digital Personal Data Protection Act. Sign in to learn; progress stays in your browser.",
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
