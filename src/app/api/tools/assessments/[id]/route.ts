import { NextResponse } from "next/server";

import { isSchemaMismatchError } from "@/lib/schema-mismatch";
import { requireToolSession } from "@/lib/tools/session";
import { loadOwnedAssessment } from "@/lib/tools/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireToolSession();
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ success: false, message: "Assessment not found" }, { status: 404 });
  }

  try {
    const row = await loadOwnedAssessment(id, gate.session.organizationId);
    if (!row) {
      return NextResponse.json({ success: false, message: "Assessment not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      assessment: {
        id: row.id,
        toolType: row.toolType,
        status: row.status,
        score: row.score,
        methodologyVersion: row.methodologyVersion,
        updatedAt: row.updatedAt,
        organisationName: gate.session.organizationName,
        answers: row.answers,
        result: row.result,
      },
    });
  } catch (error) {
    const message = isSchemaMismatchError(error)
      ? "Assessment storage is not ready. Run the schema update, then retry."
      : "Could not load the assessment.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
