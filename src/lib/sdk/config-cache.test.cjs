const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  isCacheablePublishedConfig,
  loadSdkConfig,
  memorySdkConfigStore,
  normalizeSdkConfigDimensions,
  resetSdkConfigCacheForTests,
  sdkConfigCacheKey,
  sdkConfigCacheMetrics,
} = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/sdk/config-cache.js"));

async function main() {

function entry(overrides = {}) {
  const siteKey = overrides.siteKey ?? "site-alpha1";
  const version = overrides.policyVersion ?? 41;
  return {
    organizationId: overrides.organizationId ?? "org-a",
    websiteId: overrides.websiteId ?? "web-a",
    siteKey,
    domain: overrides.domain ?? "alpha.example",
    verified: true,
    policyId: overrides.policyId ?? "policy-a",
    policyVersionId: overrides.policyVersionId ?? `version-${version}`,
    policyVersion: version,
    published: true,
    configHash: overrides.configHash ?? `hash-${version}`,
    locale: overrides.locale ?? "en",
    country: overrides.country ?? "US",
    region: overrides.region ?? "CA",
    gpc: overrides.gpc ?? "absent",
    body: {
      success: true,
      policy: {
        id: overrides.policyId ?? "policy-a",
        version,
        versionId: overrides.policyVersionId ?? `version-${version}`,
        isPublished: true,
        configHash: overrides.configHash ?? `hash-${version}`,
      },
      ...(overrides.body ?? {}),
    },
    storedAt: 0,
  };
}

function dimensions(siteKey, extra = {}) {
  return normalizeSdkConfigDimensions({
    siteKey,
    queryLang: extra.queryLang ?? "en",
    country: extra.country ?? "US",
    region: extra.region ?? "CA",
    gpc: extra.gpc ?? "absent",
  });
}

function keyFor(siteKey, extra) {
  return sdkConfigCacheKey(dimensions(siteKey, extra));
}

resetSdkConfigCacheForTests();

const alpha = keyFor("site-alpha1");
const bravo = keyFor("site-bravo2");
assert.notEqual(alpha, bravo);
assert.notEqual(alpha, keyFor("site-alpha1", { gpc: "valid_1" }));
assert.notEqual(alpha, keyFor("site-alpha1", { queryLang: "fr" }));
assert.notEqual(alpha, keyFor("site-alpha1", { country: "DE", region: "BE" }));
assert.equal(keyFor("site-alpha1"), keyFor("site-alpha1"));

const draft = entry();
draft.published = false;
draft.body.policy.isPublished = false;
assert.equal(isCacheablePublishedConfig(draft), false);
await memorySdkConfigStore.write("site-alpha1", alpha, draft);
assert.equal(await memorySdkConfigStore.read("site-alpha1", alpha), undefined);

let builds = 0;
async function loadPublished(version, siteKey = "site-alpha1") {
  builds += 1;
  return {
    ok: true,
    entry: entry({
      siteKey,
      organizationId: siteKey === "site-alpha1" ? "org-a" : "org-b",
      websiteId: siteKey === "site-alpha1" ? "web-a" : "web-b",
      policyVersion: version,
      policyVersionId: `version-${version}`,
      configHash: `hash-${version}`,
    }),
  };
}

const miss = await loadSdkConfig({
  key: alpha,
  siteKey: "site-alpha1",
  loader: () => loadPublished(41),
});
assert.equal(miss.outcome, "miss");
assert.equal(miss.entry.policyVersion, 41);
assert.equal(builds, 1);
assert.equal(sdkConfigCacheMetrics().databaseBuilds, 1);

const hit = await loadSdkConfig({
  key: alpha,
  siteKey: "site-alpha1",
  loader: () => loadPublished(41),
});
assert.equal(hit.outcome, "hit");
assert.equal(hit.entry.body.policy.isPublished, true);
assert.equal(hit.buildMs, 0);
assert.equal(builds, 1);

const other = await loadSdkConfig({
  key: bravo,
  siteKey: "site-bravo2",
  loader: () => loadPublished(7, "site-bravo2"),
});
assert.equal(other.entry.organizationId, "org-b");
assert.equal(other.entry.websiteId, "web-b");
assert.notEqual(other.entry.body.policy.versionId, hit.entry.body.policy.versionId);
assert.equal((await memorySdkConfigStore.read("site-alpha1", alpha)).organizationId, "org-a");

await memorySdkConfigStore.invalidate("site-alpha1");
assert.equal(await memorySdkConfigStore.read("site-alpha1", alpha), undefined);
assert.equal((await memorySdkConfigStore.read("site-bravo2", bravo)).policyVersion, 7);

const republished = await loadSdkConfig({
  key: alpha,
  siteKey: "site-alpha1",
  loader: () => loadPublished(42),
});
assert.equal(republished.outcome, "miss");
assert.equal(republished.entry.policyVersion, 42);
assert.equal(republished.entry.body.policy.isPublished, true);
const afterPublish = await loadSdkConfig({
  key: alpha,
  siteKey: "site-alpha1",
  loader: () => loadPublished(42),
});
assert.equal(afterPublish.outcome, "hit");
assert.equal(afterPublish.entry.policyVersion, 42);

resetSdkConfigCacheForTests();
builds = 0;
let inFlight = 0;
let maxInFlight = 0;
const stampedeKey = keyFor("site-stamp1");
await Promise.all(
  Array.from({ length: 25 }, () =>
    loadSdkConfig({
      key: stampedeKey,
      siteKey: "site-stamp1",
      loader: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 15));
        inFlight -= 1;
        return {
          ok: true,
          entry: entry({ siteKey: "site-stamp1", websiteId: "web-s", organizationId: "org-s" }),
        };
      },
    }),
  ),
);
assert.equal(maxInFlight, 1);
assert.equal(sdkConfigCacheMetrics().databaseBuilds, 1);

