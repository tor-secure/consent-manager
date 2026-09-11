import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { loadConsentGraph } from "@/lib/intelligence/graph-snapshot";
import { simulatePrivacyImpact } from "@/lib/intelligence/simulator";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { RunIntelligenceButton } from "@/components/intelligence/run-intelligence-button";
import { diffTwinPayloads, listDigitalTwinSnapshots } from "@/lib/intelligence/service";
import { Field, FormCard } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";

function deltaLabel(delta: number) {
  if (delta === 0) return "no change";
  return `${delta > 0 ? "+" : ""}${delta} pts`;
}

function summarizeValue(value: unknown): string {
  if (value == null) return "Not present";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return `${Object.keys(value as Record<string, unknown>).length} field${Object.keys(value as Record<string, unknown>).length === 1 ? "" : "s"}`;
  return String(value);
}

export default async function DigitalTwinPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string; before?: string; after?: string }>;
}) {
  const context = await requireDashboardContext();
  const params = await searchParams;
  const sites = await loadOrgWebsites(context.organization.id);
  const websiteId = pickWebsiteId(sites, params.website);

  const [snapshot, loaded, history] = websiteId
    ? await Promise.all([
        loadConsentGraph(context.organization.id, websiteId),
        loadQualityScoreInput(websiteId),
        listDigitalTwinSnapshots(context.organization.id, websiteId),
      ])
    : [null, null, []];
  const before = history.find((item) => item.id === params.before);
  const after = history.find((item) => item.id === params.after);
  const comparison = before && after ? diffTwinPayloads(before.inputPayload, after.inputPayload) : [];

  const baseline = loaded ? calculateConsentQualityScore(loaded.input) : null;
  const scenarios = loaded ? simulatePrivacyImpact(loaded.input) : [];

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/intelligence">Intelligence</SectionEyebrow>}
        title="Consent digital twin"
        description="A combined view of the current consent dependency graph and the projected impact of configuration changes."
      />

      {sites.length === 0 ? (
        <EmptyState title="No website available for a digital twin" description="Add a website, then run a scan to create the first immutable consent snapshot." actionLabel="Add a website" actionHref="/dashboard/websites/new" />
      ) : (
        <>
          <WebsiteFilter action="/dashboard/digital-twin" websites={sites.map((s) => ({ id: s.id, name: s.name }))} selected={websiteId} />
          {websiteId ? <RunIntelligenceButton websiteId={websiteId} engine="digital_twin" /> : null}

          {!websiteId || !snapshot || !loaded || !baseline ? (
            <EmptyState
              title="Digital twin inputs are not ready"
              description="Run a scan and publish a policy so this page can snapshot the current consent graph."
              actionLabel="Open scanner"
              actionHref={websiteId ? `/dashboard/scanner?website=${websiteId}` : "/dashboard/scanner"}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-base font-semibold">Baseline twin state</h2>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      Operational score: <span className="font-semibold text-[var(--foreground)]">{baseline.overall}/100</span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Open findings: <span className="font-semibold text-[var(--foreground)]">{loaded.openFindingCount ?? 0}</span>
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
                        <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
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
                      <ul className="mt-2 space-y-1 text-sm text-[var(--secondary-foreground)]">
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
                      <ul className="mt-2 space-y-1 text-sm text-[var(--secondary-foreground)]">
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
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold">Immutable snapshot history</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Compare immutable scan and policy captures without exposing raw snapshot JSON.
                  </p>
                  {history.length >= 2 ? (
                    <form action="/dashboard/digital-twin" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                      <input type="hidden" name="website" value={websiteId} />
                      <Field label="Before snapshot" htmlFor="twin-before">
                        <Select id="twin-before" name="before" defaultValue={before?.id ?? history[1]?.id}>
                          {history.map((item) => <option key={item.id} value={item.id}>{item.source} · {item.createdAt.toLocaleString()}</option>)}
                        </Select>
                      </Field>
                      <Field label="After snapshot" htmlFor="twin-after">
                        <Select id="twin-after" name="after" defaultValue={after?.id ?? history[0]?.id}>
                          {history.map((item) => <option key={item.id} value={item.id}>{item.source} · {item.createdAt.toLocaleString()}</option>)}
                        </Select>
                      </Field>
                      <button className="btn btn-secondary" type="submit">Compare snapshots</button>
                    </form>
                  ) : null}
                  <div className="mt-4 space-y-2">
                    {history.slice(0, 12).map((item) => (
                      <div key={item.id} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                        <span className="font-medium">{item.source}</span>
                        <span className="text-[var(--muted-foreground)]"> · {item.createdAt.toLocaleString()} · score {item.qualityScore ?? "unknown"} · {item.graphHash.slice(0, 12)}</span>
                      </div>
                    ))}
                    {!history.length ? <p className="text-sm text-[var(--muted-foreground)]">No snapshots captured yet.</p> : null}
                  </div>
                  {before && after ? (
                    <FormCard className="mt-4" title="Snapshot differences" description={`${comparison.length} top-level section${comparison.length === 1 ? "" : "s"} changed.`}>
                      {comparison.length ? <div className="table-scroll rounded-xl border border-[var(--border)]"><table className="data-table"><caption className="sr-only">Digital twin snapshot differences</caption><thead><tr><th scope="col">Section</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>{comparison.map((item) => <tr key={item.key}><th scope="row" className="text-left font-medium capitalize">{item.key.replaceAll("_", " ")}</th><td>{summarizeValue(item.before)}</td><td>{summarizeValue(item.after)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-[var(--muted-foreground)]">These snapshots have no top-level differences.</p>}
                    </FormCard>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

