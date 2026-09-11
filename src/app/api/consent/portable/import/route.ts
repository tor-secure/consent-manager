import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, gt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentEvents } from "@/db/schema/consent-events";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentRecords } from "@/db/schema/consent-records";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { portableConsentExchanges } from "@/db/schema/portable-consent-exchanges";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { resolveConsentState } from "@/lib/consent-evaluation-core";
import {
  hashPortableExchangeSecret,
  verifyPortableConsentCryptoProof,
  type PortableConsentClaims,
  type PortableConsentCryptoProof,
} from "@/lib/portable-consent-proof";
import { validatePortableClaims } from "@/lib/portable-consent-core";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  isValidWebsiteId,
  publicCorsHeaders,
  publicOptionsResponse,
  readPublicJsonObject,
} from "@/lib/sdk/public-http";

const HEADERS = { ...publicCorsHeaders("POST, OPTIONS"), "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const limit = rateLimit({
      key: `portable-import:${getClientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, HEADERS);

    const parsed = await readPublicJsonObject(request);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: parsed.status, headers: HEADERS });
    }
    const targetWebsiteId = String(parsed.body.targetWebsiteId ?? "").trim();
    if (!isValidWebsiteId(targetWebsiteId)) return failure(400, "Invalid targetWebsiteId");

    const supplied = resolveSuppliedBundle(parsed.body);
    if (!supplied) return failure(400, "A token, code, or signed portable bundle is required");

    const [target] = await db.select({
      id: websites.id,
      organizationId: websites.organizationId,
      domain: websites.domain,
    }).from(websites).where(and(
      eq(websites.id, targetWebsiteId),
      eq(websites.status, "active"),
      isNull(websites.deletedAt),
    )).limit(1);
    if (!target) return failure(404, "Target website not found");
    if (!(await callerMayImport(request, target.organizationId, target.domain))) {
      return failure(403, "Origin is not authorized for the target website");
    }

    const now = new Date();
    const imported = await db.transaction(async (tx) => {
      let lookup;
      if (supplied.kind === "code") {
        lookup = eq(portableConsentExchanges.codeHash, hashPortableExchangeSecret(supplied.value.toUpperCase()));
      } else if (supplied.kind === "token") {
        lookup = eq(portableConsentExchanges.tokenHash, hashPortableExchangeSecret(supplied.value));
      } else {
        lookup = eq(portableConsentExchanges.jti, supplied.claims.jti);
      }

      const [exchange] = await tx.select().from(portableConsentExchanges).where(and(
        lookup,
        eq(portableConsentExchanges.targetWebsiteId, targetWebsiteId),
        eq(portableConsentExchanges.organizationId, target.organizationId),
        eq(portableConsentExchanges.status, "issued"),
        isNull(portableConsentExchanges.consumedAt),
        gt(portableConsentExchanges.expiresAt, now),
      )).limit(1);
      if (!exchange) return { error: "Exchange is invalid, expired, or already consumed", status: 409 as const };

      const stored = exchange.claims as { claims?: PortableConsentClaims; proof?: PortableConsentCryptoProof };
      const bundle = supplied.kind === "bundle" ? supplied : stored;
      const claims = bundle.claims;
      const proof = bundle.proof;
      if (!claims || !proof || !validatePortableClaims(claims, targetWebsiteId, now) ||
          claims.jti !== exchange.jti ||
          !verifyPortableConsentCryptoProof({ claims, proof }).intact) {
        return { error: "Portable consent proof is invalid", status: 400 as const };
      }

      if (!exchange.sourceConsentRecordId) {
        return { error: "Source consent is no longer active", status: 409 as const };
      }
      const [source] = await tx.select({
        id: consentRecords.id,
        status: consentRecords.status,
        expiresAt: consentRecords.expiresAt,
        withdrawnAt: consentRecords.withdrawnAt,
      }).from(consentRecords).where(and(
        eq(consentRecords.id, exchange.sourceConsentRecordId),
        eq(consentRecords.organizationId, target.organizationId),
        eq(consentRecords.websiteId, claims.originWebsiteId),
      )).limit(1);
      if (!source || resolveConsentState(source, now) !== "active") {
        return { error: "Source consent is no longer active", status: 409 as const };
      }

      const policy = await loadTargetPolicy(tx, targetWebsiteId);
      if (!policy) return { error: "No active published target policy", status: 404 as const };
      const mapped = mapDecisions(claims, policy.purposes, policy.vendors);
      const importedConsentId = `pc_${randomUUID().replaceAll("-", "")}`;
      const [record] = await tx.insert(consentRecords).values({
        organizationId: target.organizationId,
        websiteId: targetWebsiteId,
        policyVersionId: policy.versionId,
        consentId: importedConsentId,
        jurisdiction: claims.jurisdiction,
        status: mapped.some((row) => !row.granted) ? "partial" : "accepted",
        source: "portable",
        consentedAt: now,
        expiresAt: claims.expiresAt ? new Date(claims.expiresAt) : null,
        metadata: {
          choice: claims.choice ?? "granular",
          portableEvidence: {
            jti: claims.jti,
            originWebsiteId: claims.originWebsiteId,
            sourceConsentId: claims.consentId,
            proofHash: proof.hash,
            issuedAt: claims.issuedAt,
          },
        },
      }).returning({
        id: consentRecords.id,
        consentId: consentRecords.consentId,
        stateVersion: consentRecords.stateVersion,
      });

      if (mapped.length) {
        await tx.insert(consentDecisions).values(mapped.map((row) => ({
          consentRecordId: record.id,
          ...row,
          decision: "granular",
          decidedAt: now,
        })));
      }
      await tx.insert(consentEvents).values({
        organizationId: target.organizationId,
        websiteId: targetWebsiteId,
        consentId: record.consentId,
        consentRecordId: record.id,
        policyVersionId: policy.versionId,
        eventType: "consent.portable_imported",
        source: "portable",
        occurredAt: now,
        eventData: { jti: claims.jti, originWebsiteId: claims.originWebsiteId },
      });
      await tx.insert(auditLogs).values({
        organizationId: target.organizationId,
        action: "consent.portable_imported",
        resourceType: "consent_record",
        resourceId: record.id,
        description: "Portable consent imported through one-time exchange",
        metadata: { jti: claims.jti, sourceWebsiteId: claims.originWebsiteId, targetWebsiteId },
      });

      const consumed = await tx.update(portableConsentExchanges).set({
        status: "consumed",
        consumedAt: now,
        importedConsentRecordId: record.id,
      }).where(and(
        eq(portableConsentExchanges.id, exchange.id),
        eq(portableConsentExchanges.status, "issued"),
        isNull(portableConsentExchanges.consumedAt),
      )).returning({ id: portableConsentExchanges.id });
      if (consumed.length !== 1) throw new Error("Portable exchange was concurrently consumed");
      return {
        record,
        decisions: mapped,
        expiresAt: claims.expiresAt,
        choice: claims.choice ?? "granular",
        confirmedAt: now,
      };
    });

    if ("error" in imported && imported.error) return failure(imported.status ?? 500, imported.error);
    if (!imported.record || !imported.decisions) return failure(500, "Portable import did not persist");
    return NextResponse.json({
      success: true,
      consentId: imported.record.consentId,
      recordId: imported.record.id,
      stateVersion: imported.record.stateVersion,
      confirmedAt: imported.confirmedAt,
      expiresAt: imported.expiresAt,
      choice: imported.choice,
      decisions: imported.decisions,
    }, { status: 201, headers: HEADERS });
  } catch {
    return failure(500, "Failed to import portable consent");
  }
}

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function loadTargetPolicy(tx: DbTx, websiteId: string) {
  const [policy] = await tx.select({ id: consentPolicies.id }).from(consentPolicies)
    .where(and(eq(consentPolicies.websiteId, websiteId), eq(consentPolicies.status, "active"))).limit(1);
  if (!policy) return null;
  const versions = await tx.select().from(consentPolicyVersions)
    .where(eq(consentPolicyVersions.policyId, policy.id)).orderBy(consentPolicyVersions.version);
  const version = versions.findLast((item) => item.isPublished);
  if (!version) return null;
  const purposeRows = await tx.select({ id: purposes.id, key: purposes.key, isRequired: purposes.isRequired })
    .from(policyPurposes).innerJoin(purposes, eq(policyPurposes.purposeId, purposes.id))
    .where(eq(policyPurposes.policyVersionId, version.id));
  const ids = purposeRows.map((item) => item.id);
  const vendorRows = ids.length ? await tx.select({ id: vendors.id, domain: vendors.domain })
    .from(vendorPurposes).innerJoin(vendors, eq(vendorPurposes.vendorId, vendors.id))
    .where(inArray(vendorPurposes.purposeId, ids)) : [];
  return { versionId: version.id, purposes: purposeRows, vendors: vendorRows };
}

function mapDecisions(
  claims: PortableConsentClaims,
  targetPurposes: Array<{ id: string; key: string; isRequired: boolean }>,
  targetVendors: Array<{ id: string; domain: string | null }>,
) {
  const sourcePurposes = new Map(claims.decisions.filter((d) => d.purposeKey).map((d) => [d.purposeKey!.toLowerCase(), d.granted]));
  const sourceVendors = new Map(claims.decisions.filter((d) => d.vendorDomain).map((d) => [d.vendorDomain!.toLowerCase(), d.granted]));
  return [
    ...targetPurposes.map((purpose) => ({ purposeId: purpose.id, vendorId: null, granted: purpose.isRequired || sourcePurposes.get(purpose.key.toLowerCase()) === true })),
    ...targetVendors.map((vendor) => ({ purposeId: null, vendorId: vendor.id, granted: Boolean(vendor.domain && sourceVendors.get(vendor.domain.toLowerCase()) === true) })),
  ];
}

function resolveSuppliedBundle(body: Record<string, unknown>):
  | { kind: "code"; value: string }
  | { kind: "token"; value: string }
  | { kind: "bundle"; claims: PortableConsentClaims; proof: PortableConsentCryptoProof }
  | null {
  if (typeof body.code === "string" && body.code.length <= 32) return { kind: "code", value: body.code };
  if (typeof body.token === "string" && body.token.length <= 48_000) return { kind: "token", value: body.token };
  if (body.claims && body.proof) return { kind: "bundle", claims: body.claims as PortableConsentClaims, proof: body.proof as PortableConsentCryptoProof };
  return null;
}

async function callerMayImport(request: Request, organizationId: string, _domain: string): Promise<boolean> {
  const session = await auth();
  if (session.isAuthenticated && session.orgId && session.userId) {
    const [organization, user] = await Promise.all([
      resolveLocalOrganization(session.orgId),
      resolveLocalUser(session.userId),
    ]);
    if (organization?.id === organizationId && user &&
        await resolveActiveMembership(organizationId, user.id)) return true;
  }
  return false;
}

function failure(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status, headers: HEADERS });
}

export async function OPTIONS() {
  return publicOptionsResponse("POST, OPTIONS");
}
