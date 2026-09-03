import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { loadConsentGraph } from "@/lib/intelligence/graph-snapshot";
import { buildConsentRecommendations } from "@/lib/intelligence/recommendations";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";

function severityVariant(severity: string): "danger" | "warning" | "neutral" {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "neutral";
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string }>;
}) {
  const context = await requireDashboardContext();
  const params = await searchParams;
  const sites = await loadOrgWebsites(context.organization.id);
  const websiteId = pickWebsiteId(sites, params.website);
  const snapshot = websiteId
    ? await loadConsentGraph(context.organization.id, websiteId)
    : null;
  const qualityInput = websiteId ? await loadQualityScoreInput(websiteId) : null;
  const quality = qualityInput ? calculateConsentQualityScore(qualityInput.input) : null;
  const items =
    snapshot
      ? buildConsentRecommendations({
          snapshot,
          quality,
          openFindingCount: qualityInput?.openFindingCount ?? 0,
          published: qualityInput?.published ?? false,
        })
      : [];

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Intelligence"
        title="Consent recommendations"
        description="Configuration gaps from the tracker graph, quality score, and open findings. No generated legal policy text."
      />

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : (
        <>
          <WebsiteFilter action="/dashboard/recommendations" websites={sites} selected={websiteId} />
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">{item.title}</h2>
                      <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.detail}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open
                  </Link>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">Website not found.</CardContent>
              </Card>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
