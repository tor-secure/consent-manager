"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { BrandLogo } from "@/components/brand/brand-logo";
import { RightsRequestTracker } from "@/components/public/rights-request-tracker";
import { PRIVACY_CENTRE_ORG } from "@/content/privacy-centre";

export function TrackRequestPortal() {
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket")?.trim() ?? "";
  const email = searchParams.get("email")?.trim() ?? "";

  return (
    <div className="mx-auto max-w-[760px] space-y-5 px-5 py-8 sm:px-8 sm:py-10">
      <header className="rounded-2xl border border-[#D3E0DE] bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center" aria-label="Consent Guru home">
            <BrandLogo height={36} />
          </Link>
          <p className="text-sm text-[#6B7280]">{PRIVACY_CENTRE_ORG.website}</p>
        </div>
      </header>

      <RightsRequestTracker
        id="track-request"
        title="Track a Data Principal request or grievance"
        description="Use the ticket ID issued after you submitted a Data Principal Rights form (DPR-) or a grievance (GRV-), plus the same email address."
        initialTicket={ticket}
        initialEmail={email}
        autoLookup={Boolean(ticket && email)}
      />

      <section className="rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold tracking-tight text-[#0B2C4A]">Need to file instead?</h2>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          Tracking looks up both submission types. File a new request from the forms below.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/privacy-center/data-principal-request"
            className="inline-flex h-10 items-center rounded-lg border border-[#D3E0DE] px-4 text-sm font-semibold text-[#0B2C4A] hover:border-[#00C4A7]"
          >
            Data Principal Rights
          </Link>
          <Link
            href="/privacy-center/grievance"
            className="inline-flex h-10 items-center rounded-lg border border-[#D3E0DE] px-4 text-sm font-semibold text-[#0B2C4A] hover:border-[#00C4A7]"
          >
            File a Grievance
          </Link>
        </div>
      </section>
    </div>
  );
}
