"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { primaryBtn } from "@/components/learning/ui";

export function EnrollButton({ moduleCount }: { moduleCount: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function enroll() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/learning/enroll", { method: "POST" });
      if (!response.ok) {
        setError("Enrollment could not be saved. Try again.");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <button type="button" onClick={enroll} disabled={pending} aria-busy={pending} className={`${primaryBtn} h-12 px-6 text-base`}>
        {pending ? "Enrolling…" : "Enroll in the course"}
        <span className="rounded-md bg-[#00C4A7] px-2 py-0.5 text-xs font-semibold text-[#0B2C4A]">{moduleCount} modules</span>
      </button>
      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
