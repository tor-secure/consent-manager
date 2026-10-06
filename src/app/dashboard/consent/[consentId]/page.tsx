"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/sdk/copy-snippet";
import { PageHeader } from "@/components/ui/page-header";

type ProofPayload = {
  stored: { alg: string; hash: string; signature: string; signedAt: string; proofVersion?: number; keyId?: string } | null;
  currentHash: string;
  verification: { hashMatches: boolean; signatureValid: boolean; intact: boolean };
  proofVersion?: number;
  keyId?: string;
};

type EvidenceResponse = {
  success: boolean;
  message?: string;
  evidence?: {
    consentId: string;
    status: string;
    jurisdiction: string | null;
    website: { name: string; domain: string } | null;
    policyVersion: { policyName: string | null; version: number } | null;
    session: { id: string; status: string; decisionCount: number; issuedAt: string; expiresAt: string; revokedAt: string | null } | null;
    privacyEvents?: Array<{ id: string; eventType: string; provenance: string; occurredAt: string; payload: Record<string, unknown> }>;
    proof: ProofPayload | null;
  };
};

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
              <Badge variant={intact ? "success" : "danger"}>{intact ? "Intact" : "Not intact"}</Badge>
              <Badge variant="neutral">{data.evidence.status}</Badge>
              <Badge variant="neutral">Proof v{proof?.proofVersion ?? proof?.stored?.proofVersion ?? 1}</Badge>
              <Badge variant="neutral">Key {proof?.keyId ?? proof?.stored?.keyId ?? "legacy"}</Badge>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {data.evidence.website?.name} ({data.evidence.website?.domain}) ·{" "}
              {data.evidence.policyVersion
                ? `${data.evidence.policyVersion.policyName ?? "Policy"} v${data.evidence.policyVersion.version}`
                : "No policy version"}
            </p>
            <section className="rounded-xl border border-[var(--border)] p-4">
              <h2 className="font-semibold">Consent session</h2>
              {data.evidence.session ? <div className="mt-2 space-y-1 text-sm"><p>Session <code className="break-all">{data.evidence.session.id}</code></p><p>Status: <span className="capitalize">{data.evidence.session.status}</span> · {data.evidence.session.decisionCount} decisions</p><p>Issued {new Date(data.evidence.session.issuedAt).toLocaleString()} · expires {new Date(data.evidence.session.expiresAt).toLocaleString()}</p>{data.evidence.session.revokedAt && <p>Revoked {new Date(data.evidence.session.revokedAt).toLocaleString()}</p>}</div> : <p className="mt-2 text-sm text-[var(--muted-foreground)]">No session is linked to this evidence.</p>}
            </section>
            <section className="rounded-xl border border-[var(--border)] p-4"><h2 className="font-semibold">Decision evidence</h2><p className="mt-2 text-sm">Policy: {data.evidence.policyVersion?.policyName ?? "Unknown"} v{data.evidence.policyVersion?.version ?? "—"} · jurisdiction: {data.evidence.jurisdiction ?? "Not recorded"}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Decision timestamp and purpose/vendor choices are included in the signed evidence.</p></section>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Consent ID</p>
              <code className="mt-1 block break-all font-mono text-xs">{data.evidence.consentId}</code>
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
            <section className="border-t border-[var(--border)] pt-4"><h2 className="font-semibold">Privacy event history</h2>{data.evidence.privacyEvents?.length ? <ol className="mt-3 space-y-2">{data.evidence.privacyEvents.map((event) => <li key={event.id} className="rounded-lg bg-[var(--muted)] p-3 text-sm"><span className="font-medium">{event.eventType}</span><span className="text-[var(--muted-foreground)]"> · {event.provenance} · {new Date(event.occurredAt).toLocaleString()}</span></li>)}</ol> : <p className="mt-2 text-sm text-[var(--muted-foreground)]">No structured privacy events for this session.</p>}</section>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
