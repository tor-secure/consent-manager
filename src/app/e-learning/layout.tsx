import type { ReactNode } from "react";

import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";

export default function ELearningLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-page min-h-screen bg-[#f3f7f6] text-[#0B2C4A]">
      <SkipLink />
      <HomeInteractions />
      <HomeNavbar />
      <main id="main-content" className="py-8">
        {children}
      </main>
      <HomeFooter />
    </div>
  );
}
