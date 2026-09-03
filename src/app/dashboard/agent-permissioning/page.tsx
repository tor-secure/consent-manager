import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites } from "@/lib/intelligence/org-websites";
import AgentPermissionTool from "@/components/agent-permissioning/agent-permission-tool";
import { Card, CardContent } from "@/components/ui/card";

export default async function AgentPermissioningPage() {
  const context = await requireDashboardContext();
  const sites = await loadOrgWebsites(context.organization.id);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">AI</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">AI-agent permissioning</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Permission-checking for AI agents that want to access data categorized by consent purposes and vendor domains.
        </p>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : (
        <AgentPermissionTool websites={sites.map((s) => ({ id: s.id, name: s.name }))} />
      )}
    </div>
  );
}

