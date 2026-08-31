import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { purposes } from "@/db/schema/purposes";
import {
  resolveLocalOrganization,
  resolveLocalUser,
  resolveActiveMembership,
} from "@/lib/api-auth-helpers";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_STATUSES = ["active", "inactive"] as const;

// DPDP Rules 2025 Rule 3 — recognised processing grounds.
const VALID_LEGAL_BASES = [
  "consent",
  "legitimate_interest",
  "legal_obligation",
  "vital_interest",
  "public_task",
] as const;

// Maximum number of data-category labels per purpose.
const MAX_DATA_CATEGORIES = 20;
const MAX_DATA_CATEGORY_LENGTH = 150;

// ---------------------------------------------------------------------------
// POST /api/purposes
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { success: false, message: "No active organization selected" },
        { status: 400 },
      );
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    const organization = await resolveLocalOrganization(orgId);
    if (!organization) {
      return NextResponse.json(
        { success: false, message: "Organization not found" },
        { status: 404 },
      );
    }

    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }

    const body = await request.json();

    // ── Core fields ──────────────────────────────────────────────────────

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Purpose name is required" },
        { status: 400 },
      );
    }

    const rawKey = body.key
      ? String(body.key).trim()
      : name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const key = rawKey.slice(0, 100);

    if (!key) {
      return NextResponse.json(
        { success: false, message: "Purpose key is required" },
        { status: 400 },
      );
    }

    // Key uniqueness per org.
    const [existing] = await db
      .select({ id: purposes.id })
      .from(purposes)
      .where(
        and(
          eq(purposes.organizationId, organization.id),
          eq(purposes.key, key),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `A purpose with key "${key}" already exists in this organization.`,
        },
        { status: 409 },
      );
    }

    const description = body.description
      ? String(body.description).trim() || null
      : null;

    const isRequired = body.isRequired === true;

    const status = (VALID_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as (typeof VALID_STATUSES)[number])
      : "active";

    // ── DPDP enrichment fields ───────────────────────────────────────────

    // dataCategories: must be an array of non-empty strings, max 20 items,
    // each no longer than 150 chars.
    let dataCategories: string[] | null = null;
    if (Array.isArray(body.dataCategories) && body.dataCategories.length > 0) {
      const cleaned = (body.dataCategories as unknown[])
        .slice(0, MAX_DATA_CATEGORIES)
        .map((c) => String(c).trim().slice(0, MAX_DATA_CATEGORY_LENGTH))
        .filter(Boolean);
      dataCategories = cleaned.length > 0 ? cleaned : null;
    }

    // retentionPeriod: free-text, max 255 chars.
    const retentionPeriod = body.retentionPeriod
      ? String(body.retentionPeriod).trim().slice(0, 255) || null
      : null;

    // legalBasis: allowlist, defaults to "consent".
    const legalBasis = (VALID_LEGAL_BASES as readonly string[]).includes(body.legalBasis)
      ? (body.legalBasis as (typeof VALID_LEGAL_BASES)[number])
      : "consent";

    // ── Insert ───────────────────────────────────────────────────────────

    const [purpose] = await db
      .insert(purposes)
      .values({
        organizationId: organization.id,
        key,
        name,
        description,
        isRequired,
        status,
        dataCategories,
        retentionPeriod,
        legalBasis,
      })
      .returning();

    return NextResponse.json({ success: true, purpose }, { status: 201 });
  } catch (error) {
    console.error("Purpose creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create purpose" },
      { status: 500 },
    );
  }
}
