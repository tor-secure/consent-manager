const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function compact(source) {
  return source.replace(/\s+/g, " ");
}

function assertIncludes(source, expected, label) {
  assert.ok(
    source.includes(expected),
    `${label} is missing required source fragment: ${expected}`,
  );
}

function assertMatches(source, pattern, label) {
  assert.match(source, pattern, `${label} is missing required pattern: ${pattern}`);
}

function assertAuthenticated(relativePath) {
  const source = read(relativePath);
  const oneLine = compact(source);
  assertIncludes(source, 'auth()'.replace("'", ""), `${relativePath} auth call`);
  assertMatches(
    oneLine,
    /!isAuthenticated\s*\|\|\s*!userId(?:\s*\|\|\s*!orgId)?/,
    `${relativePath} rejects unauthenticated users`,
  );
  assertIncludes(oneLine, "status: 401", `${relativePath} unauthorized response`);
  assertMatches(
    source,
    /resolveLocalUser\(userId\)|eq\(users\.clerkUserId,\s*userId\)/,
    `${relativePath} local user lookup`,
  );
  assertMatches(
    source,
    /resolveLocalOrganization\(orgId\)|eq\(\s*organizations\.clerkOrganizationId,\s*orgId\s*,?\s*\)/,
    `${relativePath} local org lookup`,
  );
  assertMatches(
    source,
    /resolveActiveMembership\((organization|localOrg)\.id,\s*localUser\.id\)|eq\(memberships\.userId,\s*(user|localUser)\.id\)/,
    `${relativePath} user-scoped active membership`,
  );
  assertMatches(oneLine, /status:\s*403/, `${relativePath} forbidden response`);
  return { source, oneLine };
}

function assertOwnerAdminOnly(relativePath) {
  const { source, oneLine } = assertAuthenticated(relativePath);
  assertMatches(
    source,
    /(Owner|Admin)/,
    `${relativePath} declares an Owner/Admin authorization gate`,
  );
  assertMatches(
    oneLine,
    /roleName|AUTHORIZED_ROLES|AUTHORIZED_ADMIN_ROLES|allowedRoles/,
    `${relativePath} checks the caller role`,
  );
}

function assertOrgPredicate(relativePath, tableName) {
  const { oneLine } = assertAuthenticated(relativePath);
  assertMatches(
    oneLine,
    new RegExp(
      `eq\\(${tableName}\\.organizationId,\\s*organization\\.id\\)|organizationId:\\s*organization\\.id`,
    ),
    `${relativePath} scopes ${tableName} to the active organization`,
  );
}

function assertWebsiteOwnership(relativePath) {
  const { oneLine } = assertAuthenticated(relativePath);
  assertMatches(
    oneLine,
    /eq\(websites\.organizationId,\s*(organization|localOrg|ctx)\.id\)|eq\(websites\.organizationId,\s*ctx\.organizationId\)|where\(eq\(websites\.organizationId,\s*organization\.id\)\)/,
    `${relativePath} scopes website access through the active organization`,
  );
}

const authenticatedOrgRoutes = [
  ["src/app/api/websites/route.ts", "websites"],
  ["src/app/api/websites/[id]/route.ts", "websites"],
  ["src/app/api/purposes/route.ts", "purposes"],
  ["src/app/api/vendors/route.ts", "vendors"],
  ["src/app/api/api-keys/route.ts", "apiKeys"],
  ["src/app/api/api-keys/[id]/route.ts", "apiKeys"],
  ["src/app/api/webhooks/endpoints/route.ts", "webhookEndpoints"],
  ["src/app/api/webhooks/endpoints/[id]/route.ts", "webhookEndpoints"],
];

for (const [route, table] of authenticatedOrgRoutes) {
  assertOrgPredicate(route, table);
}

{
  const { oneLine } = assertAuthenticated("src/app/api/regulations/route.ts");
  assertMatches(
    oneLine,
    /resolveActiveMembership\(organization\.id,\s*localUser\.id\)/,
    "regulation catalog is authenticated and membership-scoped",
  );
}

