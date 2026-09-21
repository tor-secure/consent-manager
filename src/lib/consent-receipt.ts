import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentEvidenceSnapshots } from "@/db/schema/consent-evidence-snapshots";
import { consentRecords } from "@/db/schema/consent-records";
import { organizations } from "@/db/schema/organizations";
import { purposes } from "@/db/schema/purposes";
import { websites } from "@/db/schema/websites";
import { loadLatestSession } from "@/lib/children/service";
import { isConsentExpired } from "@/lib/consent-engine";
import { BRAND } from "@/lib/brand";
import { SITE_URL } from "@/lib/site-metadata";

export type ConsentReceiptPurpose = {
  name: string;
  key: string;
  required: boolean;
  granted: boolean;
  status: "Consented" | "Declined";
};

export type ConsentReceipt = {
  brand: {
    name: string;
    url: string;
    tagline: string;
  };
  consentId: string;
  property: string;
  domain: string;
  date: string | null;
  expires: string | null;
  status: string;
  statusCode: string;
  method: string;
  language: string;
  purposes: ConsentReceiptPurpose[];
  dpoName: string | null;
  dpoEmail: string | null;
  grievanceOfficerName: string | null;
  grievanceOfficerEmail: string | null;
  generatedAt: string;
};

function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function languageLabel(locale: string | null | undefined): string {
  const code = String(locale || "en").trim() || "en";
  try {
    const base = code.split("-")[0] || code;
    const display = new Intl.DisplayNames(["en"], { type: "language" });
    return display.of(base) || code;
  } catch {
    return code;
  }
}

function purposeStatus(granted: boolean): "Consented" | "Declined" {
  return granted ? "Consented" : "Declined";
}

function receiptStatus(input: {
  withdrawn: boolean;
  expired: boolean;
  recordStatus: string;
  purposes: ConsentReceiptPurpose[];
  under18: boolean;
}): { label: string; code: string } {
  if (input.withdrawn) return { label: "Consent Withdrawn", code: "withdrawn" };
  if (input.expired) return { label: "Expired", code: "expired" };
  if (input.under18) return { label: "Consent Declined", code: "declined" };

  const optional = input.purposes.filter((row) => !row.required);
  const optionalGranted = optional.filter((row) => row.granted);
  if (optional.length > 0 && optionalGranted.length === 0) {
    return { label: "Essential only", code: "essential" };
  }
  if (input.recordStatus === "accepted" || (optional.length > 0 && optionalGranted.length === optional.length)) {
    return { label: "Consent Granted", code: "granted" };
  }
  if (input.recordStatus === "rejected") return { label: "Consent Declined", code: "declined" };
  return { label: "Custom preferences", code: "custom" };
}

export async function loadPublicConsentReceipt(input: {
  consentId: string;
  websiteId: string;
  siteKey: string;
}): Promise<
  | { ok: true; receipt: ConsentReceipt; website: { domain: string; verified: boolean | null } }
  | { ok: false; status: number; message: string }
