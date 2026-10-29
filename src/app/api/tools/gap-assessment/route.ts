import { NextResponse } from "next/server";

import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isSchemaMismatchError } from "@/lib/schema-mismatch";
import { parseProfile } from "@/lib/tools/gap-document";
import { createGapAssessment, listGapAssessments } from "@/lib/tools/gap-store";
import { requireToolSession } from "@/lib/tools/session";

export const dynamic = "force-dynamic";

function storageMessage(error: unknown, fallback: string) {
  return isSchemaMismatchError(error) ? "Assessment storage is not ready. Run the schema update, then retry." : fallback;
}

export async function GET() {
  const gate = await requireToolSession();
  if ("response" in gate) return gate.response;
  try {
    const assessments = await listGapAssessments(gate.session.organizationId);
    return NextResponse.json({ success: true, organisationName: gate.session.organizationName, assessments });
  } catch (error) {
    return NextResponse.json({ success: false, message: storageMessage(error, "Could not load assessments.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireToolSession();
  if ("response" in gate) return gate.response;
  const limit = rateLimit({
    key: `gap-create:${gate.session.organizationId}:${gate.session.userId}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  const body = await request.json().catch(() => null) as { profile?: unknown } | null;
  const profile = body?.profile ? parseProfile(body.profile, gate.session.organizationName) : null;
  if (body?.profile && !profile) {
    return NextResponse.json({ success: false, message: "Check the company details and try again." }, { status: 400 });
  }

  try {
    const assessment = await createGapAssessment({
      organizationId: gate.session.organizationId,
      userId: gate.session.userId,
      companyName: gate.session.organizationName,
      profile: profile ?? undefined,
    });
    return NextResponse.json({ success: true, assessment });
  } catch (error) {
    return NextResponse.json({ success: false, message: storageMessage(error, "Could not start the assessment.") }, { status: 500 });
  }
}
