"use client";

import { useState, type ReactNode } from "react";

type BrandLogo = {
  match: RegExp;
  bg: string;
  label: string;
  svg: ReactNode;
};

const BRANDS: BrandLogo[] = [
  {
    match: /google|gstatic|doubleclick|googletag|gtm/i,
    bg: "bg-white",
    label: "Google",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    match: /meta|facebook|fbcdn|instagram/i,
    bg: "bg-[#0668E1]",
    label: "Meta",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="white">
        <path d="M12 2C6.5 2 2 6.1 2 11.1c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.2 1.9.4 2.9.4 5.5 0 10-4.1 10-9.4S17.5 2 12 2zm1.1 12.6l-2.6-2.8-5.1 2.8 5.6-6 2.7 2.8 5 2.8-5.6 6.4z" />
      </svg>
    ),
  },
  {
    match: /hotjar/i,
    bg: "bg-[#FF3C00]",
    label: "Hotjar",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="white">
        <path d="M12 2C7 2 3.5 6 3.5 11.2c0 3.4 1.8 6.3 4.5 7.8L12 22l3.9-3c2.8-1.5 4.6-4.4 4.6-7.8C20.5 6 17 2 12 2zm0 4.2c2.4 0 4.3 2.2 4.3 5 0 1.7-.8 3.2-2 4.1L12 17l-2.3-1.7c-1.2-.9-2-2.4-2-4.1 0-2.8 1.9-5 4.3-5z" />
      </svg>
    ),
  },
  {
    match: /intercom/i,
    bg: "bg-[#1F8DED]",
    label: "Intercom",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="white">
        <path d="M5 4h2v9H5V4zm4 3h2v6H9V7zm4-2h2v8h-2V5zm4 3h2v5h-2V8zM4 17h16v2H4v-2z" />
      </svg>
    ),
  },
  {
    match: /hubspot/i,
    bg: "bg-[#FF7A59]",
    label: "HubSpot",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="white">
        <circle cx="17.5" cy="6.5" r="2.5" />
        <circle cx="8" cy="14" r="3.5" />
        <path d="M11.2 12.2l4.2-4.2M8 17.5V21" stroke="white" strokeWidth="2" fill="none" />
      </svg>
    ),
  },
  {
    match: /linkedin/i,
    bg: "bg-[#0A66C2]",
    label: "LinkedIn",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="white">
        <path d="M6.5 9.5H3.7V20h2.8V9.5zM5.1 4A1.65 1.65 0 105.12 7.3 1.65 1.65 0 005.1 4zM20.3 20h-2.8v-5.6c0-1.5-.5-2.5-1.8-2.5-1 0-1.6.7-1.8 1.3-.1.2-.1.5-.1.8V20H11v-10h2.7v1.4c.4-.7 1.3-1.7 3.2-1.7 2.3 0 4 1.5 4 4.8V20z" />
      </svg>
    ),
  },
  {
    match: /clarity|microsoft/i,
    bg: "bg-white",
    label: "Microsoft",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
        <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
        <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
        <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
      </svg>
    ),
  },
  {
    match: /youtube|ytimg/i,
    bg: "bg-[#FF0000]",
    label: "YouTube",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="white">
        <path d="M23.5 7.2a3 3 0 00-2.1-2.1C19.5 4.5 12 4.5 12 4.5s-7.5 0-9.4.6A3 3 0 00.5 7.2 31 31 0 000 12a31 31 0 00.5 4.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-4.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z" />
      </svg>
    ),
  },
  {
    match: /stripe/i,
    bg: "bg-[#635BFF]",
    label: "Stripe",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="white">
        <path d="M13.6 9.3c0-.8.7-1.1 1.8-1.1 1.6 0 3.6.5 5.2 1.4V5.2A13 13 0 0015.4 4C11.4 4 8.7 6.1 8.7 9.6c0 5.3 7.3 4.5 7.3 6.7 0 .9-.8 1.2-2 1.2-1.7 0-3.9-.7-5.6-1.7v4.5A14 14 0 0014 20.1c4.2 0 7.1-2.1 7.1-5.6-.1-5.7-7.5-4.7-7.5-5.2z" />
      </svg>
    ),
  },
  {
    match: /zendesk/i,
    bg: "bg-[#03363D]",
    label: "Zendesk",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="white">
        <path d="M12 2l9 5v10l-9 5-9-5V7l9-5zm0 3.2L6.2 8.5v7L12 18.8l5.8-3.3v-7L12 5.2z" />
      </svg>
    ),
  },
  {
    match: /twitter|x\.com/i,
    bg: "bg-black",
    label: "X",
    svg: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="white">
        <path d="M18.2 2H21l-6.6 7.5L22 22h-6.8l-4.7-6.2L5.3 22H2.5l7-8L2 2h7l4.2 5.7L18.2 2zm-1.2 18h1.9L7.1 4H5.1l11.9 16z" />
      </svg>
    ),
  },
  {
    match: /amazon|aws/i,
    bg: "bg-[#FF9900]",
    label: "Amazon",
    svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="white">
        <path d="M12.5 4c-3.2 0-5.2 1.7-5.2 4.1 0 2.1 1.5 3.3 3.9 3.9l1.1.3c1.4.3 1.9.7 1.9 1.3 0 .8-.8 1.3-2.1 1.3-1.4 0-2.7-.4-3.9-1v2.2c1.2.5 2.5.8 4 .8 3.3 0 5.4-1.6 5.4-4.2 0-2.2-1.5-3.4-4.1-4l-1.1-.3c-1.2-.3-1.7-.7-1.7-1.2 0-.7.7-1.2 1.9-1.2 1.1 0 2.3.3 3.4.8V4.7A10 10 0 0012.5 4zM20 16.5c-2.2 1.7-5.4 2.6-8.2 2.6-3.9 0-7.4-1.4-10-3.8-.2-.2 0-.4.2-.3 2.9 1.7 6 2.5 9.4 2.5 2.3 0 4.8-.5 7.1-1.5.4-.1.6.2.5.5z" />
      </svg>
    ),
  },
];

function faviconUrl(domain: string) {
  const clean = domain.replace(/^https?:\/\//, "").split("/")[0];
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(clean)}&sz=64`;
}

function initialTone(name: string) {
  const tones = [
    "bg-sky-50 text-sky-700",
    "bg-violet-50 text-violet-700",
    "bg-emerald-50 text-emerald-700",
    "bg-amber-50 text-amber-700",
    "bg-rose-50 text-rose-700",
    "bg-teal-50 text-teal-700",
  ];
  return tones[name.charCodeAt(0) % tones.length];
}

export function VendorLogo({
  name,
  domain,
  keyHint,
}: {
  name: string;
  domain?: string | null;
  keyHint?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const hay = `${name} ${domain ?? ""} ${keyHint ?? ""}`;
  const brand = BRANDS.find((item) => item.match.test(hay));

  if (brand) {
    return (
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-slate-200/80 ${brand.bg}`}
        title={brand.label}
      >
        {brand.svg}
      </span>
    );
  }

  if (domain && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={faviconUrl(domain)}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1.5 ring-1 ring-slate-200/80"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-slate-200/80 ${initialTone(name)}`}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
