"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ArrowButton } from "@/components/ui/arrow-button";

type Grecaptcha = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      size: "invisible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => number;
  execute: (widgetId: number) => void;
  reset: (widgetId: number) => void;
};

type InvisibleRecaptchaHandle = {
  execute: () => void;
  reset: () => void;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
    recaptchaOnLoad?: () => void;
  }
}

const INTERESTS = [
  { id: "business", label: "Get a DPO", hint: "My organisation needs privacy support" },
  { id: "professional", label: "Join as a DPO", hint: "I am a privacy professional" },
] as const;

const TIERS = [
  { id: "unsure", label: "Not sure yet" },
  { id: "essential", label: "Essential" },
  { id: "professional", label: "Professional" },
  { id: "enterprise", label: "Enterprise" },
] as const;

function InvisibleRecaptcha({
  ref,
  siteKey,
  onToken,
  onError,
}: {
  ref: React.Ref<InvisibleRecaptchaHandle>;
  siteKey: string;
  onToken: (token: string) => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onToken, onError]);

  useImperativeHandle(ref, () => ({
    execute() {
      const widgetId = widgetIdRef.current;
      if (widgetId == null || !window.grecaptcha) {
        onErrorRef.current();
        return;
      }
      window.grecaptcha.execute(widgetId);
    },
    reset() {
      const widgetId = widgetIdRef.current;
      if (widgetId == null || !window.grecaptcha) return;
      window.grecaptcha.reset(widgetId);
    },
  }));

  useEffect(() => {
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.grecaptcha || widgetIdRef.current != null) return;
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        size: "invisible",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onErrorRef.current(),
        "error-callback": () => onErrorRef.current(),
      });
    }

    if (window.grecaptcha) {
      renderWidget();
    } else {
      window.recaptchaOnLoad = () => {
        if (!cancelled) renderWidget();
      };
      if (!document.querySelector("script[data-recaptcha-api]")) {
        const script = document.createElement("script");
        script.src = "https://www.google.com/recaptcha/api.js?render=explicit&onload=recaptchaOnLoad";
        script.async = true;
        script.defer = true;
        script.dataset.recaptchaApi = "true";
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  return <div ref={containerRef} className="hidden" aria-hidden="true" />;
}

export function DpoEnquiryForm({ siteKey }: { siteKey: string }) {
  const searchParams = useSearchParams();
  const requestedInterest = searchParams.get("interest")?.toLowerCase();
  const requestedTier = searchParams.get("tier")?.toLowerCase();
  const selectedInterest = INTERESTS.some((item) => item.id === requestedInterest)
    ? requestedInterest
    : "business";
  const selectedTier = TIERS.some((item) => item.id === requestedTier) ? requestedTier : "unsure";
  const [interest, setInterest] = useState(selectedInterest);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const captchaRef = useRef<InvisibleRecaptchaHandle>(null);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#enquiry") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("enquiry")?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }, [selectedInterest, selectedTier]);

  function captchaFailed() {
    captchaRef.current?.reset();
    setStatus("error");
    setMessage("Security check failed. Try sending the enquiry again.");
  }

  async function postForm(recaptchaToken: string) {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setStatus("sending");
    setMessage(null);

    try {
      const res = await fetch("/api/dpo-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          organisation: data.get("organisation"),
          phone: data.get("phone"),
          interest: data.get("interest"),
          tier: data.get("tier"),
          message: data.get("message"),
          companyUrl: data.get("companyUrl"),
          recaptchaToken,
        }),
      });
      const payload = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !payload.success) {
        setStatus("error");
        setMessage(payload.message ?? "Could not send the enquiry.");
        captchaRef.current?.reset();
        return;
      }
      setStatus("sent");
      setMessage(payload.message ?? "Thanks. We will be in touch.");
      form.reset();
      captchaRef.current?.reset();
    } catch {
      setStatus("error");
      setMessage("Could not send the enquiry. Try again in a moment.");
      captchaRef.current?.reset();
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!siteKey) {
      void postForm("");
      return;
    }
    setStatus("sending");
    setMessage(null);
    captchaRef.current?.execute();
  }

  return (
    <form
      key={`${selectedInterest}-${selectedTier}`}
      ref={formRef}
      onSubmit={submit}
      className="relative rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8"
    >
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="field-label">I want to</legend>
        {INTERESTS.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E5E7EB] px-3 py-3 has-[:checked]:border-[#00C4A7] has-[:checked]:bg-[#E6F9F5]"
          >
            <input
              type="radio"
              name="interest"
              value={item.id}
              required
              defaultChecked={item.id === selectedInterest}
              onChange={() => setInterest(item.id)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-[#0B2C4A]">{item.label}</span>
              <span className="block text-xs text-[#6B7280]">{item.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="dpo-name" className="field-label">
            Full name
          </label>
          <input id="dpo-name" name="name" required autoComplete="name" className="field-input" maxLength={120} />
        </div>
        <div>
          <label htmlFor="dpo-email" className="field-label">
            {interest === "professional" ? "Email" : "Work email"}
          </label>
          <input
            id="dpo-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="field-input"
            maxLength={320}
          />
        </div>
        <div>
          <label htmlFor="dpo-organisation" className="field-label">
            Organisation{interest === "professional" ? <span className="font-normal text-[#6B7280]"> (optional)</span> : null}
          </label>
          <input
            id="dpo-organisation"
            name="organisation"
            required={interest === "business"}
            autoComplete="organization"
            className="field-input"
            maxLength={200}
          />
        </div>
        <div>
          <label htmlFor="dpo-phone" className="field-label">
            Phone <span className="font-normal text-[#6B7280]">(optional)</span>
          </label>
          <input id="dpo-phone" name="phone" type="tel" autoComplete="tel" className="field-input" maxLength={40} />
        </div>
      </div>

      {interest === "business" ? (
        <div className="mt-6">
          <label htmlFor="dpo-tier" className="field-label">
            Service level of interest
          </label>
          <select id="dpo-tier" name="tier" defaultValue={selectedTier} className="field-input">
            {TIERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="tier" value="unsure" />
      )}

      <div className="mt-6">
        <label htmlFor="dpo-message" className="field-label">
          {interest === "professional" ? "Tell us about your experience" : "What do you need?"}
        </label>
        <textarea
          id="dpo-message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className="field-input"
          placeholder={
            interest === "professional"
              ? "Share jurisdictions you work in, typical engagements, and how you would like to join the network."
              : "Share your industry, where you operate, and the privacy support you are looking for."
          }
        />
      </div>

      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="dpo-company-url">Company website</label>
        <input id="dpo-company-url" name="companyUrl" tabIndex={-1} autoComplete="off" />
      </div>

      {siteKey ? (
        <InvisibleRecaptcha
          ref={captchaRef}
          siteKey={siteKey}
          onToken={(token) => {
            void postForm(token);
          }}
          onError={captchaFailed}
        />
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ArrowButton type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send enquiry"}
        </ArrowButton>
        <p className="text-xs leading-5 text-[#6B7280]">
          We use this only to reply about DPO-as-a-Service. See our{" "}
          <a href="/privacy-center/privacy-policy" className="font-medium text-[#0B2C4A] underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>

      <div aria-live="polite">
        {message ? (
          <p className={`mt-4 text-sm ${status === "error" ? "text-[#B91C1C]" : "text-[#047857]"}`}>{message}</p>
        ) : null}
      </div>
    </form>
  );
}
