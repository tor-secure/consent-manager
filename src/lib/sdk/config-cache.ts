/**
 * Cache-aside store for published SDK configuration.
 * The public route must not query PostgreSQL on a hit.
 * Draft payloads are rejected. Keys include the site and every request
 * dimension that changes the body (locale, country, region, GPC).
 */

export const SDK_CONFIG_CACHE_TTL_MS = 60_000;
const MAX_ENTRIES = 2_000;
const UNIT = "\x1f";

export type SdkConfigGpcDimension = "absent" | "valid_1" | "invalid";

export type SdkConfigCacheDimensions = {
  siteKey: string;
  locale: string;
  country: string;
  region: string;
  gpc: SdkConfigGpcDimension;
};

export type SdkConfigCacheEntry = {
  organizationId: string;
  websiteId: string;
  siteKey: string;
  domain: string;
  verified: boolean;
  policyId: string;
  policyVersionId: string;
  policyVersion: number;
  published: true;
  configHash: string;
  locale: string;
  country: string;
  region: string;
  gpc: SdkConfigGpcDimension;
  body: Record<string, unknown>;
  storedAt: number;
};

export type SdkConfigCacheStore = {
  read(siteKey: string, key: string): Promise<SdkConfigCacheEntry | undefined>;
  write(siteKey: string, key: string, entry: SdkConfigCacheEntry): Promise<void>;
  invalidate(siteKey: string): Promise<void>;
};

export type SdkConfigLoadFailure = {
  status: number;
  message: string;
};

export type SdkConfigLoaderResult =
  | { ok: true; entry: Omit<SdkConfigCacheEntry, "storedAt"> & { storedAt?: number } }
  | { ok: false; failure: SdkConfigLoadFailure };

export type SdkConfigLoadOutcome = "hit" | "miss" | "fallback";

export type SdkConfigLoadResult = {
  outcome: SdkConfigLoadOutcome;
  entry: SdkConfigCacheEntry | null;
  failure: SdkConfigLoadFailure | null;
  cacheReadMs: number;
  buildMs: number;
  totalMs: number;
};

type CacheRow = {
  entry: SdkConfigCacheEntry;
  expiresAt: number;
};

type Sample = {
  outcome: SdkConfigLoadOutcome;
  totalMs: number;
  cacheReadMs: number;
  buildMs: number;
};

const memoryRows = new Map<string, CacheRow>();
const inflight = new Map<string, Promise<SdkConfigLoadResult>>();
const samples: Sample[] = [];
const SAMPLE_LIMIT = 500;

const counts = {
  requests: 0,
  hits: 0,
  misses: 0,
  fallbacks: 0,
  databaseBuilds: 0,
};

function encodePart(value: string): string {
  return encodeURIComponent(value);
}

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeSdkConfigDimensions(input: {
  siteKey: string;
  queryLang?: string | null;
  acceptLanguage?: string | null;
  country?: string | null;
  region?: string | null;
  gpc: SdkConfigGpcDimension;
}): SdkConfigCacheDimensions {
  const queryLang = (input.queryLang ?? "").trim().toLowerCase().slice(0, 35);
  const headerLang = queryLang
    ? ""
    : (input.acceptLanguage ?? "").split(",")[0]?.split(";")[0]?.trim().toLowerCase().slice(0, 35) ?? "";
  return {
    siteKey: input.siteKey.trim(),
    locale: queryLang || headerLang,
    country: (input.country ?? "").trim().toUpperCase().slice(0, 8),
    region: (input.region ?? "").trim().toUpperCase().slice(0, 16),
    gpc: input.gpc,
  };
}

export function sdkConfigCacheKey(dimensions: SdkConfigCacheDimensions): string {
  return [
    "sdkcfg",
    "v1",
    encodePart(dimensions.siteKey),
    encodePart(dimensions.locale),
    encodePart(dimensions.country),
    encodePart(dimensions.region),
    dimensions.gpc,
  ].join(UNIT);
}

