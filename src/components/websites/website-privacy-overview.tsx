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
  let quality: Awaited<ReturnType<typeof computeWebsiteQualityScore>> = null;
  let pages: Awaited<ReturnType<typeof loadPageIntelligence>> = [];
  try {
    [quality, pages] = await Promise.all([
      computeWebsiteQualityScore(websiteId),
      loadPageIntelligence(websiteId),
    ]);
  } catch {
    quality = null;
    pages = [];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/quality`}
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]"
        >
          Consent quality
        </Link>
        <Link
          href={`/dashboard/risk?website=${websiteId}`}
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]"
        >
          Risk findings
        </Link>
        <Link
          href={`/dashboard/monitoring?website=${websiteId}`}
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]"
        >
          Privacy drift
        </Link>
        <Link
          href={`/dashboard/firewall?website=${websiteId}`}
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]"
        >
          Firewall
        </Link>
        <Link
          href={`/dashboard/simulator?website=${websiteId}`}
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]"
        >
          Impact simulator
        </Link>
        <Link
          href={`/dashboard/graph?website=${websiteId}`}
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]"
        >
          Graph
        </Link>
        <Link
          href={`/dashboard/data-flow?website=${websiteId}`}
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]"
        >
          Data flow
        </Link>
        <Link
          href={`/dashboard/recommendations?website=${websiteId}`}
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]"
        >
          Recommendations
        </Link>
        <Link
          href={`/dashboard/experiments?website=${websiteId}`}
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]"
        >
          Experiments
        </Link>
        <Link
          href={`/dashboard/websites/${websiteId}/enforcement`}
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]"
        >
          Enforcement
        </Link>
      </div>

      {quality ? (
        <Card>
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Consent quality</h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Operational indicator from mappings, scans, and open findings — not a legal percentage.
            </p>
          </div>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold text-[var(--foreground)]">
                {quality.score.overall}
                <span className="text-base font-normal text-[var(--muted-foreground)]">/100</span>
              </p>
              <Badge variant={categoryVariant(quality.score.category)}>
                {qualityCategoryLabel(quality.score.category)}
              </Badge>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {quality.score.dimensions.map((dimension) => (
                <div key={dimension.key} className="rounded-xl bg-[var(--muted)] px-3 py-2">
                  <dt className="text-xs text-[var(--muted-foreground)]">{dimension.label}</dt>
                  <dd className="text-sm font-medium text-[var(--foreground)]">{dimension.score}</dd>
                </div>
              ))}
            </dl>
            {quality.score.lostPoints.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]">
                {quality.score.lostPoints.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Page intelligence</h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Grouped from the latest completed scan. The scanner still fetches one URL per run, so this is usually the homepage only.
          </p>
        </div>
        <CardContent>
          {!pages || pages.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No completed scan yet, so no page inventory is available.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {pages.map((page) => (
                <li key={page.pageUrl} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{page.path === "/" ? "Homepage" : page.path}</p>
                    <p className="font-mono text-xs text-[var(--muted-foreground)]">{page.pageUrl}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {page.trackerCount} trackers · {page.unmappedCount} unmanaged · {page.shadowFindingCount + page.driftFindingCount} findings
                    </p>
                    {page.vendorNames.length > 0 ? (
                      <p className="text-xs text-[var(--muted-foreground)]">Vendors: {page.vendorNames.join(", ")}</p>
                    ) : null}
                    {page.purposeNames.length > 0 ? (
                      <p className="text-xs text-[var(--muted-foreground)]">Purposes: {page.purposeNames.join(", ")}</p>
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
