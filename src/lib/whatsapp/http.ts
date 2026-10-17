import "server-only";

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { JSON_BODY_MAX_BYTES } from "@/lib/sdk/public-http";
import type { ChallengeError } from "./challenge-service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/;

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

export function errorResponse(error: ChallengeError & { attemptsLeft?: number }) {
  return json(
    {
      success: false,
      code: error.code,
      message: error.message,
      ...(error.attemptsLeft !== undefined ? { attemptsLeft: error.attemptsLeft } : {}),
    },
    error.status,
  );
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > JSON_BODY_MAX_BYTES) {
    return { ok: false, response: json({ success: false, message: "Request too large" }, 413) };
  }
  try {
    const text = await request.text();
    if (text.length > JSON_BODY_MAX_BYTES) {
      return { ok: false, response: json({ success: false, message: "Request too large" }, 413) };
    }
    const parsed: unknown = text ? JSON.parse(text) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, response: json({ success: false, message: "Invalid JSON body" }, 400) };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, response: json({ success: false, message: "Invalid JSON body" }, 400) };
  }
}

export async function limitWhatsAppRoute(
  request: Request,
  scope: string,
  limit: number,
): Promise<NextResponse | null> {
  const result = await consumeRateLimit({
    key: `whatsapp-consent:${scope}:${getClientIp(request)}`,
    limit,
    windowMs: 60_000,
  });
  if (!result.allowed) return rateLimitResponse(result, NO_STORE_HEADERS);
  return null;
}

export function readChallengeId(body: Record<string, unknown>): string | null {
  const value = String(body.challengeId ?? "").trim();
  return UUID_RE.test(value) ? value : null;
}

export function readSessionToken(body: Record<string, unknown>): string | null {
  const value = String(body.sessionToken ?? "").trim();
  return SESSION_TOKEN_RE.test(value) ? value : null;
}

export function internalError(operation: string, error: unknown) {
  logger.error("WhatsApp consent route failed", { operation, error });
  return json({ success: false, message: "Something went wrong. Try again." }, 500);
}
