import { isBlockedIpAddress } from "./ssrf-guard";

export type AddressRecord = { address: string; family: number };

/** Reject a DNS answer set if any answer is non-public; never pick around a mixed answer. */
export function pickPublicAddress(records: AddressRecord[]): AddressRecord | null {
  if (!records.length || records.some((record) => isBlockedIpAddress(record.address))) return null;
  // Prefer IPv4 because many hosted workers lack outbound IPv6 routing. Every
  // answer is still checked first, so this never selects around a private IP.
  return records.find((record) => record.family === 4) ?? records[0];
}
