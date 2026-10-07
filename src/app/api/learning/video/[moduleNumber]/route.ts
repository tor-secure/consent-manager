import { NextResponse } from "next/server";

import { moduleDriveFileId, moduleDriveMediaUrl } from "@/lib/learning/module-videos";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ moduleNumber: string }> }) {
  const { moduleNumber } = await context.params;
  const number = Number(moduleNumber);
  const fileId = Number.isInteger(number) ? moduleDriveFileId(number) : null;
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
