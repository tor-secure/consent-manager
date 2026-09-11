import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites } from "@/lib/intelligence/org-websites";
import DataRedactionTool from "@/components/data-redaction/data-redaction-tool";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DataRedactionPage() {
  const context = await requireDashboardContext();
  const sites = await loadOrgWebsites(context.organization.id);

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Governance"
        title="Real-time data redaction"
        description="MVP: filters the analytics purpose breakdown to only expose granted (or essential) purposes for a chosen consent record."
      />

      {sites.length === 0 ? (
        <EmptyState title="No analytics source available" description="Add a website, publish a policy, and install the SDK so a consent record exists before previewing redaction." actionLabel="Add a website" actionHref="/dashboard/websites/new" />
      ) : (
        <DataRedactionTool websites={sites.map((s) => ({ id: s.id, name: s.name }))} />
      )}
    </div>
  );
}