resetSdkConfigCacheForTests();
builds = 0;
const broken = {
  async read() {
    throw new Error("cache unavailable");
  },
  async write() {
    throw new Error("cache unavailable");
  },
  async invalidate() {},
};
const fallbackKey = keyFor("site-fallb1");
const firstFallback = await loadSdkConfig({
  key: fallbackKey,
  siteKey: "site-fallb1",
  store: broken,
  loader: async () => {
    builds += 1;
    return { ok: true, entry: entry({ siteKey: "site-fallb1", websiteId: "web-f", organizationId: "org-f" }) };
  },
});
assert.equal(firstFallback.outcome, "fallback");
assert.equal(builds, 1);
const secondFallback = await loadSdkConfig({
  key: fallbackKey,
  siteKey: "site-fallb1",
  store: broken,
  loader: async () => {
    builds += 1;
    return { ok: true, entry: entry({ siteKey: "site-fallb1" }) };
  },
});
assert.equal(secondFallback.outcome, "fallback");
assert.equal(secondFallback.entry.organizationId, "org-f");
assert.equal(builds, 1);

const routeSource = fs.readFileSync(
  path.join(__dirname, "../../app/api/sdk/[siteKey]/config/route.ts"),
  "utf8",
);
const cacheLoadAt = routeSource.indexOf("await loadSdkConfig");
const originGuardAt = routeSource.indexOf("sdkOriginGuard(");
assert.ok(cacheLoadAt > 0 && originGuardAt > cacheLoadAt, "origin guard runs after cache lookup, including hits");
assert.match(routeSource, /result\.entry\.domain/);
assert.match(routeSource, /result\.entry\.verified/);

resetSdkConfigCacheForTests();
const abKey = keyFor("site-abtest1");
let abLoads = 0;
const abBody = {
  abTest: {
    enabled: true,
    variants: [
      { id: "variant-a", weight: 50 },
      { id: "variant-b", weight: 50 },
    ],
  },
  policyContexts: {
    "variant-a": { token: "context-a" },
    "variant-b": { token: "context-b" },
  },
};
const abFirst = await loadSdkConfig({
  key: abKey,
  siteKey: "site-abtest1",
  loader: async () => {
    abLoads += 1;
    return { ok: true, entry: entry({ siteKey: "site-abtest1", organizationId: "org-ab", websiteId: "web-ab", body: abBody }) };
  },
});
const abHit = await loadSdkConfig({
  key: abKey,
  siteKey: "site-abtest1",
  loader: async () => {
    abLoads += 1;
    return { ok: true, entry: entry({ siteKey: "site-abtest1", body: { abTest: { enabled: true, variants: [] } } }) };
  },
});
assert.equal(abLoads, 1);
assert.equal(abHit.outcome, "hit");
assert.deepEqual(
  abHit.entry.body.abTest.variants.map((variant) => variant.id),
  ["variant-a", "variant-b"],
);
assert.equal(abHit.entry.body.policyContexts["variant-a"].token, "context-a");
assert.equal(abHit.entry.body.policyContexts["variant-b"].token, "context-b");
assert.equal(abFirst.entry.body.policyContexts["variant-b"].token, "context-b");
assert.equal(sdkConfigCacheKey(dimensions("site-abtest1")), abKey);

