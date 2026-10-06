import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { db } from "@/db";
import { privacyEvents } from "@/db/schema/privacy-events";
import { websites } from "@/db/schema/websites";

export async function GET(request: Request) { try { const context = await requireDashboardContext(); const params = new URL(request.url).searchParams; const websiteId = params.get("websiteId"); const limit = Math.min(Math.max(Number(params.get("limit") ?? 100), 1), 250); const rows = await db.select({ event: privacyEvents, websiteName: websites.name }).from(privacyEvents).innerJoin(websites, eq(privacyEvents.websiteId, websites.id)).where(and(eq(privacyEvents.organizationId, context.organization.id), ...(websiteId ? [eq(privacyEvents.websiteId, websiteId)] : []))).orderBy(desc(privacyEvents.occurredAt), desc(privacyEvents.id)).limit(limit); return NextResponse.json({ success: true, events: rows.map((row) => ({ ...row.event, websiteName: row.websiteName })) }); } catch { return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }); } }
