"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EnrollButton({ moduleCount }: { moduleCount: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function enroll() {
    setPending(true);
    setError("");
    const response = await fetch("/api/learning/enroll", { method: "POST" });
    if (!response.ok) {
      setError("Enrollment could not be saved. Try again.");
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={enroll}
        disabled={pending}
        className="inline-flex items-center gap-3 rounded-lg bg-[#0B2C4A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Enrolling…" : "Enroll"}
        <span className="rounded-md bg-[#00C4A7] px-2 py-0.5 text-xs font-semibold text-[#0B2C4A]">
          {moduleCount} modules
        </span>
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
