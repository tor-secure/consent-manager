import type { ReactNode } from "react";

import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";

export default function ToolsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <div className="print:hidden">
        <SkipLink />
        <HomeNavbar />
      </div>
      <main id="main-content">{children}</main>
      <div className="print:hidden">
        <HomeFooter />
      </div>
    </div>
  );
}
