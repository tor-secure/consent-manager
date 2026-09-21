import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { MAX_VERIFICATION_ATTEMPTS } from "./types";

export function generateRightsToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateRequesterReference(): string {
  return `DPR-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function hashRightsToken(token: string): string {
  return createHash("sha256").update(token.trim().toLowerCase()).digest("hex");
}

export function tokensMatch(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashRightsToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function verificationLocked(failedAttempts: number): boolean {
  return failedAttempts >= MAX_VERIFICATION_ATTEMPTS;
}

export function tokenExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function tokenReusable(input: {
  usedAt: Date | null;
  expiresAt: Date;
  failedAttempts: number;
  now?: Date;
}): { ok: boolean; reason?: string } {
  if (input.usedAt) return { ok: false, reason: "reused" };
  if (tokenExpired(input.expiresAt, input.now)) return { ok: false, reason: "expired" };
  if (verificationLocked(input.failedAttempts)) return { ok: false, reason: "locked" };
  return { ok: true };
}
