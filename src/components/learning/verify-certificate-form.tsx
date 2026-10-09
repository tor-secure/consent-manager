"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { primaryBtn } from "@/components/learning/ui";

export function VerifyCertificateForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/learning/verify/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="block min-w-0 flex-1 text-sm font-semibold text-[#0B2C4A]">
        Certificate ID
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          name="code"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="CG-DPDP-…"
          className="mt-1.5 h-11 w-full rounded-lg border border-[#d5e3e0] bg-white px-3 text-base font-medium text-[#0B2C4A] outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
        />
      </label>
      <button type="submit" className={primaryBtn}>
        Verify certificate
      </button>
    </form>
  );
}