for (const route of [
  "src/app/api/policies/route.ts",
  "src/app/api/policies/[id]/publish/route.ts",
  "src/app/api/policies/[id]/banner-config/route.ts",
  "src/app/api/scanner/run/route.ts",
  "src/app/api/scanner/[scanId]/route.ts",
  "src/app/api/websites/[id]/scan-schedule/route.ts",
  "src/app/api/integrations/connect/route.ts",
  "src/app/api/integrations/[id]/disconnect/route.ts",
  "src/app/api/websites/[id]/consent-integrations/route.ts",
  "src/app/api/websites/[id]/jurisdiction-rules/route.ts",
]) {
  assertWebsiteOwnership(route);
}

{
  const { oneLine } = assertAuthenticated("src/app/api/search/route.ts");
  assertMatches(
    oneLine,
    /eq\(websites\.organizationId,\s*organization\.id\)/,
    "dashboard search websites are organization scoped",
  );
  assertMatches(
    oneLine,
    /eq\(purposes\.organizationId,\s*organization\.id\)/,
    "dashboard search purposes are organization scoped",
  );
  assertMatches(
    oneLine,
    /eq\(vendors\.organizationId,\s*organization\.id\)/,
    "dashboard search vendors are organization scoped",
  );
}

for (const route of [
  "src/app/api/policies/[id]/purposes/route.ts",
  "src/app/api/policies/[id]/purposes/[purposeId]/route.ts",
]) {
  const { oneLine } = assertAuthenticated(route);
  assertMatches(
    oneLine,
    /inArray\(consentPolicies\.websiteId,\s*websiteIds\)|eq\(websites\.organizationId,\s*organization\.id\)/,
    `${route} verifies policy ownership through org websites`,
  );
  assertMatches(
    oneLine,
    /eq\(purposes\.organizationId,\s*(ctx\.organizationId|organization\.id)\)/,
    `${route} prevents attaching or detaching purposes from another organization`,
  );
}

for (const route of [
  "src/app/api/vendors/[id]/purposes/route.ts",
  "src/app/api/vendors/[id]/purposes/[purposeId]/route.ts",
]) {
  const { oneLine } = assertAuthenticated(route);
  assertMatches(
    oneLine,
    /eq\(vendors\.organizationId,\s*organization\.id\)/,
    `${route} verifies vendor ownership`,
  );
  assertMatches(
    oneLine,
    /eq\(purposes\.organizationId,\s*organization\.id\)/,
    `${route} prevents cross-organization purpose attachment`,
  );
}

{
  const { oneLine } = assertAuthenticated("src/app/api/consent/evidence/[consentId]/route.ts");
  assertMatches(
    oneLine,
    /eq\(consentRecords\.organizationId,\s*organization\.id\)/,
    "consent evidence cannot read another organization's consent record",
  );
}

{
  const { oneLine } = assertAuthenticated("src/app/api/notifications/[id]/read/route.ts");
  assertMatches(
    oneLine,
    /eq\(notifications\.organizationId,\s*organization\.id\).*notifications\.userId.*localUser\.id/,
    "notification read is scoped to the active organization and user",
  );
}

{
  const { oneLine } = assertAuthenticated("src/app/api/notifications/read-all/route.ts");
  assertMatches(
    oneLine,
    /eq\(notifications\.organizationId,\s*organization\.id\).*notifications\.userId.*localUser\.id/,
    "notification bulk read is scoped to the active organization and user",
  );
}

assertOwnerAdminOnly("src/app/api/settings/organization/route.ts");
assertOwnerAdminOnly("src/app/api/settings/team/role/route.ts");
assertOwnerAdminOnly("src/app/api/settings/team/[memberId]/route.ts");
assertOwnerAdminOnly("src/app/api/settings/team/invite/route.ts");
assertOwnerAdminOnly("src/app/api/settings/rights-requests/[id]/route.ts");
assertOwnerAdminOnly("src/app/api/settings/retention/route.ts");
assertOwnerAdminOnly("src/app/api/settings/retention/purge/route.ts");

{
  const source = read("src/app/api/settings/rights-requests/[id]/route.ts");
  const oneLine = compact(source);
  assertMatches(
    oneLine,
    /eq\(dataPrincipalRequests\.organizationId,\s*organization\.id\)/,
    "rights request updates are organization scoped",
  );
}

{
  const source = read("src/app/dashboard/audit-logs/page.tsx");
  const oneLine = compact(source);
  assertMatches(
    oneLine,
    /eq\(auditLogs\.organizationId,\s*(organization|localOrg)\.id\)/,
    "audit log reads are organization scoped",
  );
}