resetSdkConfigCacheForTests();
let lifeVersion = 1;
let lifePublished = true;
let lifeLoads = 0;
const lifeKey = keyFor("site-life01");
async function lifeLoader() {
  lifeLoads += 1;
  if (!lifePublished) {
    return { ok: false, failure: { status: 404, message: "No published policy version found" } };
  }
  return {
    ok: true,
    entry: entry({
      siteKey: "site-life01",
      organizationId: "org-life",
      websiteId: "web-life",
      policyVersion: lifeVersion,
      policyVersionId: `version-${lifeVersion}`,
      configHash: `hash-${lifeVersion}`,
    }),
  };
}
const publishedV1 = await loadSdkConfig({ key: lifeKey, siteKey: "site-life01", loader: lifeLoader });
assert.equal(publishedV1.outcome, "miss");
assert.equal(publishedV1.entry.policyVersion, 1);
const cachedV1 = await loadSdkConfig({ key: lifeKey, siteKey: "site-life01", loader: lifeLoader });
assert.equal(cachedV1.outcome, "hit");
assert.equal(cachedV1.entry.policyVersion, 1);
assert.equal(lifeLoads, 1);

lifeVersion = 2;
const stillV1 = await loadSdkConfig({ key: lifeKey, siteKey: "site-life01", loader: lifeLoader });
assert.equal(stillV1.outcome, "hit");
assert.equal(stillV1.entry.policyVersion, 1, "scheduling a future version must not replace the cached published version");

await memorySdkConfigStore.invalidate("site-life01");
const publishedV2 = await loadSdkConfig({ key: lifeKey, siteKey: "site-life01", loader: lifeLoader });
assert.equal(publishedV2.outcome, "miss");
assert.equal(publishedV2.entry.policyVersion, 2);
const cachedV2 = await loadSdkConfig({ key: lifeKey, siteKey: "site-life01", loader: lifeLoader });
assert.equal(cachedV2.outcome, "hit");
assert.equal(cachedV2.entry.policyVersion, 2);

lifeVersion = 3;
await memorySdkConfigStore.invalidate("site-life01");
const rolledBack = await loadSdkConfig({ key: lifeKey, siteKey: "site-life01", loader: lifeLoader });
assert.equal(rolledBack.entry.policyVersion, 3);
assert.notEqual(rolledBack.entry.policyVersionId, cachedV2.entry.policyVersionId);

lifePublished = false;
await memorySdkConfigStore.invalidate("site-life01");
const loadsBeforeUnpublish = lifeLoads;
const unpublished = await loadSdkConfig({ key: lifeKey, siteKey: "site-life01", loader: lifeLoader });
assert.equal(unpublished.entry, null);
assert.equal(unpublished.failure.status, 404);
const unpublishedAgain = await loadSdkConfig({ key: lifeKey, siteKey: "site-life01", loader: lifeLoader });
assert.equal(unpublishedAgain.failure.status, 404);
assert.equal(lifeLoads, loadsBeforeUnpublish + 2, "unpublished responses are not cached");

resetSdkConfigCacheForTests();
let owner = "org-a";
const ownerKey = keyFor("site-owner1");
async function ownerLoader() {
  return {
    ok: true,
    entry: entry({ siteKey: "site-owner1", organizationId: owner, websiteId: "web-owner" }),
  };
}
const owned = await loadSdkConfig({ key: ownerKey, siteKey: "site-owner1", loader: ownerLoader });
assert.equal(owned.entry.organizationId, "org-a");
owner = "org-b";
const staleOwner = await loadSdkConfig({ key: ownerKey, siteKey: "site-owner1", loader: ownerLoader });
assert.equal(staleOwner.outcome, "hit");
assert.equal(staleOwner.entry.organizationId, "org-a");
await memorySdkConfigStore.invalidate("site-owner1");
const transferred = await loadSdkConfig({ key: ownerKey, siteKey: "site-owner1", loader: ownerLoader });
assert.equal(transferred.entry.organizationId, "org-b");
assert.equal(transferred.entry.siteKey, "site-owner1");

const foreign = {
  async read() {
    return entry({ siteKey: "site-other9", organizationId: "org-other", websiteId: "web-other" });
  },
  async write() {},
  async invalidate() {},
};
let foreignLoads = 0;
const rejectedForeign = await loadSdkConfig({
  key: keyFor("site-owner1"),
  siteKey: "site-owner1",
  store: foreign,
  loader: async () => {
    foreignLoads += 1;
    return { ok: true, entry: entry({ siteKey: "site-owner1", organizationId: "org-b", websiteId: "web-owner" }) };
  },
});
assert.equal(foreignLoads, 1);
assert.equal(rejectedForeign.entry.organizationId, "org-b");
assert.equal(rejectedForeign.entry.siteKey, "site-owner1");
assert.notEqual(
  (await memorySdkConfigStore.read("site-alpha1", keyFor("site-alpha1")) || {}).organizationId,
  transferred.entry.organizationId,
);

