"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { notify } from "@/components/feedback/notify";
import { ShieldLoader } from "@/components/ui/shield-loader";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [resetPending, setResetPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/elearning-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        notify.error(body?.message ?? "Could not sign in.");
        return;
      }
      notify.success("Signed in");
      router.replace("/elearning-admin");
      router.refresh();
    } catch {
      notify.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function onForgotPassword() {
    if (resetPending || pending) return;
    setResetPending(true);
    try {
      const response = await fetch("/api/elearning-admin/forgot-password", {
        method: "POST",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        notify.error(body?.message ?? "Password reset failed.");
        return;
      }
      notify.success(body?.message ?? "Password reset link sent to consentguruofficial@gmail.com.");
    } catch {
      notify.error("Network error. Try again.");
    } finally {
      setResetPending(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      style={{
        background:
          "radial-gradient(ellipse 55% 35% at 15% 0%, rgba(0,196,167,0.18), transparent 55%), radial-gradient(ellipse 45% 30% at 90% 100%, rgba(11,44,74,0.12), transparent 50%), linear-gradient(180deg, #F3F4F6 0%, #E6F9F5 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,196,167,0.22) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#00C4A7]/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-16 h-64 w-64 rounded-full bg-[#0B2C4A]/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur-sm">
        <div className="flex flex-col items-center border-b border-[#F3F4F6] px-6 py-7 text-center">
          <BrandLogo height={36} />
          <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#0B2C4A]">
            E-learning admin
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
          <label className="block">
            <span className="text-sm font-semibold text-[#0B2C4A]">Username</span>
            <input
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#D1D5DB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/20"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#0B2C4A]">Password</span>
            <span className="relative mt-1.5 block">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#D1D5DB] bg-white px-3 pr-12 text-sm text-[#111827] outline-none focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-[#4d6570] hover:text-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M3 3l18 18M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.2A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 11 7.5a12 12 0 0 1-4.1 5.1M6.1 6.2A12 12 0 0 0 1 12.5C2.7 16.9 7 20 12 20c1.4 0 2.8-.3 4-.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5C21.3 16.9 17 20 12 20S2.7 16.9 1 12.5Z" strokeLinejoin="round" />
                    <circle cx="12" cy="12.5" r="3" />
                  </svg>
                )}
              </button>
            </span>
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void onForgotPassword()}
              disabled={resetPending || pending}
              className="text-sm font-semibold text-[#0B2C4A] underline-offset-2 hover:text-[#00A88F] hover:underline disabled:opacity-60"
            >
              {resetPending ? "Sending reset…" : "Forgot password?"}
            </button>
          </div>

          <button
            type="submit"
            disabled={pending || resetPending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0B2C4A] text-sm font-semibold text-white hover:bg-[#123d63] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
          >
            {pending ? (
              <>
                <ShieldLoader />
                Signing in…
              </>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
