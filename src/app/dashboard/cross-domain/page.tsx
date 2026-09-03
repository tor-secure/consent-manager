import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites } from "@/lib/intelligence/org-websites";
import PortableConsentTool from "@/components/cross-domain/portable-consent-tool";
import { Card, CardContent } from "@/components/ui/card";

export default async function CrossDomainPage() {
  const context = await requireDashboardContext();
  const sites = await loadOrgWebsites(context.organization.id);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Consent</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Cross-domain & cross-device consent</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Export an integrity-checked consent bundle from one website, then import it onto another website’s active policy.
          This enables portable consent across domains/devices inside the same CMP account.
        </p>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">
            No websites yet. Add a website to start exchanging consent.
          </CardContent>
        </Card>
      ) : (
        <PortableConsentTool websites={sites} />
      )}
    </div>
  );
}

