import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { loadConsentRecordExport, RECORD_EXPORT_LIMIT } from "@/lib/consent/record-list";
import { csvCell, displayConsentStatus, parseRecordListQuery } from "@/lib/consent/record-list-params";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

function iso(value: Date | null) {
  return value ? value.toISOString() : "";
}

export async function GET(request: Request) {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId || !orgId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const limit = rateLimit({
    key: `consent-record-export:${orgId}:${userId}:${getClientIp(request)}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  const localUser = await resolveLocalUser(userId);
  const organization = await resolveLocalOrganization(orgId);
  if (!localUser || !organization || !(await resolveActiveMembership(organization.id, localUser.id))) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = parseRecordListQuery({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    policy: url.searchParams.get("policy") ?? undefined,
    jurisdiction: url.searchParams.get("jurisdiction") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    dir: url.searchParams.get("dir") ?? undefined,
  });
  const rows = await loadConsentRecordExport(organization.id, query);
  const header = ["consent_id", "website", "domain", "policy", "policy_version", "status", "source", "jurisdiction", "consented_at", "expires_at", "withdrawn_at"];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        csvCell(row.consentId),
        csvCell(row.websiteName),
        csvCell(row.websiteDomain.includes(".deleted.") ? "" : row.websiteDomain),
        csvCell(row.policyName),
        csvCell(row.policyVersion),
        csvCell(displayConsentStatus(row).label),
        csvCell(row.source),
        csvCell(row.jurisdiction),
        csvCell(iso(row.consentedAt)),
        csvCell(iso(row.expiresAt)),
        csvCell(iso(row.withdrawnAt)),
      ].join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="consent-records.csv"',
      "Cache-Control": "no-store",
      "X-Export-Limit": String(RECORD_EXPORT_LIMIT),
      "X-Export-Truncated": rows.length >= RECORD_EXPORT_LIMIT ? "true" : "false",
    },
  });
}
