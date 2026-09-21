import type { Metadata } from "next";

import { unlistedPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = unlistedPageMetadata(
  "SDK demo",
  "Load a Consent Guru banner against a site key. This demo page is not indexed.",
);

export default function SdkDemoLayout({ children }: LayoutProps<"/sdk-demo">) {
  return children;
}
