import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { loadConsentGraph } from "@/lib/intelligence/graph-snapshot";
import { simulatePrivacyImpact } from "@/lib/intelligence/simulator";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";
import { buildConsentRecommendations } from "@/lib/intelligence/recommendations";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { buildAutopilotPlan } from "@/lib/intelligence/autopilot-engine";
import { RunIntelligenceButton } from "@/components/intelligence/run-intelligence-button";
import { EmptyState } from "@/components/ui/empty-state";
import { AutopilotPlanControls } from "@/components/intelligence/autopilot-plan-controls";
import { db } from "@/db";
import { autopilotPlans } from "@/db/schema/intelligence";
import { and, desc, eq } from "drizzle-orm";

function severityVariant(severity: string): "danger" | "warning" | "neutral" {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "neutral";
}

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

export default async function AutopilotPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string }>;
}) {
  const context = await requireDashboardContext();
  const params = await searchParams;
  const sites = await loadOrgWebsites(context.organization.id);
  const websiteId = pickWebsiteId(sites, params.website);

  const [loaded, snapshot, latestPlan] = websiteId
    ? await Promise.all([
        loadQualityScoreInput(websiteId),
        loadConsentGraph(context.organization.id, websiteId),
        db
          .select()
          .from(autopilotPlans)
          .where(
            and(
              eq(autopilotPlans.organizationId, context.organization.id),
              eq(autopilotPlans.websiteId, websiteId),
            ),
          )
          .orderBy(desc(autopilotPlans.createdAt))
          .limit(1)
          .then((rows) => rows[0] ?? null),
      ])
    : [null, null, null];
  const baseline = loaded ? calculateConsentQualityScore(loaded.input) : null;

  const quality = baseline;
  const openFindingCount = loaded?.openFindingCount ?? 0;
  const published = loaded?.published ?? false;
  const recommendations =
    snapshot && quality
      ? buildConsentRecommendations({
          snapshot,
          quality,
          openFindingCount,
          published,
        })
      : [];

  const scenarios = loaded ? simulatePrivacyImpact(loaded.input) : [];
  const bestNext = scenarios.slice().sort((a, b) => b.delta - a.delta)[0] ?? null;

  const plan = loaded ? buildAutopilotPlan(loaded.input).steps : [];
  const persistedPlan = latestPlan?.plan as { steps?: Array<{ id: string; title?: string; applyMode?: string; reversible?: boolean; legalPublication?: boolean }>; appliedStepIds?: string[] } | null;
  const safeSteps = (persistedPlan?.steps ?? [])
    .filter((step) => step.applyMode === "operator_approval" && step.reversible && !step.legalPublication)
    .map((step) => ({ id: step.id, title: step.title ?? step.id.replaceAll("_", " "), applied: persistedPlan?.appliedStepIds?.includes(step.id) ?? false }));

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/intelligence">Intelligence</SectionEyebrow>}
        title="AI consent autopilot"
        description="Generates an ordered configuration plan by combining quality score inputs, consent dependency graph, and the privacy impact simulator. This is an assisted autopilot (no auto-publishing yet)."
      />

      {sites.length === 0 ? (
        <EmptyState title="No website available for autopilot" description="Add a website, publish a policy, and run a scan to generate an assisted remediation plan." actionLabel="Add a website" actionHref="/dashboard/websites/new" />
      ) : (
        <>
          <WebsiteFilter action="/dashboard/autopilot" websites={sites.map((s) => ({ id: s.id, name: s.name }))} selected={websiteId} />
          {websiteId ? <RunIntelligenceButton websiteId={websiteId} engine="autopilot" /> : null}

          {!websiteId || !loaded || !baseline || !snapshot ? (
            <EmptyState
              title="Quality inputs are not ready"
              description="Publish a policy and run a scan so autopilot can read the CMP snapshot and quality score."
              actionLabel="Open scanner"
              actionHref={websiteId ? `/dashboard/scanner?website=${websiteId}` : "/dashboard/scanner"}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Baseline</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Operational consent quality score: <span className="font-semibold text-[var(--foreground)]">{baseline.overall}/100</span>
                    </p>
                    {quality?.category ? (
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                        Category: <span className="font-medium text-[var(--foreground)]">{quality.category.replaceAll("_", " ")}</span>
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Next best action</h2>
                    {bestNext ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium">{bestNext.title}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">{bestNext.description}</p>
                        <Link href={scenarioToActionHref(bestNext.id)} className="btn btn-primary">
                          Open related page
                        </Link>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--muted-foreground)]">No improving scenario found.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold">Autopilot plan</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Cumulatively recomputed steps. Legal publication is always routed to explicit operator action.
                  </p>
                  {latestPlan ? (
                    <div className="mt-4">
                      <AutopilotPlanControls planId={latestPlan.id} status={latestPlan.status} rollbackAvailable={Boolean(latestPlan.rollbackState)} safeSteps={safeSteps} />
                    </div>
                  ) : null}
                  {plan.length ? (
                    <div className="mt-4 space-y-3">
                      {plan.map((row) => (
                        <div key={row.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{row.title}</p>
                              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{row.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">{row.after}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                delta {row.delta > 0 ? "+" : ""}
                                {row.delta} pts
                              </p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <Link href={scenarioToActionHref(row.id)} className="btn btn-secondary">
                              {row.applyMode === "operator_approval" ? "Review and approve" : "Open operator workflow"}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--muted-foreground)]">No positive delta steps found.</p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Recommendations</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Actionable config gaps from graph + quality.</p>
                    <div className="mt-4 space-y-3">
                      {recommendations.length ? (
                        recommendations.map((item) => (
                          <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold">{item.title}</p>
                                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.detail}</p>
                              </div>
                              <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                            </div>
                            <div className="mt-3">
                              <Link href={item.href} className="btn btn-primary">
                                Open
                              </Link>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--muted-foreground)]">No recommendations found.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">What-if scenarios</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Single-step quality deltas.</p>
                    <div className="mt-4 space-y-3">
                      {scenarios.map((row) => (
                        <div key={row.id} className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                          <div>
                            <p className="font-semibold">{row.title}</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{row.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">{row.after}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {row.delta > 0 ? "+" : ""}
                              {row.delta} pts
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

