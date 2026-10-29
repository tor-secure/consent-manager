import { NextResponse } from "next/server";

import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isSchemaMismatchError } from "@/lib/schema-mismatch";
import { parseProfile, parseRemediation, parseResponses } from "@/lib/tools/gap-document";
import { loadGapAssessment, saveGapAssessment } from "@/lib/tools/gap-store";
import { requireToolSession } from "@/lib/tools/session";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

function storageMessage(error: unknown, fallback: string) {
  return isSchemaMismatchError(error) ? "Assessment storage is not ready. Run the schema update, then retry." : fallback;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireToolSession();
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ success: false, message: "Assessment not found" }, { status: 404 });
  try {
    const assessment = await loadGapAssessment(gate.session.organizationId, id);
    if (!assessment) return NextResponse.json({ success: false, message: "Assessment not found" }, { status: 404 });
    return NextResponse.json({ success: true, assessment });
  } catch (error) {
    return NextResponse.json({ success: false, message: storageMessage(error, "Could not load the assessment.") }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireToolSession();
  if ("response" in gate) return gate.response;
  const limit = rateLimit({
    key: `gap-save:${gate.session.organizationId}:${gate.session.userId}`,
    limit: 120,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ success: false, message: "Assessment not found" }, { status: 404 });

  const body = await request.json().catch(() => null) as { profile?: unknown; responses?: unknown; remediation?: unknown; complete?: unknown } | null;
  const profile = parseProfile(body?.profile, gate.session.organizationName);
  const responses = parseResponses(body?.responses);
  const remediation = parseRemediation(body?.remediation);
  if (!profile || !responses || !remediation) {
    return NextResponse.json({ success: false, message: "Check the assessment and try again." }, { status: 400 });
  }

  try {
    const saved = await saveGapAssessment({
      organizationId: gate.session.organizationId,
      userId: gate.session.userId,
      id,
      profile,
      responses,
      remediation,
      complete: body?.complete === true,
    });
    if ("error" in saved) {
      return NextResponse.json({ success: false, message: saved.error, missing: saved.missing }, { status: saved.status });
    }
    return NextResponse.json({ success: true, assessment: saved.assessment });
  } catch (error) {
    return NextResponse.json({ success: false, message: storageMessage(error, "Could not save the assessment.") }, { status: 500 });
  }
}
