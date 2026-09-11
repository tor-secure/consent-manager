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
    /(Owner|Admin)|requireOperatorRole/,
    `${relativePath} declares an Owner/Admin authorization gate`,
  );
  assertMatches(
    oneLine,
    /roleName|AUTHORIZED_ROLES|AUTHORIZED_ADMIN_ROLES|allowedRoles|requireOperatorRole/,
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
  const http = compact(read("src/lib/processing/http.ts"));
  assertMatches(http, /!isAuthenticated\s*\|\|\s*!userId/, "processing auth rejects unauthenticated users");
  assertIncludes(http, "status: 401", "processing auth returns unauthorized");
  assertIncludes(http, "status: 403", "processing auth returns forbidden");
  assertIncludes(http, "resolveLocalOrganization(orgId)", "processing auth resolves the session organization");
  assertIncludes(http, "eq(vendors.organizationId, organizationId)", "vendor lookup is organization scoped");
  assertIncludes(http, "eq(processingActivities.organizationId, organizationId)", "processing activity lookup is organization scoped");
  assertIncludes(http, "eq(crossBorderTransfers.organizationId, organizationId)", "transfer lookup is organization scoped");
  assertIncludes(http, "eq(vendorRelationships.organizationId, organizationId)", "vendor relationship lookup is organization scoped");
  assert.doesNotMatch(http, /body.organizationId/, "processing helpers must not trust a client-supplied organizationId");
}

for (const [route, loader, notFound] of [
  ["src/app/api/vendors/[id]/route.ts", "loadOwnedVendorRecord", "Vendor not found"],
  ["src/app/api/processing-activities/[id]/route.ts", "loadOwnedActivity", "Processing activity not found"],
  ["src/app/api/transfers/[id]/route.ts", "loadOwnedTransfer", "Transfer not found"],
  ["src/app/api/vendors/[id]/relationships/route.ts", "loadOwnedVendorRecord", "Vendor not found"],
]) {
  const source = compact(read(route));
  assertIncludes(source, "authorizeProcessingOrganization()", `${route} uses shared processing authorization`);
  assertIncludes(source, `${loader}(authz.organization.id`, `${route} loads the resource through the session organization`);
  assertIncludes(source, notFound, `${route} returns 404 for another tenant's resource`);
  assertIncludes(source, "status: 404", `${route} uses a 404 status for missing or cross-tenant ids`);
}

{
  const source = compact(read("src/app/api/settings/rights-requests/[id]/downstream/route.ts"));
  assertIncludes(source, "authorizeRightsOrganization()", "downstream DSAR uses shared rights authorization");
  assertIncludes(source, "requireRightsManager", "downstream DSAR updates require Owner/Admin");
  assertIncludes(source, "loadOwnedRightsRequest(authz.organization.id", "downstream DSAR loads the request through the session organization");
  assertIncludes(source, "loadOwnedVendorRecord(authz.organization.id", "downstream DSAR cannot attach another tenant's vendor");
  assertIncludes(source, "eq(rightsDownstreamActions.organizationId, authz.organization.id)", "downstream DSAR rows are organization scoped");
}

{
  const source = compact(read("src/app/api/policies/[id]/publish/route.ts"));
  assertIncludes(source, "ignoreClientComplianceClaims(body)", "policy publish ignores client-forged validation claims");
  assertIncludes(source, "authorizeOwnedPolicy(policyId)", "policy publish authorizes the policy through the session organization");
  assert.doesNotMatch(source, /body.validated/, "policy publish must not trust client validated flags");
  assert.doesNotMatch(source, /body.organizationId/, "policy publish must not trust a client-supplied organizationId");
}

