import { createHash } from "node:crypto";

export const SDK_CONFIG_CACHE_CONTROL = "private, no-store, must-revalidate";

export function hashPublishedConfig(payload: unknown): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

/** Canonical input for a stored policy version hash. Same bytes on publish and SDK config. */
export function hashForPublishedVersion(version: {
  id: string;
  configuration: unknown;
  processingSnapshot?: unknown;
}): string {
  return hashPublishedConfig({
    versionId: version.id,
    configuration: version.configuration,
    processingSnapshot: version.processingSnapshot ?? {},
  });
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`).join(",")}}`;
}

export function sdkConfigCacheHeaders(configHash: string): Record<string, string> {
  return {
    "Cache-Control": SDK_CONFIG_CACHE_CONTROL,
    ETag: quotedEtag(configHash),
    Vary: "Accept-Language, Sec-GPC",
  };
}

export function quotedEtag(configHash: string): string {
  return `"${configHash}"`;
}

export function etagMatches(ifNoneMatch: string | null | undefined, configHash: string): boolean {
  if (!ifNoneMatch || !configHash) return false;
  const expected = configHash.toLowerCase();
  return ifNoneMatch.split(",").some((part) => {
    const token = part.trim().replace(/^W\//i, "").replace(/^"|"$/g, "").toLowerCase();
    return token === expected;
  });
}

export function pickLatestPublished<T extends { isPublished: boolean; version: number }>(
  versions: T[],
): T | null {
  const published = versions.filter((row) => row.isPublished);
  if (published.length === 0) return null;
  return published.reduce((latest, row) => (row.version > latest.version ? row : latest));
}

export function stickyUnitInterval(seed: string): number {
  const digest = createHash("sha256").update(seed).digest();
  return digest.readUInt32BE(0) / 0x1_0000_0000;
}
