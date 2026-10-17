import { NextResponse } from "next/server";

import { isResponse, requireLearner } from "@/lib/learning/http";
import { learningRateLimit } from "@/lib/learning/request-guard";
import { moduleDriveFileId, moduleDriveMediaUrl } from "@/lib/learning/module-videos";
import { canAccessModuleVideo } from "@/lib/learning/service";

export const dynamic = "force-dynamic";

/**
 * Legacy Drive MP4 proxy. Kept for fallback when a module has no YouTube URL.
 * Public YouTube embeds cannot be fully access-controlled from this app.
 */
export async function GET(request: Request, context: { params: Promise<{ moduleNumber: string }> }) {
  const limited = learningRateLimit(request, "video", 40, 60_000);
  if (limited) return limited;

  const learner = await requireLearner();
  if (isResponse(learner)) return learner;

  const { moduleNumber } = await context.params;
  const number = Number(moduleNumber);
  const access = await canAccessModuleVideo(learner, number);
  if (!access.ok) {
    const status = access.error === "not_enrolled" || access.error === "locked" ? 403 : 404;
    return NextResponse.json({ error: access.error }, { status });
  }

  const fileId = moduleDriveFileId(number);
  if (!fileId) return new NextResponse(null, { status: 404 });

  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  const upstream = await fetch(moduleDriveMediaUrl(fileId), {
    headers,
    redirect: "follow",
    cache: "no-store",
  });
  const contentType = upstream.headers.get("content-type") ?? "";
  if ((!upstream.ok && upstream.status !== 206) || !contentType.startsWith("video/")) {
    return new NextResponse(null, { status: 502 });
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("Accept-Ranges", upstream.headers.get("accept-ranges") ?? "bytes");
  responseHeaders.set("Cache-Control", "private, no-store");
  const length = upstream.headers.get("content-length");
  if (length) responseHeaders.set("Content-Length", length);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
}
