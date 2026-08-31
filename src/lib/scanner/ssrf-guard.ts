import { lookup } from "node:dns/promises";
import { BlockList, isIP, isIPv4, isIPv6 } from "node:net";

// Blocks scanner fetches to loopback, private, link-local, CGNAT, metadata,
// and other non-public targets. Safe error text never includes the host or IP.

export const SCAN_URL_BLOCKED_MESSAGE = "This address cannot be scanned";
export const SCAN_URL_INVALID_MESSAGE = "The scan URL is invalid";

export class ScannerUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScannerUrlError";
  }
}

const ALLOWED_PORTS = new Set(["", "80", "443"]);
const MAX_HOSTNAME_LENGTH = 253;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "metadata.google.com",
  "metadata.goog",
  "instance-data",
  "internal",
  "kubernetes",
  "kubernetes.default",
  "kubernetes.default.svc",
  "kubernetes.default.svc.cluster.local",
]);

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".corp",
  ".private",
  ".localdomain",
];

const SUSPICIOUS_HOST_PARTS = new Set([
  "localhost",
  "metadata",
  "internal",
  "intranet",
]);

const blockedNets = new BlockList();

// IPv4 special / non-public ranges
blockedNets.addSubnet("0.0.0.0", 8, "ipv4");
blockedNets.addSubnet("10.0.0.0", 8, "ipv4");
blockedNets.addSubnet("100.64.0.0", 10, "ipv4");
blockedNets.addSubnet("127.0.0.0", 8, "ipv4");
blockedNets.addSubnet("169.254.0.0", 16, "ipv4");
blockedNets.addSubnet("172.16.0.0", 12, "ipv4");
blockedNets.addSubnet("192.168.0.0", 16, "ipv4");
blockedNets.addSubnet("192.0.0.0", 24, "ipv4");
blockedNets.addSubnet("192.0.2.0", 24, "ipv4");
blockedNets.addSubnet("192.88.99.0", 24, "ipv4");
blockedNets.addSubnet("198.18.0.0", 15, "ipv4");
blockedNets.addSubnet("198.51.100.0", 24, "ipv4");
blockedNets.addSubnet("203.0.113.0", 24, "ipv4");
blockedNets.addSubnet("224.0.0.0", 4, "ipv4");
blockedNets.addSubnet("240.0.0.0", 4, "ipv4");
blockedNets.addSubnet("255.255.255.255", 32, "ipv4");

// IPv6 special / non-public ranges
blockedNets.addAddress("::", "ipv6");
blockedNets.addAddress("::1", "ipv6");
blockedNets.addSubnet("fc00::", 7, "ipv6");
blockedNets.addSubnet("fe80::", 10, "ipv6");
blockedNets.addSubnet("ff00::", 8, "ipv6");
blockedNets.addSubnet("64:ff9b::", 96, "ipv6");
blockedNets.addSubnet("100::", 64, "ipv6");
blockedNets.addSubnet("2002::", 16, "ipv6");
blockedNets.addSubnet("2001:db8::", 32, "ipv6");

function throwBlocked(): never {
  throw new ScannerUrlError(SCAN_URL_BLOCKED_MESSAGE);
}

function throwInvalid(): never {
  throw new ScannerUrlError(SCAN_URL_INVALID_MESSAGE);
}

function ipv4FromDword(host: string): string | null {
  if (!/^\d+$/.test(host)) return null;
  const n = Number(host);
  if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return null;
  return [
    (n >>> 24) & 255,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255,
  ].join(".");
}

function expandShortIPv4(host: string): string | null {
  if (isIPv4(host)) return host;
  const dword = ipv4FromDword(host);
  if (dword) return dword;

  const parts = host.split(".");
  if (parts.length < 1 || parts.length > 4) return null;
  if (!parts.every((p) => /^\d+$/.test(p))) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => n < 0 || n > 255)) return null;

  if (parts.length === 4) return nums.join(".");
  if (parts.length === 1) return ipv4FromDword(parts[0]);
  if (parts.length === 2) return `${nums[0]}.0.0.${nums[1]}`;
  return `${nums[0]}.0.${nums[1]}.${nums[2]}`;
}

function mappedIPv4(address: string): string | null {
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  if (dotted) return dotted[1];
  return null;
}

export function isBlockedIpAddress(address: string): boolean {
  const mapped = mappedIPv4(address);
  if (mapped) return isBlockedIpAddress(mapped);

  const kind = isIP(address);
  if (kind === 4) return blockedNets.check(address, "ipv4");
  if (kind === 6) return blockedNets.check(address, "ipv6");
  return true;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host.length > MAX_HOSTNAME_LENGTH) return true;
  if (host.includes("metadata.google")) return true;
  if (host.includes("..")) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  const labels = host.split(".");
  if (labels.length < 2) return true;

  return labels.some((label) => {
    if (!label || label.length > 63) return true;
    if (SUSPICIOUS_HOST_PARTS.has(label)) return true;
    return !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
  });
}

export function toAbsoluteScanUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throwInvalid();

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.includes("://")) throwBlocked();
  return `https://${trimmed}`;
}

function parseScanUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throwInvalid();
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throwBlocked();
  if (parsed.username || parsed.password) throwBlocked();
  if (!ALLOWED_PORTS.has(parsed.port)) throwBlocked();
  if (!parsed.hostname) throwInvalid();
  return parsed;
}

async function resolvePublicAddresses(hostname: string): Promise<void> {
  const asIpv4 = expandShortIPv4(hostname);
  if (asIpv4 && isIPv4(asIpv4)) {
    if (isBlockedIpAddress(asIpv4)) throwBlocked();
    return;
  }

  if (isIPv6(hostname) || hostname.startsWith("[")) {
    const addr = hostname.replace(/^\[/, "").replace(/\]$/, "");
    if (isBlockedIpAddress(addr)) throwBlocked();
    if (isIP(addr)) return;
  }

  if (isBlockedHostname(hostname)) throwBlocked();

  let records: Array<{ address: string; family: number }>;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ScannerUrlError(SCAN_URL_INVALID_MESSAGE);
  }

  if (!records.length) throwBlocked();
  for (const record of records) {
    if (isBlockedIpAddress(record.address)) throwBlocked();
  }
}

export async function assertSafeScanUrl(raw: string): Promise<URL> {
  const parsed = parseScanUrl(raw);
  await resolvePublicAddresses(parsed.hostname);
  return parsed;
}

export async function getSafeScanUrl(raw: string): Promise<string> {
  return (await assertSafeScanUrl(raw)).href;
}
