import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { buildDataFlowMap } from "@/lib/intelligence/data-flow";
import { loadConsentGraph } from "@/lib/intelligence/graph-snapshot";

export default async function DataFlowMapPage({
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
  const hops = snapshot ? buildDataFlowMap(snapshot) : [];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Data flow consent map</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Tracker → vendor → purpose → data categories for active scripts on this website.
        </p>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : !snapshot ? (
        <>
          <WebsiteFilter action="/dashboard/data-flow" websites={sites} selected={websiteId} />
          <Card>
            <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">Website not found.</CardContent>
          </Card>
        </>
      ) : (
        <>
          <WebsiteFilter action="/dashboard/data-flow" websites={sites} selected={websiteId} />
          <Card>
            <CardContent className="overflow-x-auto p-5">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--muted-foreground)]">
                  <tr>
                    <th className="pb-2 pr-4">Tracker</th>
                    <th className="pb-2 pr-4">Vendor</th>
                    <th className="pb-2 pr-4">Country</th>
                    <th className="pb-2 pr-4">Purpose</th>
                    <th className="pb-2">Data categories</th>
                  </tr>
                </thead>
                <tbody>
                  {hops.map((hop) => (
                    <tr key={hop.trackerId} className="border-t border-slate-100 align-top">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{hop.tracker}</span>
                        <span className="block text-xs text-[var(--muted-foreground)]">
                          {hop.trackerType}
                          {hop.domain ? ` · ${hop.domain}` : ""}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{hop.vendor ?? "Unmapped"}</td>
                      <td className="py-2 pr-4">{hop.vendorCountry ?? "—"}</td>
                      <td className="py-2 pr-4">{hop.purpose ?? "Unmapped"}</td>
                      <td className="py-2">
                        {hop.dataCategories.length ? hop.dataCategories.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hops.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">No active trackers to map.</p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
