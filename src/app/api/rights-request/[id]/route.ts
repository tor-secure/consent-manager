import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET /api/rights-request/[id]
//
// Public status-check endpoint — returns only non-PII fields so that the
// Data Principal can verify their request was received and track progress
// without leaking personal information in URL parameters.
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const [row] = await db
      .select({
        id:            dataPrincipalRequests.id,
        requestType:   dataPrincipalRequests.requestType,
        status:        dataPrincipalRequests.status,
        receivedAt:    dataPrincipalRequests.receivedAt,
        acknowledgeBy: dataPrincipalRequests.acknowledgeBy,
        acknowledgedAt:dataPrincipalRequests.acknowledgedAt,
        dueAt:         dataPrincipalRequests.dueAt,
        completedAt:   dataPrincipalRequests.completedAt,
      })
      .from(dataPrincipalRequests)
      .where(eq(dataPrincipalRequests.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { success: false, message: "Request not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, request: row });
  } catch (error) {
    logger.error("Rights request status fetch failed", {
      operation: "rights_request.status",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Failed to fetch request status" },
      { status: 500 },
    );
  }
}
