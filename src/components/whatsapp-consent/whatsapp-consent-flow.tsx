"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "intro" | "phone" | "sending" | "otp" | "notice" | "done";

type NoticePurpose = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  dataCategories: string[];
  retentionPeriod: string | null;
  legalBasis: string | null;
};

type Notice = {
  websiteName: string;
  policyName: string;
  policyVersion: number;
  title: string;
  description: string;
  locale: string;
  purposes: NoticePurpose[];
  vendors: Array<{ id: string; name: string; domain: string | null }>;
  grievance: Record<string, unknown>;
};

type Summary = {
  consentId: string;
  status: string;
  stateVersion: number;
  consentedAt: string | null;
  expiresAt: string | null;
  withdrawnAt: string | null;
  websiteName: string;
  phoneMasked: string;
  decisions: Array<{ purposeId: string; name: string; isRequired: boolean; granted: boolean }>;
};

type ApiError = { success: false; code?: string; message?: string; attemptsLeft?: number };

const OTP_LENGTH = 6;

async function post<T>(path: string, body: unknown): Promise<T | ApiError> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T | ApiError;
  if (!response.ok) {
    const err = data as ApiError;
    return { success: false, code: err.code, message: err.message ?? "Request failed" };
  }
  return data;
}

function secondsUntil(iso: string | null, now: number): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((Date.parse(iso) - now) / 1000));
}

function formatDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "—" };
  const value = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value),
    time: new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(value),
  };
}

function ShieldIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}

