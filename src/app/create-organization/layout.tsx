import type { Metadata } from "next";

import { unlistedPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = unlistedPageMetadata(
  "Create organization",
  "Create an organization to use Consent Guru with your team.",
);

export default function CreateOrganizationLayout({
  children,
}: LayoutProps<"/create-organization">) {
  return children;
}
