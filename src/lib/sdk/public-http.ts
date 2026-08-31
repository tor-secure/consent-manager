import { NextResponse } from "next/server";

// Shared CORS + input guards for public SDK and consent endpoints.
//
// CORS is intentionally Access-Control-Allow-Origin: * with no credentials.
// The browser SDK runs on customer sites (and localhost/demo), so Origin is
// not used as an allowlist. siteKey is the capability token. Do not echo
// secrets, Clerk data, API keys, or internal org/user fields in responses.

export const SITE_KEY_MAX_LENGTH = 255;
export const CONSENT_ID_MAX_LENGTH = 255;
export const JSON_BODY_MAX_BYTES = 64 * 1024;
export const MAX_DECISION_ITEMS = 200;

const SITE_KEY_RE = /^[A-Za-z0-9_-]{8,255}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONSENT_ID_RE = /^[A-Za-z0-9_-]{8,255}$/;
const LANG_RE = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8}){0,3}$/;

export function publicCorsHeaders(methods: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "X-Content-Type-Options": "nosniff",
  };
}

export function publicOptionsResponse(methods: string): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: publicCorsHeaders(methods),
  });
}

export function isValidSiteKey(value: string): boolean {
  return SITE_KEY_RE.test(value);
}

export function isValidWebsiteId(value: string): boolean {
  return value.length === 36 && UUID_RE.test(value);
}

export function isValidConsentId(value: string): boolean {
  return CONSENT_ID_RE.test(value);
}

export function sanitizeRequestedLang(raw: string | null | undefined): string {
  if (!raw) return "en";
  const trimmed = raw.trim().slice(0, 35);
  if (!LANG_RE.test(trimmed)) return "en";
  return trimmed.toLowerCase();
}

export function isSafeApiBase(value: string): boolean {
  if (!value || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    return true;
  } catch {
    return false;
  }
}

export async function readPublicJsonObject(
  request: Request,
): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; message: string }
> {
  const lenHeader = request.headers.get("content-length");
  if (lenHeader) {
    const n = Number(lenHeader);
    if (Number.isFinite(n) && n > JSON_BODY_MAX_BYTES) {
      return { ok: false, status: 413, message: "Request body too large" };
    }
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, message: "Invalid request body" };
  }

  if (text.length > JSON_BODY_MAX_BYTES) {
    return { ok: false, status: 413, message: "Request body too large" };
  }

  if (!text.trim()) {
    return { ok: false, status: 400, message: "Request body is required" };
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, status: 400, message: "Request body must be a JSON object" };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON" };
  }
}
