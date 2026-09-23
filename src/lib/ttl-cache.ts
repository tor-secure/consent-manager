/**
 * Process-local TTL cache for expensive, org-scoped aggregates.
 * Serverless isolates do not share this map. It removes repeat work inside
 * one instance. A shared cache is the next step once more than one instance
 * serves the same organisation concurrently.
 */

type Entry = {
  value: unknown;
  expiresAt: number;
};

const MAX_ENTRIES = 200;
const store = new Map<string, Entry>();

function evictExpired(now: number) {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

export function readTtlCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function writeTtlCache<T>(key: string, value: T, ttlMs: number): void {
  const now = Date.now();
  if (store.size >= MAX_ENTRIES) evictExpired(now);
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: now + ttlMs });
}
