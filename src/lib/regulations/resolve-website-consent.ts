import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { consentPolicies } from "@/db/schema/consent-policies";
import { websiteJurisdictionRules } from "@/db/schema/website-jurisdiction-rules";
import { resolveJurisdiction } from "@/lib/regulations/geo";
import { matchRegulationFromGeo, resolveRegulationProfile } from "@/lib/regulations/engine";
import { selectConsentPolicy } from "@/lib/regulations/policy-selection";
import { runGeoLegalEngine } from "@/lib/regulations/legal-engine";

export async function resolveWebsiteConsentContext(input: {
  websiteId: string;
  organizationId: string;
  websiteDefaultRegion: string | null;
  defaultRegulationKey: string | null;
  country?: string | null;
  region?: string | null;
}) {
  const geo = resolveJurisdiction({
    country: input.country,
    region: input.region,
    websiteDefaultRegion: input.websiteDefaultRegion,
  });

  const [policies, rules] = await Promise.all([
    db
      .select({
        id: consentPolicies.id,
        isDefault: consentPolicies.isDefault,
        status: consentPolicies.status,
        createdAt: consentPolicies.createdAt,
        name: consentPolicies.name,
      })
      .from(consentPolicies)
      .where(eq(consentPolicies.websiteId, input.websiteId)),
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
          eq(websiteJurisdictionRules.websiteId, input.websiteId),
          eq(websiteJurisdictionRules.organizationId, input.organizationId),
        ),
      ),
  ]);

  const selection = selectConsentPolicy({
    country: geo.country,
    region: geo.region,
    rules,
    policies,
    defaultRegulationKey: input.defaultRegulationKey,
  });

  const selectedPolicy = policies.find((policy) => policy.id === selection.policyId) ?? null;
  const configured = selection.regulationKey
    ? resolveRegulationProfile({ key: selection.regulationKey })
    : null;
  const inferred = matchRegulationFromGeo({ country: geo.country, region: geo.region });
  const regulation = configured ?? inferred;

  const legalEngine = runGeoLegalEngine({
    country: input.country,
    region: input.region,
    websiteDefaultRegion: input.websiteDefaultRegion,
    selection,
    configuredRegulation: configured,
    inferredRegulation: inferred,
    regulation,
    regulationSource: configured ? "configured" : inferred ? "inferred" : "none",
  });

  return {
    geo,
    selection,
    selectedPolicy,
    regulation,
    regulationSource: configured ? "configured" : inferred ? "inferred" : "none",
    legalEngine,
  };
}
