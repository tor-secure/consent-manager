import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { completeLesson } from "@/lib/learning/service";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as { sectionIds?: unknown } | null;
  const visitedSectionIds = Array.isArray(body?.sectionIds) ? body.sectionIds.filter((id): id is string => typeof id === "string") : [];
  const result = await completeLesson(learner, slug, { visitedSectionIds });
  if ("error" in result) {
    const status = result.error === "locked" || result.error === "not_enrolled" || result.error === "sections_required" ? 403 : 404;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
