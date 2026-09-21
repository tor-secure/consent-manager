import type { Metadata } from "next";

import { unlistedPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = unlistedPageMetadata(
  "Privacy request",
  "Check or verify a privacy rights request. This page is a utility form and is not indexed.",
);

export default function PrivacyRequestLayout({ children }: LayoutProps<"/privacy-request">) {
  return children;
}
