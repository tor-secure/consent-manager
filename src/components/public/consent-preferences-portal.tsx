"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { PRIVACY_CENTRE_ORG } from "@/content/privacy-centre";

type PurposeRow = {
  id: string;
  key?: string;
  name: string;
  description: string;
  isRequired: boolean;
  granted: boolean;
};

type PreferenceSnapshot = {
  consentId: string | null;
  status: string | null;
  consentedAt: string | null;
  expiresAt: string | null;
  websiteId?: string | null;
  purposes: PurposeRow[];
};

type WithdrawalRecord = {
  code: string;
  consentId: string;
  withdrawnAt: string;
  reason: string;
  status: string;
};

const FALLBACK_PURPOSES: PurposeRow[] = [
  {
    id: "necessary",
    name: "Necessary",
    description: "Essential cookies required for the website to function properly.",
    isRequired: true,
    granted: true,
  },
  {
    id: "data_processor",
    name: "Data Processor",
    description: "We would be sharing it to govt & authorities.",
    isRequired: false,
    granted: false,
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Cookies that help us understand how visitors interact with our website.",
    isRequired: false,
    granted: false,
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Cookies used to deliver personalised advertisements.",
    isRequired: false,
    granted: false,
  },
  {
    id: "functional",
    name: "Functional",
    description: "Cookies which enhance the functionality of the website.",
    isRequired: false,
    granted: false,
  },
];

const WITHDRAWAL_STORE = "cmp_withdrawal_records";

