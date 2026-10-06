import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { db } from "@/db";
import { consentSessions } from "@/db/schema/consent-sessions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { websites } from "@/db/schema/websites";
import { createConsentSession } from "@/lib/consent-session";

export async function GET(request: Request) {
  try { const context = await requireDashboardContext(); const websiteId = new URL(request.url).searchParams.get("websiteId"); const rows = await db.select({ session: consentSessions, websiteName: websites.name }).from(consentSessions).innerJoin(websites, eq(consentSessions.websiteId, websites.id)).where(and(eq(consentSessions.organizationId, context.organization.id), ...(websiteId ? [eq(consentSessions.websiteId, websiteId)] : []))).orderBy(desc(consentSessions.createdAt)).limit(100); return NextResponse.json({ success: true, sessions: rows.map(({ session, websiteName }) => ({ id: session.id, websiteId: session.websiteId, websiteName, consentRecordId: session.consentRecordId, policyVersionId: session.policyVersionId, status: session.expiresAt <= new Date() && session.status === "active" ? "expired" : session.status, decisionCount: session.decisionCount, expiresAt: session.expiresAt, revokedAt: session.revokedAt, createdAt: session.createdAt })) }); }
  catch { return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }); }
}
const createSchema = z.object({ websiteId: z.string().uuid(), policyVersionId: z.string().uuid().optional() });
export async function POST(request: Request) {
  try { const context = await requireDashboardContext(); const input = createSchema.safeParse(await request.json()); if (!input.success) return NextResponse.json({ success: false, message: "Invalid session request" }, { status: 400 }); const versions = await db.select({ versionId: consentPolicyVersions.id }).from(consentPolicyVersions).innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id)).innerJoin(websites, eq(consentPolicies.websiteId, websites.id)).where(and(eq(websites.id, input.data.websiteId), eq(websites.organizationId, context.organization.id), eq(consentPolicies.status, "active"), eq(consentPolicyVersions.isPublished, true), ...(input.data.policyVersionId ? [eq(consentPolicyVersions.id, input.data.policyVersionId)] : []))).orderBy(desc(consentPolicyVersions.version)).limit(1); if (!versions[0]) return NextResponse.json({ success: false, message: "Published policy version not found" }, { status: 404 }); const result = await createConsentSession({ organizationId: context.organization.id, websiteId: input.data.websiteId, policyVersionId: versions[0].versionId }); return NextResponse.json({ success: true, session: { id: result.session.id, websiteId: result.session.websiteId, policyVersionId: result.session.policyVersionId, status: result.session.status, expiresAt: result.session.expiresAt, issuedAt: result.session.createdAt }, token: result.token }, { status: 201 }); }
  catch { return NextResponse.json({ success: false, message: "Unable to create consent session" }, { status: 500 }); }
}
