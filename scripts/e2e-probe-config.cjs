const siteKey = "site_8bff235da012a007a3996e2c02e1085d5a4cf0ffb5e7f7b4";
const otherKey = "site_e8138f5cab02b69dec2a15175e0bb66b9af86fefc98242b7";
const origin = "http://localhost:3000";

function summarize(j) {
  if (!j || !j.success) return j;
  return {
    websiteId: j.websiteId,
    policy: j.policy,
    purposeKeys: (j.purposes || []).map((p) => p.key),
    purposes: (j.purposes || []).map((p) => ({
      id: p.id,
      key: p.key,
      required: p.isRequired ?? p.required ?? null,
    })),
    trackers: (j.trackerRules || []).map((t) => ({
      domain: t.domain,
      purposeKey: t.purposeKey,
      purposeId: t.purposeId,
      cookieNames: t.cookieNames,
      isEssential: t.isEssential,
      patterns: t.patterns,
    })),
    enforcement: j.trackerEnforcement,
    hasSecrets: /sk_live|sk_test|STRIPE_SECRET|DATABASE_URL|CLERK_SECRET_KEY|postgres:\/\//i.test(
      JSON.stringify(j),
    ),
  };
}

(async () => {
  const valid = await fetch(`${origin}/api/sdk/${siteKey}/config`);
  const validJson = await valid.json();
  console.log("valid", valid.status, JSON.stringify(summarize(validJson), null, 2));

  const hash = validJson.policy && validJson.policy.configHash;
  const etagRes = await fetch(`${origin}/api/sdk/${siteKey}/config`, {
    headers: { "If-None-Match": `"${hash}"` },
  });
  console.log("etag-match", etagRes.status, etagRes.headers.get("etag"), etagRes.headers.get("cache-control"));

  const invalid = await fetch(
    `${origin}/api/sdk/site_deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef/config`,
  );
  console.log("invalid", invalid.status, await invalid.json());

  const other = await fetch(`${origin}/api/sdk/${otherKey}/config`);
  const otherJson = await other.json();
  console.log("other", other.status, {
    websiteId: otherJson.websiteId,
    policyId: otherJson.policy && otherJson.policy.id,
    sameAsValid: otherJson.websiteId === validJson.websiteId,
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
