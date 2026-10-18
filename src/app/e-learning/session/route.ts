import type { NextRequest } from "next/server";

import { establishLearningSession } from "@/lib/learning/auth";

export async function GET(request: NextRequest) {
  return establishLearningSession(request);
}
