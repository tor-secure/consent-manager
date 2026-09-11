import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites } from "@/lib/intelligence/org-websites";
import PortableConsentTool from "@/components/cross-domain/portable-consent-tool";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CrossDomainPage() {
  const context = await requireDashboardContext();
  const sites = await loadOrgWebsites(context.organization.id);

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/intelligence">Intelligence</SectionEyebrow>}
        title="Cross-domain & cross-device consent"
        description="Export an integrity-checked consent bundle from one website, then import it onto another website’s active policy. This enables portable consent across domains/devices inside the same CMP account."
      />

      {sites.length < 2 ? (
        <EmptyState title="Add two websites to exchange consent" description="Portable consent needs two sites, a published policy, and an active consent record on the source website." actionLabel="Add a website" actionHref="/dashboard/websites/new" />
      ) : (
        <PortableConsentTool websites={sites} />
      )}
    </div>
  );
}

