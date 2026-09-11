"use client";

import { useState } from "react";
import Link from "next/link";
import { SkipLink } from "@/components/ui/skip-link";

export default function GuardianConsentPage() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setPayload(null);
    const res = await fetch("/api/guardian-consent/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json() as {
      success: boolean;
      message?: string;
      notice?: string;
      age?: Record<string, unknown>;
      authorityVerified?: boolean;
    };
    if (!data.success) {
      setMessage(data.message ?? "Verification failed");
      return;
    }
    setMessage(data.notice ?? "Guardian contact was proven.");
    setPayload({
      ageStatus: data.age?.ageStatus,
      guardianStatus: data.age?.guardianStatus,
      restrictedProcessingAllowed: data.age?.restrictedProcessingAllowed,
      authorityVerified: data.authorityVerified === true,
    });
  }

  return (
    <div className="min-h-screen bg-white">
      <SkipLink />
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 text-sm">
          <Link href="/" className="font-medium text-slate-700 hover:text-slate-900">Home</Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">Guardian authorization</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the one-time token. Proving contact does not establish legal guardian authority,
          and restricted processing stays blocked until staff attestation.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="guardian-token" className="mb-1.5 block text-sm font-medium text-slate-800">
              One-time token
            </label>
            <input
              id="guardian-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="rounded-2xl bg-[#2c4a7c] px-4 py-2 text-sm font-medium text-white">
            Verify token
          </button>
        </form>
        <div aria-live="polite">
          {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
          {payload && (
            <pre className="mt-4 overflow-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-700">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </div>
      </main>
    </div>
  );
}
