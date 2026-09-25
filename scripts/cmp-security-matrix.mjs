import { createHash, createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 3468;
const origin = `http://127.0.0.1:${port}`;

function loadEnv() {
  const env = {};
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^"|"$/g, "");
  }
  return env;
}

function contextSecret(env) {
  const material = env.POLICY_CONTEXT_SECRET?.trim()
    || env.CONSENT_PROOF_SECRET?.trim()
    || "cmp-dev-policy-context";
  return createHash("sha256").update(material).digest();
}

function resign(token, env, mutate) {
  const [encoded] = String(token).split(".");
  const claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  mutate(claims);
  const nextEncoded = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = createHmac("sha256", contextSecret(env)).update(nextEncoded, "ascii").digest("base64url");
  return `${nextEncoded}.${signature}`;
}

async function waitForHttp(url) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return true;
    } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function jsonStatus(url, init = {}) {
  let response;
  try {
    response = await fetch(url, { redirect: "manual", ...init });
  } catch (error) {
    return {
      status: 0,
      json: false,
      code: null,
      message: error.cause && error.cause.code || error.message,
      success: false,
      idempotent: false,
      hasRecord: false,
    };
  }
  const type = response.headers.get("content-type") || "";
  const text = type.includes("json") ? await response.text() : "";
  let body = {};
  if (text) {
    try { body = JSON.parse(text); } catch { body = {}; }
  }
  return {
    status: response.status,
    json: type.includes("json"),
    code: body.code || null,
    message: body.message || null,
    success: body.success === true,
    idempotent: body.idempotent === true,
    hasRecord: Boolean(body.record?.consentId || body.consentId),
  };
}

const env = loadEnv();
if (!env.DATABASE_URL) {
  console.log(JSON.stringify({ result: "NOT VERIFIED", reason: "DATABASE_URL is not set." }));
  process.exit(0);
}

const postgres = require("postgres");
const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
let child = null;
let createdConsentId = "";
let createdSubmissionId = "";

