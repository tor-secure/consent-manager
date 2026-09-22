"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { PRIVACY_CENTRE_ORG } from "@/content/privacy-centre";
import {
  GRIEVANCE_CATEGORY_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/lib/privacy-rights/intake-fields";

type PortalContact = {
  fiduciaryName: string;
  websiteLabel: string;
  dpoName: string | null;
  dpoEmail: string | null;
  grievanceOfficerName: string | null;
  grievanceOfficerEmail: string | null;
  addressLines: string[];
};

type TrackedRequest = {
  requesterReference: string | null;
  requestType: string;
  status: string;
  verificationStatus: string;
  receivedAt: string;
  dueAt: string;
  completedAt: string | null;
};

const FALLBACK_CONTACT: PortalContact = {
  fiduciaryName: PRIVACY_CENTRE_ORG.name,
  websiteLabel: PRIVACY_CENTRE_ORG.website,
  dpoName: PRIVACY_CENTRE_ORG.dpoName,
  dpoEmail: PRIVACY_CENTRE_ORG.dpoEmail,
  grievanceOfficerName: PRIVACY_CENTRE_ORG.dpoName,
  grievanceOfficerEmail: PRIVACY_CENTRE_ORG.dpoEmail,
  addressLines: [...PRIVACY_CENTRE_ORG.addressLines],
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4 4 8l8 4 8-4-8-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4 12l8 4 8-4M4 16l8 4 8-4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconPen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 16v4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function GrievancePortal() {
  const searchParams = useSearchParams();
  const siteKey = searchParams.get("siteKey")?.trim() ?? "";

  const [contact, setContact] = useState<PortalContact>(FALLBACK_CONTACT);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState<string | null>(null);

  const [trackTicket, setTrackTicket] = useState(searchParams.get("ticket")?.trim() ?? "");
  const [trackEmail, setTrackEmail] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<TrackedRequest | null>(null);

  const remaining = Math.max(0, 50 - description.trim().length);
  const officerEmail = contact.dpoEmail || contact.grievanceOfficerEmail;
  const officerName = contact.dpoName || contact.grievanceOfficerName;

  const privacyHref = useMemo(() => {
    const params = siteKey ? `?siteKey=${encodeURIComponent(siteKey)}` : "";
    return `/privacy-center/privacy-policy${params}`;
  }, [siteKey]);

  useEffect(() => {
    let cancelled = false;
    const query = siteKey ? `?siteKey=${encodeURIComponent(siteKey)}` : "";
    fetch(`/api/rights-request/grievance-contact${query}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: { success?: boolean; contact?: PortalContact }) => {
        if (cancelled || !payload.success || !payload.contact) return;
        setContact(payload.contact);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  async function submitGrievance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/rights-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteKey: siteKey || undefined,
          requestType: "grievance",
          grievanceCategory: data.get("grievanceCategory"),
          requesterName: data.get("requesterName"),
          requesterEmail: data.get("requesterEmail"),
          requesterPhone: data.get("requesterPhone") || undefined,
          description: data.get("description"),
          priorCommunication: data.get("priorCommunication") || undefined,
          preferredLanguage: data.get("preferredLanguage"),
          processingConsent: data.get("processingConsent") === "on",
          fulfillConsent: data.get("fulfillConsent") === "on",
          jurisdiction: "dpdp",
        }),
      });
      const payload = (await res.json()) as {
        success?: boolean;
        message?: string;
        ticketId?: string;
        requesterReference?: string;
        dueAt?: string;
      };
      if (!res.ok || !payload.success) {
        setSubmitError(payload.message ?? "Could not submit this grievance.");
        return;
      }
      const issued = payload.ticketId ?? payload.requesterReference ?? null;
      setTicketId(issued);
      setDueAt(payload.dueAt ?? null);
      if (issued) setTrackTicket(issued);
      form.reset();
      setDescription("");
    } catch {
      setSubmitError("Could not submit this grievance. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function trackGrievance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTracking(true);
    setTrackError(null);
    setTracked(null);
    try {
      const params = new URLSearchParams({
        ticket: trackTicket.trim(),
        email: trackEmail.trim(),
      });
      const res = await fetch(`/api/rights-request/status?${params.toString()}`);
      const payload = (await res.json()) as {
        success?: boolean;
        message?: string;
        request?: TrackedRequest;
      };
      if (!res.ok || !payload.success || !payload.request) {
        setTrackError(payload.message ?? "Grievance not found");
        return;
      }
      setTracked(payload.request);
    } catch {
      setTrackError("Could not look up this grievance. Try again in a moment.");
    } finally {
      setTracking(false);
    }
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-5 px-5 py-8 sm:px-8 sm:py-10">
      <header className="rounded-2xl border border-[#D3E0DE] bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center" aria-label="Consent Guru home">
            <BrandLogo height={36} />
          </Link>
          <p className="text-sm text-[#6B7280]">{contact.websiteLabel}</p>
        </div>
      </header>

      <section className="rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-[#00A88F]">
            <IconShield />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0B2C4A] sm:text-2xl">
              Data Protection Officer / Grievance Officer
            </h1>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              Designated officer responsible for grievance redressal under the Digital Personal Data
              Protection Act, 2023.
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#6B7280]">Email</dt>
            <dd className="mt-0.5 font-medium text-[#0B2C4A]">
              {officerEmail ? (
                <a className="underline decoration-[#00C4A7]/50 underline-offset-2" href={`mailto:${officerEmail}`}>
                  {officerEmail}
                </a>
              ) : (
                "Not published"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[#6B7280]">Officer</dt>
            <dd className="mt-0.5 font-medium text-[#0B2C4A]">{officerName || contact.fiduciaryName}</dd>
          </div>
          {contact.addressLines.length ? (
            <div className="sm:col-span-2">
              <dt className="text-[#6B7280]">Registered address</dt>
              <dd className="mt-0.5 leading-6 text-[#0B2C4A]">
                {contact.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-[#6B7280]">Response time</dt>
            <dd className="mt-0.5 font-medium text-[#0B2C4A]">Within 7 days as per DPDP Act Section 13</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-6 text-[#4B5563]">
          You may lodge a complaint with the Data Fiduciary using the form below. This grievance
          mechanism is established in accordance with Section 13 of the Digital Personal Data
          Protection Act, 2023. All complaints will be acknowledged and addressed within the
          prescribed timeline.
        </p>
      </section>

      <section className="rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-[#00A88F]">
            <IconLayers />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#0B2C4A]">
              DPDP Act Grievance Redressal System
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              The Digital Personal Data Protection Act, 2023 provides a two-tier grievance redressal
              mechanism.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-[#E5E7EB] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB]">Tier 1 · Internal Resolution</p>
            <h3 className="mt-2 text-base font-semibold text-[#0B2C4A]">
              Your complaint is first handled by {contact.fiduciaryName}&apos;s Grievance Officer
            </h3>
            <p className="mt-2 text-sm text-[#4B5563]">Penalties: up to ₹250 crore for non-compliance</p>
          </article>
          <article className="rounded-xl border border-[#E5E7EB] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB]">Tier 2</p>
            <h3 className="mt-2 text-base font-semibold text-[#0B2C4A]">
              Data Protection Board of India (DPBI)
            </h3>
            <p className="mt-2 text-sm text-[#4B5563]">
              If internal resolution is unsatisfactory, you can escalate to DPBI. Appeal: TDSAT within 60 days.
            </p>
          </article>
        </div>
      </section>

      <section id="file-grievance" className="scroll-mt-28 rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-[#00A88F]">
            <IconPen />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#0B2C4A]">File a Grievance</h2>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              Submit your grievance related to personal data processing. Your complaint will be
              addressed by the Grievance Officer as per DPDP Act requirements.
            </p>
          </div>
        </div>

        {ticketId ? (
          <div className="mt-6 rounded-xl border border-[#B7E8DC] bg-[#F3FAF8] p-5" role="status">
            <p className="text-sm font-semibold text-[#0B2C4A]">Grievance submitted</p>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              Save this ticket ID. Use it with the email you submitted to track your grievance.
            </p>
            <p className="mt-3 font-mono text-lg font-bold tracking-wide text-[#0B2C4A]">{ticketId}</p>
            {dueAt ? (
              <p className="mt-1 text-sm text-[#5D6B73]">Response due by {formatDate(dueAt)}.</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#track-grievance"
                className="inline-flex h-10 items-center rounded-lg bg-[#0B2C4A] px-4 text-sm font-semibold text-white"
              >
                Track this grievance
              </a>
              <button
                type="button"
                className="inline-flex h-10 items-center rounded-lg border border-[#D3E0DE] px-4 text-sm font-semibold text-[#0B2C4A]"
                onClick={() => setTicketId(null)}
              >
                File another grievance
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitGrievance} className="mt-6 space-y-5">
            <div>
              <label htmlFor="grievanceCategory" className="field-label">
                Grievance Category *
              </label>
              <select id="grievanceCategory" name="grievanceCategory" required className="field-input">
                <option value="">Select grievance category</option>
                {GRIEVANCE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="requesterName" className="field-label">
                  Full Name *
                </label>
                <input
                  id="requesterName"
                  name="requesterName"
                  required
                  autoComplete="name"
                  maxLength={255}
                  placeholder="Your full name"
                  className="field-input"
                />
              </div>
              <div>
                <label htmlFor="requesterEmail" className="field-label">
                  Email Address *
                </label>
                <input
                  id="requesterEmail"
                  name="requesterEmail"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={320}
                  placeholder="you@email.com"
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="requesterPhone" className="field-label">
                Phone Number (optional)
              </label>
              <input
                id="requesterPhone"
                name="requesterPhone"
                type="tel"
                autoComplete="tel"
                maxLength={50}
                placeholder="+91 XXXXX XXXXX"
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="description" className="field-label">
                Description of Grievance *
              </label>
              <textarea
                id="description"
                name="description"
                required
                minLength={50}
                maxLength={5000}
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Please describe your grievance in detail (minimum 50 characters)"
                className="field-input"
              />
              <p className="mt-1 text-xs text-[#6B7280]">
                Minimum 50 characters required ({remaining})
              </p>
            </div>

            <div>
              <label htmlFor="priorCommunication" className="field-label">
                Prior Communication Reference (optional)
              </label>
              <textarea
                id="priorCommunication"
                name="priorCommunication"
                maxLength={2000}
                rows={3}
                placeholder="Describe any previous contact about this issue (e.g., emails, calls, reference numbers)"
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="preferredLanguage" className="field-label">
                Preferred Language
              </label>
              <select id="preferredLanguage" name="preferredLanguage" defaultValue="en" className="field-input">
                {PREFERRED_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-start gap-2 text-sm leading-6 text-[#374151]">
              <input
                type="checkbox"
                name="processingConsent"
                required
                className="mt-1 h-4 w-4 rounded border-[#D3E0DE] text-[#00C4A7] focus:ring-[#00C4A7]"
              />
              <span>
                Your name, email, phone, and grievance details will be processed under{" "}
                <strong>Section 6 (Consent)</strong>, DPDP Act 2023 solely for grievance resolution.{" "}
                <Link href={privacyHref} className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm leading-6 text-[#374151]">
              <input
                type="checkbox"
                name="fulfillConsent"
                required
                className="mt-1 h-4 w-4 rounded border-[#D3E0DE] text-[#00C4A7] focus:ring-[#00C4A7]"
              />
              <span>
                I consent to my data being processed to <strong>resolve this grievance</strong> as per
                DPDP Act Section 13.
              </span>
            </label>

            {submitError ? (
              <p className="text-sm font-medium text-[#B42318]" role="alert">
                {submitError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Grievance"}
            </button>
          </form>
        )}
      </section>

      <section
        id="track-grievance"
        className="scroll-mt-28 rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-[#00A88F]">
            <IconSearch />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#0B2C4A]">Track Your Grievance</h2>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              Enter your ticket ID and the email address used when filing the grievance.
            </p>
          </div>
        </div>

        <form onSubmit={trackGrievance} className="mt-5 space-y-4">
          <div>
            <label htmlFor="trackTicket" className="field-label">
              Enter ticket ID (e.g., GRV-XXXXXXXX)
            </label>
            <input
              id="trackTicket"
              value={trackTicket}
              onChange={(event) => setTrackTicket(event.target.value)}
              required
              autoComplete="off"
              placeholder="GRV-XXXXXXXX"
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="trackEmail" className="field-label">
              Email used for the grievance
            </label>
            <input
              id="trackEmail"
              type="email"
              value={trackEmail}
              onChange={(event) => setTrackEmail(event.target.value)}
              required
              autoComplete="email"
              className="field-input"
            />
          </div>
          {trackError ? (
            <p className="text-sm font-medium text-[#B42318]" role="alert">
              {trackError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={tracking}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            {tracking ? "Looking up…" : "Track"}
          </button>
        </form>

        {tracked ? (
          <dl className="mt-5 grid gap-3 rounded-xl border border-[#D3E0DE] bg-[#F8FCFB] p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[#6B7280]">Ticket ID</dt>
              <dd className="mt-0.5 font-mono font-semibold text-[#0B2C4A]">
                {tracked.requesterReference ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Status</dt>
              <dd className="mt-0.5 font-medium capitalize text-[#0B2C4A]">{tracked.status}</dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Verification</dt>
              <dd className="mt-0.5 font-medium text-[#0B2C4A]">{tracked.verificationStatus}</dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Received</dt>
              <dd className="mt-0.5 text-[#0B2C4A]">{formatDate(tracked.receivedAt)}</dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Due</dt>
              <dd className="mt-0.5 text-[#0B2C4A]">{formatDate(tracked.dueAt)}</dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Completed</dt>
              <dd className="mt-0.5 text-[#0B2C4A]">{formatDate(tracked.completedAt)}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <p className="px-1 text-center text-xs leading-5 text-[#6B7280]">
        This grievance portal is provided in compliance with the Digital Personal Data Protection Act,
        2023 (DPDP Act).
      </p>
    </div>
  );
}
