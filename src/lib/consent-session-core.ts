import { createHash } from "node:crypto";
export function hashConsentSessionToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function consentSessionIsActive(session: { status: string; expiresAt: Date; revokedAt?: Date | null }, now = new Date()) { return session.status === "active" && !session.revokedAt && session.expiresAt.getTime() > now.getTime(); }
