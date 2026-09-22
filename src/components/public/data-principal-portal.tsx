"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import {
  DATA_CATEGORY_OPTIONS,
  DPDP_REQUEST_TYPE_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/lib/privacy-rights/intake-fields";
import { PRIVACY_CENTRE_ORG } from "@/content/privacy-centre";

type TrackedRequest = {
  requesterReference: string | null;
  requestType: string;
  status: string;
  verificationStatus: string;
  receivedAt: string;
  dueAt: string;
  completedAt: string | null;
};

const REQUEST_TYPE_LABELS = Object.fromEntries(
  DPDP_REQUEST_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

const RIGHTS = [
  {
    section: "Section 11",
    title: "Right of Access",
    body:
      "You have the right to obtain information about your personal data being processed, including a summary of the data, the processing activities, and the identities of other Data Fiduciaries and Data Processors with whom it has been shared.",
  },
  {
    section: "Section 12",
    title: "Right to Correction and Erasure",
    body:
      "You have the right to request correction of inaccurate or misleading personal data, completion of incomplete data, updating of data, and erasure of personal data that is no longer necessary for the purpose for which it was processed, unless retention is required by law.",
  },
  {
    section: "Section 13",
    title: "Grievance Redressal",
    body:
      "You have the right to readily available means of grievance redressal provided by the Data Fiduciary in respect of any act or omission regarding your personal data. We aim to respond within the period required by the DPDP Act.",
  },
  {
    section: "Section 14",
    title: "Right to Nominate",
    body:
      "You may nominate another individual who can, in the event of your death or incapacity, exercise your rights under the DPDP Act on your behalf.",
  },
] as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function openPreferenceCenter() {
  const cmp = (window as Window & { CMP?: { openPreferenceCenter?: () => void } }).CMP;
  if (cmp && typeof cmp.openPreferenceCenter === "function") {
    cmp.openPreferenceCenter();
    return;
  }
  window.location.href = "/privacy-center/cookie-policy";
}

export function DataPrincipalPortal() {
  const searchParams = useSearchParams();
  const siteKey = searchParams.get("siteKey")?.trim() ?? "";
  const presetType = searchParams.get("type")?.trim().toLowerCase() ?? "";

  const initialRequestType = useMemo(() => {
    return DPDP_REQUEST_TYPE_OPTIONS.some((option) => option.value === presetType)
      ? presetType
      : "";
  }, [presetType]);

  const [requestType, setRequestType] = useState(initialRequestType);
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState<string | null>(null);

  const [trackTicket, setTrackTicket] = useState(searchParams.get("ticket")?.trim() ?? "");
  const [trackEmail, setTrackEmail] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<TrackedRequest | null>(null);

  function toggleCategory(value: string) {
    setCategories((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
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
          requestType: data.get("requestType"),
          requesterName: data.get("requesterName"),
          requesterEmail: data.get("requesterEmail"),
          requesterPhone: data.get("requesterPhone") || undefined,
          identityProof: data.get("identityProof"),
          description: data.get("description"),
          dataCategories: categories,
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
        setSubmitError(payload.message ?? "Could not submit this request.");
        return;
      }
      const issued = payload.ticketId ?? payload.requesterReference ?? null;
      setTicketId(issued);
      setDueAt(payload.dueAt ?? null);
      if (issued) setTrackTicket(issued);
      form.reset();
      setRequestType("");
      setCategories([]);
    } catch {
      setSubmitError("Could not submit this request. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function trackRequest(event: React.FormEvent<HTMLFormElement>) {
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
        setTrackError(payload.message ?? "Request not found");
        return;
      }
      setTracked(payload.request);
    } catch {
      setTrackError("Could not look up this request. Try again in a moment.");
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
          <p className="text-sm text-[#6B7280]">{PRIVACY_CENTRE_ORG.website}</p>
        </div>
      </header>

      <section className="rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-[#00A88F]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3.75 5.25 6v5.25c0 4.25 2.83 7.85 6.75 9 3.92-1.15 6.75-4.75 6.75-9V6L12 3.75Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0B2C4A] sm:text-2xl">
              Submit a Data Principal Request
            </h1>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              Exercise your rights under the Digital Personal Data Protection Act, 2023. Your request
              will be processed within 90 days as per DPDP Act requirements.
            </p>
          </div>
        </div>

        {ticketId ? (
          <div className="mt-6 rounded-xl border border-[#B7E8DC] bg-[#F3FAF8] p-5" role="status">
            <p className="text-sm font-semibold text-[#0B2C4A]">Request submitted</p>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              Save this ticket ID. Use it with the email you submitted to track your request.
            </p>
            <p className="mt-3 font-mono text-lg font-bold tracking-wide text-[#0B2C4A]">{ticketId}</p>
            {dueAt ? (
              <p className="mt-1 text-sm text-[#5D6B73]">Response due by {formatDate(dueAt)}.</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#track-request"
                className="inline-flex h-10 items-center rounded-lg bg-[#0B2C4A] px-4 text-sm font-semibold text-white"
              >
                Track this request
              </a>
              <button
                type="button"
                className="inline-flex h-10 items-center rounded-lg border border-[#D3E0DE] px-4 text-sm font-semibold text-[#0B2C4A]"
                onClick={() => setTicketId(null)}
              >
                Submit another request
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitRequest} className="mt-6 space-y-5">
            <div>
              <label htmlFor="requestType" className="field-label">
                Request Type *
              </label>
              <select
                id="requestType"
                name="requestType"
                required
                value={requestType}
                onChange={(event) => setRequestType(event.target.value)}
                className="field-input"
              >
                <option value="">Select your request type</option>
                {DPDP_REQUEST_TYPE_OPTIONS.map((option) => (
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
              <label htmlFor="identityProof" className="field-label">
                Identity Proof Description (optional)
              </label>
              <textarea
                id="identityProof"
                name="identityProof"
                maxLength={2000}
                rows={3}
                placeholder="Describe the identity proof you can provide (e.g., Aadhaar, PAN, Passport)"
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="description" className="field-label">
                Description of Request *
              </label>
              <textarea
                id="description"
                name="description"
                required
                maxLength={5000}
                rows={4}
                placeholder="Please describe your request in detail"
                className="field-input"
              />
            </div>

            <fieldset>
              <legend className="field-label">Data Categories</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {DATA_CATEGORY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-[#374151]"
                  >
                    <input
                      type="checkbox"
                      checked={categories.includes(option.value)}
                      onChange={() => toggleCategory(option.value)}
                      className="h-4 w-4 rounded border-[#D3E0DE] text-[#00C4A7] focus:ring-[#00C4A7]"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="preferredLanguage" className="field-label">
                Preferred Language
              </label>
              <select
                id="preferredLanguage"
                name="preferredLanguage"
                defaultValue="en"
                className="field-input"
              >
                {PREFERRED_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="rounded-lg bg-[#F3FAF8] px-3 py-2 text-sm leading-6 text-[#4B5563]">
              Your request will be processed within 90 days as per DPDP Act requirements.
            </p>

            <label className="flex items-start gap-2 text-sm leading-6 text-[#374151]">
              <input
                type="checkbox"
                name="processingConsent"
                required
                className="mt-1 h-4 w-4 rounded border-[#D3E0DE] text-[#00C4A7] focus:ring-[#00C4A7]"
              />
              <span>
                Your name, email, phone, and request details will be processed under Section 6
                (Consent), DPDP Act 2023 solely to fulfill your Data Principal request.
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
                I consent to my data being processed to{" "}
                <strong>fulfill this Data Principal request</strong>.
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
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60 sm:w-auto"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        )}
      </section>

      <section
        id="track-request"
        className="scroll-mt-28 rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-[#00A88F]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.7" />
              <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#0B2C4A]">Track Your Request</h2>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              Enter your ticket ID and the email address used when submitting the request.
            </p>
          </div>
        </div>

        <form onSubmit={trackRequest} className="mt-5 space-y-4">
          <div>
            <label htmlFor="trackTicket" className="field-label">
              Enter ticket ID (e.g., DPR-XXXXXXXX)
            </label>
            <input
              id="trackTicket"
              value={trackTicket}
              onChange={(event) => setTrackTicket(event.target.value)}
              required
              autoComplete="off"
              placeholder="DPR-XXXXXXXX"
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="trackEmail" className="field-label">
              Email address
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
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60 sm:w-auto"
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
              <dt className="text-[#6B7280]">Request type</dt>
              <dd className="mt-0.5 font-medium text-[#0B2C4A]">
                {REQUEST_TYPE_LABELS[tracked.requestType] ?? tracked.requestType}
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
            <div className="sm:col-span-2">
              <dt className="text-[#6B7280]">Completed</dt>
              <dd className="mt-0.5 text-[#0B2C4A]">{formatDate(tracked.completedAt)}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-[#00A88F]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12 8v.01M11 11h1v5h1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#0B2C4A]">
              Your Rights Under DPDP Act
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              The Digital Personal Data Protection Act, 2023 grants you the following rights as a
              Data Principal.
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {RIGHTS.map((right) => (
            <article key={right.section} className="rounded-xl border border-[#E5E7EB] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB]">
                {right.section}
              </p>
              <h3 className="mt-1 text-base font-semibold text-[#0B2C4A]">{right.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[#4B5563]">{right.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold tracking-tight text-[#0B2C4A]">Escalation Information</h2>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          If your request is not addressed within the stipulated time, you may escalate to the Data
          Protection Board of India (DPBI).
        </p>
        <p className="mt-3 text-sm leading-6 text-[#4B5563]">
          Under Section 13 of the DPDP Act, the Data Fiduciary is required to respond to your
          grievance within the prescribed timeline. If you do not receive a satisfactory response,
          you may file a complaint with the Data Protection Board.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={siteKey ? `/privacy-center/grievance?siteKey=${encodeURIComponent(siteKey)}` : "/privacy-center/grievance"}
            className="inline-flex h-10 items-center rounded-lg border border-[#D3E0DE] px-4 text-sm font-semibold text-[#0B2C4A] hover:border-[#00C4A7]"
          >
            File a Grievance
          </Link>
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-lg border border-[#D3E0DE] px-4 text-sm font-semibold text-[#0B2C4A] hover:border-[#00C4A7]"
            onClick={openPreferenceCenter}
          >
            Manage Preferences
          </button>
        </div>
        <p className="mt-4 text-sm text-[#5D6B73]">
          Data Protection Officer: {PRIVACY_CENTRE_ORG.dpoName},{" "}
          <a
            className="font-medium text-[#0B2C4A] underline decoration-[#00C4A7]/50 underline-offset-2"
            href={`mailto:${PRIVACY_CENTRE_ORG.dpoEmail}`}
          >
            {PRIVACY_CENTRE_ORG.dpoEmail}
          </a>
        </p>
      </section>
    </div>
  );
}
