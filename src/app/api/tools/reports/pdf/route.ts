import { NextResponse } from "next/server";

import { toolCard } from "@/config/tools/catalog";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { runTool } from "@/lib/tools/assessment-engine";
import { isToolId, type AssessmentResult } from "@/lib/tools/types";
import { parseToolAnswers } from "@/lib/tools/parse-answers";
import { assessmentPdf } from "@/lib/tools/report-pdf";
import { requireToolSession } from "@/lib/tools/session";
import { loadOwnedAssessment } from "@/lib/tools/store";

export const dynamic = "force-dynamic";

function isResult(value: unknown): value is AssessmentResult {
  if (!value || typeof value !== "object") return false;
  const record = value as AssessmentResult;
  return typeof record.label === "string" && typeof record.summary === "string" && typeof record.methodologyVersion === "string" && Array.isArray(record.findings);
}

export async function POST(request: Request) {
  const limit = rateLimit({
    key: `tools-pdf:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  const body = await request.json().catch(() => null) as { assessmentId?: unknown } | null;
  let organisationName = "Not saved to a workspace";
  let toolName = "DPDP assessment";
  let result: AssessmentResult | null = null;
  let completedAt = new Date();

  if (body && typeof body.assessmentId === "string") {
    const gate = await requireToolSession();
    if ("response" in gate) return gate.response;
    const row = await loadOwnedAssessment(body.assessmentId, gate.session.organizationId);
    if (!row || !isResult(row.result)) {
      return NextResponse.json({ success: false, message: "Assessment not found" }, { status: 404 });
    }
    organisationName = gate.session.organizationName;
    toolName = toolCard(row.toolType)?.name ?? row.toolType;
    result = row.result;
    completedAt = row.updatedAt;
  } else {
    const parsed = parseToolAnswers(body);
    if (!parsed || !isToolId(parsed.tool)) {
      return NextResponse.json({ success: false, message: "The report could not be built from these answers." }, { status: 400 });
    }
    const run = runTool(parsed.tool, parsed.answers);
    if (!run.ok) {
      return NextResponse.json({ success: false, message: "Answer the remaining questions before downloading." }, { status: 400 });
    }
    toolName = toolCard(parsed.tool)?.name ?? parsed.tool;
    result = run.result;
  }

  const bytes = await assessmentPdf({ organisationName, toolName, result, completedAt });
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"consentguru-dpdp-assessment.pdf\"",
      "Cache-Control": "no-store",
    },
  });
}
