const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = path.resolve(__dirname, "../../..");
const outDir = path.join(root, ".tmp/regulations");

execSync(
  "npx tsc --outDir .tmp/regulations --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck --noEmit false src/lib/regulations/catalog.ts src/lib/regulations/engine.ts src/lib/regulations/geo.ts src/lib/regulations/policy-selection.ts src/lib/signals/google-consent-mode.ts src/lib/signals/iab-adapter.ts src/lib/signals/consent-integrations.ts",
  { cwd: root, stdio: "pipe" },
);

function compiled(name, folder) {
  const candidates = [
    path.join(outDir, `${name}.js`),
    path.join(outDir, folder, `${name}.js`),
    path.join(outDir, "src/lib", folder, `${name}.js`),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Missing compiled ${folder}/${name}.js`);
  return found;
}

const { resolveRegulationProfile, matchRegulationFromGeo } = require(compiled("engine", "regulations"));
const { resolveJurisdiction } = require(compiled("geo", "regulations"));
const { selectConsentPolicy, findConflictingJurisdictionRules } = require(
  compiled("policy-selection", "regulations"),
);
const { mapDecisionsToGoogleConsent, defaultGoogleConsentState } = require(
  compiled("google-consent-mode", "signals"),
);
const { buildIabSignalSnapshot, tcfPingResponse, gppPingResponse } = require(
  compiled("iab-adapter", "signals"),
);

{
  const before = resolveRegulationProfile({ key: "ccpa", at: new Date("2021-06-01T00:00:00Z") });
  const after = resolveRegulationProfile({ key: "ccpa", at: new Date("2023-06-01T00:00:00Z") });
  assert.equal(before.version, "1.0");
  assert.equal(after.version, "2.0");
  assert.equal(resolveRegulationProfile({ key: "gdpr" }).key, "gdpr");
  assert.equal(resolveRegulationProfile({ key: "unknown" }), null);
  const tooEarly = resolveRegulationProfile({ key: "ucpa", at: new Date("2020-01-01T00:00:00Z") });
  assert.equal(tooEarly, null);
}

{
  const ca = matchRegulationFromGeo({ country: "US", region: "CA", at: new Date("2024-01-01") });
  assert.equal(ca.key, "ccpa");
  const inGeo = matchRegulationFromGeo({ country: "IN", region: null });
  assert.equal(inGeo.key, "dpdp");
  const fallback = matchRegulationFromGeo({ country: null, region: null });
  assert.equal(fallback, null);
}

{
  const hinted = resolveJurisdiction({ country: "us", region: "ca" });
  assert.deepEqual(hinted, { country: "US", region: "CA", source: "hint" });
  const website = resolveJurisdiction({ websiteDefaultRegion: "EU" });
  assert.equal(website.region, "EU");
  assert.equal(website.source, "website_default");
  const invalid = resolveJurisdiction({ country: "not-a-country", region: "??" });
  assert.equal(invalid.source, "none");
}

{
  const policyA = { id: "p1", isDefault: true, status: "active", createdAt: new Date("2024-01-01") };
  const policyB = { id: "p2", isDefault: false, status: "active", createdAt: new Date("2024-02-01") };
  const rules = [
    { countryCode: "US", regionCode: "CA", policyId: "p2", regulationKey: "ccpa" },
    { countryCode: "US", regionCode: "", policyId: "p1", regulationKey: "gdpr" },
  ];
  assert.equal(
    selectConsentPolicy({
      country: "US",
      region: "CA",
      rules,
      policies: [policyA, policyB],
      defaultRegulationKey: "dpdp",
    }).reason,
    "state",
  );
  assert.equal(
    selectConsentPolicy({
      country: "US",
      region: null,
      rules,
      policies: [policyA, policyB],
      defaultRegulationKey: "dpdp",
    }).policyId,
    "p1",
  );
  assert.equal(
    selectConsentPolicy({
      country: "IN",
      region: null,
      rules,
      policies: [policyA, policyB],
      defaultRegulationKey: "dpdp",
    }).reason,
    "default",
  );
  assert.deepEqual(findConflictingJurisdictionRules(rules.concat(rules[0])), ["US|CA"]);
}

{
  const initial = defaultGoogleConsentState();
  assert.equal(initial.analytics_storage, "denied");
  assert.equal(initial.security_storage, "granted");
  const purposes = [
    { key: "analytics", isRequired: false },
    { key: "ads", isRequired: false },
    { key: "essential", isRequired: true },
  ];
  const accepted = mapDecisionsToGoogleConsent({
    purposes,
    grantedByPurposeKey: { analytics: true, ads: true },
  });
  assert.equal(accepted.analytics_storage, "granted");
  assert.equal(accepted.ad_storage, "granted");
  const rejected = mapDecisionsToGoogleConsent({
    purposes,
    grantedByPurposeKey: { analytics: false, ads: false },
  });
  assert.equal(rejected.analytics_storage, "denied");
  assert.equal(rejected.security_storage, "granted");
  const granular = mapDecisionsToGoogleConsent({
    purposes,
    grantedByPurposeKey: { analytics: true, ads: false },
  });
  assert.equal(granular.analytics_storage, "granted");
  assert.equal(granular.ad_storage, "denied");
}

{
  const disabled = buildIabSignalSnapshot({ tcf: { enabled: false }, gpp: { enabled: false } });
  assert.equal(disabled.tcf.status, "disabled");
  assert.equal(disabled.tcf.tcString, null);
  const enabled = buildIabSignalSnapshot({ tcf: { enabled: true }, gpp: { enabled: true } });
  assert.equal(enabled.gpp.status, "foundation");
  assert.equal(enabled.gpp.gppString, null);
  assert.equal(tcfPingResponse(true).cmpStatus, "stub");
  assert.equal(gppPingResponse(true).gppString, "");
}

{
  const sdk = fs.readFileSync(path.join(root, "src/lib/sdk/cmp-sdk-script.ts"), "utf8");
  assert.match(sdk, /gtag\('consent', 'default'/);
  assert.match(sdk, /gtag\('consent', 'update'/);
  assert.match(sdk, /window\.__tcfapi/);
  assert.match(sdk, /window\.__gpp/);
  assert.match(sdk, /window\.__CMP_GEO/);
  const config = fs.readFileSync(path.join(root, "src/app/api/sdk/[siteKey]/config/route.ts"), "utf8");
  assert.match(config, /resolveWebsiteConsentContext/);
  assert.doesNotMatch(config, /searchParams\.get\(["']organizationId["']\)/);
}

console.log("regulation-engine.test.cjs passed");
