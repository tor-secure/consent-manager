import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { toolAssessments } from "@/db/schema/tool-assessments";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isSchemaMismatchError } from "@/lib/schema-mismatch";
import { runTool } from "@/lib/tools/assessment-engine";
import { canAccessAssessment } from "@/lib/tools/access";
import { parseToolAnswers } from "@/lib/tools/parse-answers";
import { redactAnswers } from "@/lib/tools/redact";
import { requireToolSession } from "@/lib/tools/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireToolSession();
  if ("response" in gate) return gate.response;
  const { session } = gate;
  if (!canAccessAssessment({ organizationId: session.organizationId }, { organizationId: session.organizationId })) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await db
      .select({
        id: toolAssessments.id,
        toolType: toolAssessments.toolType,
        status: toolAssessments.status,
        score: toolAssessments.score,
        methodologyVersion: toolAssessments.methodologyVersion,
        updatedAt: toolAssessments.updatedAt,
        result: toolAssessments.result,
      })
      .from(toolAssessments)
      .where(eq(toolAssessments.organizationId, session.organizationId))
      .orderBy(desc(toolAssessments.updatedAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      assessments: rows.map((row) => ({
        id: row.id,
        toolType: row.toolType,
        status: row.status,
        score: row.score,
        methodologyVersion: row.methodologyVersion,
        updatedAt: row.updatedAt,
        label: typeof row.result?.label === "string" ? row.result.label : "",
      })),
    });
  } catch (error) {
    const message = isSchemaMismatchError(error)
      ? "Assessment storage is not ready. Run the schema update, then retry."
      : "Could not load assessments.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireToolSession();
  if ("response" in gate) return gate.response;
  const { session } = gate;
  const limit = rateLimit({
    key: `tools-save:${session.organizationId}:${session.userId}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  const parsed = parseToolAnswers(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ success: false, message: "Check the assessment answers and try again." }, { status: 400 });
  }
  const run = runTool(parsed.tool, parsed.answers);
  if (!run.ok) {
    return NextResponse.json({ success: false, message: "Answer the remaining questions before saving.", missing: run.missing }, { status: 400 });
  }

  const answers = redactAnswers(parsed.tool, parsed.answers);
  try {
    const [row] = await db
      .insert(toolAssessments)
      .values({
        organizationId: session.organizationId,
        userId: session.userId,
        toolType: parsed.tool,
        status: "completed",
        score: run.result.score,
        methodologyVersion: run.result.methodologyVersion,
        answers,
        result: run.result as unknown as Record<string, unknown>,
      })
      .returning({ id: toolAssessments.id });

    await db.insert(auditLogs).values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "tool_assessment_completed",
      resourceType: "tool_assessment",
      resourceId: row?.id,
      description: `Completed ${parsed.tool}`,
      metadata: {
        toolType: parsed.tool,
        methodologyVersion: run.result.methodologyVersion,
        score: run.result.score,
      },
    });

    return NextResponse.json({
      success: true,
      id: row?.id,
      organisationName: session.organizationName,
      result: run.result,
    });
  } catch (error) {
    const message = isSchemaMismatchError(error)
      ? "Assessment storage is not ready. Run the schema update, then retry."
      : "Could not save the assessment.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
