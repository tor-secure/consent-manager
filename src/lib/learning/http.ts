import { NextResponse } from "next/server";

import { getLearningSession } from "@/lib/learning/auth";
import type { LearnerContext } from "@/lib/learning/service";

export async function requireLearner(): Promise<LearnerContext | NextResponse> {
  const learner = await getLearningSession();
  if (!learner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return learner;
}

export function isResponse(value: LearnerContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
