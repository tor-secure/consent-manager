import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { loadConsentAnalytics } from "@/lib/analytics/queries";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId || !orgId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const limit = rateLimit({
    key: `analytics-export:${orgId}:${userId}:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);
  const localUser = await resolveLocalUser(userId);
  const organization = await resolveLocalOrganization(orgId);
  if (!localUser || !organization || !(await resolveActiveMembership(organization.id, localUser.id))) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const data = await loadConsentAnalytics(organization.id, {
    websiteId: url.searchParams.get("websiteId"),
    days: url.searchParams.get("days"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    country: url.searchParams.get("country"),
    device: url.searchParams.get("device"),
    browser: url.searchParams.get("browser"),
    purposeId: url.searchParams.get("purposeId"),
    policyVersionId: url.searchParams.get("policyVersionId"),
  });
  const lines = [
    "metric,value",
    `total,${data.overview.total}`,
    `accepted,${data.overview.accepted}`,
    `rejected,${data.overview.rejected}`,
    `consentRate,${data.overview.consentRate}`,
    "",
    "purpose,granted,total,grantRate",
    ...data.purposes.map(
      (row) =>
        `${csv(row.purposeName)},${row.granted},${row.total},${row.grantRate}`,
    ),
  ];
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="consent-analytics.csv"',
      "Cache-Control": "no-store",
    },
  });
}

function csv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
