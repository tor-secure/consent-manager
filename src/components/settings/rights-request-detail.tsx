"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/components/feedback/notify";

type Discovery = {
  recordCount: number;
  decisionCount: number;
  eventCount: number;
  evidenceCount: number;
  holds: {
    request: boolean;
    consentRecords: string[];
    evidence: string[];
  };
  deletionPlan: {
    canExecute: boolean;
    blockedByHold: boolean;
    deleteCurrentState: boolean;
    preserveEvidence: boolean;
  };
  records: Array<{ id: string; consentId: string; status: string; websiteId: string }>;
  californiaOptOuts?: Array<{
    consentId: string;
    websiteId: string;
    state: string;
    source: string;
    saleOptOut: boolean;
    shareOptOut: boolean;
    sensitivePiLimit: boolean;
  }>;
  downstream?: {
    disclaimer: string;
    vendors: Array<{
      id: string;
      name: string;
      role: string | null;
      downstreamDsarMode: string;
      actionRequired: boolean;
    }>;
    actions: Array<{
      id: string;
      vendorId: string;
      status: string;
      reference: string | null;
      notes: string | null;
    }>;
  };
};

export type RightsRequestDetailModel = {
  id: string;
  requestType: string;
  status: string;
  jurisdiction: string;
  requesterReference: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  requesterKind: string;
  agentAuthorizationNote: string | null;
  consentId: string | null;
  description: string;
  responseNotes: string | null;
  verificationStatus: string;
  verificationMethod: string | null;
  verificationExpiresAt: Date | string | null;
  verifiedAt: Date | string | null;
  acknowledgeBy: Date | string;
  dueAt: Date | string;
  acknowledgedAt: Date | string | null;
  completedAt: Date | string | null;
  receivedAt: Date | string;
  deadlineKind: string;
  assignedTo: string | null;
  assignedToName: string | null;
  websiteName: string | null;
  canManage: boolean;
};

export type RightsRequestActivityItem = {
  id: string;
  action: string;
  description: string | null;
  createdAt: Date | string;
};