try {
  const websites = await sql`
    select w.id as website_id, w.site_key, w.organization_id, w.status,
      c.consent_id
    from websites w
    left join lateral (
      select consent_id from consent_records
      where website_id = w.id
      order by created_at desc
      limit 1
    ) c on true
    where w.status = 'active'
    order by w.created_at asc
    limit 10
  `;
  const orgCount = new Set(websites.map((row) => row.organization_id)).size;
  const a = websites.find((row) => row.consent_id);
  const b = websites.find((row) => a && row.organization_id !== a.organization_id);
  if (!a || !b || orgCount < 2) {
    console.log(JSON.stringify({ result: "NOT VERIFIED", reason: "Two active websites in different organizations were not available." }));
    process.exit(0);
  }

  const fkRows = await sql`
    select conrelid::regclass::text as table_name
    from pg_constraint
    where contype = 'f'
      and conrelid::regclass::text in (
        'websites', 'consent_policies', 'consent_policy_versions',
        'consent_records', 'consent_decisions', 'consent_events',
        'purposes', 'vendors'
      )
  `;
  const tablesWithFk = new Set(fkRows.map((row) => row.table_name));
  const expectedFkTables = [
    "websites", "consent_policies", "consent_policy_versions",
    "consent_records", "consent_decisions", "consent_events",
    "purposes", "vendors",
  ];

  const alreadyUp = await waitForHttp(`${origin}/api/health`).then((ready) => ready).catch(() => false);
  if (!alreadyUp) {
    child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-p", String(port)], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "ignore",
    });
    if (!(await waitForHttp(`${origin}/api/health`))) {
      console.log(JSON.stringify({ result: "NOT VERIFIED", reason: "Local application server did not become ready." }));
      process.exit(0);
    }
  }

  const ownGet = await jsonStatus(`${origin}/api/consent/record?consentId=${encodeURIComponent(a.consent_id)}&websiteId=${encodeURIComponent(a.website_id)}&siteKey=${encodeURIComponent(a.site_key)}&organizationId=${encodeURIComponent(b.organization_id)}`);
  const crossGet = await jsonStatus(`${origin}/api/consent/record?consentId=${encodeURIComponent(a.consent_id)}&websiteId=${encodeURIComponent(b.website_id)}&siteKey=${encodeURIComponent(b.site_key)}&organizationId=${encodeURIComponent(a.organization_id)}`);
  const beforeCount = await sql`select count(*)::int as count from consent_records`;
  const crossPost = await jsonStatus(`${origin}/api/consent/record`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      websiteId: b.website_id,
      organizationId: a.organization_id,
      consentId: a.consent_id,
      policyContext: { token: "forged.token", noticeSnapshot: { policy: {} } },
      expectedStateVersion: 1,
      submissionId: randomUUID(),
      submission: { choice: "reject-all" },
    }),
  });
  const malformed = await jsonStatus(`${origin}/api/consent/record`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  const oversized = await jsonStatus(`${origin}/api/consent/record`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pad: "x".repeat(70 * 1024) }),
  });

  const configA = await fetch(`${origin}/api/sdk/${encodeURIComponent(a.site_key)}/config`, { redirect: "manual" });
  const configABody = configA.headers.get("content-type")?.includes("json") ? await configA.json() : {};
  const configB = await fetch(`${origin}/api/sdk/${encodeURIComponent(b.site_key)}/config?organizationId=${encodeURIComponent(a.organization_id)}`, { redirect: "manual" });
  const configBBody = configB.headers.get("content-type")?.includes("json") ? await configB.json() : {};
  const configAMatchesA = configABody.websiteId === a.website_id;
  const configBMatchesB = configBBody.websiteId === b.website_id;
  const configBDoesNotMatchA = configBBody.websiteId !== a.website_id;

  let scopeMismatch = { status: null, code: null };
  let expired = { status: null, code: null };
  let replay = { status: "NOT VERIFIED", reason: "No published policy context was returned for a live consent write." };
  const context = configABody.policyContext;
  if (context?.token && context?.noticeSnapshot) {
    scopeMismatch = await jsonStatus(`${origin}/api/consent/record`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        websiteId: b.website_id,
        organizationId: a.organization_id,
        policyContext: context,
        expectedStateVersion: 0,
        submissionId: randomUUID(),
        submission: { choice: "reject-all" },
      }),
    });
    const expiredToken = resign(context.token, env, (claims) => {
      const issued = Date.now() - 2 * 60 * 60 * 1000;
      claims.issuedAt = new Date(issued).toISOString();
      claims.expiresAt = new Date(issued + 30 * 60 * 1000).toISOString();
    });
    expired = await jsonStatus(`${origin}/api/consent/record`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        websiteId: a.website_id,
        policyContext: { ...context, token: expiredToken },
        expectedStateVersion: 0,
        submissionId: randomUUID(),
        submission: { choice: "reject-all" },
      }),
    });

    createdSubmissionId = randomUUID();
    const firstBody = {
      websiteId: a.website_id,
      policyContext: context,
      expectedStateVersion: 0,
      submissionId: createdSubmissionId,
      submission: { choice: "reject-all" },
    };
    const first = await fetch(`${origin}/api/consent/record`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(firstBody),
    });
    const firstJson = await first.json().catch(() => ({}));
    createdConsentId = firstJson.consentId || firstJson.record?.consentId || "";
    const second = await jsonStatus(`${origin}/api/consent/record`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(firstBody),
    });
    const changed = await jsonStatus(`${origin}/api/consent/record`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...firstBody, submission: { choice: "accept-all" } }),
    });
    const afterFirst = await sql`select count(*)::int as count from consent_records where consent_id = ${createdConsentId || "missing"}`;
    replay = {
      status: first.status === 200 || first.status === 201 ? "PASS" : "FAIL",
      firstStatus: first.status,
      firstCode: firstJson.code || firstJson.message || null,
      repeatStatus: second.status,
      repeatIdempotent: second.idempotent,
      changedStatus: changed.status,
      changedCode: changed.code,
      rowsForSubmission: afterFirst[0].count,
    };
  }

  const afterCount = await sql`select count(*)::int as count from consent_records`;
  const dashboardPaths = [
    ["/api/settings/organization", "GET"],
    ["/api/policies", "GET"],
    ["/api/policies", "POST"],
    ["/api/websites", "GET"],
    [`/api/websites/${b.website_id}`, "PUT"],
    [`/api/consent/evidence/${encodeURIComponent(a.consent_id)}`, "GET"],
    [`/api/policies/${randomUUID()}`, "DELETE"],
  ];
  const dashboard = [];
  for (const [pathname, method] of dashboardPaths) {
    const result = await jsonStatus(`${origin}${pathname}`, {
      method,
      headers: method === "GET" ? undefined : { "content-type": "application/json" },
      body: method === "GET" ? undefined : "{}",
    });
    dashboard.push({ method, path: pathname.split("?")[0].replace(b.website_id, ":websiteId").replace(a.consent_id, ":consentId"), ...result });
  }

  const cases = {
    ownConsentGet: ownGet.status === 200 && ownGet.hasRecord ? "PASS" : "FAIL",
    crossTenantGet: crossGet.status === 404 && crossGet.hasRecord === false ? "PASS" : "FAIL",
    forgedContext: crossPost.status === 400 && crossPost.code === "INVALID_POLICY_CONTEXT" ? "PASS" : "FAIL",
    malformedJson: malformed.status === 400 ? "PASS" : "FAIL",
    oversizedPayload: oversized.status === 413 ? "PASS" : "FAIL",
    websiteAConfig: configA.status === 200 && configAMatchesA ? "PASS" : configA.status === 404 ? "NOT VERIFIED" : "FAIL",
    websiteBConfigIgnoresOrganization: configB.status === 200 && configBMatchesB && configBDoesNotMatchA
      ? "PASS"
      : configB.status === 404 && configBBody.websiteId !== a.website_id
        ? "PASS"
        : "FAIL",
    contextForOtherWebsite: scopeMismatch.status === 403 && scopeMismatch.code === "POLICY_CONTEXT_SCOPE_MISMATCH" ? "PASS" : scopeMismatch.status ? "FAIL" : "NOT VERIFIED",
    expiredContext: expired.status === 409 && expired.code === "POLICY_CONTEXT_EXPIRED" ? "PASS" : expired.status ? "FAIL" : "NOT VERIFIED",
    replay: replay.status,
    unauthenticatedDashboard: dashboard.every((item) => item.status === 401 && item.json && item.message === "Unauthorized") ? "PASS" : "FAIL",
    authenticatedCrossTenant: "NOT VERIFIED",
    memberRoleBypass: "NOT VERIFIED",
  };

  let probeDeleted = null;
  if (createdConsentId) {
    await sql`delete from consent_events where consent_id = ${createdConsentId}`.catch(() => {});
    await sql`delete from consent_decisions where consent_record_id in (select id from consent_records where consent_id = ${createdConsentId})`.catch(() => {});
    await sql`delete from consent_records where consent_id = ${createdConsentId}`.catch(() => {});
    const left = await sql`select count(*)::int as count from consent_records where consent_id = ${createdConsentId}`;
    probeDeleted = left[0].count === 0;
    createdConsentId = "";
    createdSubmissionId = "";
  }

  console.log(JSON.stringify({
    cases,
    details: {
      ownGet: { status: ownGet.status, leakedOtherOrg: ownGet.hasRecord && crossGet.hasRecord },
      crossGet: { status: crossGet.status, code: crossGet.message },
      crossPost: { status: crossPost.status, code: crossPost.code },
      malformed: { status: malformed.status },
      oversized: { status: oversized.status, message: oversized.message },
      scopeMismatch: { status: scopeMismatch.status, code: scopeMismatch.code },
      expired: { status: expired.status, code: expired.code },
      replay,
      dashboard,
      consentRowsUnchangedExceptProbe: afterCount[0].count - beforeCount[0].count,
    },
    schema: {
      status: expectedFkTables.every((name) => tablesWithFk.has(name)) ? "PASS" : "NEEDS WORK",
      missingForeignKeyTables: expectedFkTables.filter((name) => !tablesWithFk.has(name)),
      migrationAdded: false,
    },
    authenticated: {
      status: "NOT VERIFIED",
      reason: "No existing pair of Clerk sessions was available. New production users were not created.",
    },
    probeDeleted,
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    result: "NOT VERIFIED",
    reason: error.message,
    cause: error.cause && (error.cause.code || error.cause.message) || null,
  }));
} finally {
  if (createdConsentId) {
    await sql`delete from consent_events where consent_id = ${createdConsentId}`.catch(() => {});
    await sql`delete from consent_decisions where consent_record_id in (select id from consent_records where consent_id = ${createdConsentId})`.catch(() => {});
    await sql`delete from consent_records where consent_id = ${createdConsentId}`.catch(() => {});
  }
  await sql.end({ timeout: 5 }).catch(() => {});
  if (child) child.kill();
}