{
  const source = read("src/app/dashboard/trackers/page.tsx");
  const oneLine = compact(source);
  assertMatches(
    oneLine,
    /eq\(websites\.organizationId,\s*(organization|localOrg)\.id\)/,
    "tracker reads are scoped through organization-owned websites",
  );
  assertMatches(
    oneLine,
    /inArray\(trackers\.websiteId,\s*websiteIds\)/,
    "tracker rows cannot be read outside the active organization's websites",
  );
}

{
  const source = read("src/app/dashboard/consent/page.tsx");
  const oneLine = compact(source);
  assertMatches(
    oneLine,
    /eq\(websites\.organizationId,\s*(organization|localOrg)\.id\).*inArray\(consentRecords\.websiteId,\s*websiteIds\)/,
    "consent record list reads are scoped through organization-owned websites",
  );
}

for (const route of [
  "src/app/api/monitoring/findings/route.ts",
  "src/app/api/monitoring/findings/[id]/route.ts",
  "src/app/api/monitoring/findings/[id]/review/route.ts",
  "src/app/api/monitoring/findings/[id]/resolve/route.ts",
  "src/app/api/monitoring/run/route.ts",
  "src/app/api/monitoring/quality/route.ts",
  "src/app/api/monitoring/risk/route.ts",
  "src/app/api/monitoring/pages/route.ts",
]) {
  const { oneLine } = assertAuthenticated(route);
  assertMatches(
    oneLine,
    /eq\(privacyFindings\.organizationId,\s*organization\.id\)|eq\(websites\.organizationId,\s*organization\.id\)/,
    `${route} scopes monitoring access to the active organization`,
  );
}

{
  const { oneLine } = assertAuthenticated("src/app/api/monitoring/run/route.ts");
  assertMatches(
    oneLine,
    /eq\(websites\.id,\s*websiteId\).*eq\(websites\.organizationId,\s*organization\.id\)|eq\(websites\.organizationId,\s*organization\.id\)/,
    "manual drift run verifies website ownership",
  );
}

{
  const source = read("src/app/dashboard/monitoring/page.tsx");
  const oneLine = compact(source);
  assertMatches(
    oneLine,
    /eq\(privacyFindings\.organizationId,\s*organizationId\)/,
    "monitoring dashboard lists findings for the active organization only",
  );
}

{
  const risk = compact(read("src/app/dashboard/risk/page.tsx"));
  assertMatches(
    risk,
    /loadOrgRiskSnapshot\(organizationId/,
    "privacy risk dashboard loads findings for the active organization only",
  );
}

{
  const quality = compact(read("src/app/dashboard/quality/page.tsx"));
  assertMatches(
    quality,
    /eq\(websites\.organizationId,\s*organizationId\)/,
    "consent quality dashboard lists organization-owned websites only",
  );
}

{
  const { oneLine } = assertAuthenticated("src/app/api/analytics/consent/route.ts");
  assertMatches(
    oneLine,
    /loadConsentAnalytics\(organization\.id/,
    "consent analytics API is scoped to the active organization",
  );
  assert.doesNotMatch(
    oneLine,
    /searchParams\.get\(["']organizationId["']\)/,
    "consent analytics API must not trust a client-supplied organizationId",
  );
}

{
  const source = read("src/app/dashboard/analytics/page.tsx");
  const oneLine = compact(source);
  assertMatches(
    oneLine,
    /loadConsentAnalytics\(localOrg\.id/,
    "analytics dashboard loads metrics for the active organization only",
  );
}

{
  const source = read("src/app/api/cron/scans/route.ts");
  assert.doesNotMatch(source, /auth\(\)/, "scheduled scan cron must not use a dashboard Clerk session");
  assertIncludes(source, "authorizeCronRequest", "scheduled scan cron authenticates with a server secret");
  assertIncludes(source, "runDueScheduledScans", "scheduled scan cron executes due scans");
}

{
  const source = read("src/lib/scanner/run-due-scans.ts");
  assertIncludes(source, "eq(websiteScanSchedules.organizationId, input.organizationId)", "schedule updates stay tenant scoped");
  assertIncludes(source, "assertSafeScanUrl", "scheduled scans reuse SSRF protection");
}

console.log("tenant isolation regression tests passed");

