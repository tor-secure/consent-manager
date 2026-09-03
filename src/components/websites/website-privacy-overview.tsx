import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { computeWebsiteQualityScore, loadPageIntelligence } from "@/lib/monitoring/privacy-intelligence";
import { qualityCategoryLabel } from "@/lib/monitoring/consent-quality";

function categoryVariant(category: string): "success" | "primary" | "warning" | "danger" {
  if (category === "excellent") return "success";
  if (category === "good") return "primary";
  if (category === "needs_attention") return "warning";
  return "danger";
}

function riskVariant(risk: string): "success" | "primary" | "warning" | "danger" | "neutral" {
  if (risk === "clear") return "success";
  if (risk === "low") return "neutral";
  if (risk === "medium") return "primary";
  if (risk === "high") return "warning";
  return "danger";
}

export async function WebsitePrivacyOverview({ websiteId }: { websiteId: string }) {
  const [quality, pages] = await Promise.all([
    computeWebsiteQualityScore(websiteId),
    loadPageIntelligence(websiteId),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/quality`}
          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Consent quality
        </Link>
        <Link
          href={`/dashboard/risk?website=${websiteId}`}
          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Risk findings
        </Link>
        <Link
          href={`/dashboard/monitoring?website=${websiteId}`}
          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Privacy drift
        </Link>
        <Link
          href={`/dashboard/websites/${websiteId}/enforcement`}
          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Enforcement
        </Link>
      </div>

      {quality ? (
        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Consent quality</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Operational indicator from mappings, scans, and open findings — not a legal percentage.
            </p>
          </div>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold text-slate-900">
                {quality.score.overall}
                <span className="text-base font-normal text-slate-500">/100</span>
              </p>
              <Badge variant={categoryVariant(quality.score.category)}>
                {qualityCategoryLabel(quality.score.category)}
              </Badge>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {quality.score.dimensions.map((dimension) => (
                <div key={dimension.key} className="rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-500">{dimension.label}</dt>
                  <dd className="text-sm font-medium text-slate-800">{dimension.score}</dd>
                </div>
              ))}
            </dl>
            {quality.score.lostPoints.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {quality.score.lostPoints.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Page intelligence</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Grouped from the latest completed scan. The scanner still fetches one URL per run, so this is usually the homepage only.
          </p>
        </div>
        <CardContent>
          {!pages || pages.length === 0 ? (
            <p className="text-sm text-slate-500">No completed scan yet, so no page inventory is available.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pages.map((page) => (
                <li key={page.pageUrl} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{page.path === "/" ? "Homepage" : page.path}</p>
                    <p className="font-mono text-xs text-slate-500">{page.pageUrl}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {page.trackerCount} trackers · {page.unmappedCount} unmanaged · {page.shadowFindingCount + page.driftFindingCount} findings
                    </p>
                    {page.vendorNames.length > 0 ? (
                      <p className="text-xs text-slate-500">Vendors: {page.vendorNames.join(", ")}</p>
                    ) : null}
                    {page.purposeNames.length > 0 ? (
                      <p className="text-xs text-slate-500">Purposes: {page.purposeNames.join(", ")}</p>
                    ) : null}
                  </div>
                  <Badge variant={riskVariant(page.risk)} className="capitalize w-fit">
                    {page.risk === "clear" ? "Clear" : page.risk}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
