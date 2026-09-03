import Link from "next/link";

import { requireTenantWebsite } from "@/lib/tenant-website";
import {
  WebsiteSettingsForm,
  type WebsiteSettingsData,
} from "@/components/websites/website-settings-form";
import { ScanSchedulePanel } from "@/components/scanner/scan-schedule-panel";
import { db } from "@/db";
import { websiteScanSchedules } from "@/db/schema/website-scan-schedules";
import { and, eq } from "drizzle-orm";

export default async function WebsiteSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const website = await requireTenantWebsite(id);

  const [schedule] = await db
    .select({
      enabled: websiteScanSchedules.enabled,
      frequency: websiteScanSchedules.frequency,
      timezone: websiteScanSchedules.timezone,
      nextScanAt: websiteScanSchedules.nextScanAt,
      lastScanAt: websiteScanSchedules.lastScanAt,
      lastScanStatus: websiteScanSchedules.lastScanStatus,
      lastError: websiteScanSchedules.lastError,
    })
    .from(websiteScanSchedules)
    .where(
      and(
        eq(websiteScanSchedules.websiteId, website.id),
        eq(websiteScanSchedules.organizationId, website.organizationId),
      ),
    )
    .limit(1);

  const settingsData: WebsiteSettingsData = {
    id: website.id,
    name: website.name,
    description: website.description,
    domain: website.domain,
    environment: website.environment,
    defaultLanguage: website.defaultLanguage,
    defaultRegion: website.defaultRegion,
    siteKey: website.siteKey,
  };

  return (
    <div className="page-wrap space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/websites" className="transition hover:text-slate-900">Websites</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <Link href={`/dashboard/websites/${website.id}`} className="transition hover:text-slate-900">{website.name}</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="text-slate-900">Settings</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Website settings</h1>
        <p className="mt-1 text-sm text-slate-500">Update how this website is identified in the CMP.</p>
      </div>

      <WebsiteSettingsForm website={settingsData} />

      <ScanSchedulePanel
        schedules={[
          {
            websiteId: website.id,
            websiteName: website.name,
            websiteDomain: website.domain,
            enabled: schedule?.enabled ?? false,
            frequency: schedule?.frequency ?? "weekly",
            timezone: schedule?.timezone ?? "UTC",
            nextScanAt: schedule?.nextScanAt?.toISOString() ?? null,
            lastScanAt: schedule?.lastScanAt?.toISOString() ?? null,
            lastScanStatus: schedule?.lastScanStatus ?? null,
            lastError: schedule?.lastError ?? null,
          },
        ]}
      />
    </div>
  );
}
