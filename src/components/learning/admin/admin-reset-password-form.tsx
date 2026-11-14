"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { notify } from "@/components/feedback/notify";
import { ShieldLoader } from "@/components/ui/shield-loader";

function PasswordField({
  label,
  name,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#0B2C4A]">{label}</span>
      <span className="relative mt-1.5 block">
        <input
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-[#D1D5DB] bg-white px-3 pr-12 text-sm text-[#111827] outline-none focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/20"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-[#4d6570] hover:text-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
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
  );
}

export function AdminResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <ResetShell>
        <div className="space-y-4 px-6 py-8 text-center">
          <h1 className="text-xl font-bold text-[#0B2C4A]">Invalid reset link</h1>
          <p className="text-sm leading-6 text-[#4d6570]">
            This link is missing a reset token. Request a new password reset from the login page.
          </p>
          <Link
            href="/elearning-admin/login"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0B2C4A] px-5 text-sm font-semibold text-white hover:bg-[#123d63]"
          >
            Back to sign in
          </Link>
        </div>
      </ResetShell>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (password.length < 8) {
      notify.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      notify.error("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/elearning-admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        notify.error(body?.message ?? "Could not update password.");
        return;
      }
      notify.success(body?.message ?? "Password updated.");
      router.replace("/elearning-admin/login");
      router.refresh();
    } catch {
      notify.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <ResetShell>
      <div className="border-b border-[#F3F4F6] px-6 py-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00A88F]">Security</p>
        <h1 className="mt-2 text-xl font-bold text-[#0B2C4A]">Set a new password</h1>
        <p className="mt-2 text-sm text-[#4d6570]">Choose a new password for the e-learning admin account.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
        <PasswordField
          label="New password"
          name="password"
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm new password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirm}
          onToggle={() => setShowConfirm((value) => !value)}
          autoComplete="new-password"
        />
        <p className="text-xs text-[#4d6570]">Use at least 8 characters.</p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0B2C4A] text-sm font-semibold text-white hover:bg-[#123d63] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
        >
          {pending ? (
            <>
              <ShieldLoader />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </button>
        <p className="text-center text-sm text-[#4d6570]">
          <Link href="/elearning-admin/login" className="font-semibold text-[#0B2C4A] underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </ResetShell>
  );
}

function ResetShell({ children }: { children: ReactNode }) {
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
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur-sm">
        <div className="flex flex-col items-center border-b border-[#F3F4F6] px-6 py-7 text-center">
          <BrandLogo height={36} />
          <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#0B2C4A]">
            E-learning admin
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
