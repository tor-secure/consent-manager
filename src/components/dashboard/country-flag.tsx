"use client";

import { useState } from "react";

export function CountryFlag({
  code,
  size = "sm",
}: {
  code: string;
  /** sm = inline chip; md = template / card badge */
  size?: "sm" | "md";
}) {
  const iso = code.trim().toLowerCase();
  const [failed, setFailed] = useState(false);
  const isMd = size === "md";

  // ISO 3166-1 alpha-2, plus `eu` for the European Union flag.
  if (!/^[a-z]{2}$/.test(iso) || failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-[3px] bg-[var(--secondary)] font-semibold uppercase text-[var(--muted-foreground)] ${
          isMd ? "h-6 w-8 text-[10px]" : "h-[15px] w-5 text-[8px]"
        }`}
      >
        {code.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/${isMd ? "40x30" : "24x18"}/${iso}.png`}
      srcSet={`https://flagcdn.com/${isMd ? "80x60" : "48x36"}/${iso}.png 2x`}
      alt=""
      width={isMd ? 32 : 20}
      height={isMd ? 24 : 15}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-[3px] object-cover ring-1 ring-black/10 ${
        isMd ? "h-6 w-8" : "h-[15px] w-5"
      }`}
    />
  );
}
