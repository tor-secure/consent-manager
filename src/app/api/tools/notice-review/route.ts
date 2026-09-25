import { NextResponse } from "next/server";

import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { reviewNotice } from "@/lib/tools/notice-review";
import { parseToolAnswers } from "@/lib/tools/parse-answers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = rateLimit({
    key: `tools-notice:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  const parsed = parseToolAnswers(await request.json().catch(() => null));
  if (!parsed || parsed.tool !== "notice-auditor") {
    return NextResponse.json({ success: false, message: "Paste a notice to review." }, { status: 400 });
  }
  const run = await reviewNotice(parsed.answers);
  if (!run.ok) {
    return NextResponse.json({ success: false, message: "Paste the notice text before reviewing." }, { status: 400 });
  }
  return NextResponse.json({ success: true, result: run.result });
}
