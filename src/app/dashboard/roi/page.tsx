import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { simulatePrivacyImpact } from "@/lib/intelligence/simulator";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";
import { computeConsentRoi } from "@/lib/roi/roi-engine";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default async function RoiPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string }>;
}) {
  const context = await requireDashboardContext();
  const params = await searchParams;
  const sites = await loadOrgWebsites(context.organization.id);
  const websiteId = pickWebsiteId(sites, params.website);

  const loaded = websiteId ? await loadQualityScoreInput(websiteId) : null;
  const baseline = loaded ? calculateConsentQualityScore(loaded.input) : null;
  const scenarios = loaded ? simulatePrivacyImpact(loaded.input) : [];

  const roiReport =
    baseline && scenarios.length
      ? computeConsentRoi({
          baseline: baseline.overall,
          scenarios,
        })
      : null;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Intelligence"
        title="Consent ROI engine"
        description="Converts expected consent quality improvements into a relative ROI score per configuration scenario."
      />

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : (
        <>
          <WebsiteFilter action="/dashboard/roi" websites={sites.map((s) => ({ id: s.id, name: s.name }))} selected={websiteId} />

          {!loaded || !baseline || !roiReport ? (
            <Card>
              <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">
                ROI inputs are unavailable for this website.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Baseline</h2>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      Quality score: <span className="font-semibold text-slate-900">{baseline.overall}/100</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Target: <span className="font-semibold text-slate-900">{roiReport.targetScore}/100</span>
                    </p>
                    <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                      ROI per quality point: <span className="font-semibold text-slate-900">{roiReport.roiPerQualityPoint}</span>
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Best scenario</h2>
                    {roiReport.bestScenario ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium">{roiReport.bestScenario.title}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">{roiReport.bestScenario.description}</p>
                        <p className="text-lg font-semibold">
                          ROI: {roiReport.bestScenario.roi}{" "}
                          <span className="text-xs font-normal text-[var(--muted-foreground)]">relative units</span>
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--muted-foreground)]">No ROI-positive scenario found.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold">Scenario ROI breakdown</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Single-step estimates.</p>
                  <div className="mt-4 space-y-3">
                    {roiReport.scenarios.map((row) => (
                      <div key={row.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
                        <div>
                          <p className="font-semibold">{row.title}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{row.description}</p>
                          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                            quality {row.before} → {row.after} (delta {row.delta > 0 ? "+" : ""}
                            {row.delta} pts)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">ROI: {row.roi}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            roiPerQualityPoint {roiReport.roiPerQualityPoint}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

