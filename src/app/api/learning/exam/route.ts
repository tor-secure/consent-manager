import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { learningRateLimit } from "@/lib/learning/request-guard";
import { startExam } from "@/lib/learning/service";

export async function POST(request: Request) {
  const limited = learningRateLimit(request, "exam-start", 20);
  if (limited) return limited;
  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const result = await startExam(learner);
  if (result.error) return NextResponse.json(result, { status: 403 });
  return NextResponse.json(result);
}
