import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { endLearningSession } from "@/lib/learning/auth";
import { learningRateLimit } from "@/lib/learning/request-guard";

export async function POST(request: NextRequest) {
  const limited = learningRateLimit(request, "sign-out", 30);
  if (limited) return limited;
  return endLearningSession(request);
}

/** GET logout is disabled — use POST to avoid prefetch / logout CSRF. */
export async function GET() {
  return NextResponse.json(
    { error: "method_not_allowed", message: "Use POST to sign out." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
