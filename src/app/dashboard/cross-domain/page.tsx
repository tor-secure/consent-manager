import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites } from "@/lib/intelligence/org-websites";
import PortableConsentTool from "@/components/cross-domain/portable-consent-tool";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default async function CrossDomainPage() {
  const context = await requireDashboardContext();
  const sites = await loadOrgWebsites(context.organization.id);

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Consent"
        title="Cross-domain & cross-device consent"
        description="Export an integrity-checked consent bundle from one website, then import it onto another website’s active policy. This enables portable consent across domains/devices inside the same CMP account."
      />

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

