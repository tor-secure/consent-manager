"use client";

import { useState } from "react";
import Link from "next/link";
import { SkipLink } from "@/components/ui/skip-link";

export default function PublicPrivacyRequestPage() {
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"status" | "verify">("status");
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setPayload(null);
    if (mode === "verify") {
      const res = await fetch("/api/rights-request/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json() as { success: boolean; message?: string };
      setMessage(data.message ?? (data.success ? "Verified" : "Verification failed"));
      return;
    }
    const res = await fetch(`/api/rights-request/status?token=${encodeURIComponent(token)}`);
    const data = await res.json() as { success: boolean; request?: Record<string, unknown>; message?: string };
    if (!data.success) {
      setMessage(data.message ?? "Request not found");
      return;
    }
    setPayload(data.request ?? null);
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
        <h1 className="text-2xl font-semibold text-slate-900">Privacy request status</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the token issued when the request was submitted. This page does not reveal whether another person&apos;s request exists.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="flex gap-2" role="group" aria-label="Request action">
            <button
              type="button"
              onClick={() => setMode("status")}
              aria-pressed={mode === "status"}
              className={`rounded-2xl px-3 py-1.5 text-xs ${mode === "status" ? "bg-slate-900 text-white" : "border border-slate-200"}`}
            >
              Check status
            </button>
            <button
              type="button"
              onClick={() => setMode("verify")}
              aria-pressed={mode === "verify"}
              className={`rounded-2xl px-3 py-1.5 text-xs ${mode === "verify" ? "bg-slate-900 text-white" : "border border-slate-200"}`}
            >
              Verify identity
            </button>
          </div>
          <div>
            <label htmlFor="privacy-request-token" className="mb-1.5 block text-sm font-medium text-slate-800">
              Request token
            </label>
            <input
              id="privacy-request-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="rounded-2xl bg-[#2c4a7c] px-4 py-2 text-sm font-medium text-white">
            Continue
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
