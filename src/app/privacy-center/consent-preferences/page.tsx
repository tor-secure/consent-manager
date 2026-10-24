import type { Metadata } from "next";

import { ConsentPreferencesPortal } from "@/components/public/consent-preferences-portal";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { readPortalQuery } from "@/content/privacy-centre";
import { SkipLink } from "@/components/ui/skip-link";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const title = "Manage Preferences";
const description =
  "Review cookie and consent preferences recorded in this browser, withdraw consent under DPDP Section 6(4), and check withdrawal status.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/privacy-center/consent-preferences"),
  ...socialMetadata({
    title: `${title} — Consent Guru`,
    description,
    path: "/privacy-center/consent-preferences",
  }),
};

export default async function ConsentPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await readPortalQuery(searchParams);
  return (
    <div className="public-page min-h-screen bg-[#F3F6F8] text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <main id="main-content">
        <ConsentPreferencesPortal query={query} />
      </main>
      <HomeFooter />
    </div>
  );
}
