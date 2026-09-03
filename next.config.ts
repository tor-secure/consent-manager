import type { NextConfig } from "next";

import { BASELINE_SECURITY_HEADERS } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(BASELINE_SECURITY_HEADERS).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
