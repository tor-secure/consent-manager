import type { ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  "/dashboard/consent": (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </>
  ),
  "/dashboard/policies": (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </>
  ),
  "/dashboard/purposes": (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  "/dashboard/vendors": (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  "/dashboard/transfers": (
    <>
      <path d="M7 7h10l-3-3M17 17H7l3 3" />
      <path d="M17 7v4M7 17v-4" />
    </>
  ),
  "/dashboard/trackers": (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 010 8.48M7.76 7.76a6 6 0 000 8.48" />
      <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
    </>
  ),
  "/dashboard/scanner": (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  "/dashboard/monitoring": (
    <>
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </>
  ),
  "/dashboard/risk": (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  "/dashboard/quality": (
    <>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
    </>
  ),
  "/dashboard/analytics": (
    <>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </>
  ),
  "/dashboard/firewall": (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </>
  ),
  "/dashboard/simulator": (
    <>
      <path d="M9 3h6M10 3v6.5L5 18a2 2 0 002 3h10a2 2 0 002-3l-5-8.5V3" />
    </>
  ),
  "/dashboard/experiments": (
    <>
      <path d="M5 3h14M8 3v6l-4 8a3 3 0 002.7 4h10.6A3 3 0 0020 17l-4-8V3" />
      <path d="M8 13h8" />
    </>
  ),
  "/dashboard/graph": (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="7" r="2.5" />
      <circle cx="7" cy="18" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
      <path d="M8.2 7.6l5.6.8M7.8 15.6l7.4-6.4M8.8 17.4l5.5-.6" />
    </>
  ),
  "/dashboard/recommendations": (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 016 6c0 2.2-1.2 4.1-3 5.2V16a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1.8C7.2 13.1 6 11.2 6 9a6 6 0 016-6z" />
    </>
  ),
  "/dashboard/data-flow": (
    <>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M7 6h10M5.8 8l5 8M18.2 8l-5 8" />
    </>
  ),
  "/dashboard/cross-domain": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </>
  ),
  "/dashboard/autopilot": (
    <>
      <rect x="5" y="8" width="14" height="9" rx="3" />
      <circle cx="9" cy="12.5" r="1" />
      <circle cx="15" cy="12.5" r="1" />
      <path d="M9 4.5h6M12 4.5V8M8 19.5v2M16 19.5v2" />
    </>
  ),
  "/dashboard/digital-twin": (
    <>
      <rect x="3" y="5" width="10" height="14" rx="2" />
      <rect x="11" y="8" width="10" height="14" rx="2" />
    </>
  ),
  "/dashboard/roi": (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="M7 15l4-4 3 3 6-7" />
    </>
  ),
  "/dashboard/negotiation": (
    <>
      <path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" />
    </>
  ),
  "/dashboard/agent-permissioning": (
    <>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </>
  ),
  "/dashboard/data-redaction": (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <path d="M1 1l22 22" />
    </>
  ),
  "/dashboard/audit-logs": (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </>
  ),
  "/dashboard/notifications": (
    <>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </>
  ),
  "/dashboard/rights-requests": (
    <>
      <path d="M12 3l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  "/dashboard/developers": (
    <>
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4" />
    </>
  ),
  "/dashboard/integrations": (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M17.5 14v7M14 17.5h7" />
    </>
  ),
  "/dashboard/developers/webhooks": (
    <>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </>
  ),
  "/dashboard/settings/organization": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  ),
  "/dashboard/settings/retention": (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M12 12v4M10 14h4" />
    </>
  ),
  "/dashboard/settings/team": (
    <>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </>
  ),
};

export function FeatureIcon({ href }: { href: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[href] ?? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M8 11h8M8 15h5" />
        </>
      )}
    </svg>
  );
}