type CmpWindow = Window & {
  CMP?: {
    getPreferenceSnapshot?: () => PreferenceSnapshot;
    withdrawConsent?: () => Promise<unknown>;
    showBanner?: () => void;
    downloadReceipt?: () => void;
  };
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function confirmationCode(consentId: string) {
  const compact = consentId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  return compact ? `WD-${compact}` : "WD-UNKNOWN";
}

function readWithdrawals(): WithdrawalRecord[] {
  try {
    const raw = localStorage.getItem(WITHDRAWAL_STORE);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWithdrawals(rows: WithdrawalRecord[]) {
  localStorage.setItem(WITHDRAWAL_STORE, JSON.stringify(rows.slice(0, 20)));
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4 3.5 19h17L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 10v5M12 17.5v.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ConsentPreferencesPortal() {
  const searchParams = useSearchParams();
  const siteKey = searchParams.get("siteKey")?.trim() ?? "";
  const [snapshot, setSnapshot] = useState<PreferenceSnapshot | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState("");
  const [statusResult, setStatusResult] = useState<WithdrawalRecord | string | null>(null);

  const rightsHref = siteKey
    ? `/privacy-center/data-principal-request?siteKey=${encodeURIComponent(siteKey)}`
    : "/privacy-center/data-principal-request";
  const grievanceHref = siteKey
    ? `/privacy-center/grievance?siteKey=${encodeURIComponent(siteKey)}`
    : "/privacy-center/grievance";

  const refresh = useCallback(() => {
    const cmp = (window as CmpWindow).CMP;
    const live = cmp?.getPreferenceSnapshot?.() ?? null;
    if (live && (live.consentId || live.purposes.length)) {
      setSnapshot(live);
      return;
    }
    setSnapshot(null);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const purposes = useMemo(() => {
    if (snapshot?.purposes?.length) return snapshot.purposes;
    return FALLBACK_PURPOSES;
  }, [snapshot]);

  const loaded = Boolean(snapshot?.consentId);
  const recordedOn = formatDate(snapshot?.consentedAt ?? null);

  async function submitWithdrawal() {
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const cmp = (window as CmpWindow).CMP;
      const consentId = snapshot?.consentId;
      if (!cmp?.withdrawConsent || !consentId) {
        throw new Error("No confirmed consent is available in this browser to withdraw.");
      }
      await cmp.withdrawConsent();
      const record: WithdrawalRecord = {
        code: confirmationCode(consentId),
        consentId,
        withdrawnAt: new Date().toISOString(),
        reason: reason.trim(),
        status: "withdrawn",
      };
      writeWithdrawals([record, ...readWithdrawals().filter((row) => row.code !== record.code)]);
      setLastCode(record.code);
      setStatusCode(record.code);
      setStatusResult(record);
      setWithdrawOpen(false);
      setReason("");
      refresh();
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : "Could not withdraw consent.");
    } finally {
      setWithdrawing(false);
    }
  }

  function checkStatus(event: FormEvent) {
    event.preventDefault();
    const code = statusCode.trim().toUpperCase();
    const match = readWithdrawals().find(
      (row) => row.code.toUpperCase() === code || row.consentId.toUpperCase() === code,
    );
    if (match) {
      setStatusResult(match);
      return;
    }
    if (snapshot?.consentId && confirmationCode(snapshot.consentId).toUpperCase() === code) {
      setStatusResult(
        snapshot.status === "withdrawn"
          ? {
              code,
              consentId: snapshot.consentId,
              withdrawnAt: snapshot.consentedAt ?? new Date().toISOString(),
              reason: "",
              status: "withdrawn",
            }
          : "This confirmation code matches an active consent. Withdrawal has not been completed.",
      );
      return;
    }
    setStatusResult("No withdrawal was found for that confirmation code in this browser.");
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
            <IconSearch />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0B2C4A]">Your Consent</h1>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">
              We automatically detected your consent preferences from this browser.
            </p>
          </div>
        </div>
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            loaded ? "bg-[#ECFDF3] text-[#067647]" : "bg-[#F3F6F8] text-[#4B5563]"
          }`}
        >
          {loaded
            ? "Preferences loaded automatically from this browser"
            : "No confirmed consent was found in this browser yet. Necessary cookies stay on. Choose cookies on this site to record preferences."}
        </p>
      </section>

      <section className="rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold tracking-tight text-[#0B2C4A]">Your Consent Preferences</h2>
        <p className="mt-1 text-sm text-[#6B7280]">Consent recorded on {recordedOn}</p>
        <div className="mt-4 space-y-3">
          {purposes.map((purpose) => (
            <article key={purpose.id} className="rounded-xl border border-[#E5E7EB] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#0B2C4A]">
                    {purpose.name}{" "}
                    {purpose.isRequired ? (
                      <span className="ml-1 text-xs font-medium text-[#B42318]">Required</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#4B5563]">
                    {purpose.description || (purpose.isRequired ? "Legal basis: necessary" : "Legal basis: consent")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    purpose.granted ? "bg-[#2563EB] text-white" : "bg-[#FEE4E2] text-[#B42318]"
                  }`}
                >
                  {purpose.granted ? "Granted" : "Denied"}
                </span>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#D92D20] px-4 text-sm font-semibold text-white hover:bg-[#B42318]"
          onClick={() => setWithdrawOpen(true)}
        >
          Withdraw All Consent
        </button>
        <p className="mt-3 text-sm leading-6 text-[#4B5563]">
          Under DPDP Act Section 6(4), you have the right to withdraw consent at any time. Withdrawal
          does not affect the lawfulness of processing based on consent before its withdrawal.
        </p>
      </section>

      {withdrawOpen ? (
        <section className="rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEF3F2] text-[#D92D20]">
              <IconAlert />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#0B2C4A]">Withdraw All Consent</h2>
              <p className="mt-1 text-sm text-[#4B5563]">This will withdraw your consent for all purposes.</p>
            </div>
          </div>
          <label htmlFor="withdrawReason" className="field-label mt-5">
            Reason (optional)
          </label>
          <textarea
            id="withdrawReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="You may optionally provide a reason for withdrawing consent"
            className="field-input"
          />
          {withdrawError ? (
            <p className="mt-3 text-sm font-medium text-[#B42318]" role="alert">
              {withdrawError}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={withdrawing}
              className="inline-flex h-11 items-center rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
              onClick={submitWithdrawal}
            >
              {withdrawing ? "Submitting…" : "Submit Withdrawal Request"}
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-lg border border-[#D3E0DE] px-4 text-sm font-semibold text-[#0B2C4A]"
              onClick={() => {
                setWithdrawOpen(false);
                setWithdrawError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {lastCode ? (
        <p className="rounded-xl border border-[#B7E8DC] bg-[#F3FAF8] px-4 py-3 text-sm text-[#0B2C4A]">
          Withdrawal submitted. Save this confirmation code:{" "}
          <span className="font-mono font-semibold">{lastCode}</span>
        </p>
      ) : null}

      <section className="rounded-2xl border border-[#D3E0DE] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-[#00A88F]">
            <IconSearch />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#0B2C4A]">Check Withdrawal Status</h2>
            <p className="mt-1 text-sm text-[#4B5563]">
              Enter your confirmation code to check the status of a withdrawal request.
            </p>
          </div>
        </div>
        <form onSubmit={checkStatus} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={statusCode}
            onChange={(event) => setStatusCode(event.target.value)}
            placeholder="Enter confirmation code"
            className="field-input flex-1"
            required
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
          >
            Check Status
          </button>
        </form>
        {statusResult ? (
          <div className="mt-4 rounded-xl border border-[#D3E0DE] bg-[#F8FCFB] p-4 text-sm text-[#0B2C4A]">
            {typeof statusResult === "string" ? (
              <p>{statusResult}</p>
            ) : (
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-[#6B7280]">Confirmation code</dt>
                  <dd className="font-mono font-semibold">{statusResult.code}</dd>
                </div>
                <div>
                  <dt className="text-[#6B7280]">Status</dt>
                  <dd className="capitalize">{statusResult.status}</dd>
                </div>
                <div>
                  <dt className="text-[#6B7280]">Withdrawn</dt>
                  <dd>{formatDate(statusResult.withdrawnAt)}</dd>
                </div>
                <div>
                  <dt className="text-[#6B7280]">Reason</dt>
                  <dd>{statusResult.reason || "—"}</dd>
                </div>
              </dl>
            )}
          </div>
        ) : null}
      </section>

      <p className="px-1 text-center text-sm leading-6 text-[#4B5563]">
        Your rights under DPDP Act 2023, Section 6(4) — Right to withdraw consent at any time. Processing
        of withdrawal requests is subject to applicable SLA timelines.
      </p>
      <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold text-[#2563EB]">
        <Link href={rightsHref} className="hover:underline">
          ← Data Principal Requests
        </Link>
        <Link href={grievanceHref} className="hover:underline">
          Grievance Portal →
        </Link>
      </div>
    </div>
  );
}
