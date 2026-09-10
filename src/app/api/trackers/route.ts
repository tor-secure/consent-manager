import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { trackers } from "@/db/schema/trackers";
import { websites } from "@/db/schema/websites";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { auditLogs } from "@/db/schema/audit-logs";
import { logger } from "@/lib/logger";
import {
  authorizeTrackerOrganization,
  loadOwnedPurpose,
  loadOwnedVendor,
  loadOwnedWebsite,
  trackerMutationLimit,
  vendorMappingError,
} from "@/lib/trackers/http";
import {
  deriveTrackerIdentifier,
  parseTrackerWriteInput,
  resolveScannerClassification,
  sanitizeTrackerAuditConfig,
  TRACKER_AUDIT_ACTIONS,
  TRACKER_STATUSES,
  essentialChangeRequiresConfirmation,
} from "@/lib/trackers/management";

export async function GET(request: Request) {
  try {
    const authz = await authorizeTrackerOrganization();
    if ("error" in authz) return authz.error;

    const url = new URL(request.url);
    const websiteId = url.searchParams.get("websiteId");
    const status = url.searchParams.get("status");
    const orgWebsites = await db
      .select({ id: websites.id, name: websites.name, domain: websites.domain })
      .from(websites)
      .where(eq(websites.organizationId, authz.organization.id));
    const websiteIds = orgWebsites
      .map((site) => site.id)
      .filter((id) => !websiteId || id === websiteId);
    if (websiteId && !websiteIds.includes(websiteId)) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }
    if (websiteIds.length === 0) {
      return NextResponse.json({ success: true, trackers: [] });
    }

    const rows = await db
      .select({
        tracker: trackers,
        websiteName: websites.name,
        websiteDomain: websites.domain,
        vendorName: vendors.name,
        purposeName: purposes.name,
        purposeKey: purposes.key,
      })
      .from(trackers)
      .innerJoin(websites, eq(trackers.websiteId, websites.id))
      .leftJoin(vendors, eq(trackers.vendorId, vendors.id))
      .leftJoin(purposes, eq(trackers.purposeId, purposes.id))
      .where(
        and(
          eq(websites.organizationId, authz.organization.id),
          inArray(trackers.websiteId, websiteIds),
          status && TRACKER_STATUSES.includes(status as (typeof TRACKER_STATUSES)[number])
            ? eq(trackers.status, status)
            : undefined,
        ),
      )
      .orderBy(desc(trackers.updatedAt));

    return NextResponse.json({
      success: true,
      trackers: rows.map((row) => ({
        ...row.tracker,
        websiteName: row.websiteName,
        websiteDomain: row.websiteDomain,
        vendorName: row.vendorName,
        purposeName: row.purposeName,
        purposeKey: row.purposeKey,
      })),
    });
  } catch (error) {
    logger.error("Tracker list failed", { route: "GET /api/trackers", error });
    return NextResponse.json({ success: false, message: "Unable to load trackers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authz = await authorizeTrackerOrganization();
    if ("error" in authz) return authz.error;
    const limited = trackerMutationLimit(request, authz.orgId, authz.userId);
    if (limited) return limited;

    const parsed = parseTrackerWriteInput(await request.json(), { requireWebsite: true });
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }
    const input = parsed.value;
    const website = await loadOwnedWebsite(authz.organization.id, input.websiteId!);
    if (!website) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }
    if (input.vendorId !== undefined && input.vendorId !== null) {
      const vendor = await loadOwnedVendor(authz.organization.id, input.vendorId);
      const vendorError = vendorMappingError(vendor);
      if (vendorError) return vendorError;
    }
    if (input.purposeId !== undefined && input.purposeId !== null) {
      const purpose = await loadOwnedPurpose(authz.organization.id, input.purposeId);
      if (!purpose.ok) {
        return NextResponse.json({ success: false, message: "Purpose not found in this organization." }, { status: 400 });
      }
    }
    if (essentialChangeRequiresConfirmation(input.isEssential === true, input.confirmEssential === true)) {
      return NextResponse.json({ success: false, message: "Essential classification requires confirmation." }, { status: 400 });
    }

    const identifier = deriveTrackerIdentifier({
      identifier: input.identifier,
      domain: input.domain ?? null,
      name: input.name ?? "tracker",
    });
    const scannerClassification = resolveScannerClassification({
      purposeId: input.purposeId ?? null,
      vendorId: input.vendorId ?? null,
      scannerClassification: "unmapped",
    });

    const [tracker] = await db
      .insert(trackers)
      .values({
        websiteId: website.id,
        name: input.name!,
        description: input.description ?? null,
        type: input.type ?? "script",
        vendorId: input.vendorId ?? null,
        purposeId: input.purposeId ?? null,
        category: input.category ?? null,
        isEssential: input.isEssential === true,
        ccpaSale: input.ccpaSale ?? "unknown",
        ccpaShare: input.ccpaShare ?? "unknown",
        ccpaSensitivePi: input.ccpaSensitivePi ?? "unknown",
        status: input.status ?? "active",
        domain: input.domain ?? null,
        identifier,
        cookieNames: input.cookieNames ?? [],
        storageTypes: input.storageTypes ?? [],
        localStorageKeys: input.localStorageKeys ?? [],
        sessionStorageKeys: input.sessionStorageKeys ?? [],
        indexedDbNames: input.indexedDbNames ?? [],
        scriptUrlPatterns: input.scriptUrlPatterns ?? [],
        iframeUrlPatterns: input.iframeUrlPatterns ?? [],
        pixelUrlPatterns: input.pixelUrlPatterns ?? [],
        party: input.party ?? "unknown",
        duration: input.duration ?? null,
        deletionBehavior: input.deletionBehavior ?? null,
        scannerClassification,
        detectionMethod: "manual",
      })
      .returning();

    await db.insert(auditLogs).values({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: TRACKER_AUDIT_ACTIONS.created,
      resourceType: "tracker",
      resourceId: tracker.id,
      description: "Created tracker mapping",
      metadata: {
        websiteId: website.id,
        trackerId: tracker.id,
        previous: null,
        next: sanitizeTrackerAuditConfig(tracker),
      },
    });

    return NextResponse.json({ success: true, tracker }, { status: 201 });
  } catch (error) {
    logger.error("Tracker create failed", { route: "POST /api/trackers", error });
    return NextResponse.json({ success: false, message: "Unable to create tracker." }, { status: 500 });
  }
}
