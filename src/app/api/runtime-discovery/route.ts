import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveActiveClerkOrgId, resolveLocalOrganization } from "@/lib/api-auth-helpers";
import { listRuntimeDiscovery } from "@/lib/runtime-discovery";

export async function GET(request: Request) {
  const { isAuthenticated, userId, orgId: sessionOrgId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const clerkOrgId = await resolveActiveClerkOrgId(userId, sessionOrgId);
  if (!clerkOrgId) return NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 });
  const organization = await resolveLocalOrganization(clerkOrgId);
  if (!organization) return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
  const { searchParams } = new URL(request.url);
  const websiteId = searchParams.get("websiteId") || undefined;
  const pageUrl = searchParams.get("pageUrl") || undefined;
  const rawLimit = Number(searchParams.get("limit") ?? "100");
  const observations = await listRuntimeDiscovery(organization.id, { websiteId, pageUrl, limit: Number.isFinite(rawLimit) ? rawLimit : 100 });
  return NextResponse.json({ success: true, observations: observations.map(({ observation, trackerName, vendorName, purposeName }) => ({ ...observation, trackerName, vendorName, purposeName })) });
}
