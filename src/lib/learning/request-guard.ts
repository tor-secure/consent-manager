import { NextResponse } from "next/server";

import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_JSON_BYTES = 64 * 1024;

/** Soft per-IP limits for learning mutations and expensive reads. */
export function learningRateLimit(request: Request, scope: string, limit = 60, windowMs = 60_000): NextResponse | null {
  const result = rateLimit({
    key: `learning:${scope}:${getClientIp(request)}`,
    limit,
    windowMs,
  });
  if (!result.allowed) return rateLimitResponse(result);
  return null;
}

/**
 * Reject oversized or non-JSON bodies for routes that parse JSON.
 * Empty bodies (enroll / quiz start / sign-out) are allowed.
 */
export function requireJsonBodyHeaders(request: Request): NextResponse | null {
  const lengthHeader = request.headers.get("content-length");
  const length = lengthHeader == null || lengthHeader === "" ? 0 : Number(lengthHeader);
  if (!Number.isFinite(length) || length < 0) {
    return NextResponse.json({ error: "invalid", message: "Invalid content length." }, { status: 400 });
  }
  if (length === 0) return null;
  if (length > MAX_JSON_BYTES) {
    return NextResponse.json({ error: "invalid", message: "Request too large." }, { status: 413 });
  }
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "invalid", message: "Expected application/json." }, { status: 415 });
  }
  return null;
}
