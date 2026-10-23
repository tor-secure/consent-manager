"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/sdk/copy-snippet";
import { PageHeader } from "@/components/ui/page-header";

type ProofPayload = {
  stored: { alg: string; hash: string; signature: string; signedAt: string } | null;
  currentHash: string;
  verification: { hashMatches: boolean; signatureValid: boolean; intact: boolean };
};

type EvidenceDecision = {
  name: string | null;
  decision: string;
  granted: boolean;
  decidedAt?: string;
};

type EvidenceHistory = {
  noticeHash?: string;
  policyVersionNumber?: number;
  choice?: string | null;
  consentedAt?: string;
  noticeSnapshot?: { policy?: { name?: string; version?: number } };
};

type EvidenceResponse = {
  success: boolean;
  message?: string;
  evidence?: {
    consentId: string;
    status: string;
    source?: string;
    jurisdiction: string | null;
    consentedAt?: string | null;
    expiresAt?: string | null;
    withdrawnAt?: string | null;
    website: { name: string; domain: string } | null;
    policyVersion: { policyName: string | null; version: number } | null;
    decisions?: EvidenceDecision[];
    history?: EvidenceHistory[];
    proof: ProofPayload | null;
  };
};

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ConsentProofPage() {
  const params = useParams<{ consentId: string }>();
  const consentId = params.consentId;
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/consent/evidence/${encodeURIComponent(consentId)}`)
      .then(async (response) => {
        const json = (await response.json()) as EvidenceResponse;
        if (cancelled) return;
        if (!response.ok) {
          setError(json.message || "Unable to load proof.");
          return;
        }
        setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load proof.");
      });
    return () => {
      cancelled = true;
    };
  }, [consentId]);

  const proof = data?.evidence?.proof;
  const intact = proof?.verification.intact === true;
  const evidence = data?.evidence;
  const notice = evidence?.history && evidence.history.length > 0 ? evidence.history[evidence.history.length - 1] : null;
  const noticePolicy = notice?.noticeSnapshot?.policy;
  const jurisdiction = evidence?.jurisdiction?.trim();
  const unknownJurisdiction = !jurisdiction || jurisdiction.toLowerCase() === "unknown";

  return (
    <div className="page-wrap space-y-6">
      <nav className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/consent" className="hover:text-[var(--foreground)]">
          Consent
        </Link>
        <span className="text-[var(--border)]">/</span>
        <span className="text-[var(--foreground)]">Cryptographic proof</span>
      </nav>

      <PageHeader
        title="Cryptographic consent proof"
        description="SHA-256 over a canonical decision payload, then HMAC-SHA256. Tampering with stored decisions invalidates the hash."
      />

      {error ? (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      ) : !data?.evidence ? (
        <p className="text-sm text-[var(--muted-foreground)]">Loading proof…</p>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={proof?.stored ? (intact ? "success" : "danger") : "neutral"}>{proof?.stored ? (intact ? "Intact" : "Not intact") : "No signature stored"}</Badge>
              <Badge variant="neutral">{data.evidence.status}</Badge>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {data.evidence.website?.name} ({data.evidence.website?.domain}) ·{" "}
              {data.evidence.policyVersion
                ? `${data.evidence.policyVersion.policyName ?? "Policy"} v${data.evidence.policyVersion.version}`
                : "No policy version"}
            </p>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Consent ID</p>
              <code className="mt-1 block break-all font-mono text-xs">{data.evidence.consentId}</code>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="text-[var(--muted-foreground)]">Consented: <span className="text-[var(--foreground)]">{formatWhen(evidence?.consentedAt)}</span></p>
              <p className="text-[var(--muted-foreground)]">Expires: <span className="text-[var(--foreground)]">{evidence?.expiresAt ? formatWhen(evidence.expiresAt) : "Not configured"}</span></p>
              <p className="text-[var(--muted-foreground)]">Withdrawn: <span className="text-[var(--foreground)]">{formatWhen(evidence?.withdrawnAt)}</span></p>
              <p className="text-[var(--muted-foreground)]">Source: <span className="capitalize text-[var(--foreground)]">{evidence?.source || "—"}</span></p>
              <p className="text-[var(--muted-foreground)]">Jurisdiction: <span className="text-[var(--foreground)]">{unknownJurisdiction ? "Unknown" : jurisdiction}</span></p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Notice</p>
              {notice ? (
                <div className="mt-1 space-y-1 text-sm">
                  <p className="text-[var(--foreground)]">
                    {noticePolicy?.name ? `${noticePolicy.name} · v${noticePolicy.version ?? notice.policyVersionNumber ?? "—"}` : `Policy version ${notice.policyVersionNumber ?? "—"}`}
                  </p>
                  {notice.choice ? <p className="text-[var(--muted-foreground)]">Choice: {notice.choice}</p> : null}
                  {notice.noticeHash ? <code className="block break-all font-mono text-xs text-[var(--muted-foreground)]">{notice.noticeHash}</code> : null}
                </div>
              ) : (
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">No notice snapshot is stored for this record.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Choices</p>
              {evidence?.decisions && evidence.decisions.length > 0 ? (
                <ul className="mt-1 space-y-1 text-sm">
                  {evidence.decisions.map((decision) => (
                    <li key={`${decision.name ?? "purpose"}-${decision.decision}`} className="text-[var(--foreground)]">
                      {decision.name ?? "Purpose"} · {decision.granted ? "Granted" : "Not granted"} · {decision.decision}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">No individual choices are stored for this record.</p>
              )}
            </div>
            {proof?.stored ? (
              <>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">SHA-256</p>
                    <CopyButton text={proof.stored.hash} />
                  </div>
                  <code className="mt-1 block break-all font-mono text-xs">{proof.stored.hash}</code>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">HMAC-SHA256</p>
                    <CopyButton text={proof.stored.signature} />
                  </div>
                  <code className="mt-1 block break-all font-mono text-xs">{proof.stored.signature}</code>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Signed {proof.stored.signedAt || "—"}. Hash matches current record:{" "}
                  {proof.verification.hashMatches ? "yes" : "no"}. Signature valid:{" "}
                  {proof.verification.signatureValid ? "yes" : "no"}.
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                This record was stored before proofs were signed. New consents include a hash and HMAC.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
