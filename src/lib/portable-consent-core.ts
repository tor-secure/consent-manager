import type { PortableConsentClaims } from "./portable-consent-proof";

export type PortableExchangeState = {
  organizationId: string;
  targetWebsiteId: string;
  status: string;
  consumedAt: Date | null;
  expiresAt: Date;
};

export function validatePortableClaims(
  claims: PortableConsentClaims,
  targetWebsiteId: string,
  now = new Date(),
): boolean {
  if (
    claims.v !== 2 ||
    claims.audience !== "portable-consent-import" ||
    claims.targetWebsiteId !== targetWebsiteId ||
    !Array.isArray(claims.decisions) ||
    claims.decisions.length > 200
  ) return false;
  const issuedAt = new Date(claims.issuedAt);
  const exchangeExpiry = new Date(claims.exchangeExpiresAt);
  return Number.isFinite(issuedAt.getTime()) &&
    exchangeExpiry > now &&
    issuedAt <= now &&
    exchangeExpiry.getTime() - issuedAt.getTime() <= 10 * 60 * 1000;
}

export function canConsumePortableExchange(
  exchange: PortableExchangeState,
  organizationId: string,
  targetWebsiteId: string,
  now = new Date(),
): boolean {
  return exchange.organizationId === organizationId &&
    exchange.targetWebsiteId === targetWebsiteId &&
    exchange.status === "issued" &&
    exchange.consumedAt === null &&
    exchange.expiresAt > now;
}
