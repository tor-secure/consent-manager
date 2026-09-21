import type { Metadata } from "next";

import { unlistedPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = unlistedPageMetadata(
  "Guardian consent",
  "Verify a guardian consent token. This page is a utility form and is not indexed.",
);

export default function GuardianConsentLayout({ children }: LayoutProps<"/guardian-consent">) {
  return children;
}