resetSdkConfigCacheForTests();
const warmKey = keyFor("site-warm01");
let warmLoads = 0;
await loadSdkConfig({
  key: warmKey,
  siteKey: "site-warm01",
  loader: async () => {
    warmLoads += 1;
    return { ok: true, entry: entry({ siteKey: "site-warm01", organizationId: "org-warm", websiteId: "web-warm" }) };
  },
});
await Promise.all(
  Array.from({ length: 100 }, () =>
    loadSdkConfig({
      key: warmKey,
      siteKey: "site-warm01",
      loader: async () => {
        warmLoads += 1;
        return { ok: true, entry: entry({ siteKey: "site-warm01" }) };
      },
    }),
  ),
);
assert.equal(warmLoads, 1, "100 concurrent cache hits must not call the loader");

resetSdkConfigCacheForTests();
let coldInFlight = 0;
let coldMax = 0;
const coldKey = keyFor("site-cold01");
await Promise.all(
  Array.from({ length: 100 }, () =>
    loadSdkConfig({
      key: coldKey,
      siteKey: "site-cold01",
      loader: async () => {
        coldInFlight += 1;
        coldMax = Math.max(coldMax, coldInFlight);
        await new Promise((resolve) => setTimeout(resolve, 15));
        coldInFlight -= 1;
        return { ok: true, entry: entry({ siteKey: "site-cold01", organizationId: "org-cold", websiteId: "web-cold" }) };
      },
    }),
  ),
);
assert.equal(coldMax, 1);
assert.equal(sdkConfigCacheMetrics().databaseBuilds, 1, "100 concurrent cold requests share one loader");

resetSdkConfigCacheForTests();
let outageLoads = 0;
const outageKey = keyFor("site-outage1");
const outageStore = {
  async read() {
    throw new Error("cache unavailable");
  },
  async write() {
    throw new Error("cache unavailable");
  },
  async invalidate() {},
};
await Promise.all(
  Array.from({ length: 100 }, () =>
    loadSdkConfig({
      key: outageKey,
      siteKey: "site-outage1",
      store: outageStore,
      loader: async () => {
        outageLoads += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return { ok: true, entry: entry({ siteKey: "site-outage1", organizationId: "org-out", websiteId: "web-out" }) };
      },
    }),
  ),
);
assert.equal(outageLoads, 1, "a cache outage must not stampede the loader");
for (let i = 0; i < 20; i += 1) {
  const repeated = await loadSdkConfig({
    key: outageKey,
    siteKey: "site-outage1",
    store: outageStore,
    loader: async () => {
      outageLoads += 1;
      return { ok: true, entry: entry({ siteKey: "site-outage1" }) };
    },
  });
  assert.equal(repeated.outcome, "fallback");
  assert.equal(repeated.entry.organizationId, "org-out");
}
assert.equal(outageLoads, 1);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function timed(work) {
  const started = performance.now();
  await work();
  return performance.now() - started;
}

const uncached = [];
for (let i = 0; i < 40; i += 1) {
  uncached.push(await timed(() => delay(8)));
}
resetSdkConfigCacheForTests();
const benchKey = keyFor("site-bench1");
let benchBuilds = 0;
const missBench = await loadSdkConfig({
  key: benchKey,
  siteKey: "site-bench1",
  loader: async () => {
    benchBuilds += 1;
    await delay(8);
    return { ok: true, entry: entry({ siteKey: "site-bench1", websiteId: "web-bench", organizationId: "org-bench" }) };
  },
});
const hits = [];
for (let i = 0; i < 100; i += 1) {
  const result = await loadSdkConfig({
    key: benchKey,
    siteKey: "site-bench1",
    loader: async () => {
      benchBuilds += 1;
      await delay(8);
      return { ok: true, entry: entry({ siteKey: "site-bench1" }) };
    },
  });
  assert.equal(result.outcome, "hit");
  hits.push(result.totalMs);
}
assert.equal(benchBuilds, 1);
assert.equal(missBench.outcome, "miss");

function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const pick = (ratio) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(ratio * sorted.length) - 1))];
  return { p50: pick(0.5), p95: pick(0.95), p99: pick(0.99) };
}

const uncachedSummary = summarize(uncached);
const hitSummary = summarize(hits);
console.log(
  `SDK_CONFIG_CACHE_BEHAVIOR_BENCH ${JSON.stringify({
    kind: "cache behavior benchmark",
    notProductionPostgreSQL: true,
    note: "The uncached path waits setTimeout(8). It is not a PostgreSQL or production RPS measurement.",
    samples: { uncached: uncached.length, hits: hits.length },
    simulatedDatabaseDelayMs: 8,
    uncachedMs: uncachedSummary,
    cacheMissMs: missBench.totalMs,
    cacheHitMs: hitSummary,
    databaseBuildsPerMiss: 1,
    databaseBuildsPerHit: 0,
    hitRatio: sdkConfigCacheMetrics().hitRatio,
  })}`,
);

console.log("sdk config cache tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