{
  const { oneLine } = assertAuthenticated("src/app/api/consent/evidence/[consentId]/route.ts");
  assertMatches(
    oneLine,
    /eq\(consentRecords\.organizationId,\s*organization\.id\)/,
    "consent evidence cannot read another organization's consent record",
  );
  assertMatches(
    oneLine,
    /eq\(consentEvidenceSnapshots\.organizationId,\s*organization\.id\)/,
    "consent evidence history is scoped to the active organization",
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
assertOwnerAdminOnly("src/app/api/api-keys/route.ts");
assertOwnerAdminOnly("src/app/api/api-keys/[id]/route.ts");
assertOwnerAdminOnly("src/app/api/webhooks/endpoints/route.ts");
assertOwnerAdminOnly("src/app/api/webhooks/endpoints/[id]/route.ts");
assertOwnerAdminOnly("src/app/api/scanner/run/route.ts");
assertOwnerAdminOnly("src/app/api/integrations/connect/route.ts");
assert.match(
  read("src/app/api/policies/[id]/publish/route.ts"),
  /requireOperatorRole/,
  "policy publish is Owner/Admin gated",
);
{
  const source = compact(read("src/app/api/settings/rights-requests/[id]/route.ts"));
  assertIncludes(source, "authorizeRightsOrganization()", "rights request PATCH uses shared rights authorization");
  assertIncludes(source, "requireRightsManager", "rights request status changes require Owner/Admin");
}
{
  const http = compact(read("src/lib/retention/http.ts"));
  assertMatches(http, /!isAuthenticated\s*\|\|\s*!userId/, "retention auth rejects unauthenticated users");
  assertIncludes(http, "status: 401", "retention auth returns unauthorized");
  assertIncludes(http, "status: 403", "retention auth returns forbidden");
  assertIncludes(http, "resolveLocalOrganization(orgId)", "retention auth resolves the session organization");
  assertIncludes(http, "eq(legalHolds.organizationId, organizationId)", "legal hold lookup is organization scoped");
  assertIncludes(http, "eq(consentEvidenceSnapshots.organizationId, input.organizationId)", "evidence holds cannot target another tenant");
  assertIncludes(http, "eq(consentRecords.organizationId, input.organizationId)", "consent-record holds cannot target another tenant");
  assert.doesNotMatch(http, /body\.organizationId/, "retention helpers must not trust a client-supplied organizationId");
  for (const route of [
    "src/app/api/settings/retention/route.ts",
    "src/app/api/settings/retention/purge/route.ts",
    "src/app/api/settings/legal-holds/route.ts",
    "src/app/api/settings/legal-holds/[id]/route.ts",
  ]) {
    const source = compact(read(route));
    assertIncludes(source, "authorizeRetentionOrganization()", `${route} uses shared retention authorization`);
    assertMatches(source, /Owner|Admin/, `${route} declares an Owner/Admin authorization gate`);
  }
}

{
  const source = compact(read("src/app/api/settings/legal-holds/route.ts"));
  assertIncludes(source, "assertOwnedRetentionResource", "legal hold creation verifies resource ownership");
  assertIncludes(source, "eq(legalHolds.organizationId, authz.organization.id)", "legal hold list is scoped to the authenticated organization");
}

{
  const source = compact(read("src/app/api/settings/legal-holds/[id]/route.ts"));
  assertIncludes(source, "loadOwnedLegalHold(authz.organization.id", "legal hold release is organization scoped");
}

{
  const source = compact(read("src/app/api/settings/retention/purge/route.ts"));
  assertIncludes(source, "runRetentionCleanup", "retention purge uses the shared cleanup service");
  assertIncludes(source, "organizationId: authz.organization.id", "retention purge is scoped to the authenticated organization");
}

{
  const source = read("src/app/api/settings/rights-requests/[id]/route.ts");
  const oneLine = compact(source);
  assertIncludes(oneLine, "loadOwnedRightsRequest(authz.organization.id", "rights request mutations load the org-owned request");
  assert.doesNotMatch(oneLine, /body\.organizationId/, "rights request mutations must not trust a client organizationId");
}

{
  const http = compact(read("src/lib/privacy-rights/http.ts"));
  assertIncludes(http, "resolveLocalOrganization(orgId)", "rights auth resolves the session organization");
  assertIncludes(http, "eq(dataPrincipalRequests.organizationId, organizationId)", "rights request lookup is organization scoped");
}

for (const route of [
  "src/app/api/settings/rights-requests/[id]/export/route.ts",
  "src/app/api/settings/rights-requests/[id]/deletion/route.ts",
  "src/app/api/settings/rights-requests/[id]/correction/route.ts",
  "src/app/api/settings/rights-requests/[id]/withdraw/route.ts",
]) {
  const source = compact(read(route));
  assertIncludes(source, "authorizeRightsOrganization()", `${route} uses shared rights authorization`);
  assertIncludes(source, "loadOwnedRightsRequest(authz.organization.id", `${route} is organization scoped`);
  assertMatches(source, /Owner|Admin|requireRightsManager/, `${route} declares an Owner/Admin authorization gate`);
  assert.doesNotMatch(source, /body\.organizationId/, `${route} must not trust a client organizationId`);
}

{
  const source = compact(read("src/app/api/settings/rights-requests/[id]/export/[exportId]/route.ts"));
  assertIncludes(source, "loadOwnedExport", "export download requires an org-owned export");
  assertIncludes(source, "organizationId: authz.organization.id", "export download is organization scoped");
}

{
  const http = compact(read("src/lib/compliance/http.ts"));
  assertIncludes(http, "resolveLocalOrganization(orgId)", "policy compliance auth resolves the session organization");
  assertIncludes(http, "eq(websites.organizationId, organization.id)", "policy compliance lookup is organization scoped");
  assert.doesNotMatch(http, /body\.organizationId/, "policy compliance must not trust a client organizationId");
  for (const route of [
    "src/app/api/policies/[id]/publish/route.ts",
    "src/app/api/policies/[id]/validate/route.ts",
  ]) {
    const source = compact(read(route));
    assertIncludes(source, "authorizeOwnedPolicy(policyId)", `${route} uses shared policy authorization`);
    assertIncludes(source, "ignoreClientComplianceClaims", `${route} ignores client compliance claims`);
    assert.doesNotMatch(source, /body\.validated|body\.organizationId|body\.jurisdiction/, `${route} must not trust client compliance fields`);
  }
}

{
  const source = compact(read("src/app/api/rights-request/verify/route.ts"));
  assert.doesNotMatch(source, /organizationId/, "public verification does not accept a client organizationId");
  assertIncludes(source, "rateLimit", "public verification is rate limited");
}

{
  const source = compact(read("src/app/dashboard/rights-requests/[id]/page.tsx"));
  assertIncludes(source, "eq(auditLogs.organizationId, localOrg.id)", "rights activity is organization scoped");
  assertIncludes(source, 'eq(auditLogs.resourceType, "data_principal_request")', "rights activity is request scoped");
  assertIncludes(source, "eq(auditLogs.resourceId, request.id)", "rights activity cannot read another request");
}

{
  const service = compact(read("src/lib/privacy-rights/service.ts"));
  assertIncludes(service, "verificationAllowedForRequest(request.status)", "cancelled requests cannot be verified");
  assertIncludes(service, "eq(consentRecords.organizationId, input.organizationId)", "DSAR withdrawal is tenant scoped");
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

{
  const http = compact(read("src/lib/trackers/http.ts"));
  assertMatches(http, /!isAuthenticated\s*\|\|\s*!userId/, "tracker auth rejects unauthenticated users");
  assertIncludes(http, "status: 401", "tracker auth returns unauthorized");
  assertIncludes(http, "status: 403", "tracker auth returns forbidden");
  assertIncludes(http, "eq(websites.organizationId, organizationId)", "tracker helpers scope websites to the active organization");
  assertIncludes(http, "eq(vendors.organizationId, organizationId)", "tracker helpers reject vendors from another organization");
  assertIncludes(http, "eq(purposes.organizationId, organizationId)", "tracker helpers reject purposes from another organization");
  assertIncludes(http, "eq(trackers.id, trackerId)", "tracker helpers load a specific tracker id");
  for (const route of [
    "src/app/api/trackers/route.ts",
    "src/app/api/trackers/[id]/route.ts",
    "src/app/api/trackers/[id]/map/route.ts",
    "src/app/api/trackers/[id]/classify/route.ts",
    "src/app/api/trackers/unmapped/route.ts",
  ]) {
    const source = compact(read(route));
    assertIncludes(source, "authorizeTrackerOrganization()", `${route} uses shared tracker authorization`);
    assertMatches(
      source,
      /eq\(websites\.organizationId,\s*(authz\.)?organization\.id\)|loadOwnedWebsite\(|loadOwnedTracker\(/,
      `${route} cannot access another tenant's trackers`,
    );
  }
}

{
  const eventsSchema = read("src/db/schema/consent-events.ts");
  assertIncludes(eventsSchema, 'onDelete: "set null"', "consent events do not cascade-delete with current consent records");
  assertIncludes(eventsSchema, "organizationId", "consent events keep tenant identity after current-state deletion");
}

{
  const evidenceSchema = compact(read("src/db/schema/consent-evidence-snapshots.ts"));
  assertMatches(
    evidenceSchema,
    /consentRecordId:\s*uuid\("consent_record_id"\)[,}]/,
    "historical evidence consent_record_id is informational and nullable",
  );
}

{
  const cleanup = read("src/lib/retention/cleanup.ts");
  assert.doesNotMatch(cleanup, /delete\(consentEvidenceSnapshots\)/, "retention cleanup never deletes historical evidence");
  assertIncludes(cleanup, "eq(consentRecords.organizationId, input.organizationId)", "current-state cleanup is tenant scoped");
}

{
  const evidenceRoute = read("src/app/api/consent/evidence/[consentId]/route.ts");
  assert.doesNotMatch(evidenceRoute, /export async function PATCH/, "ordinary users cannot patch evidence");
  assert.doesNotMatch(evidenceRoute, /export async function DELETE/, "ordinary users cannot delete evidence");
}

{
  assertOwnerAdminOnly("src/app/api/websites/[id]/child-protection/route.ts");
  assertWebsiteOwnership("src/app/api/websites/[id]/child-protection/route.ts");
  assertOwnerAdminOnly("src/app/api/websites/[id]/child-protection/attest/route.ts");
  const age = compact(read("src/app/api/age-assurance/route.ts"));
  assertMatches(age, /eq\(websites\.id, websiteId\).*eq\(websites\.siteKey, siteKey\)|eq\(websites\.siteKey, siteKey\)/, "age assurance binds siteKey to website");
  assert.doesNotMatch(age, /body\.organizationId/, "age assurance ignores client organizationId");
  const verify = compact(read("src/app/api/guardian-consent/verify/route.ts"));
  assertIncludes(verify, "verifyGuardianToken", "guardian verify uses hashed server tokens");
  const service = read("src/lib/children/service.ts");
  assertIncludes(service, "eq(ageAssuranceSessions.organizationId, input.organizationId)", "age sessions stay tenant scoped");
  assertIncludes(service, "eq(ageAssuranceSessions.websiteId, input.websiteId)", "staff attest is website scoped");
  assert.doesNotMatch(service, /guardianVerified:\s*true/, "server does not accept a client guardianVerified flag");
}

console.log("tenant isolation regression tests passed");