export function WhatsAppConsentFlow({ siteKey, websiteName }: { siteKey: string; websiteName: string }) {
  const [step, setStep] = useState<Step>("intro");
  const [phone, setPhone] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [granular, setGranular] = useState(false);
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (step !== "otp") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  const expiresIn = secondsUntil(otpExpiresAt, now);
  const resendIn = secondsUntil(resendAvailableAt, now);
  const code = digits.join("");

  const resetOtp = useCallback(() => {
    setDigits(Array(OTP_LENGTH).fill(""));
    setAttemptsLeft(null);
    otpRefs.current[0]?.focus();
  }, []);

  async function sendOtp() {
    setError(null);
    setPending(true);
    setStep("sending");
    const result = await post<{
      success: true;
      challengeId: string;
      phoneMasked: string;
      otpExpiresAt: string;
      resendAvailableAt: string;
      devOtp?: string;
    }>("/api/consent/whatsapp/start", { siteKey, phone });
    setPending(false);
    if (!result.success) {
      setError(result.message ?? "Could not send the code");
      setStep("phone");
      return;
    }
    setChallengeId(result.challengeId);
    setPhoneMasked(result.phoneMasked);
    setOtpExpiresAt(result.otpExpiresAt);
    setResendAvailableAt(result.resendAvailableAt);
    setDevOtp(result.devOtp ?? null);
    setNow(Date.now());
    setStep("otp");
    setTimeout(() => otpRefs.current[0]?.focus(), 0);
  }

  async function resendOtp() {
    if (!challengeId || resendIn > 0) return;
    setError(null);
    setPending(true);
    const result = await post<{
      success: true;
      otpExpiresAt: string;
      resendAvailableAt: string;
      devOtp?: string;
    }>("/api/consent/whatsapp/resend", { challengeId });
    setPending(false);
    if (!result.success) {
      setError(result.message ?? "Could not resend the code");
      if (result.code === "not_resendable" || result.code === "resend_limit") {
        setStep("phone");
        setChallengeId(null);
      }
      return;
    }
    setOtpExpiresAt(result.otpExpiresAt);
    setResendAvailableAt(result.resendAvailableAt);
    setDevOtp(result.devOtp ?? null);
    setNow(Date.now());
    resetOtp();
  }

  async function verifyOtp(value = code) {
    if (!challengeId || value.length !== OTP_LENGTH) return;
    setError(null);
    setPending(true);
    const result = await post<{
      success: true;
      sessionToken: string;
      notice: Notice;
      phoneMasked: string;
    }>("/api/consent/whatsapp/verify", { challengeId, code: value });
    setPending(false);
    if (!result.success) {
      setError(result.message ?? "That code is not correct");
      if (typeof result.attemptsLeft === "number") setAttemptsLeft(result.attemptsLeft);
      if (result.code === "too_many_attempts" || result.code === "challenge_closed") {
        setStep("phone");
        setChallengeId(null);
      } else if (result.code === "otp_expired") {
        setOtpExpiresAt(null);
      }
      setDigits(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
      return;
    }
    setSessionToken(result.sessionToken);
    setNotice(result.notice);
    setChoices(
      Object.fromEntries(result.notice.purposes.map((purpose) => [purpose.id, purpose.isRequired])),
    );
    setStep("notice");
  }

  function onDigitChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    // Paste of the whole code into one box.
    if (cleaned.length > 1) {
      const next = Array(OTP_LENGTH).fill("");
      for (let i = 0; i < Math.min(OTP_LENGTH, cleaned.length); i += 1) next[i] = cleaned[i];
      setDigits(next);
      const last = Math.min(OTP_LENGTH - 1, cleaned.length - 1);
      otpRefs.current[last]?.focus();
      if (cleaned.length >= OTP_LENGTH) void verifyOtp(next.join(""));
      return;
    }
    setDigits((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      const full = next.join("");
      if (index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
      if (full.length === OTP_LENGTH && !full.includes("")) void verifyOtp(full);
      return next;
    });
  }

  function onDigitKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function submit(choice: "accept-all" | "reject-all" | "granular") {
    if (!challengeId || !sessionToken || !notice) return;
    setError(null);
    setPending(true);
    const submission =
      choice === "granular"
        ? {
            choice,
            purposeDecisions: notice.purposes.map((purpose) => ({
              purposeId: purpose.id,
              granted: purpose.isRequired || choices[purpose.id] === true,
            })),
          }
        : { choice };
    const result = await post<{ success: true; summary: Summary }>("/api/consent/whatsapp/submit", {
      challengeId,
      sessionToken,
      submission,
    });
    setPending(false);
    if (!result.success) {
      setError(result.message ?? "Could not save your consent");
      return;
    }
    setSummary(result.summary);
    setShowSummary(false);
    setStep("done");
  }

  async function withdraw() {
    if (!challengeId || !sessionToken) return;
    if (!window.confirm("Withdraw this consent? The organisation will stop the optional processing you agreed to.")) {
      return;
    }
    setError(null);
    setPending(true);
    const result = await post<{ success: true; summary: Summary }>("/api/consent/whatsapp/withdraw", {
      challengeId,
      sessionToken,
    });
    setPending(false);
    if (!result.success) {
      setError(result.message ?? "Could not withdraw");
      return;
    }
    setSummary(result.summary);
  }

  const optionalPurposes = useMemo(
    () => notice?.purposes.filter((purpose) => !purpose.isRequired) ?? [],
    [notice],
  );

  const stepNumber: Record<Step, number> = { intro: 1, phone: 2, sending: 3, otp: 4, notice: 5, done: 5 };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] sm:p-8">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
        <span>{websiteName}</span>
        <span aria-live="polite">Step {stepNumber[step]} of 5</span>
      </div>

      {error ? (
        <Alert variant="error" role="alert" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {step === "intro" ? (
        <section className="mt-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e6f7f1] text-[#0f9d78]">
            <ShieldIcon />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-900">Your health. Your privacy.</h1>
          <p className="mt-2 text-sm text-slate-600">
            {websiteName} needs your consent before it processes your personal data. We will confirm your
            mobile number with a one-time code on WhatsApp, then show you exactly what you are agreeing to.
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={() => setStep("phone")}>
            Give consent
          </Button>
          <p className="mt-3 text-xs text-slate-500">Your data. Your rights. Your choice.</p>
        </section>
      ) : null}

      {step === "phone" || step === "sending" ? (
        <section className="mt-6">
          <h1 className="text-xl font-semibold text-slate-900">Verify your mobile number</h1>
          <p className="mt-1 text-sm text-slate-600">
            We will send a WhatsApp code to confirm it is you. Standard Indian numbers can be entered without
            the country code.
          </p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!pending) void sendOtp();
            }}
          >
            <div>
              <label htmlFor="wa-phone" className="mb-1.5 block text-sm font-medium text-slate-800">
                Mobile number
              </label>
              <Input
                id="wa-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={pending}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" loading={pending} disabled={!phone.trim()}>
              {pending ? "Sending code on WhatsApp" : "Send OTP"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-slate-500">
            Your number is used only to deliver the code and your consent receipt. It is stored as a keyed hash
            with your consent record.
          </p>
        </section>
      ) : null}

      {step === "otp" ? (
        <section className="mt-6">
          <h1 className="text-xl font-semibold text-slate-900">Enter OTP</h1>
          <p className="mt-1 text-sm text-slate-600">
            We sent a 6-digit code to <span className="font-medium text-slate-900">{phoneMasked}</span> on
            WhatsApp.
          </p>
          {devOtp ? (
            <Alert variant="warning" className="mt-3">
              Development only: WhatsApp is not configured, your code is <strong>{devOtp}</strong>.
            </Alert>
          ) : null}
          <div className="mt-5 flex justify-between gap-2" role="group" aria-label="One-time code">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  otpRefs.current[index] = element;
                }}
                className="field-input h-14 w-12 text-center text-xl font-semibold tracking-widest"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1}`}
                maxLength={OTP_LENGTH}
                value={digit}
                disabled={pending}
                onChange={(event) => onDigitChange(index, event.target.value)}
                onKeyDown={(event) => onDigitKeyDown(index, event)}
              />
            ))}
          </div>
          <Button
            className="mt-5 w-full"
            size="lg"
            loading={pending}
            disabled={code.length !== OTP_LENGTH}
            onClick={() => void verifyOtp()}
          >
            Verify OTP
          </Button>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span aria-live="polite">
              {expiresIn > 0
                ? `Code valid for ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}`
                : "Code expired. Request a new one."}
            </span>
            <button
              type="button"
              className="font-medium text-[#0f9d78] disabled:text-slate-400"
              disabled={pending || resendIn > 0}
              onClick={() => void resendOtp()}
            >
              {resendIn > 0 ? `Resend in 00:${String(resendIn).padStart(2, "0")}` : "Resend code"}
            </button>
          </div>
          {attemptsLeft !== null ? (
            <p className="mt-2 text-xs text-slate-500">{attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left.</p>
          ) : null}
          <button
            type="button"
            className="mt-4 text-xs text-slate-500 underline"
            onClick={() => {
              setStep("phone");
              setChallengeId(null);
              setError(null);
            }}
          >
            Use a different number
          </button>
        </section>
      ) : null}

      {step === "notice" && notice ? (
        <section className="mt-6">
          <h1 className="text-xl font-semibold text-slate-900">{notice.title || "Your consent"}</h1>
          <p className="mt-1 text-xs text-slate-500">
            {notice.policyName} · version {notice.policyVersion}
          </p>
          {notice.description ? (
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{notice.description}</p>
          ) : null}

          <h2 className="mt-5 text-sm font-semibold text-slate-900">What you are agreeing to</h2>
          <ul className="mt-2 space-y-2">
            {notice.purposes.map((purpose) => (
              <li key={purpose.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{purpose.name}</p>
                    {purpose.description ? (
                      <p className="mt-0.5 text-xs text-slate-600">{purpose.description}</p>
                    ) : null}
                    {purpose.dataCategories.length ? (
                      <p className="mt-1 text-xs text-slate-500">Data: {purpose.dataCategories.join(", ")}</p>
                    ) : null}
                    {purpose.retentionPeriod ? (
                      <p className="text-xs text-slate-500">Kept for: {purpose.retentionPeriod}</p>
                    ) : null}
                  </div>
                  {purpose.isRequired ? (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Required
                    </span>
                  ) : granular ? (
                    <label className="flex shrink-0 items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={choices[purpose.id] === true}
                        onChange={(event) =>
                          setChoices((prev) => ({ ...prev, [purpose.id]: event.target.checked }))
                        }
                      />
                      Allow
                    </label>
                  ) : (
                    <span className="shrink-0 rounded-full bg-[#e6f7f1] px-2 py-0.5 text-[11px] font-medium text-[#0f9d78]">
                      Optional
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {notice.vendors.length ? (
            <p className="mt-3 text-xs text-slate-500">
              Shared with: {notice.vendors.map((vendor) => vendor.name).join(", ")}
            </p>
          ) : null}

          <div className="mt-5 space-y-2">
            {granular ? (
              <Button className="w-full" size="lg" loading={pending} onClick={() => void submit("granular")}>
                Save my choices
              </Button>
            ) : (
              <Button className="w-full" size="lg" loading={pending} onClick={() => void submit("accept-all")}>
                I agree
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              disabled={pending}
              onClick={() => void submit("reject-all")}
            >
              Only what is required
            </Button>
            {optionalPurposes.length > 0 ? (
              <button
                type="button"
                className="w-full py-2 text-sm font-medium text-[#0f9d78]"
                disabled={pending}
                onClick={() => setGranular((value) => !value)}
              >
                {granular ? "Back to simple choices" : "Choose purpose by purpose"}
              </button>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            You can withdraw at any time from the confirmation screen or by replying STOP on WhatsApp.
          </p>
        </section>
      ) : null}

      {step === "done" && summary ? (
        <section className="mt-6 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              summary.status === "withdrawn" ? "bg-slate-100 text-slate-600" : "bg-[#e6f7f1] text-[#0f9d78]"
            }`}
          >
            <CheckIcon />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-slate-900">
            {summary.status === "withdrawn" ? "Consent withdrawn" : "Consent successfully recorded"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {summary.status === "withdrawn"
              ? `Your consent for ${summary.websiteName} has been withdrawn. Required processing continues as described in the notice.`
              : `Thank you. Your consent for ${summary.websiteName} has been recorded. A confirmation has been sent to ${summary.phoneMasked} on WhatsApp.`}
          </p>
          {(() => {
            const when = formatDateTime(summary.withdrawnAt ?? summary.consentedAt);
            return (
              <dl className="mt-5 grid grid-cols-2 gap-3 text-left text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Date</dt>
                  <dd className="font-medium text-slate-900">{when.date}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Time</dt>
                  <dd className="font-medium text-slate-900">{when.time}</dd>
                </div>
                <div className="col-span-2 rounded-2xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Reference</dt>
                  <dd className="break-all font-mono text-xs text-slate-900">{summary.consentId}</dd>
                </div>
              </dl>
            );
          })()}
          <button
            type="button"
            className="mt-5 text-sm font-medium text-[#0f9d78]"
            onClick={() => setShowSummary((value) => !value)}
          >
            {showSummary ? "Hide consent summary" : "View consent summary"}
          </button>
          {showSummary ? (
            <ul className="mt-3 space-y-1.5 text-left text-sm">
              {summary.decisions.map((decision) => (
                <li key={decision.purposeId} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <span className="text-slate-800">{decision.name}</span>
                  <span
                    className={`text-xs font-medium ${
                      summary.status === "withdrawn" && !decision.isRequired
                        ? "text-slate-500"
                        : decision.granted
                          ? "text-[#0f9d78]"
                          : "text-slate-500"
                    }`}
                  >
                    {summary.status === "withdrawn" && !decision.isRequired
                      ? "Withdrawn"
                      : decision.granted
                        ? decision.isRequired
                          ? "Required"
                          : "Allowed"
                        : "Not allowed"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {summary.status !== "withdrawn" ? (
            <Button variant="outline" className="mt-6 w-full" disabled={pending} loading={pending} onClick={() => void withdraw()}>
              Withdraw consent
            </Button>
          ) : null}
          <p className="mt-4 text-xs text-slate-500">
            Keep the reference. The organisation can show this record if you ask what you agreed to.
          </p>
        </section>
      ) : null}
    </div>
  );
}
