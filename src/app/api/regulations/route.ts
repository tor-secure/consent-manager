import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { REGULATION_CATALOG } from "@/lib/regulations/catalog";
import { resolveRegulationProfile } from "@/lib/regulations/engine";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";

export async function GET() {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 });
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    const organization = await resolveLocalOrganization(orgId);
    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }
    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 });
    }

    const profiles = REGULATION_CATALOG.map((profile) => {
      const resolved = resolveRegulationProfile({ key: profile.key });
      return {
        key: profile.key,
        label: profile.label,
        description: profile.description,
        currentVersion: resolved?.version ?? null,
        effectiveFrom: resolved?.effectiveFrom ?? null,
        versions: profile.versions.map((version) => ({
          version: version.version,
          effectiveFrom: version.effectiveFrom,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      disclaimer: "Operational regulation profiles only. Not a legal compliance certification.",
      profiles,
    });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to load regulation catalog." }, { status: 500 });
  }
}
