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
    ];
  },
};

export default nextConfig;
