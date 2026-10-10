import type { ReactNode } from "react";

import { NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = {
  robots: NOINDEX_ROBOTS,
};

export default function PrivateCertificateLayout({ children }: { children: ReactNode }) {
  return children;
}
