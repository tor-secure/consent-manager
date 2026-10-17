import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { learningRateLimit } from "@/lib/learning/request-guard";
import { enrollInCourse } from "@/lib/learning/service";

export async function POST(request: Request) {
  const limited = learningRateLimit(request, "enroll", 20);
  if (limited) return limited;
  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const result = await enrollInCourse(learner);
  return NextResponse.json(result);
}
