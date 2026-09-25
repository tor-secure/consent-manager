import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { toolAssessments } from "@/db/schema/tool-assessments";
import { canAccessAssessment } from "./access";

export async function loadOwnedAssessment(id: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(toolAssessments)
    .where(and(eq(toolAssessments.id, id), eq(toolAssessments.organizationId, organizationId)))
    .limit(1);
  if (!row) return null;
  if (!canAccessAssessment({ organizationId: row.organizationId }, { organizationId })) return null;
  return row;
}
