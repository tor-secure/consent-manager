"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { primaryBtn } from "@/components/learning/ui";

const CERTIFICATE_PREFIX = "CG-DPDP-";

function certificateSuffix(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, "");
  return trimmed.toUpperCase().startsWith(CERTIFICATE_PREFIX)
    ? trimmed.slice(CERTIFICATE_PREFIX.length)
    : trimmed;
}

export function VerifyCertificateForm() {
  const router = useRouter();
  const [suffix, setSuffix] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rest = certificateSuffix(suffix);
    if (!rest) return;
    router.push(`/learning/verify/${encodeURIComponent(`${CERTIFICATE_PREFIX}${rest}`)}`);
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="block min-w-0 flex-1 text-sm font-semibold text-[#0B2C4A]">
        Certificate ID
        <span className="mt-1.5 flex h-11 w-full items-center rounded-lg border border-[#d5e3e0] bg-white px-3 focus-within:ring-2 focus-within:ring-[#00C4A7]">
          <span className="shrink-0 font-medium text-[#0B2C4A]" aria-hidden="true">
            {CERTIFICATE_PREFIX}
          </span>
          <input
            value={suffix}
            onChange={(event) => setSuffix(certificateSuffix(event.target.value))}
            name="code"
            required
            autoComplete="off"
            spellCheck={false}
            aria-label="Certificate ID"
            placeholder="…"
            className="h-full min-w-0 flex-1 bg-transparent text-base font-medium text-[#0B2C4A] outline-none"
          />
        </span>
      </label>
      <button type="submit" className={primaryBtn}>
        Verify certificate
      </button>
    </form>
  );
}
