import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { roles } from "@/db/schema/roles";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { getCurrentGvl, syncOfficialGvl } from "@/lib/signals/iab-gvl-sync";

async function requireAdmin() {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId || !orgId) return false;
  const [user, organization] = await Promise.all([resolveLocalUser(userId), resolveLocalOrganization(orgId)]);
  if (!user || !organization) return false;
  const membership = await resolveActiveMembership(organization.id, user.id);
  if (!membership) return false;
  const [role] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, membership.roleId)).limit(1);
  return ["owner", "admin"].includes((role?.name ?? "").toLowerCase());
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  const current = await getCurrentGvl();
  return NextResponse.json({ success: true, current: current ? {
    version: current.version, status: current.status, fetchedAt: current.fetchedAt,
    validatedAt: current.validatedAt, sha256: current.sha256, sourceUrl: current.sourceUrl,
  } : null });
}

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  return NextResponse.json({ success: true, ...(await syncOfficialGvl()) });
}
