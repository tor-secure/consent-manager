import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites } from "@/lib/intelligence/org-websites";
import AgentPermissionTool from "@/components/agent-permissioning/agent-permission-tool";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AgentPermissioningPage() {
  const context = await requireDashboardContext();
  const sites = await loadOrgWebsites(context.organization.id);

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="AI"
        title="AI-agent permissioning"
        description="Permission-checking for AI agents that want to access data categorized by consent purposes and vendor domains."
      />

      {sites.length === 0 ? (
        <EmptyState title="No website available for permission checks" description="Add a website, install the SDK, and collect a consent record before evaluating agent access." actionLabel="Add a website" actionHref="/dashboard/websites/new" />
      ) : (
        <AgentPermissionTool websites={sites.map((s) => ({ id: s.id, name: s.name }))} />
      )}
    </div>
  );
}

