import { createHash, randomUUID } from "node:crypto";

import { createHistoricalConsentEvidenceProof } from "@/lib/consent-proof";
import { buildWithdrawalEvidenceDecisions } from "@/lib/retention/core";
import type { ConsentEvidenceDecision } from "@/db/schema/consent-evidence-snapshots";
import type { PolicyContextClaims, PolicyNoticeSnapshot } from "@/lib/policy-context";

export function buildWithdrawalEvidenceSnapshot(input: {
  prior: {
    organizationId: string;
    websiteId: string;
    policyId: string;
    policyVersionId: string;
    policyVersionNumber: number;
    consentRecordId: string | null;
    consentId: string;
    policyContextId: string;
    jurisdiction: string;
    locale: string;
    variantId?: string | null;
    noticeHash: string;
    policyContext: PolicyContextClaims;
    noticeSnapshot: PolicyNoticeSnapshot;
    decisions: ConsentEvidenceDecision[];
    signals: Record<string, unknown>;
    source?: string;
  };
  stateVersion: number;
  withdrawnAt: Date;
}) {
  const withdrawnAt = input.withdrawnAt.toISOString();
  const decisions = buildWithdrawalEvidenceDecisions(input.prior.decisions, withdrawnAt);
  const payload = {
    organizationId: input.prior.organizationId,
    websiteId: input.prior.websiteId,
    consentId: input.prior.consentId,
    policyId: input.prior.policyId,
    policyVersionId: input.prior.policyVersionId,
    policyVersionNumber: input.prior.policyVersionNumber,
    policyContextId: input.prior.policyContextId,
    jurisdiction: input.prior.jurisdiction,
    locale: input.prior.locale,
    noticeHash: input.prior.noticeHash,
    noticeSnapshot: input.prior.noticeSnapshot,
    choice: "withdraw" as const,
    status: "withdrawn",
    source: input.prior.source ?? "web",
    decisions,
    consentedAt: withdrawnAt,
  };
  const proof = createHistoricalConsentEvidenceProof(payload);
  const submissionId = randomUUID();
  const requestHash = createHash("sha256")
    .update(JSON.stringify({
      consentId: input.prior.consentId,
      websiteId: input.prior.websiteId,
      action: "withdraw",
      withdrawnAt,
    }))
    .digest("hex");

  return {
    values: {
      organizationId: input.prior.organizationId,
      websiteId: input.prior.websiteId,
      policyId: input.prior.policyId,
      policyVersionId: input.prior.policyVersionId,
      policyVersionNumber: input.prior.policyVersionNumber,
      consentRecordId: input.prior.consentRecordId,
      consentId: input.prior.consentId,
      submissionId,
      requestHash,
      policyContextId: input.prior.policyContextId,
      jurisdiction: input.prior.jurisdiction,
      locale: input.prior.locale,
      variantId: input.prior.variantId ?? input.prior.policyContext.variantId ?? null,
      noticeHash: input.prior.noticeHash,
      choice: "withdraw",
      status: "withdrawn",
      stateVersion: input.stateVersion,
      source: input.prior.source ?? "web",
      policyContext: input.prior.policyContext,
      noticeSnapshot: input.prior.noticeSnapshot,
      decisions,
      signals: input.prior.signals,
      evidenceHash: proof.hash,
      evidenceSignature: proof.signature,
      consentedAt: input.withdrawnAt,
    },
    payload,
  };
}
