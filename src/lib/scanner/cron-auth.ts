import { timingSafeEqual } from "node:crypto";

export function getConfiguredCronSecret(): string | null {
  const secret = process.env.CRON_SECRET || process.env.SCANNER_CRON_SECRET || "";
  const trimmed = secret.trim();
  return trimmed.length >= 16 ? trimmed : null;
}

export function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function extractBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

export function authorizeCronRequest(request: Request): boolean {
  const expected = getConfiguredCronSecret();
  if (!expected) return false;
  const bearer = extractBearerToken(request.headers.get("authorization"));
  const header = request.headers.get("x-cron-secret")?.trim() || null;
  const provided = bearer || header;
  if (!provided) return false;
  return secretsMatch(provided, expected);
}
