import type { Metadata } from "next";
import Link from "next/link";

import { WhatsAppConsentFlow } from "@/components/whatsapp-consent/whatsapp-consent-flow";
import { SkipLink } from "@/components/ui/skip-link";
import { isValidSiteKey } from "@/lib/sdk/public-http";
import { publicWebsiteForSiteKey } from "@/lib/whatsapp/challenge-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Give consent via WhatsApp",
  description: "Verify your mobile number with a WhatsApp code, review the notice, and record your consent.",
  robots: { index: false, follow: false },
};

export default async function WhatsAppConsentPage({
  params,
}: {
  params: Promise<{ siteKey: string }>;
}) {
  const { siteKey } = await params;
  const website = isValidSiteKey(siteKey) ? await publicWebsiteForSiteKey(siteKey) : null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3fbf8_0%,#ffffff_45%)]">
      <SkipLink />
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 text-sm">
          <span className="font-semibold text-slate-900">Consent Guru</span>
          <Link href="/privacy-center" className="text-slate-600 hover:text-slate-900">
            Privacy centre
          </Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        {website ? (
          <WhatsAppConsentFlow siteKey={siteKey} websiteName={website.name} />
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">This consent link is not active</h1>
            <p className="mt-2 text-sm text-slate-600">
              The organisation link is missing or the website is no longer active. Ask the organisation for a
              current link.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
