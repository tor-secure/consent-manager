import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadConsentRecordDetail } from "@/lib/consent/record-list";
import { displayConsentStatus, isUnknownJurisdiction } from "@/lib/consent/record-list-params";

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
      <div className="mt-1 text-sm text-[var(--foreground)]">{children}</div>
    </div>
  );
}

export default async function ConsentRecordDetailPage({
  params,
}: {
  params: Promise<{ consentId: string }>;
}) {
  const { consentId } = await params;
  const { organization } = await requireDashboardContext();
  const detail = await loadConsentRecordDetail(organization.id, decodeURIComponent(consentId));
  if (!detail) notFound();

  const { record, decisions, events, notice } = detail;
  const shown = displayConsentStatus(record);
  const domain = record.websiteDomain.includes(".deleted.") ? "Removed site" : record.websiteDomain;

  return (
    <div className="page-wrap space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/consent" className="hover:text-[var(--foreground)]">Consent records</Link>
        <span className="text-[var(--border)]">/</span>
        <span className="text-[var(--foreground)]">Record</span>
      </nav>
      <PageHeader
        title="Consent record"
        description="Stored choices, policy version, and evidence for this consent. Historical proof is not rewritten."
        action={
          <Link href={`/dashboard/consent/${encodeURIComponent(record.consentId)}`} className="btn btn-secondary">
            Proof
          </Link>
        }
      />

      <Card>
        <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
          <Fact label="Consent ID">
            <code className="block break-all font-mono text-xs">{record.consentId}</code>
          </Fact>
          <Fact label="Status">
            <Badge variant={shown.key === "expired" ? "warning" : shown.key === "rejected" ? "danger" : shown.key === "accepted" ? "success" : "neutral"} size="sm">
              {shown.label}
            </Badge>
          </Fact>
          <Fact label="Website">
            <Link href={`/dashboard/websites/${record.websiteId}`} className="font-medium text-[var(--primary)]">{record.websiteName}</Link>
            <p className="text-[var(--muted-foreground)]">{domain}</p>
          </Fact>
          <Fact label="Policy">
            {record.policyName ? `${record.policyName} · v${record.policyVersion}` : "—"}
          </Fact>
          <Fact label="Data principal reference">
            {record.visitorId ? <code className="break-all font-mono text-xs">{record.visitorId}</code> : "—"}
          </Fact>
          <Fact label="Source">{record.source || "—"}</Fact>
          <Fact label="Jurisdiction">
            {isUnknownJurisdiction(record.jurisdiction) ? <Badge variant="warning" size="sm">Unknown</Badge> : record.jurisdiction}
          </Fact>
          <Fact label="Consented">{fmt(record.consentedAt)}</Fact>
          <Fact label="Expires">{record.expiresAt ? fmt(record.expiresAt) : "Not configured"}</Fact>
          <Fact label="Withdrawn">{record.withdrawnAt ? fmt(record.withdrawnAt) : "—"}</Fact>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Purpose decisions</h2>
          {decisions.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">No purpose decisions are stored for this record.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {decisions.map((decision) => (
                <li key={decision.id} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)]">{decision.purposeName ?? "Purpose"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Data categories: {decision.dataCategories && decision.dataCategories.length > 0 ? decision.dataCategories.join(", ") : "—"}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">{decision.granted ? "Granted" : "Not granted"} · {decision.decision}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Evidence</h2>
          {notice ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Fact label="Notice">{notice.policyName ? `${notice.policyName} · v${notice.policyVersion}` : `Policy version ${notice.policyVersion}`}</Fact>
              <Fact label="Notice hash"><code className="break-all font-mono text-xs">{notice.hash}</code></Fact>
              <Fact label="Evidence hash"><code className="break-all font-mono text-xs">{notice.evidenceHash}</code></Fact>
              <Fact label="Snapshot time">{fmt(notice.consentedAt)}</Fact>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No notice snapshot is stored for this record.</p>
          )}
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Audit events</h3>
          {events.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No audit events are stored for this record.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {events.map((event) => (
                <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                  <span className="font-medium text-[var(--foreground)]">{event.eventType}</span>
                  <span className="text-[var(--muted-foreground)]">{event.source} · {fmt(event.occurredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