function fmt(value: Date | string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function RightsRequestDetail({
  request,
  deadlineState,
  discovery,
  activity,
}: {
  request: RightsRequestDetailModel;
  deadlineState: string;
  discovery: Discovery;
  activity: RightsRequestActivityItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(request.responseNotes ?? "");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [correctionName, setCorrectionName] = useState(request.requesterName);

  const terminal = ["completed", "rejected", "expired", "cancelled"].includes(request.status);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/settings/rights-requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { success: boolean; message?: string; verificationToken?: string };
    if (!data.success) {
      notify.error(data.message ?? "Unable to update request");
      return data;
    }
    notify.success("Request updated");
    router.refresh();
    return data;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge size="sm" className="capitalize">{request.requestType.replace("_", " ")}</Badge>
        <Badge size="sm" variant="neutral">{request.status.replace("_", " ")}</Badge>
        <Badge size="sm" variant="warning">{request.verificationStatus}</Badge>
        <Badge size="sm" variant={deadlineState === "overdue" ? "danger" : "neutral"}>{deadlineState}</Badge>
      </div>

      <section className="rounded-2xl bg-[var(--card)] card-shadow p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Request</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-[var(--muted-foreground)]">Reference</dt><dd className="font-mono text-[var(--foreground)]">{request.requesterReference ?? request.id}</dd></div>
          <div><dt className="text-[var(--muted-foreground)]">Jurisdiction</dt><dd className="uppercase">{request.jurisdiction}</dd></div>
          <div><dt className="text-[var(--muted-foreground)]">Submitted</dt><dd>{fmt(request.receivedAt)}</dd></div>
          <div><dt className="text-[var(--muted-foreground)]">Deadline (configured target)</dt><dd>{fmt(request.dueAt)} · {request.deadlineKind}</dd></div>
          <div><dt className="text-[var(--muted-foreground)]">Requester</dt><dd>{request.requesterName} · {request.requesterEmail}</dd></div>
          <div><dt className="text-[var(--muted-foreground)]">Kind</dt><dd>{request.requesterKind.replace("_", " ")}</dd></div>
          <div>
            <dt className="text-[var(--muted-foreground)]">Assigned admin</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span>{request.assignedToName ?? "Unassigned"}</span>
              {request.canManage && !terminal && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(async () => {
                    await patch({ action: "assign_self" });
                  })}
                  className="btn btn-outline btn-sm"
                >
                  Assign me
                </button>
              )}
            </dd>
          </div>
        </dl>
        <p className="rounded-2xl bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)] whitespace-pre-wrap">{request.description}</p>
      </section>

      <section className="rounded-2xl bg-[var(--card)] card-shadow p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Verification</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-[var(--muted-foreground)]">State</dt><dd>{request.verificationStatus}</dd></div>
          <div><dt className="text-[var(--muted-foreground)]">Method</dt><dd>{request.verificationMethod ?? "—"}</dd></div>
          <div><dt className="text-[var(--muted-foreground)]">Verified</dt><dd>{fmt(request.verifiedAt)}</dd></div>
          <div><dt className="text-[var(--muted-foreground)]">Challenge expires</dt><dd>{fmt(request.verificationExpiresAt)}</dd></div>
        </dl>
        {request.agentAuthorizationNote && (
          <p className="text-sm text-[var(--muted-foreground)]">Agent note: {request.agentAuthorizationNote}</p>
        )}
        {request.canManage && !terminal && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => {
                const data = await patch({ action: "resend_verification" });
                if (data.verificationToken) setIssuedToken(data.verificationToken);
              })}
              className="btn btn-outline btn-sm"
            >
              Issue verification challenge
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => {
                await patch({ action: "staff_attest", attestationNote: "Out-of-band identity check completed by staff." });
              })}
              className="btn btn-outline btn-sm"
            >
              Staff-attest identity
            </button>
          </div>
        )}
        {issuedToken && (
          <p className="rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-xs text-[var(--warning)]">
            One-time verification token (shown once): <code className="break-all">{issuedToken}</code>
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-[var(--card)] card-shadow p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Data</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {discovery.recordCount} current records · {discovery.evidenceCount} evidence snapshots · {discovery.eventCount} events
        </p>
        {(discovery.californiaOptOuts ?? []).length > 0 && (
          <div className="space-y-2 rounded-2xl border border-[var(--border)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">California opt-out</p>
            {discovery.californiaOptOuts!.map((row) => (
              <p key={`${row.consentId}-${row.websiteId}`} className="text-sm text-[var(--foreground)]">
                State {row.state.replaceAll("_", " ")} · source {row.source}
                {row.saleOptOut ? " · Do Not Sell" : ""}
                {row.shareOptOut ? " · Do Not Share" : ""}
                {row.sensitivePiLimit ? " · Limit sensitive PI" : ""}
              </p>
            ))}
          </div>
        )}
        {discovery.holds.request && (
          <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">Legal hold is active on this rights request.</p>
        )}
        {discovery.holds.consentRecords.length > 0 && (
          <p className="text-sm text-[var(--danger)]">Legal hold on {discovery.holds.consentRecords.length} consent record(s).</p>
        )}
        <p className="text-xs text-[var(--muted-foreground)]">
          Historical evidence is never deleted through this workflow. Current operational data is deleted only after verification and hold checks.
        </p>
        {request.canManage && request.verificationStatus === "verified" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => {
                const res = await fetch(`/api/settings/rights-requests/${request.id}/export`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ kind: request.requestType === "portability" ? "portability" : "access" }),
                });
                const data = await res.json() as { success: boolean; downloadPath?: string; message?: string };
                if (!data.success || !data.downloadPath) {
                  notify.error(data.message ?? "Export failed");
                  return;
                }
                window.location.href = data.downloadPath;
              })}
              className="btn btn-primary btn-sm"
            >
              Generate {request.requestType === "portability" ? "portability" : "access"} export
            </button>
            {request.requestType === "erasure" && (
              <button
                type="button"
                disabled={pending || !discovery.deletionPlan.canExecute}
                onClick={() => startTransition(async () => {
                  const res = await fetch(`/api/settings/rights-requests/${request.id}/deletion`, { method: "POST" });
                  const data = await res.json() as { success: boolean; message?: string };
                  if (!data.success) notify.error(data.message ?? "Deletion blocked");
                  else notify.success("Eligible current-state data deleted; evidence preserved");
                  router.refresh();
                })}
                className="btn btn-danger btn-sm"
              >
                Execute eligible deletion
              </button>
            )}
            {(request.requestType === "withdraw_consent" || request.requestType === "objection") && (
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => {
                  const res = await fetch(`/api/settings/rights-requests/${request.id}/withdraw`, { method: "POST" });
                  const data = await res.json() as { success: boolean; message?: string };
                  if (!data.success) notify.error(data.message ?? "Withdrawal failed");
                  else notify.success("Existing withdrawal flow invoked");
                  router.refresh();
                })}
                className="btn btn-outline btn-sm"
              >
                Invoke consent withdrawal
              </button>
            )}
          </div>
        )}
      </section>

      {discovery.downstream && (
        <section className="rounded-2xl bg-[var(--card)] card-shadow p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Downstream vendors</h2>
          <p className="text-xs text-[var(--muted-foreground)]">{discovery.downstream.disclaimer}</p>
          {discovery.downstream.vendors.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No processing-activity vendors discovered for this request.</p>
          ) : (
            <ul className="space-y-3">
              {discovery.downstream.vendors.map((vendor) => {
                const action = discovery.downstream?.actions.find((row) => row.vendorId === vendor.id);
                return (
                  <li key={vendor.id} className="rounded-2xl bg-[var(--muted)] px-4 py-3 text-sm">
                    <p className="font-medium text-[var(--foreground)]">{vendor.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{vendor.role ?? "unknown"} · tracking {vendor.downstreamDsarMode}</p>
                    <p className="mt-1 text-xs">Operator status: {action?.status ?? "not recorded"}</p>
                    {request.canManage && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {["pending", "sent", "completed", "failed", "manually_handled", "not_required"].map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={pending}
                            onClick={() => startTransition(async () => {
                              const res = await fetch(`/api/settings/rights-requests/${request.id}/downstream`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ vendorId: vendor.id, status }),
                              });
                              const data = await res.json() as { success: boolean; message?: string };
                              if (!data.success) notify.error(data.message ?? "Unable to record downstream status");
                              else {
                                notify.success("Downstream status recorded. This is not vendor deletion proof.");
                                router.refresh();
                              }
                            })}
                            className="btn btn-outline btn-sm capitalize"
                          >
                            {status.replaceAll("_", " ")}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {request.requestType === "correction" && request.canManage && request.verificationStatus === "verified" && !terminal && (
        <section className="rounded-2xl bg-[var(--card)] card-shadow p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Correction</h2>
          <input
            value={correctionName}
            onChange={(event) => setCorrectionName(event.target.value)}
            className="field-input"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => {
              const res = await fetch(`/api/settings/rights-requests/${request.id}/correction`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requesterName: correctionName }),
              });
              const data = await res.json() as { success: boolean; message?: string };
              if (!data.success) notify.error(data.message ?? "Correction rejected");
              else notify.success("Approved correction applied");
              router.refresh();
            })}
            className="btn btn-primary btn-sm"
          >
            Apply approved name correction
          </button>
        </section>
      )}

      {request.canManage && !terminal && (
        <section className="rounded-2xl bg-[var(--card)] card-shadow p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Operator actions</h2>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="field-input"
            placeholder="Internal notes only"
          />
          <div className="flex flex-wrap gap-2">
            {["in_review", "in_progress", "completed", "rejected", "cancelled"].map((status) => (
              <button
                key={status}
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => {
                  await patch({ status, responseNotes: notes });
                })}
                className="btn btn-outline btn-sm capitalize"
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-[var(--card)] card-shadow p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No recorded activity yet.</p>
        ) : (
          <ol className="space-y-3">
            {activity.map((item) => (
              <li key={item.id} className="border-l-2 border-[var(--border)] pl-3">
                <p className="text-xs font-medium text-[var(--foreground)]">{item.action.replaceAll("_", " ")}</p>
                {item.description && (
                  <p className="text-sm text-[var(--muted-foreground)]">{item.description}</p>
                )}
                <p className="text-[11px] text-[var(--muted-foreground)]">{fmt(item.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
