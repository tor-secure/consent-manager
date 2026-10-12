import type { NextRequest } from "next/server";

import { endLearningSession } from "@/lib/learning/auth";

export async function GET(request: NextRequest) {
  return endLearningSession(request);
}
