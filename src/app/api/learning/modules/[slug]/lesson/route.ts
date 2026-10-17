import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { learningRateLimit, requireJsonBodyHeaders } from "@/lib/learning/request-guard";
import { completeLesson, completeLessonAndStartQuiz } from "@/lib/learning/service";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const limited = learningRateLimit(request, "lesson-complete", 40);
  if (limited) return limited;
  const headersError = requireJsonBodyHeaders(request);
  if (headersError) return headersError;

  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    sectionIds?: unknown;
    startQuiz?: unknown;
  } | null;
  const visitedSectionIds = Array.isArray(body?.sectionIds)
    ? body.sectionIds.filter((id): id is string => typeof id === "string").slice(0, 200)
    : [];
  const startQuiz = body?.startQuiz === true;
  const result = startQuiz
    ? await completeLessonAndStartQuiz(learner, slug, { visitedSectionIds })
    : await completeLesson(learner, slug, { visitedSectionIds });
  if ("error" in result) {
    const status =
      result.error === "locked" || result.error === "not_enrolled" || result.error === "sections_required"
        ? 403
        : 404;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
