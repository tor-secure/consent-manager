import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { submitExam } from "@/lib/learning/service";
import type { SubmittedAnswer } from "@/lib/learning/engine";

export async function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const { attemptId } = await context.params;
  const body = (await request.json().catch(() => null)) as { answers?: SubmittedAnswer[]; passed?: boolean; percentage?: number } | null;
  if (!body || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: "invalid", message: "Send the selected answers." }, { status: 400 });
  }
  const result = await submitExam(learner, attemptId, body.answers);
  if (result.error) {
    const status = result.error === "already_submitted" ? 409 : result.error === "incomplete" ? 400 : 404;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
