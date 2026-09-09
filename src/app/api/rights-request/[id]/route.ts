import { NextResponse } from "next/server";

import { publicStatusPayload } from "@/lib/privacy-rights/public-status";
import { lookupStatusToken } from "@/lib/privacy-rights/service";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limit = rateLimit({
    key: `rights-status:${getClientIp(request)}`,
    limit: 30,
    windowMs: 15 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
  }

  const row = await lookupStatusToken(token);
  if (!row || row.id !== id) {
    return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    request: {
      id: row.requesterReference,
      requestType: row.requestType,
      status: publicStatusPayload({
        requesterReference: row.requesterReference,
        requestType: row.requestType,
        status: row.status,
        verificationStatus: row.verificationStatus,
        receivedAt: row.receivedAt,
        dueAt: row.dueAt,
        completedAt: row.completedAt,
      }).status,
      receivedAt: row.receivedAt,
      acknowledgeBy: row.acknowledgeBy,
      acknowledgedAt: row.acknowledgedAt,
      dueAt: row.dueAt,
      completedAt: row.completedAt,
    },
  });
}
