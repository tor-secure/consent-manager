import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { GAP_VERSION } from "@/config/tools/gap";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { type GapDocument } from "@/lib/tools/gap-document";
import { gapAssessmentPdf } from "@/lib/tools/gap-pdf";
import { loadGapAssessment } from "@/lib/tools/gap-store";
import { requireToolSession } from "@/lib/tools/session";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireToolSession();
  if ("response" in gate) return gate.response;
  const limit = rateLimit({
    key: `gap-pdf:${gate.session.organizationId}:${gate.session.userId}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ success: false, message: "Assessment not found" }, { status: 404 });

  const assessment = await loadGapAssessment(gate.session.organizationId, id);
  if (!assessment?.analysis || !assessment.completedAt) {
    return NextResponse.json({ success: false, message: "Complete the assessment before downloading the report." }, { status: 400 });
  }

  const document: GapDocument = {
    kind: "dpdp-gap",
    version: GAP_VERSION,
    profile: assessment.profile,
    responses: assessment.responses,
    remediation: assessment.remediation,
    cmp: assessment.cmp,
    analysis: assessment.analysis,
    completedAt: assessment.completedAt,
    label: assessment.label,
    summary: assessment.summary,
  };
  const logo = await readFile(path.join(process.cwd(), "public/brand/consent-guru-logo.jpg"));
  const bytes = await gapAssessmentPdf(document, new Date(assessment.completedAt), logo);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dpdp-gap-assessment.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
