import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { legalHolds } from "@/db/schema/legal-holds";
import { consentEvidenceSnapshots } from "@/db/schema/consent-evidence-snapshots";
import { consentRecords } from "@/db/schema/consent-records";
import { auditLogs } from "@/db/schema/audit-logs";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";
import { isUuid, type RetentionResourceType } from "./core";

const OWNER_ADMIN = ["Owner", "Admin"] as const;

export async function authorizeRetentionOrganization() {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  if (!orgId) {
    return { error: NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 }) };
  }
  const localUser = await resolveLocalUser(userId);
  if (!localUser) {
    return { error: NextResponse.json({ success: false, message: "User not found" }, { status: 404 }) };
  }
  const organization = await resolveLocalOrganization(orgId);
  if (!organization) {
    return { error: NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 }) };
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership) {
    return { error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { localUser, organization, membership };
}

export function requireRetentionAdmin(roleName: string) {
  if (!(OWNER_ADMIN as readonly string[]).includes(roleName)) {
    return NextResponse.json(
      { success: false, message: "Only Owner or Admin can change retention settings" },
      { status: 403 },
    );
  }
  return null;
}

export async function loadOwnedWebsite(organizationId: string, websiteId: string | null) {
  if (!websiteId) return { ok: true as const, website: null };
  if (!isUuid(websiteId)) return { ok: false as const };
  const [website] = await db
    .select({ id: websites.id, organizationId: websites.organizationId })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organizationId)))
    .limit(1);
  return website ? { ok: true as const, website } : { ok: false as const };
}

export async function loadOwnedLegalHold(organizationId: string, holdId: string) {
  if (!isUuid(holdId)) return null;
  const [hold] = await db
    .select()
    .from(legalHolds)
    .where(and(eq(legalHolds.id, holdId), eq(legalHolds.organizationId, organizationId)))
    .limit(1);
  return hold ?? null;
}

export async function assertOwnedRetentionResource(input: {
  organizationId: string;
  resourceType: RetentionResourceType;
  resourceId: string;
}): Promise<boolean> {
  if (!isUuid(input.resourceId)) return false;

  if (input.resourceType === "consent_evidence") {
    const [row] = await db
      .select({ id: consentEvidenceSnapshots.id })
      .from(consentEvidenceSnapshots)
      .where(
        and(
          eq(consentEvidenceSnapshots.id, input.resourceId),
          eq(consentEvidenceSnapshots.organizationId, input.organizationId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  if (input.resourceType === "consent_record") {
    const [row] = await db
      .select({ id: consentRecords.id })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.id, input.resourceId),
          eq(consentRecords.organizationId, input.organizationId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  if (input.resourceType === "audit_event") {
    const [row] = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(and(eq(auditLogs.id, input.resourceId), eq(auditLogs.organizationId, input.organizationId)))
      .limit(1);
    return Boolean(row);
  }

  const [row] = await db
    .select({ id: dataPrincipalRequests.id })
    .from(dataPrincipalRequests)
    .where(
      and(
        eq(dataPrincipalRequests.id, input.resourceId),
        eq(dataPrincipalRequests.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  return Boolean(row);
}
