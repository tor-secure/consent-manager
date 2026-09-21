import { NextResponse } from "next/server";

import { publicStatusPayload } from "@/lib/privacy-rights/public-status";
import { lookupStatusByTicket, lookupStatusToken } from "@/lib/privacy-rights/service";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";

const NOT_FOUND = { success: false, message: "Request not found" } as const;

export async function GET(request: Request) {
  const limit = await consumeRateLimit({
    key: `rights-status:${getClientIp(request)}`,
    limit: 30,
    windowMs: 15 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  const params = new URL(request.url).searchParams;
  const token = params.get("token")?.trim() ?? "";
  const ticket = params.get("ticket")?.trim() ?? params.get("reference")?.trim() ?? "";
  const email = params.get("email")?.trim() ?? "";

  const row = token
    ? await lookupStatusToken(token)
    : ticket && email
      ? await lookupStatusByTicket(ticket, email)
      : null;

  if (!row) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    request: publicStatusPayload({
      requesterReference: row.requesterReference,
      requestType: row.requestType,
      status: row.status,
      verificationStatus: row.verificationStatus,
      receivedAt: row.receivedAt,
      dueAt: row.dueAt,
      completedAt: row.completedAt,
    }),
  });
}