> {
  const [row] = await db
    .select({
      recordId: consentRecords.id,
      consentId: consentRecords.consentId,
      organizationId: consentRecords.organizationId,
      websiteId: consentRecords.websiteId,
      status: consentRecords.status,
      consentedAt: consentRecords.consentedAt,
      expiresAt: consentRecords.expiresAt,
      withdrawnAt: consentRecords.withdrawnAt,
      metadata: consentRecords.metadata,
      siteKey: websites.siteKey,
      domain: websites.domain,
      websiteName: websites.name,
      verified: websites.verified,
      orgName: organizations.name,
      dpoName: organizations.dpoName,
      dpoEmail: organizations.dpoEmail,
      grievanceOfficerName: organizations.grievanceOfficerName,
      grievanceOfficerEmail: organizations.grievanceOfficerEmail,
    })
    .from(consentRecords)
    .innerJoin(websites, eq(consentRecords.websiteId, websites.id))
    .innerJoin(organizations, eq(consentRecords.organizationId, organizations.id))
    .where(
      and(
        eq(consentRecords.consentId, input.consentId),
        eq(consentRecords.websiteId, input.websiteId),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, status: 404, message: "Consent record not found" };
  if (row.siteKey !== input.siteKey) return { ok: false, status: 403, message: "siteKey is required" };

  const [decisions, latestSnapshot, ageSession] = await Promise.all([
    db
      .select({
        purposeId: consentDecisions.purposeId,
        granted: consentDecisions.granted,
      })
      .from(consentDecisions)
      .where(eq(consentDecisions.consentRecordId, row.recordId)),
    db
      .select({
        choice: consentEvidenceSnapshots.choice,
        locale: consentEvidenceSnapshots.locale,
        status: consentEvidenceSnapshots.status,
        consentedAt: consentEvidenceSnapshots.consentedAt,
      })
      .from(consentEvidenceSnapshots)
      .where(
        and(
          eq(consentEvidenceSnapshots.consentId, input.consentId),
          eq(consentEvidenceSnapshots.websiteId, input.websiteId),
        ),
      )
      .orderBy(desc(consentEvidenceSnapshots.consentedAt))
      .limit(1),
    loadLatestSession({
      organizationId: row.organizationId,
      websiteId: row.websiteId,
      consentId: row.consentId,
    }),
  ]);

  const purposeIds = [...new Set(decisions.map((d) => d.purposeId).filter((id): id is string => Boolean(id)))];
  const purposeRows = purposeIds.length
    ? await db
        .select({
          id: purposes.id,
          key: purposes.key,
          name: purposes.name,
          isRequired: purposes.isRequired,
        })
        .from(purposes)
        .where(inArray(purposes.id, purposeIds))
    : [];
  const purposeById = new Map(purposeRows.map((p) => [p.id, p]));

  const receiptPurposes: ConsentReceiptPurpose[] = decisions
    .filter((d) => d.purposeId)
    .map((d) => {
      const purpose = purposeById.get(d.purposeId as string);
      const granted = purpose?.isRequired ? true : d.granted;
      return {
        name: purpose?.name || "Purpose",
        key: purpose?.key || "",
        required: Boolean(purpose?.isRequired),
        granted,
        status: purposeStatus(granted),
      };
    })
    .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name));

  const withdrawn = row.status === "withdrawn" || Boolean(row.withdrawnAt);
  const expired = isConsentExpired(row);
  const under18 = Boolean(
    ageSession &&
      ["minor", "child", "age_restricted", "guardian_required"].includes(ageSession.ageStatus),
  );
  const status = receiptStatus({
    withdrawn,
    expired,
    recordStatus: row.status,
    purposes: receiptPurposes,
    under18,
  });

  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const metadataChoice = typeof metadata.choice === "string" ? metadata.choice : "";
  const snapshot = latestSnapshot[0];
  const method = withdrawn
    ? "withdrawn"
    : under18
      ? "age_gate_minor"
      : snapshot?.choice || metadataChoice || row.status;

  return {
    ok: true,
    website: { domain: row.domain, verified: row.verified },
    receipt: {
      brand: {
        name: BRAND.name,
        url: SITE_URL.replace(/^https?:\/\//, ""),
        tagline: "Consent Management",
      },
      consentId: row.consentId,
      property: row.websiteName || row.orgName,
      domain: row.domain,
      date: isoDate(snapshot?.consentedAt || row.consentedAt),
      expires: withdrawn || expired ? null : isoDate(row.expiresAt),
      status: status.label,
      statusCode: status.code,
      method,
      language: languageLabel(snapshot?.locale || (typeof metadata.noticeLanguage === "string" ? metadata.noticeLanguage : "en")),
      purposes: receiptPurposes,
      dpoName: row.dpoName,
      dpoEmail: row.dpoEmail,
      grievanceOfficerName: row.grievanceOfficerName,
      grievanceOfficerEmail: row.grievanceOfficerEmail,
      generatedAt: isoDate(new Date()) || new Date().toISOString().slice(0, 10),
    },
  };
}
