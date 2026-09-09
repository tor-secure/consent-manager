import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { requireTenantWebsite } from "@/lib/tenant-website";
import { consentPolicies } from "@/db/schema/consent-policies";
import { websiteJurisdictionRules } from "@/db/schema/website-jurisdiction-rules";
import { parseConsentIntegrations } from "@/lib/signals/consent-integrations";
import { WebsiteRegulationForm } from "@/components/websites/website-regulation-form";
import { GeoLegalEnginePreview } from "@/components/websites/geo-legal-engine-preview";
import { getIabRegistration } from "@/lib/signals/iab-adapter";
import { getCurrentGvl } from "@/lib/signals/iab-gvl-sync";
import { PageHeader } from "@/components/ui/page-header";

export default async function WebsiteRegulationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const website = await requireTenantWebsite(id);

  const [policies, rules, currentGvl] = await Promise.all([
    db
      .select({
        id: consentPolicies.id,
        name: consentPolicies.name,
        status: consentPolicies.status,
        isDefault: consentPolicies.isDefault,
      })
      .from(consentPolicies)
      .where(eq(consentPolicies.websiteId, website.id)),
    db
      .select({
        countryCode: websiteJurisdictionRules.countryCode,
        regionCode: websiteJurisdictionRules.regionCode,
        policyId: websiteJurisdictionRules.policyId,
        regulationKey: websiteJurisdictionRules.regulationKey,
      })
      .from(websiteJurisdictionRules)
      .where(
        and(
          eq(websiteJurisdictionRules.websiteId, website.id),
          eq(websiteJurisdictionRules.organizationId, website.organizationId),
        ),
      ),
    getCurrentGvl(),
  ]);

  return (
    <div className="page-wrap space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/websites" className="transition hover:text-[var(--foreground)]">Websites</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/dashboard/websites/${website.id}`} className="transition hover:text-[var(--foreground)]">{website.name}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--foreground)]" aria-current="page">Regulations</span>
      </nav>

      <PageHeader eyebrow={website.name} title="Consent regulations" description="Configure jurisdiction-aware policy selection and optional Google / IAB signals. These operational settings are not legal advice or certification." />

      <GeoLegalEnginePreview websiteId={website.id} />

      <WebsiteRegulationForm
        websiteId={website.id}
        policies={policies}
        defaultRegulationKey={website.defaultRegulationKey}
        integrations={parseConsentIntegrations(website.consentIntegrations)}
        rules={rules}
        iabReadiness={{
          registered: getIabRegistration(process.env, website.iabRegistration).valid,
          gvlVersion: currentGvl?.version ?? null,
        }}
        iabRegistration={website.iabRegistration as { cmpId?: number | null; cmpVersion?: number | null } | null}
      />
    </div>
  );
}
