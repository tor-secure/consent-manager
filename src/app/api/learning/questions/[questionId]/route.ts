import { NextResponse } from "next/server";

import { isLearningAttemptId } from "@/lib/learning/assessment-input";
import { isResponse, requireLearner } from "@/lib/learning/http";
import { learningRateLimit, requireJsonBodyHeaders } from "@/lib/learning/request-guard";
import { saveQuestion } from "@/lib/learning/service";

export async function PATCH(request: Request, context: { params: Promise<{ questionId: string }> }) {
  const limited = learningRateLimit(request, "question-edit", 40);
  if (limited) return limited;
  const headersError = requireJsonBodyHeaders(request);
  if (headersError) return headersError;

  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const { questionId } = await context.params;
  if (!isLearningAttemptId(questionId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as {
    prompt?: string;
    explanation?: string;
    options?: { id: string; label: string; correct: boolean }[];
  } | null;
  if (!body?.prompt || !body.explanation || !Array.isArray(body.options)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (body.prompt.length > 4000 || body.explanation.length > 4000 || body.options.length > 20) {
    return NextResponse.json({ error: "invalid", message: "Request too large." }, { status: 413 });
  }
  const result = await saveQuestion(learner, questionId, {
    prompt: body.prompt,
    explanation: body.explanation,
    options: body.options,
  });
  if ("error" in result) {
    const status = result.error === "forbidden" ? 403 : result.error === "invalid" ? 400 : 404;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
