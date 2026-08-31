import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_REQUEST_TYPES = [
  "access",
  "correction",
  "erasure",
  "grievance",
  "nomination",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// DPDP Rules 2025 Rule 12 deadlines
const ACKNOWLEDGE_HOURS = 48;
const RESPONSE_DAYS = 30;

// ---------------------------------------------------------------------------
// POST /api/rights-request
//
// Public endpoint — no authentication required from the Data Principal.
// The caller must supply a websiteId (or siteKey) so the request can be
// routed to the correct organization.
//
// Body:
// {
//   websiteId:      string   — UUID of the website
//   requestType:    "access" | "correction" | "erasure" | "grievance" | "nomination"
//   requesterName:  string
//   requesterEmail: string
//   requesterPhone: string (optional)
//   description:    string
//   consentId:      string (optional) — the visitor's own consentId if known
// }
//
// Returns:
// {
//   success: true,
//   requestId:       string  — UUID to use for status polling
//   acknowledgeBy:   string  — ISO-8601 deadline (+48h) for acknowledgement
//   dueAt:           string  — ISO-8601 deadline (+30d) for full response
// }
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Validate required fields ──────────────────────────────────────────
    const websiteId    = String(body.websiteId ?? "").trim();
    const requestType  = String(body.requestType ?? "").trim().toLowerCase();
    const requesterName  = String(body.requesterName ?? "").trim().slice(0, 255);
    const requesterEmail = String(body.requesterEmail ?? "").trim().toLowerCase().slice(0, 320);
    const requesterPhone = body.requesterPhone
      ? String(body.requesterPhone).trim().slice(0, 50)
      : null;
    const description  = String(body.description ?? "").trim().slice(0, 5000);
    const consentId    = body.consentId
      ? String(body.consentId).trim().slice(0, 255)
      : null;

    if (!websiteId) {
      return NextResponse.json(
        { success: false, message: "websiteId is required" },
        { status: 400 },
      );
    }

    if (!(VALID_REQUEST_TYPES as readonly string[]).includes(requestType)) {
      return NextResponse.json(
        {
          success: false,
          message: `requestType must be one of: ${VALID_REQUEST_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!requesterName) {
      return NextResponse.json(
        { success: false, message: "requesterName is required" },
        { status: 400 },
      );
    }

    if (!requesterEmail || !EMAIL_RE.test(requesterEmail)) {
      return NextResponse.json(
        { success: false, message: "A valid requesterEmail is required" },
        { status: 400 },
      );
    }

    if (!description) {
      return NextResponse.json(
        { success: false, message: "description is required" },
        { status: 400 },
      );
    }

    // ── Resolve website → organization ────────────────────────────────────
    // Resolving through the website ensures the request is always routed to
    // the correct organization, even if the caller only knows their websiteId.
    const [website] = await db
      .select({ id: websites.id, organizationId: websites.organizationId, status: websites.status })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website || website.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404 },
      );
    }

    // ── Verify organization exists ────────────────────────────────────────
    const [org] = await db
      .select({ id: organizations.id, status: organizations.status })
      .from(organizations)
      .where(eq(organizations.id, website.organizationId))
      .limit(1);

    if (!org || org.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Organization not found" },
        { status: 404 },
      );
    }

    // ── Compute SLA deadlines ──────────────────────────────────────────────
    const now          = new Date();
    const acknowledgeBy = new Date(now.getTime() + ACKNOWLEDGE_HOURS * 60 * 60 * 1000);
    const dueAt         = new Date(now.getTime() + RESPONSE_DAYS * 24 * 60 * 60 * 1000);

    // ── Insert the request row ────────────────────────────────────────────
    const [inserted] = await db
      .insert(dataPrincipalRequests)
      .values({
        organizationId:  org.id,
        websiteId:       website.id,
        requestType,
        status:          "received",
        requesterName,
        requesterEmail,
        requesterPhone,
        consentId,
        description,
        acknowledgeBy,
        dueAt,
        receivedAt: now,
      })
      .returning({ id: dataPrincipalRequests.id });

    return NextResponse.json(
      {
        success: true,
        requestId:     inserted.id,
        acknowledgeBy: acknowledgeBy.toISOString(),
        dueAt:         dueAt.toISOString(),
        message:
          "Your request has been received. You will be acknowledged within 48 hours and receive a full response within 30 days, as required under the Digital Personal Data Protection Act, 2023.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Rights request intake failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit request" },
      { status: 500 },
    );
  }
}
