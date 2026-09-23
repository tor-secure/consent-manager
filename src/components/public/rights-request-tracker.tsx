"use client";

import { useEffect, useState, type FormEvent } from "react";

import { DPDP_REQUEST_TYPE_OPTIONS } from "@/lib/privacy-rights/intake-fields";

export type TrackedRequest = {
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

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const STEPS = ["Received", "Verification", "In review", "Completed"] as const;

function stepIndex(request: TrackedRequest) {
  const status = request.status.toLowerCase();
  if (status.includes("completed") || status.includes("rejected") || status.includes("cancelled")) {
    return 3;
  }
  if (status.includes("progress") || status.includes("review")) return 2;
  if (request.verificationStatus === "verified" || status.includes("verified")) return 2;
  if (status.includes("verification")) return 1;
  return 0;
}

async function lookupRequest(ticket: string, email: string) {
  const params = new URLSearchParams({
    ticket: ticket.trim(),
    email: email.trim(),
  });
  const res = await fetch(`/api/rights-request/status?${params.toString()}`);
  const payload = (await res.json()) as {
    success?: boolean;
    message?: string;
    request?: TrackedRequest;
  };
  if (!res.ok || !payload.success || !payload.request) {
    throw new Error(payload.message ?? "Request not found");
  }
  return payload.request;
}

export function RightsRequestTracker({
  id = "track-request",
  title = "Track your submission",
  description = "Enter the ticket ID and the email used when you submitted the Data Principal request or grievance.",
  initialTicket = "",
  initialEmail = "",
  autoLookup = false,
}: {
  id?: string;
  title?: string;
  description?: string;
  initialTicket?: string;
  initialEmail?: string;
  autoLookup?: boolean;
}) {
  const [ticket, setTicket] = useState(initialTicket);
  const [email, setEmail] = useState(initialEmail);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<TrackedRequest | null>(null);

  useEffect(() => {
    setTicket(initialTicket);
    setEmail(initialEmail);
  }, [initialTicket, initialEmail]);

  useEffect(() => {
    if (!autoLookup || !initialTicket.trim() || !initialEmail.trim()) return;
    let cancelled = false;
    setTracking(true);
    setError(null);
    lookupRequest(initialTicket, initialEmail)
      .then((request) => {
        if (!cancelled) setTracked(request);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Request not found");
      })
      .finally(() => {
        if (!cancelled) setTracking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [autoLookup, initialTicket, initialEmail]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTracking(true);
    setError(null);
    setTracked(null);
    try {
      setTracked(await lookupRequest(ticket, email));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not look up this submission.");
    } finally {
      setTracking(false);
    }
  }

  const activeStep = tracked ? stepIndex(tracked) : -1;

  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-[#00A88F]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.7" />
            <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B2C4A]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#4B5563]">{description}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor={`${id}-ticket`} className="field-label">
            Ticket ID (DPR-XXXXXXXX or GRV-XXXXXXXX)
          </label>
          <input
            id={`${id}-ticket`}
            value={ticket}
            onChange={(event) => setTicket(event.target.value)}
            required
            autoComplete="off"
            placeholder="DPR-XXXXXXXX or GRV-XXXXXXXX"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="field-label">
            Email used for the submission
          </label>
          <input
            id={`${id}-email`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="field-input"
          />
        </div>
        {error ? (
          <p className="text-sm font-medium text-[#B42318]" role="alert">
            {error}
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
        <div className="mt-5 space-y-4">
          <ol className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold uppercase tracking-wide sm:text-xs">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className={`rounded-lg px-1 py-2 ${
                  index <= activeStep ? "bg-[#E8F8F5] text-[#0B2C4A]" : "bg-[#F3F6F8] text-[#9CA3AF]"
                }`}
              >
                {step}
              </li>
            ))}
          </ol>
          <dl className="grid gap-3 rounded-xl border border-[#D3E0DE] bg-[#F8FCFB] p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[#6B7280]">Ticket ID</dt>
              <dd className="mt-0.5 font-mono font-semibold text-[#0B2C4A]">
                {tracked.requesterReference ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Submission type</dt>
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
        </div>
      ) : null}
    </section>
  );
}
