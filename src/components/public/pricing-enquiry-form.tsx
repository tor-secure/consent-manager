"use client";

import { useEffect, useRef, useState } from "react";

import { InvisibleRecaptcha, type InvisibleRecaptchaHandle } from "@/components/public/invisible-recaptcha";
import { ArrowButton } from "@/components/ui/arrow-button";
import { RECAPTCHA_DID_NOT_RUN, RECAPTCHA_FAILED } from "@/lib/recaptcha-messages";

const PLANS = [
  { id: "silver", label: "Silver", hint: "Essential compliance" },
  { id: "gold", label: "Gold", hint: "Advanced privacy" },
  { id: "platinum", label: "Platinum", hint: "Complete platform" },
  { id: "unsure", label: "Not sure yet", hint: "Help me choose" },
] as const;

function planFromLocation(): string {
  if (typeof window === "undefined") return "silver";
  const requested = new URLSearchParams(window.location.search).get("plan")?.toLowerCase();
  return PLANS.some((plan) => plan.id === requested) ? requested! : "silver";
}

export function PricingEnquiryForm({ siteKey }: { siteKey: string }) {
  const [selectedPlan, setSelectedPlan] = useState("silver");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const captchaRef = useRef<InvisibleRecaptchaHandle>(null);

  useEffect(() => {
    setSelectedPlan(planFromLocation());
  }, []);

  function captchaMissing() {
    captchaRef.current?.reset();
    setStatus("error");
    setMessage(RECAPTCHA_DID_NOT_RUN);
  }

  function captchaFailed() {
    captchaRef.current?.reset();
    setStatus("error");
    setMessage(RECAPTCHA_FAILED);
  }

  async function postForm(recaptchaToken: string) {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setStatus("sending");
    setMessage(null);

    try {
      const res = await fetch("/api/pricing-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          organisation: data.get("organisation"),
          phone: data.get("phone"),
          plan: data.get("plan"),
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
      setSelectedPlan(planFromLocation());
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
      ref={formRef}
      onSubmit={submit}
      className="relative rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pricing-name" className="field-label">
            Full name
          </label>
          <input
            id="pricing-name"
            name="name"
            required
            autoComplete="name"
            className="field-input"
            maxLength={120}
          />
        </div>
        <div>
          <label htmlFor="pricing-email" className="field-label">
            Work email
          </label>
          <input
            id="pricing-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="field-input"
            maxLength={320}
          />
        </div>
        <div>
          <label htmlFor="pricing-organisation" className="field-label">
            Organisation
          </label>
          <input
            id="pricing-organisation"
            name="organisation"
            required
            autoComplete="organization"
            className="field-input"
            maxLength={200}
          />
        </div>
        <div>
          <label htmlFor="pricing-phone" className="field-label">
            Phone <span className="font-normal text-[#6B7280]">(optional)</span>
          </label>
          <input
            id="pricing-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className="field-input"
            maxLength={40}
          />
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="field-label">Plan you want to discuss</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <label
              key={plan.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E5E7EB] px-3 py-3 has-[:checked]:border-[#6D28D9] has-[:checked]:bg-[#F5F3FF]"
            >
              <input
                type="radio"
                name="plan"
                value={plan.id}
                required
                checked={plan.id === selectedPlan}
                onChange={() => setSelectedPlan(plan.id)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-[#0F172A]">{plan.label}</span>
                <span className="block text-xs text-[#6B7280]">{plan.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <label htmlFor="pricing-message" className="field-label">
          What do you need?
        </label>
        <textarea
          id="pricing-message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className="field-input"
          placeholder="Tell us about your sites, traffic, and which regulations you need to cover."
        />
      </div>

      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="pricing-company-url">Company website</label>
        <input id="pricing-company-url" name="companyUrl" tabIndex={-1} autoComplete="off" />
      </div>

      {siteKey ? (
        <InvisibleRecaptcha
          ref={captchaRef}
          siteKey={siteKey}
          onToken={(token) => {
            void postForm(token);
          }}
          onMissing={captchaMissing}
          onFailed={captchaFailed}
        />
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ArrowButton type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send enquiry"}
        </ArrowButton>
        <p className="text-xs leading-5 text-[#6B7280]">
          We use this only to reply about pricing. See our{" "}
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
