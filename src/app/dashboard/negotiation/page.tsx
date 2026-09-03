import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { simulatePrivacyImpact } from "@/lib/intelligence/simulator";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";
import { buildConsentNegotiationPlan } from "@/lib/intelligence/negotiation-engine";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

function scenarioToActionHref(id: string): string {
  switch (id) {
    case "map_unclassified":
      return "/dashboard/trackers";
    case "resolve_findings":
      return "/dashboard/monitoring";
    case "publish_policy":
      return "/dashboard/policies";
    case "complete_coverage":
      return "/dashboard/scanner";
    default:
      return "/dashboard";
  }
}

export default async function NegotiationPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string; target?: string }>;
}) {
  const context = await requireDashboardContext();
  const params = await searchParams;
  const sites = await loadOrgWebsites(context.organization.id);
  const websiteId = pickWebsiteId(sites, params.website);

  const loaded = websiteId ? await loadQualityScoreInput(websiteId) : null;
  const baseline = loaded ? calculateConsentQualityScore(loaded.input) : null;
  const scenarios = loaded ? simulatePrivacyImpact(loaded.input) : [];

  const targetScore = (() => {
    const t = params.target ? Number(params.target) : NaN;
    if (!Number.isFinite(t)) return 85;
    return Math.max(50, Math.min(100, t));
  })();

  const plan =
    baseline && scenarios.length
      ? buildConsentNegotiationPlan({
          baselineScore: baseline.overall,
          targetScore,
          scenarios,
        })
      : null;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="AI"
        title="Consent negotiation engine"
        description="Builds an ordered negotiation plan to reach a target consent quality score by applying the highest-impact configuration steps."
      />

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : (
        <>
          <WebsiteFilter action="/dashboard/negotiation" websites={sites.map((s) => ({ id: s.id, name: s.name }))} selected={websiteId} />

          {!loaded || !baseline || !plan ? (
            <Card>
              <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">
                Negotiation inputs are unavailable for this website.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Goal</h2>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      Target quality: <span className="font-semibold text-slate-900">{plan.targetScore}/100</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Baseline: <span className="font-semibold text-slate-900">{plan.baselineScore}/100</span>
                    </p>
                    <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                      Predicted after plan:{" "}
                      <span className="font-semibold text-slate-900">{plan.predictedScoreAfter}/100</span>
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Plan steps</h2>
                    {plan.steps.length ? (
                      <div className="mt-3 space-y-2">
                        {plan.steps.map((step) => (
                          <div key={step.scenario.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="font-semibold">{step.scenario.title}</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{step.scenario.description}</p>
                            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                              Estimated score after: {step.estimatedScoreAfter}/100
                            </p>
                            <div className="mt-3">
                              <Link href={scenarioToActionHref(step.scenario.id)} className="btn btn-secondary">
                                Open action page
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                        No positive-delta steps were found for this site.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold">Scenario inventory</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    All single-step what-if scenarios available from the simulator.
                  </p>
                  <div className="mt-4 space-y-3">
                    {scenarios.map((row) => (
                      <div key={row.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
                        <div>
                          <p className="font-semibold">{row.title}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{row.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">{row.after}/100</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            delta {row.delta > 0 ? "+" : ""}
                            {row.delta} pts
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

