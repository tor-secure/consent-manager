import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import { authorizeRightsOrganization } from "@/lib/privacy-rights/http";

export async function GET() {
  const authz = await authorizeRightsOrganization();
  if (authz.error) return authz.error;

  const rows = await db
    .select()
    .from(dataPrincipalRequests)
    .where(eq(dataPrincipalRequests.organizationId, authz.organization.id))
    .orderBy(desc(dataPrincipalRequests.receivedAt));

  return NextResponse.json({
    success: true,
    requests: rows.map((row) => ({
      id: row.id,
      requestType: row.requestType,
      status: row.status,
      jurisdiction: row.jurisdiction,
      requesterReference: row.requesterReference,
      requesterName: row.requesterName,
      requesterEmail: row.requesterEmail,
      verificationStatus: row.verificationStatus,
      receivedAt: row.receivedAt,
      dueAt: row.dueAt,
      completedAt: row.completedAt,
      assignedTo: row.assignedTo,
    })),
  });
}
