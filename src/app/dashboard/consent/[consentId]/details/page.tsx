import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

function Panel({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex h-14 items-center justify-between gap-3 border-b border-[var(--border)] px-5 sm:px-6">
        <h2 className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        {extra ? <div className="shrink-0">{extra}</div> : null}
      </div>
      {children}
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-center gap-1 border-b border-[var(--border)] px-5 py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6 sm:px-6">
      <dt className="text-[11px] font-medium uppercase leading-5 tracking-wide text-[var(--muted-foreground)]">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 text-[var(--foreground)]">{children}</dd>
    </div>
  );
}

function Row({ label, detail, aside }: { label: string; detail?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-[var(--border)] px-5 py-3 last:border-b-0 sm:px-6">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5 text-[var(--foreground)]">{label}</p>
        {detail ? <p className="text-xs leading-5 text-[var(--muted-foreground)]">{detail}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
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

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel
            title="Record"
            extra={
              <Badge variant={shown.key === "expired" ? "warning" : shown.key === "rejected" ? "danger" : shown.key === "accepted" ? "success" : shown.key === "partial" ? "primary" : "neutral"}>
                {shown.label}
              </Badge>
            }
          >
            <dl>
              <Fact label="Consent ID">
                <code className="break-all font-mono text-xs leading-5">{record.consentId}</code>
              </Fact>
              <Fact label="Website">
                <span className="flex min-w-0 items-baseline gap-2">
                  <Link href={`/dashboard/websites/${record.websiteId}`} className="shrink-0 font-medium text-[var(--primary)]">{record.websiteName}</Link>
                  <span className="truncate text-[var(--muted-foreground)]">{domain}</span>
                </span>
              </Fact>
              <Fact label="Policy">{record.policyName ? `${record.policyName} · v${record.policyVersion}` : "—"}</Fact>
              <Fact label="Source">{record.source || "—"}</Fact>
              <Fact label="Jurisdiction">
                {isUnknownJurisdiction(record.jurisdiction) ? <Badge variant="warning" size="sm">Unknown</Badge> : record.jurisdiction}
              </Fact>
              <Fact label="Consented">{fmt(record.consentedAt)}</Fact>
              <Fact label="Expires">{record.expiresAt ? fmt(record.expiresAt) : "Not configured"}</Fact>
              <Fact label="Withdrawn">{record.withdrawnAt ? fmt(record.withdrawnAt) : "—"}</Fact>
              <Fact label="Principal">
                {record.visitorId ? <code className="break-all font-mono text-xs leading-5">{record.visitorId}</code> : "—"}
              </Fact>
            </dl>
          </Panel>

          <Panel title="Evidence">
            {notice ? (
              <dl>
                <Fact label="Notice">{notice.policyName ? `${notice.policyName} · v${notice.policyVersion}` : `Policy version ${notice.policyVersion}`}</Fact>
                <Fact label="Notice hash"><code className="break-all font-mono text-xs leading-5">{notice.hash}</code></Fact>
                <Fact label="Evidence hash"><code className="break-all font-mono text-xs leading-5">{notice.evidenceHash}</code></Fact>
                <Fact label="Snapshot">{fmt(notice.consentedAt)}</Fact>
              </dl>
            ) : (
              <p className="px-5 py-4 text-sm text-[var(--muted-foreground)] sm:px-6">No notice snapshot is stored for this record.</p>
            )}
            <div className="flex h-14 items-center border-y border-[var(--border)] px-5 sm:px-6">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Audit events</h3>
            </div>
            {events.length === 0 ? (
              <p className="px-5 py-4 text-sm text-[var(--muted-foreground)] sm:px-6">No audit events are stored for this record.</p>
            ) : (
              <div>
                {events.map((event) => (
                  <Row key={event.id} label={event.eventType} detail={`${event.source} · ${fmt(event.occurredAt)}`} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Purpose decisions">
          {decisions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--muted-foreground)] sm:px-6">No purpose decisions are stored for this record.</p>
          ) : (
            <div>
              {decisions.map((decision) => (
                <Row
                  key={decision.id}
                  label={decision.purposeName ?? "Purpose"}
                  detail={`${decision.decision} · ${decision.dataCategories && decision.dataCategories.length > 0 ? decision.dataCategories.join(", ") : "No data categories stored"}`}
                  aside={
                    <Badge variant={decision.granted ? "success" : "neutral"} size="sm">
                      {decision.granted ? "Granted" : "Not granted"}
                    </Badge>
                  }
                />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
