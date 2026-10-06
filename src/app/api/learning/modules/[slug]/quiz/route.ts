import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { startQuiz } from "@/lib/learning/service";

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const { slug } = await context.params;
  const result = await startQuiz(learner, slug);
  if (result.error) {
    const status = result.error === "locked" || result.error === "not_enrolled" ? 403 : result.error === "lesson_required" ? 409 : 404;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
