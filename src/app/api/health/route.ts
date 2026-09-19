import { NextResponse } from "next/server";

import { buildLivenessResponse } from "@/lib/health";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const result = buildLivenessResponse();
  return NextResponse.json(result.body, {
    status: result.statusCode,
    headers: NO_STORE,
  });
}
