import type { NextConfig } from "next";

import { BASELINE_SECURITY_HEADERS, HSTS_HEADER_VALUE } from "./src/lib/security-headers";

const documentCorpHeader = {
  key: "Cross-Origin-Resource-Policy",
  value: "same-origin",
} as const;

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/blog", destination: "/blogs", permanent: true },
      { source: "/blog/:slug", destination: "/blogs/:slug", permanent: true },
      { source: "/cookie-consent-management", destination: "/cookie-consent-manager", permanent: true },
      { source: "/dpdp-consent-management", destination: "/dpdp", permanent: true },
      { source: "/consent-management-software", destination: "/consent-management-platform", permanent: true },
    ];
  },
  async headers() {
    const baseline = Object.entries(BASELINE_SECURITY_HEADERS).map(([key, value]) => ({
      key,
      value,
    }));
    if (process.env.NODE_ENV === "production") {
      baseline.push({ key: "Strict-Transport-Security", value: HSTS_HEADER_VALUE });
    }

    return [
      {
        source: "/:path*",
        headers: baseline,
      },
      {
        source: "/((?!api/).*)",
        headers: [documentCorpHeader],
      },
      {
        source: "/e2e-customer-:file.html",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/e-learning/module/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/e-learning/manage",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/e-learning/certificate",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/e-learning/final-exam",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/learning/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
