import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { enrollInCourse } from "@/lib/learning/service";

export async function POST() {
  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const result = await enrollInCourse(learner);
  return NextResponse.json(result);
}
