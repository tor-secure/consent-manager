import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites } from "@/lib/intelligence/org-websites";
import DataRedactionTool from "@/components/data-redaction/data-redaction-tool";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DataRedactionPage() {
  const context = await requireDashboardContext();
  const sites = await loadOrgWebsites(context.organization.id);

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/intelligence">Intelligence</SectionEyebrow>}
        title="Real-time data redaction"
        description="Uses the same redaction engine as /api/v1/redact. Dry run is the default."
      />

      {sites.length === 0 ? (
        <EmptyState title="No analytics source available" description="Add a website, publish a policy, and install the SDK so a consent record exists before previewing redaction." actionLabel="Add a website" actionHref="/dashboard/websites/new" />
      ) : (
        <DataRedactionTool websites={sites.map((s) => ({ id: s.id, name: s.name }))} />
      )}
    </div>
  );
}

