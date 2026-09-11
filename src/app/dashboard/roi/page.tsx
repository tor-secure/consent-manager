import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { simulatePrivacyImpact } from "@/lib/intelligence/simulator";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";
import { computeConsentRoi } from "@/lib/roi/roi-engine";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RunIntelligenceButton } from "@/components/intelligence/run-intelligence-button";
import { db } from "@/db";
import { roiConfigurations } from "@/db/schema/intelligence";
import { and, eq } from "drizzle-orm";
import { loadConsentAnalytics } from "@/lib/analytics/queries";
import { RoiSettingsForm } from "@/components/intelligence/roi-settings-form";
import { EmptyState } from "@/components/ui/empty-state";

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
  const [roiConfig, analytics] = websiteId
    ? await Promise.all([
        db.select().from(roiConfigurations).where(and(eq(roiConfigurations.organizationId, context.organization.id), eq(roiConfigurations.websiteId, websiteId))).limit(1).then((rows) => rows[0] ?? null),
        loadConsentAnalytics(context.organization.id, { websiteId, days: "30" }),
      ])
    : [null, null];

  const roiReport =
    baseline && scenarios.length
      ? computeConsentRoi({
          baseline: baseline.overall,
          targetScore: roiConfig?.targetScore,
          scenarios,
          business: {
            monthlySessions: roiConfig?.monthlySessions,
            valuePerConversion: roiConfig?.valuePerConversion,
            valuePerConsent: roiConfig?.valuePerConsent,
            implementationCost: roiConfig?.implementationCost,
            recurringMonthlyCost: roiConfig?.recurringMonthlyCost,
            currency: roiConfig?.currency,
            measuredConsentRate: analytics?.overview.consentRate,
            measuredDecisionCount: analytics?.overview.total,
          },
        })
      : null;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Intelligence"
        title="Consent ROI engine"
        description="Uses measured aggregates and configured business inputs when available; otherwise labels results as low-confidence relative estimates."
      />

      {sites.length === 0 ? (
        <EmptyState title="No website available for ROI analysis" description="Add a website, publish a policy, and collect consent analytics before estimating business impact." actionLabel="Add a website" actionHref="/dashboard/websites/new" />
      ) : (
        <>
          <WebsiteFilter action="/dashboard/roi" websites={sites.map((s) => ({ id: s.id, name: s.name }))} selected={websiteId} />
          {websiteId ? <RunIntelligenceButton websiteId={websiteId} engine="roi" /> : null}

          {!loaded || !baseline || !roiReport ? (
            <EmptyState
              title="ROI inputs are not ready"
              description="Install the SDK and collect consent analytics, or run a scan so quality inputs exist."
              actionLabel="Install SDK"
              actionHref={websiteId ? `/dashboard/websites/${websiteId}/installation` : "/dashboard/developers"}
            />
          ) : (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-5">
                  <h2 className="mb-3 text-base font-semibold">Business inputs</h2>
                  <RoiSettingsForm websiteId={websiteId!} initialValues={roiConfig ?? undefined} />
                </CardContent>
              </Card>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Baseline</h2>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      Quality score: <span className="font-semibold text-[var(--foreground)]">{baseline.overall}/100</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Target: <span className="font-semibold text-[var(--foreground)]">{roiReport.targetScore}/100</span>
                    </p>
                    <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                      ROI per quality point: <span className="font-semibold text-[var(--foreground)]">{roiReport.roiPerQualityPoint}</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Confidence: <span className="font-semibold text-[var(--foreground)]">{roiReport.confidence}</span></p>
                    {roiReport.assumptions.map((assumption) => <p key={assumption} className="mt-1 text-xs text-[var(--muted-foreground)]">{assumption}</p>)}
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
                          <span className="text-xs font-normal text-[var(--muted-foreground)]">{roiReport.bestScenario.annualBenefit == null ? "relative units" : "%"}</span>
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
                      <div key={row.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
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

