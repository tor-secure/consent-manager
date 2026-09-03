import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites } from "@/lib/intelligence/org-websites";
import DataRedactionTool from "@/components/data-redaction/data-redaction-tool";
import { Card, CardContent } from "@/components/ui/card";

export default async function DataRedactionPage() {
  const context = await requireDashboardContext();
  const sites = await loadOrgWebsites(context.organization.id);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Governance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Real-time data redaction</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          MVP: filters the analytics purpose breakdown to only expose granted (or essential) purposes for a chosen consent record.
        </p>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : (
        <DataRedactionTool websites={sites.map((s) => ({ id: s.id, name: s.name }))} />
      )}
    </div>
  );
}

