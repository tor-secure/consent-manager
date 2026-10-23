import "server-only";

import { logger } from "@/lib/logger";

export type RecaptchaVerdict = "ok" | "missing" | "rejected";

export function recaptchaSiteKey(): string {
  return (
    process.env.RECAPTCHA_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ||
    ""
  );
}

export async function verifyRecaptcha(
  token: string,
  remoteIp: string | null,
): Promise<RecaptchaVerdict> {
  const secret = process.env.RECAPTCHA_SECRET?.trim();
  if (!token.trim()) return "missing";
  if (!secret) return "rejected";

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    logger.warn("recaptcha_verify_http", { status: response.status });
    return "rejected";
  }

  const payload = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
  if (payload.success === true) return "ok";
  logger.warn("recaptcha_verify_rejected", { codes: payload["error-codes"] ?? [] });
  return "rejected";
}
