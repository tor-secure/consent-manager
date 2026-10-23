"use client";

import { useState } from "react";

export function CountryFlag({ code }: { code: string }) {
  const iso = code.trim().toLowerCase();
  const [failed, setFailed] = useState(false);
  if (!/^[a-z]{2}$/.test(iso) || failed) {
    return (
      <span className="inline-flex h-[15px] w-5 shrink-0 items-center justify-center rounded-[2px] bg-[var(--secondary)] text-[8px] font-semibold uppercase text-[var(--muted-foreground)]">
        {code.slice(0, 2)}
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/24x18/${iso}.png`}
      srcSet={`https://flagcdn.com/48x36/${iso}.png 2x`}
      alt=""
      width={20}
      height={15}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-[15px] w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10"
    />
  );
}
