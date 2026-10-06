import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { completeLesson } from "@/lib/learning/service";

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const { slug } = await context.params;
  const result = await completeLesson(learner, slug);
  if ("error" in result) {
    const status = result.error === "locked" || result.error === "not_enrolled" ? 403 : 404;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
