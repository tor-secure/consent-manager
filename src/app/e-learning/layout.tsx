import type { ReactNode } from "react";
import { headers } from "next/headers";

import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";
import { getLearningSession } from "@/lib/learning/auth";

export default async function ELearningLayout({ children }: { children: ReactNode }) {
  const path = (await headers()).get("x-cg-path") ?? "";
  if (path.startsWith("/e-learning/sign-in") || path.startsWith("/e-learning/sign-up")) return children;
  const learner = await getLearningSession();
  return (
    <div className="public-page min-h-screen bg-[#f3f7f6] text-[#0B2C4A] print:bg-white">
      <SkipLink />
      <HomeInteractions />
      <div className="print:hidden">
        <HomeNavbar learningAuth={{ signedIn: Boolean(learner) }} />
      </div>
      <main id="main-content" className="py-6 sm:py-8 print:py-0">
        <div className="mx-auto w-full min-w-0 max-w-none px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">{children}</div>
      </main>
      <div className="print:hidden">
        <HomeFooter />
      </div>
    </div>
  );
}
