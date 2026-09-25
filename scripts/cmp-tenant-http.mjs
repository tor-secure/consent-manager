import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 3467;
const origin = `http://127.0.0.1:${port}`;

function loadEnv() {
  const envPath = path.join(root, ".env");
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^"|"$/g, "");
  }
  return env;
}

async function waitForHttp(url) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return true;
    } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

const env = loadEnv();
if (!env.DATABASE_URL) {
  console.log(JSON.stringify({ result: "NOT VERIFIED", reason: "DATABASE_URL is not set." }));
  process.exit(0);
}

const postgres = require("postgres");
const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
let child = null;
const created = { policyId: null, versionId: null, consentId: null };

try {
  const websites = await sql`
    select w.organization_id, w.id as website_id, w.site_key,
      c.consent_id, p.policy_id, v.policy_version_id
    from websites w
    left join lateral (
      select consent_id from consent_records
      where website_id = w.id
      order by created_at desc
      limit 1
    ) c on true
    left join lateral (
      select id as policy_id from consent_policies
      where website_id = w.id and deleted_at is null
      order by created_at desc
      limit 1
    ) p on true
    left join lateral (
      select id as policy_version_id from consent_policy_versions
      where policy_id = p.policy_id
      order by created_at desc
      limit 1
    ) v on true
    order by w.created_at asc
    limit 10
  `;
  const orgCount = new Set(websites.map((row) => row.organization_id)).size;
  if (websites.length < 2 || orgCount < 2) {
    console.log(JSON.stringify({ result: "NOT VERIFIED", reason: "Fewer than two organizations with websites." }));
    process.exit(0);
  }
  const a = websites.find((row) => row.consent_id) || websites[0];
  const b = websites.find((row) => row.organization_id !== a.organization_id);
  if (!a?.consent_id) {
    console.log(JSON.stringify({ result: "NOT VERIFIED", reason: "Neither website has a consent record to exchange." }));
    process.exit(0);
  }
  if (!b.consent_id) {
    let policyId = b.policy_id;
    if (!policyId) {
      const [policy] = await sql`
        insert into consent_policies (website_id, name, status)
        values (${b.website_id}, 'cmp-isolation-probe', 'draft')
        returning id
      `;
      policyId = policy.id;
      created.policyId = policyId;
    }
    let versionId = b.policy_version_id;
    if (!versionId) {
      const [version] = await sql`
        insert into consent_policy_versions (policy_id, version, status, configuration, processing_snapshot, is_published)
        values (${policyId}, 1, 'draft', ${sql.json({})}, ${sql.json({})}, false)
        returning id
      `;
      versionId = version.id;
      created.versionId = versionId;
    }
    created.consentId = `cid_isolation_${randomUUID()}`;
    await sql`
      insert into consent_records (
        organization_id, website_id, policy_version_id, consent_id, status, state_version, source, consented_at, metadata
      ) values (
        ${b.organization_id}, ${b.website_id}, ${versionId},
        ${created.consentId}, 'accepted', 1, 'web', now(), ${sql.json({ probe: "cmp-isolation" })}
      )
    `;
    b.consent_id = created.consentId;
    b.policy_version_id = versionId;
  }

  child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-p", String(port)], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  const ready = await waitForHttp(`${origin}/api/health`);
  if (!ready) {
    console.log(JSON.stringify({ result: "NOT VERIFIED", reason: "Local application server did not become ready." }));
    process.exit(0);
  }

  const beforeCount = await sql`select count(*)::int as count from consent_records`;
  async function exchange(label, caller, target) {
    const getUrl = `${origin}/api/consent/record?consentId=${encodeURIComponent(target.consent_id)}&websiteId=${encodeURIComponent(caller.website_id)}&siteKey=${encodeURIComponent(caller.site_key)}&organizationId=${encodeURIComponent(target.organization_id)}`;
    const getResponse = await fetch(getUrl);
    const getBody = await getResponse.json().catch(() => ({}));
    const postResponse = await fetch(`${origin}/api/consent/record`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://attacker.example" },
      body: JSON.stringify({
        websiteId: caller.website_id,
        organizationId: target.organization_id,
        consentId: target.consent_id,
        expectedStateVersion: 1,
        submissionId: randomUUID(),
        submission: { choice: "reject-all" },
      }),
    });
    const postBody = await postResponse.json().catch(() => ({}));
    return {
      label,
      getStatus: getResponse.status,
      getLeaked: getBody.record?.consentId === target.consent_id,
      postStatus: postResponse.status,
      postCode: postBody.code || postBody.message || null,
    };
  }

  const attempts = [
    await exchange("A reads and writes B", a, b),
    await exchange("B reads and writes A", b, a),
  ];
  const same = await fetch(`${origin}/api/consent/record?consentId=${encodeURIComponent(a.consent_id)}&websiteId=${encodeURIComponent(a.website_id)}&siteKey=${encodeURIComponent(a.site_key)}`);
  const evidence = await fetch(`${origin}/api/consent/evidence/${encodeURIComponent(a.consent_id)}`);
  const evidenceText = await evidence.text();
  const websitesApi = await fetch(`${origin}/api/websites/${encodeURIComponent(b.website_id)}`);
  const websitesText = await websitesApi.text();
  const settingsApi = await fetch(`${origin}/api/settings/organization`);
  const settingsText = await settingsApi.text();
  function shape(response, text) {
    return {
      status: response.status,
      contentType: response.headers.get("content-type"),
      jsonUnauthorized: /"Unauthorized"/.test(text),
      html: /^\s*</.test(text),
    };
  }
  const afterCount = await sql`select count(*)::int as count from consent_records`;
  const eventTypes = await sql`
    select event_type, count(*)::int as count
    from consent_events
    group by event_type
    order by event_type
  `;

  console.log(JSON.stringify({
    result: attempts.every((item) => item.getStatus === 404 && item.getLeaked === false && item.postStatus >= 400) ? "PASS" : "FAIL",
    attempts,
    ownConsentGetStatus: same.status,
    unauthenticatedEvidence: shape(evidence, evidenceText),
    unauthenticatedOtherWebsite: shape(websitesApi, websitesText),
    unauthenticatedOrganizationSettings: shape(settingsApi, settingsText),
    consentRowCountUnchanged: beforeCount[0].count === afterCount[0].count,
    temporaryConsentCreated: Boolean(created.consentId),
    historicalEventTypes: eventTypes.map((row) => ({ type: row.event_type, count: row.count })),
    note: "Historical event counts were not produced by this browser session. Dashboard calls had no Clerk session.",
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ result: "NOT VERIFIED", reason: error.message }));
} finally {
  if (created.consentId) {
    await sql`delete from consent_records where consent_id = ${created.consentId}`.catch(() => {});
  }
  if (created.versionId) {
    await sql`delete from consent_policy_versions where id = ${created.versionId}`.catch(() => {});
  }
  if (created.policyId) {
    await sql`delete from consent_policies where id = ${created.policyId}`.catch(() => {});
  }
  await sql.end({ timeout: 5 }).catch(() => {});
  if (child) child.kill();
}
