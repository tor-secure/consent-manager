"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { primaryBtn } from "@/components/learning/ui";

export function EnrollButton({ moduleCount }: { moduleCount: number }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState("");
  const pending = saving || refreshing;

  async function enroll() {
    if (pending) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/learning/enroll", { method: "POST" });
      if (!response.ok) {
        setError("Enrollment could not be saved. Try again.");
        return;
      }
      startRefresh(() => router.refresh());
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <button
        type="button"
        onClick={enroll}
        disabled={pending}
        aria-busy={pending}
        aria-label={`Enroll in all ${moduleCount} modules`}
        className={`${primaryBtn} h-12 min-w-40 px-8 text-base`}
      >
        {pending ? (
          <>
            <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />
            {saving ? "Enrolling…" : "Opening course…"}
          </>
        ) : (
          "Enroll"
        )}
      </button>
      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
