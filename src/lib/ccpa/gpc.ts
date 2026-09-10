import type { ClientGpcState, SecGpcHeaderState } from "./types";

export function readSecGpcHeaderValue(headers: Headers | { get(name: string): string | null }): string | null {
  return headers.get("sec-gpc") ?? headers.get("Sec-GPC");
}

export function parseSecGpcHeader(value: string | null | undefined): SecGpcHeaderState {
  if (value == null) return "absent";
  const next = String(value).trim();
  if (next === "") return "absent";
  if (next === "1") return "valid_1";
  return "invalid";
}

export function parseClientGpc(value: unknown): ClientGpcState {
  if (value === undefined || value === null) return "unknown";
  if (value === true) return "true";
  if (value === false) return "false";
  return "invalid";
}

export function gpcSignalIsActive(header: SecGpcHeaderState, client: ClientGpcState): boolean {
  if (header === "valid_1") return true;
  if (header === "invalid") return false;
  return client === "true";
}

export function parseGpcFromRequest(
  headers: Headers | { get(name: string): string | null },
  clientClaim: unknown,
): {
  header: SecGpcHeaderState;
  client: ClientGpcState;
  active: boolean;
} {
  const header = parseSecGpcHeader(readSecGpcHeaderValue(headers));
  const client = parseClientGpc(clientClaim);
  return {
    header,
    client,
    active: gpcSignalIsActive(header, client),
  };
}
