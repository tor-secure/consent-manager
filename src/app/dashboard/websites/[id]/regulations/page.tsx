import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { requireTenantWebsite } from "@/lib/tenant-website";
import { consentPolicies } from "@/db/schema/consent-policies";
import { websiteJurisdictionRules } from "@/db/schema/website-jurisdiction-rules";
import { parseConsentIntegrations } from "@/lib/signals/consent-integrations";
import { WebsiteRegulationForm } from "@/components/websites/website-regulation-form";
import { GeoLegalEnginePreview } from "@/components/websites/geo-legal-engine-preview";

export default async function WebsiteRegulationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const website = await requireTenantWebsite(id);

  const [policies, rules] = await Promise.all([
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
  ]);

  return (
    <div className="page-wrap space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/websites" className="transition hover:text-slate-900">Websites</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <Link href={`/dashboard/websites/${website.id}`} className="transition hover:text-slate-900">{website.name}</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="text-slate-900">Regulations</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Consent regulations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure jurisdiction-aware policy selection and optional Google / IAB signals. These settings do not make the organization legally compliant.
        </p>
      </div>

      <GeoLegalEnginePreview websiteId={website.id} />

      <WebsiteRegulationForm
        websiteId={website.id}
        policies={policies}
        defaultRegulationKey={website.defaultRegulationKey}
        integrations={parseConsentIntegrations(website.consentIntegrations)}
        rules={rules}
      />
    </div>
  );
}
