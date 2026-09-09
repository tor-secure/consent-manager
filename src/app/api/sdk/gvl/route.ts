import { NextResponse } from "next/server";

import { getCurrentGvl } from "@/lib/signals/iab-gvl-sync";
import { publicCorsHeaders, publicOptionsResponse } from "@/lib/sdk/public-http";

export async function GET() {
  const gvl = await getCurrentGvl();
  if (!gvl) {
    return NextResponse.json({ success: false, message: "No validated GVL is available" }, {
      status: 503, headers: publicCorsHeaders("GET, OPTIONS"),
    });
  }
  return NextResponse.json(gvl.payload, {
    headers: {
      ...publicCorsHeaders("GET, OPTIONS"),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      ETag: `"${gvl.sha256}"`,
    },
  });
}

export async function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}
