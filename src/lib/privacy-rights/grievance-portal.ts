import "server-only";

import { eq } from "drizzle-orm";

import { PRIVACY_CENTRE_ORG } from "@/content/privacy-centre";
import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { isValidSiteKey } from "@/lib/sdk/public-http";

export type GrievancePortalContact = {
  fiduciaryName: string;
  websiteLabel: string;
  dpoName: string | null;
  dpoEmail: string | null;
  grievanceOfficerName: string | null;
  grievanceOfficerEmail: string | null;
  addressLines: string[];
};

export function consentGuruGrievanceContact(): GrievancePortalContact {
  return {
    fiduciaryName: PRIVACY_CENTRE_ORG.name,
    websiteLabel: PRIVACY_CENTRE_ORG.website,
    dpoName: PRIVACY_CENTRE_ORG.dpoName,
    dpoEmail: PRIVACY_CENTRE_ORG.dpoEmail,
    grievanceOfficerName: PRIVACY_CENTRE_ORG.dpoName,
    grievanceOfficerEmail: PRIVACY_CENTRE_ORG.dpoEmail,
    addressLines: [...PRIVACY_CENTRE_ORG.addressLines],
  };
}

export async function loadGrievancePortalContact(
  siteKey: string | null,
): Promise<GrievancePortalContact> {
  const fallback = consentGuruGrievanceContact();
  if (!siteKey || !isValidSiteKey(siteKey)) return fallback;

  const [website] = await db
    .select({
      organizationId: websites.organizationId,
      name: websites.name,
      domain: websites.domain,
      status: websites.status,
    })
    .from(websites)
    .where(eq(websites.siteKey, siteKey))
    .limit(1);
  if (!website || website.status !== "active") return fallback;

  const [org] = await db
    .select({
      name: organizations.name,
      status: organizations.status,
      dpoName: organizations.dpoName,
      dpoEmail: organizations.dpoEmail,
      grievanceOfficerName: organizations.grievanceOfficerName,
      grievanceOfficerEmail: organizations.grievanceOfficerEmail,
    })
    .from(organizations)
    .where(eq(organizations.id, website.organizationId))
    .limit(1);
  if (!org || org.status !== "active") return fallback;

  return {
    fiduciaryName: org.name || website.name || fallback.fiduciaryName,
    websiteLabel: website.domain || fallback.websiteLabel,
    dpoName: org.dpoName || org.grievanceOfficerName || fallback.dpoName,
    dpoEmail: org.dpoEmail || org.grievanceOfficerEmail || fallback.dpoEmail,
    grievanceOfficerName: org.grievanceOfficerName || org.dpoName || fallback.grievanceOfficerName,
    grievanceOfficerEmail: org.grievanceOfficerEmail || org.dpoEmail || fallback.grievanceOfficerEmail,
    addressLines: [],
  };
}
