import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { purposes } from "@/db/schema/purposes";
import { normalizeLawfulBasis } from "@/lib/compliance/types";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";
import { creationFailureMessage, isDatabaseUnreachableError, isSchemaMismatchError } from "@/lib/schema-mismatch";

const VALID_STATUSES = ["active", "inactive"] as const;
const VALID_LEGAL_BASES = [
  "consent",
  "contract",
  "legitimate_interest",
  "legitimate_interests",
  "legal_obligation",
  "vital_interest",
  "vital_interests",
  "public_task",
] as const;
const MAX_DATA_CATEGORIES = 20;
const MAX_DATA_CATEGORY_LENGTH = 150;

async function authorizePurposeOrg() {
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
    return { error: NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 }) };
  }
  return { organization };
}

function parseCategories(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) return null;
  const cleaned = value
    .slice(0, MAX_DATA_CATEGORIES)
    .map((item) => String(item).trim().slice(0, MAX_DATA_CATEGORY_LENGTH))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await authorizePurposeOrg();
    if ("error" in authz) return authz.error;
    const { id } = await params;
    const [purpose] = await db
      .select()
      .from(purposes)
      .where(and(eq(purposes.id, id), eq(purposes.organizationId, authz.organization.id)))
      .limit(1);
    if (!purpose) {
      return NextResponse.json({ success: false, message: "Purpose not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, purpose });
  } catch (error) {
    console.error("Purpose load failed:", error);
    return NextResponse.json({ success: false, message: "Failed to load purpose" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await authorizePurposeOrg();
    if ("error" in authz) return authz.error;
    const { id } = await params;
    const [existing] = await db
      .select()
      .from(purposes)
      .where(and(eq(purposes.id, id), eq(purposes.organizationId, authz.organization.id)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ success: false, message: "Purpose not found" }, { status: 404 });
    }

    const body = await request.json();
    const name = body.name !== undefined ? String(body.name ?? "").trim() : existing.name;
    if (!name) {
      return NextResponse.json({ success: false, message: "Purpose name is required" }, { status: 400 });
    }

    const description = body.description !== undefined
      ? (String(body.description ?? "").trim() || null)
      : existing.description;
    const isRequired = body.isRequired !== undefined ? body.isRequired === true : existing.isRequired;
    const status = (VALID_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as (typeof VALID_STATUSES)[number])
      : existing.status;
    const dataCategories = parseCategories(body.dataCategories);
    const retentionPeriod = body.retentionPeriod !== undefined
      ? (String(body.retentionPeriod ?? "").trim().slice(0, 255) || null)
      : existing.retentionPeriod;
    const legalBasis = (VALID_LEGAL_BASES as readonly string[]).includes(body.legalBasis)
      ? normalizeLawfulBasis(body.legalBasis)
      : existing.legalBasis;

    const coreValues = {
      name,
      description,
      isRequired,
      status,
      updatedAt: new Date(),
    };

    let purpose;
    try {
      [purpose] = await db
        .update(purposes)
        .set({
          ...coreValues,
          ...(dataCategories !== undefined ? { dataCategories } : {}),
          retentionPeriod,
          legalBasis,
        })
        .where(and(eq(purposes.id, existing.id), eq(purposes.organizationId, authz.organization.id)))
        .returning();
    } catch (error) {
      if (!isSchemaMismatchError(error)) throw error;
      [purpose] = await db
        .update(purposes)
        .set(coreValues)
        .where(and(eq(purposes.id, existing.id), eq(purposes.organizationId, authz.organization.id)))
        .returning();
    }

    return NextResponse.json({ success: true, purpose });
  } catch (error) {
    console.error("Purpose update failed:", error);
    return NextResponse.json(
      { success: false, message: creationFailureMessage("purpose", error) },
      { status: isSchemaMismatchError(error) || isDatabaseUnreachableError(error) ? 503 : 500 },
    );
  }
}
