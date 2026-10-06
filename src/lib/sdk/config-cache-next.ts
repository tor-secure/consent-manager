import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import {
  memorySdkConfigStore,
  type SdkConfigCacheEntry,
  type SdkConfigCacheStore,
} from "@/lib/sdk/config-cache";

const SHARED_TTL_SECONDS = 60;
const fillers = new Map<string, () => Promise<SdkConfigCacheEntry>>();
const readers = new Map<string, (key: string) => Promise<SdkConfigCacheEntry>>();

export function sdkConfigCacheTag(siteKey: string): string {
  return `sdk-config:${siteKey}`.slice(0, 240);
}

function readerFor(siteKey: string) {
  const existing = readers.get(siteKey);
  if (existing) return existing;
  const read = unstable_cache(
    async (key: string) => {
      const fill = fillers.get(key);
      if (!fill) throw new Error("SDK_CONFIG_MISS");
      return fill();
    },
    ["sdk-config-v1", siteKey],
    {
      revalidate: SHARED_TTL_SECONDS,
      tags: [sdkConfigCacheTag(siteKey)],
    },
  );
  readers.set(siteKey, read);
  return read;
}

function isMiss(error: unknown): boolean {
  return error instanceof Error && error.message === "SDK_CONFIG_MISS";
}

export const nextSdkConfigStore: SdkConfigCacheStore = {
  async read(siteKey, key) {
    try {
      return await readerFor(siteKey)(key);
    } catch (error) {
      if (isMiss(error)) return undefined;
      throw error;
    }
  },
  async write(siteKey, key, entry) {
    fillers.set(key, async () => entry);
    try {
      await readerFor(siteKey)(key);
    } finally {
      fillers.delete(key);
    }
  },
  async invalidate(siteKey) {
    await memorySdkConfigStore.invalidate(siteKey);
    readers.delete(siteKey);
    try {
      revalidateTag(sdkConfigCacheTag(siteKey), { expire: 0 });
    } catch {
      // Route handlers outside the Next request store cannot touch the data cache.
      // The in-process map and the 60s shared TTL still bound staleness.
    }
  },
};

export function invalidateSdkConfigCache(siteKey: string): Promise<void> {
  return nextSdkConfigStore.invalidate(siteKey);
}
