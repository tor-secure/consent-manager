import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { loadConsentGraph } from "@/lib/intelligence/graph-snapshot";
import { simulatePrivacyImpact } from "@/lib/intelligence/simulator";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function deltaLabel(delta: number) {
  if (delta === 0) return "no change";
  return `${delta > 0 ? "+" : ""}${delta} pts`;
}

export default async function DigitalTwinPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string }>;
}) {
  const context = await requireDashboardContext();
  const params = await searchParams;
  const sites = await loadOrgWebsites(context.organization.id);
  const websiteId = pickWebsiteId(sites, params.website);

  const snapshot = websiteId ? await loadConsentGraph(context.organization.id, websiteId) : null;
  const loaded = websiteId ? await loadQualityScoreInput(websiteId) : null;

  const baseline = loaded ? calculateConsentQualityScore(loaded.input) : null;
  const scenarios = loaded ? simulatePrivacyImpact(loaded.input) : [];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Consent digital twin</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          A combined view of the current consent dependency graph and the projected impact of configuration changes.
        </p>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : (
        <>
          <WebsiteFilter action="/dashboard/digital-twin" websites={sites.map((s) => ({ id: s.id, name: s.name }))} selected={websiteId} />

          {!websiteId || !snapshot || !loaded || !baseline ? (
            <Card>
              <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">
                Digital twin inputs are unavailable for this website.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Baseline twin state</h2>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      Operational score: <span className="font-semibold text-slate-900">{baseline.overall}/100</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Open findings: <span className="font-semibold text-slate-900">{loaded.openFindingCount ?? 0}</span>
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="neutral">Purposes: {snapshot.purposes.length}</Badge>
                      <Badge variant="neutral">Vendors: {snapshot.vendors.length}</Badge>
                      <Badge variant="neutral">Trackers: {snapshot.trackers.length}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Projected twin deltas</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Single-step what-if scenarios from the privacy impact simulator.
                    </p>
                    <div className="mt-4 space-y-2">
                      {scenarios.map((row) => (
                        <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                          <div>
                            <p className="text-sm font-semibold">{row.title}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{row.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">{row.after}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{deltaLabel(row.delta)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold">Dependency graph snapshot</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    How purposes, vendors, and trackers connect for this website.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold">Purposes</h3>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {snapshot.purposes.slice(0, 12).map((p) => (
                          <li key={p.id}>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-[var(--muted-foreground)]"> · {p.key}</span>
                            {p.isRequired ? <span className="text-[var(--muted-foreground)]"> · required</span> : null}
                          </li>
                        ))}
                        {snapshot.purposes.length > 12 ? (
                          <li className="text-[var(--muted-foreground)]">… +{snapshot.purposes.length - 12} more</li>
                        ) : null}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Vendors → purposes</h3>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {snapshot.vendors.slice(0, 12).map((v) => (
                          <li key={v.id}>
                            <span className="font-medium">{v.name}</span>
                            <span className="text-[var(--muted-foreground)]"> → {v.purposeIds.length ? `${v.purposeIds.length} linked` : "no purposes"}</span>
                          </li>
                        ))}
                        {snapshot.vendors.length > 12 ? (
                          <li className="text-[var(--muted-foreground)]">… +{snapshot.vendors.length - 12} more</li>
                        ) : null}
                      </ul>
                    </div>
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

