import { NextResponse } from "next/server";

import { isLearningAttemptId, parseSubmittedAnswers } from "@/lib/learning/assessment-input";
import { isResponse, requireLearner } from "@/lib/learning/http";
import { learningRateLimit, requireJsonBodyHeaders } from "@/lib/learning/request-guard";
import { submitQuiz } from "@/lib/learning/service";

export async function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  const limited = learningRateLimit(request, "quiz-submit", 40);
  if (limited) return limited;
  const headersError = requireJsonBodyHeaders(request);
  if (headersError) return headersError;

  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const { attemptId } = await context.params;
  if (!isLearningAttemptId(attemptId)) {
    return NextResponse.json({ error: "invalid", message: "Invalid attempt." }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const parsed = parseSubmittedAnswers(body);
  if (!parsed.ok) {
    const status = parsed.error === "duplicate_question" ? 400 : 400;
    const message =
      parsed.error === "duplicate_question"
        ? "Each question may only appear once."
        : "Send the selected answers.";
    return NextResponse.json({ error: parsed.error, message }, { status });
  }
  const result = await submitQuiz(learner, attemptId, parsed.answers);
  if (result.error) {
    const status =
      result.error === "already_submitted"
        ? 409
        : result.error === "incomplete" || result.error === "duplicate_question" || result.error === "invalid"
          ? 400
          : 404;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
