import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { evaluateFirewall, grantsForScenario, type FirewallScenario } from "@/lib/intelligence/firewall";
import { graphToTrackerRules, loadConsentGraph } from "@/lib/intelligence/graph-snapshot";
import { PageHeader } from "@/components/ui/page-header";

const SCENARIOS: FirewallScenario[] = ["reject-all", "essential-only", "accept-all"];

function scenarioLabel(value: FirewallScenario) {
  if (value === "reject-all") return "Reject all";
  if (value === "essential-only") return "Essential only";
  return "Accept all";
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default async function ConsentFirewallPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string; scenario?: string }>;
}) {
  const context = await requireDashboardContext();
  const params = await searchParams;
  const sites = await loadOrgWebsites(context.organization.id);
  const websiteId = pickWebsiteId(sites, params.website);
  const scenario = SCENARIOS.includes(params.scenario as FirewallScenario)
    ? (params.scenario as FirewallScenario)
    : "reject-all";

  const snapshot = websiteId
    ? await loadConsentGraph(context.organization.id, websiteId)
    : null;
  const result = snapshot
    ? evaluateFirewall(graphToTrackerRules(snapshot), grantsForScenario(snapshot, scenario))
    : null;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Intelligence"
        title="Consent firewall"
        description="Preview which trackers the SDK would block or allow for a visitor choice, using the live tracker map."
      />

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : (
        <>
          <WebsiteFilter action="/dashboard/firewall" websites={sites} selected={websiteId} />
          <form className="mb-6 flex flex-wrap gap-2" action="/dashboard/firewall">
            <input type="hidden" name="website" value={websiteId} />
            {SCENARIOS.map((value) => (
              <button
                key={value}
                type="submit"
                name="scenario"
                value={value}
                className={`h-9 rounded-xl px-3 text-sm font-medium ${
                  scenario === value
                    ? "bg-[var(--primary)] text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {scenarioLabel(value)}
              </button>
            ))}
          </form>

          {result ? (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <StatCard label="Blocked" value={result.blockedCount} icon={<IconShield />} iconColor="rose" />
                <StatCard label="Allowed" value={result.allowedCount} icon={<IconShield />} iconColor="green" />
                <StatCard
                  label="Blocked domains"
                  value={result.blockedDomains.length}
                  icon={<IconShield />}
                  iconColor="amber"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Blocked</h2>
                    <ul className="mt-3 space-y-2">
                      {result.blocked.length === 0 ? (
                        <li className="text-sm text-[var(--muted-foreground)]">Nothing blocked in this scenario.</li>
                      ) : (
                        result.blocked.map((row) => (
                          <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                            <span>
                              {row.name}
                              {row.domain ? (
                                <span className="text-[var(--muted-foreground)]"> · {row.domain}</span>
                              ) : null}
                            </span>
                            <Badge variant={row.reason === "unclassified" ? "warning" : "neutral"}>
                              {row.reason.replaceAll("_", " ")}
                            </Badge>
                          </li>
                        ))
                      )}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Allowed</h2>
                    <ul className="mt-3 space-y-2">
                      {result.allowed.length === 0 ? (
                        <li className="text-sm text-[var(--muted-foreground)]">Nothing allowed in this scenario.</li>
                      ) : (
                        result.allowed.map((row) => (
                          <li key={row.id} className="text-sm">
                            {row.name}
                            {row.domain ? (
                              <span className="text-[var(--muted-foreground)]"> · {row.domain}</span>
                            ) : null}
                          </li>
                        ))
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">Website not found.</CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
