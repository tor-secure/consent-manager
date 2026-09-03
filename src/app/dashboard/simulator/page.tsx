import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { simulatePrivacyImpact } from "@/lib/intelligence/simulator";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";

function IconSim() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2">
      <path d="M4 19h16M7 16V8m5 8V4m5 12v-6" />
    </svg>
  );
}

export default async function PrivacyImpactSimulatorPage({
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

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Privacy impact simulator</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Estimates how the operational quality score would change if you mapped trackers, resolved findings, published a policy, or covered scan items. This is not a legal assessment.
        </p>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : (
        <>
          <WebsiteFilter action="/dashboard/simulator" websites={sites} selected={websiteId} />
          {loaded && baseline ? (
            <>
              <div className="mb-6">
                <StatCard
                  label={`${loaded.websiteName} score`}
                  value={`${baseline.overall}/100`}
                  icon={<IconSim />}
                  iconColor="purple"
                  description={loaded.websiteDomain}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {scenarios.map((row) => (
                  <Card key={row.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold">{row.title}</h2>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{row.description}</p>
                        </div>
                        <p className="text-right text-lg font-semibold">
                          {row.after}
                          <span className="block text-xs font-normal text-[var(--muted-foreground)]">
                            {row.delta === 0 ? "no change" : `${row.delta > 0 ? "+" : ""}${row.delta} pts`}
                          </span>
                        </p>
                      </div>
                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                        Current {row.before} → simulated {row.after}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">
                Quality inputs are unavailable for this website (missing CMP snapshot or schema).
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
