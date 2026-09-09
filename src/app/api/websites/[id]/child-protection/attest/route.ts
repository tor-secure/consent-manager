import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { staffAttestSession } from "@/lib/children/service";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 });
  }
  const localUser = await resolveLocalUser(userId);
  const organization = await resolveLocalOrganization(orgId);
  if (!localUser || !organization) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership || (membership.roleName !== "Owner" && membership.roleName !== "Admin")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  const [website] = await db
    .select({ id: websites.id })
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.organizationId, organization.id)))
    .limit(1);
  if (!website) {
    return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  const sessionId = String(body.sessionId ?? "").trim();
  const kind = body.kind === "guardian" ? "guardian" : "age";
  if (!sessionId) {
    return NextResponse.json({ success: false, message: "sessionId is required" }, { status: 400 });
  }
  const result = await staffAttestSession({
    organizationId: organization.id,
    websiteId: website.id,
    sessionId,
    kind,
  });
  if (!result.ok) {
    return NextResponse.json({ success: false, message: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, age: result.view });
}
