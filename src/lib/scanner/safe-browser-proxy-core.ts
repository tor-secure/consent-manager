import { isBlockedIpAddress } from "./ssrf-guard";

export type AddressRecord = { address: string; family: number };

export const MAX_PROXY_CONNECTION_BYTES = 16 * 1024 * 1024;
export const MAX_PROXY_SCAN_BYTES = 128 * 1024 * 1024;

/** Shared scan budget fails closed after exhaustion, including TLS tunnel bytes. */
export function createProxyByteBudget(limit: number) {
  let remaining = limit;
  return (bytes: number): boolean => {
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > remaining) { remaining = -1; return false; }
    remaining -= bytes;
    return true;
  };
}

/** Reject a DNS answer set if any answer is non-public; never pick around a mixed answer. */
export function pickPublicAddress(records: AddressRecord[]): AddressRecord | null {
  if (!records.length || records.some((record) => isBlockedIpAddress(record.address))) return null;
  // Prefer IPv4 because many hosted workers lack outbound IPv6 routing. Every
  // answer is still checked first, so this never selects around a private IP.
  return records.find((record) => record.family === 4) ?? records[0];
}