export function siteKeyFromSdkConfigCacheKey(key: string): string | null {
  const parts = key.split(UNIT);
  if (parts.length !== 7 || parts[0] !== "sdkcfg" || parts[1] !== "v1") return null;
  const siteKey = decodePart(parts[2] ?? "");
  return siteKey || null;
}

function policyFromBody(body: Record<string, unknown>): { isPublished?: boolean } | null {
  const policy = body.policy;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return null;
  return policy as { isPublished?: boolean };
}

export function isCacheablePublishedConfig(
  entry: Pick<
    SdkConfigCacheEntry,
    | "published"
    | "siteKey"
    | "organizationId"
    | "websiteId"
    | "policyId"
    | "policyVersionId"
    | "policyVersion"
    | "configHash"
    | "body"
  >,
): boolean {
  if (entry.published !== true) return false;
  if (!entry.siteKey || !entry.organizationId || !entry.websiteId) return false;
  if (!entry.policyId || !entry.policyVersionId || !entry.configHash) return false;
  if (!Number.isInteger(entry.policyVersion) || entry.policyVersion < 1) return false;
  if (!entry.body || entry.body.success !== true) return false;
  return policyFromBody(entry.body)?.isPublished === true;
}

function rememberSample(sample: Sample) {
  counts.requests += 1;
  if (sample.outcome === "hit") counts.hits += 1;
  else if (sample.outcome === "miss") counts.misses += 1;
  else counts.fallbacks += 1;
  samples.push(sample);
  if (samples.length > SAMPLE_LIMIT) samples.shift();
}

export function sdkConfigCacheMetrics() {
  const hitRatio = counts.requests === 0 ? 0 : counts.hits / counts.requests;
  return {
    requests: counts.requests,
    hits: counts.hits,
    misses: counts.misses,
    fallbacks: counts.fallbacks,
    databaseBuilds: counts.databaseBuilds,
    hitRatio,
    total: quantiles(samples.map((sample) => sample.totalMs)),
    cacheRead: quantiles(samples.map((sample) => sample.cacheReadMs)),
    build: quantiles(samples.filter((sample) => sample.outcome !== "hit").map((sample) => sample.buildMs)),
  };
}

export function quantiles(values: number[]): { p50: number; p95: number; p99: number } | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return {
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
  };
}

function percentile(sorted: number[], ratio: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(ratio * sorted.length) - 1));
  return sorted[index] ?? 0;
}

export function resetSdkConfigCacheForTests() {
  memoryRows.clear();
  inflight.clear();
  samples.length = 0;
  counts.requests = 0;
  counts.hits = 0;
  counts.misses = 0;
  counts.fallbacks = 0;
  counts.databaseBuilds = 0;
}

function evictMemory(now: number) {
  for (const [key, row] of memoryRows) {
    if (row.expiresAt <= now) memoryRows.delete(key);
  }
  while (memoryRows.size > MAX_ENTRIES) {
    const oldest = memoryRows.keys().next().value;
    if (!oldest) break;
    memoryRows.delete(oldest);
  }
}

export const memorySdkConfigStore: SdkConfigCacheStore = {
  async read(_siteKey, key) {
    const row = memoryRows.get(key);
    if (!row) return undefined;
    if (row.expiresAt <= Date.now()) {
      memoryRows.delete(key);
      return undefined;
    }
    if (siteKeyFromSdkConfigCacheKey(key) !== row.entry.siteKey) {
      memoryRows.delete(key);
      return undefined;
    }
    return row.entry;
  },
  async write(siteKey, key, entry) {
    if (entry.siteKey !== siteKey) return;
    if (siteKeyFromSdkConfigCacheKey(key) !== siteKey) return;
    if (!isCacheablePublishedConfig(entry)) return;
    const now = Date.now();
    evictMemory(now);
    memoryRows.set(key, { entry: { ...entry, storedAt: now }, expiresAt: now + SDK_CONFIG_CACHE_TTL_MS });
  },
  async invalidate(siteKey) {
    for (const [key, row] of memoryRows) {
      if (row.entry.siteKey === siteKey || siteKeyFromSdkConfigCacheKey(key) === siteKey) {
        memoryRows.delete(key);
      }
    }
  },
};

