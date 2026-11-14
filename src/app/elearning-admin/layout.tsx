import type { ReactNode } from "react";

import { AppToaster } from "@/components/feedback/app-toaster";
import { NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = {
  robots: NOINDEX_ROBOTS,
  title: {
    default: "E-learning admin",
    template: "%s · E-learning admin",
  },
};

export const dynamic = "force-dynamic";

export default function ElearningAdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AppToaster />
    </>
  );
}
