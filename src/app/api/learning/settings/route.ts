import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { updateCourseSettings } from "@/lib/learning/service";

export async function PATCH(request: Request) {
  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const body = (await request.json().catch(() => null)) as {
    passPercent?: number;
    examPassPercent?: number;
    examQuestionCount?: number;
  } | null;
  if (!body) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const result = await updateCourseSettings(learner, body);
  if ("error" in result) return NextResponse.json(result, { status: 403 });
  return NextResponse.json(result);
}
