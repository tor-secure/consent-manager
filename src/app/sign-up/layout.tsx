import type { Metadata } from "next";

import { unlistedPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = unlistedPageMetadata(
  "Sign up",
  "Create a Consent Guru account to start managing consent across your websites and apps.",
);

export default function SignUpLayout({ children }: LayoutProps<"/sign-up">) {
  return children;
}
