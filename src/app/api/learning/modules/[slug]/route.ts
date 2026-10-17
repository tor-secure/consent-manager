import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { learningRateLimit, requireJsonBodyHeaders } from "@/lib/learning/request-guard";
import { updateModuleContent } from "@/lib/learning/service";

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  const limited = learningRateLimit(request, "module-edit", 40);
  if (limited) return limited;
  const headersError = requireJsonBodyHeaders(request);
  if (headersError) return headersError;

  const learner = await requireLearner();
  if (isResponse(learner)) return learner;
  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    lessonContent?: string;
    videoScript?: string;
    videoUrl?: string | null;
    videoProvider?: string;
    summary?: string;
    status?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const result = await updateModuleContent(learner, slug, body);
  if ("error" in result) {
    const status = result.error === "forbidden" ? 403 : result.error === "invalid" ? 400 : 404;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
