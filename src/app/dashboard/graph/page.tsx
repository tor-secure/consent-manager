import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { loadConsentGraph } from "@/lib/intelligence/graph-snapshot";

export default async function ConsentGraphPage({
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

  const purposeMap = new Map(snapshot?.purposes.map((row) => [row.id, row]) ?? []);
  const vendorMap = new Map(snapshot?.vendors.map((row) => [row.id, row]) ?? []);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Consent dependency graph</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          How purposes, vendors, and trackers connect for this website. Unmapped trackers stay blocked by default.
        </p>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : (
        <>
          <WebsiteFilter action="/dashboard/graph" websites={sites} selected={websiteId} />
          {!snapshot ? (
            <Card>
              <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">Website not found.</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold">Purposes</h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {snapshot.purposes.length === 0 ? (
                      <li className="text-[var(--muted-foreground)]">No purposes in this organization.</li>
                    ) : (
                      snapshot.purposes.map((purpose) => (
                        <li key={purpose.id}>
                          <span className="font-medium">{purpose.name}</span>
                          <span className="text-[var(--muted-foreground)]"> · {purpose.key}</span>
                          {purpose.isRequired ? (
                            <span className="text-[var(--muted-foreground)]"> · required</span>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold">Vendors → purposes</h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {snapshot.vendors.map((vendor) => (
                      <li key={vendor.id}>
                        <span className="font-medium">{vendor.name}</span>
                        <span className="text-[var(--muted-foreground)]">
                          {" "}
                          →{" "}
                          {vendor.purposeIds.length
                            ? vendor.purposeIds.map((id) => purposeMap.get(id)?.name ?? id).join(", ")
                            : "no purposes"}
                        </span>
                      </li>
                    ))}
                    {snapshot.vendors.length === 0 ? (
                      <li className="text-[var(--muted-foreground)]">No vendors yet.</li>
                    ) : null}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="overflow-x-auto p-5">
                  <h2 className="text-base font-semibold">Trackers</h2>
                  <table className="mt-3 min-w-full text-left text-sm">
                    <thead className="text-xs uppercase text-[var(--muted-foreground)]">
                      <tr>
                        <th className="pb-2 pr-4">Tracker</th>
                        <th className="pb-2 pr-4">Purpose</th>
                        <th className="pb-2 pr-4">Vendor</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.trackers.map((tracker) => (
                        <tr key={tracker.id} className="border-t border-slate-100">
                          <td className="py-2 pr-4">
                            {tracker.name}
                            {tracker.isEssential ? (
                              <span className="text-[var(--muted-foreground)]"> · essential</span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-4">
                            {tracker.purposeId ? purposeMap.get(tracker.purposeId)?.name ?? "—" : "—"}
                          </td>
                          <td className="py-2 pr-4">
                            {tracker.vendorId ? vendorMap.get(tracker.vendorId)?.name ?? "—" : "—"}
                          </td>
                          <td className="py-2">{tracker.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {snapshot.trackers.length === 0 ? (
                    <p className="mt-3 text-sm text-[var(--muted-foreground)]">No trackers recorded for this site.</p>
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