export async function loadSdkConfig(input: {
  key: string;
  siteKey: string;
  store?: SdkConfigCacheStore;
  loader: () => Promise<SdkConfigLoaderResult>;
}): Promise<SdkConfigLoadResult> {
  const existing = inflight.get(input.key);
  if (existing) return existing;
  const flight = runSdkConfigLoad(input).finally(() => {
    inflight.delete(input.key);
  });
  inflight.set(input.key, flight);
  return flight;
}

async function runSdkConfigLoad(input: {
  key: string;
  siteKey: string;
  store?: SdkConfigCacheStore;
  loader: () => Promise<SdkConfigLoaderResult>;
}): Promise<SdkConfigLoadResult> {
  const store = input.store ?? memorySdkConfigStore;
  const started = performance.now();
  const readStarted = performance.now();
  let cached: SdkConfigCacheEntry | undefined;
  let cacheFailed = false;
  try {
    cached = await store.read(input.siteKey, input.key);
  } catch {
    cacheFailed = true;
  }
  const cacheReadMs = performance.now() - readStarted;

  if (!cacheFailed && cached && cached.siteKey === input.siteKey && isCacheablePublishedConfig(cached)) {
    const totalMs = performance.now() - started;
    const result: SdkConfigLoadResult = {
      outcome: "hit",
      entry: cached,
      failure: null,
      cacheReadMs,
      buildMs: 0,
      totalMs,
    };
    rememberSample(result);
    return result;
  }

  if (cacheFailed) {
    try {
      const degraded = await memorySdkConfigStore.read(input.siteKey, input.key);
      if (degraded && degraded.siteKey === input.siteKey && isCacheablePublishedConfig(degraded)) {
        const totalMs = performance.now() - started;
        const result: SdkConfigLoadResult = {
          outcome: "fallback",
          entry: degraded,
          failure: null,
          cacheReadMs,
          buildMs: 0,
          totalMs,
        };
        rememberSample(result);
        return result;
      }
    } catch {
      /* memory fallback is best-effort */
    }
  }

  const buildStarted = performance.now();
  counts.databaseBuilds += 1;
  let loaded: SdkConfigLoaderResult;
  try {
    loaded = await input.loader();
  } catch (error) {
    const totalMs = performance.now() - started;
    rememberSample({
      outcome: cacheFailed ? "fallback" : "miss",
      totalMs,
      cacheReadMs,
      buildMs: performance.now() - buildStarted,
    });
    throw error;
  }
  const buildMs = performance.now() - buildStarted;

  if (!loaded.ok) {
    const totalMs = performance.now() - started;
    const result: SdkConfigLoadResult = {
      outcome: cacheFailed ? "fallback" : "miss",
      entry: null,
      failure: loaded.failure,
      cacheReadMs,
      buildMs,
      totalMs,
    };
    rememberSample(result);
    return result;
  }

  const entry: SdkConfigCacheEntry = {
    ...loaded.entry,
    published: true,
    storedAt: Date.now(),
  };
  if (entry.siteKey !== input.siteKey || !isCacheablePublishedConfig(entry)) {
    const totalMs = performance.now() - started;
    const result: SdkConfigLoadResult = {
      outcome: cacheFailed ? "fallback" : "miss",
      entry: null,
      failure: { status: 500, message: "Failed to load SDK configuration" },
      cacheReadMs,
      buildMs,
      totalMs,
    };
    rememberSample(result);
    return result;
  }

  if (cacheFailed) {
    try {
      await memorySdkConfigStore.write(input.siteKey, input.key, entry);
    } catch {
      /* still return the database result */
    }
  } else {
    try {
      await store.write(input.siteKey, input.key, entry);
    } catch {
      try {
        await memorySdkConfigStore.write(input.siteKey, input.key, entry);
      } catch {
        /* response is still valid */
      }
    }
  }

  const totalMs = performance.now() - started;
  const result: SdkConfigLoadResult = {
    outcome: cacheFailed ? "fallback" : "miss",
    entry,
    failure: null,
    cacheReadMs,
    buildMs,
    totalMs,
  };
  rememberSample(result);
  return result;
}
