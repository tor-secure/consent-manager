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

      <section className="rounded-2xl bg-white card-shadow p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Request</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Reference</dt><dd className="font-mono text-slate-800">{request.requesterReference ?? request.id}</dd></div>
          <div><dt className="text-slate-500">Jurisdiction</dt><dd className="uppercase">{request.jurisdiction}</dd></div>
          <div><dt className="text-slate-500">Submitted</dt><dd>{fmt(request.receivedAt)}</dd></div>
          <div><dt className="text-slate-500">Deadline (configured target)</dt><dd>{fmt(request.dueAt)} · {request.deadlineKind}</dd></div>
          <div><dt className="text-slate-500">Requester</dt><dd>{request.requesterName} · {request.requesterEmail}</dd></div>
          <div><dt className="text-slate-500">Kind</dt><dd>{request.requesterKind.replace("_", " ")}</dd></div>
          <div>
            <dt className="text-slate-500">Assigned admin</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span>{request.assignedToName ?? "Unassigned"}</span>
              {request.canManage && !terminal && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(async () => {
                    await patch({ action: "assign_self" });
                  })}
                  className="rounded-xl border border-slate-200 px-2 py-0.5 text-[11px] font-medium"
                >
                  Assign me
                </button>
              )}
            </dd>
          </div>
        </dl>
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">{request.description}</p>
      </section>

      <section className="rounded-2xl bg-white card-shadow p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Verification</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">State</dt><dd>{request.verificationStatus}</dd></div>
          <div><dt className="text-slate-500">Method</dt><dd>{request.verificationMethod ?? "—"}</dd></div>
          <div><dt className="text-slate-500">Verified</dt><dd>{fmt(request.verifiedAt)}</dd></div>
          <div><dt className="text-slate-500">Challenge expires</dt><dd>{fmt(request.verificationExpiresAt)}</dd></div>
        </dl>
        {request.agentAuthorizationNote && (
          <p className="text-sm text-slate-600">Agent note: {request.agentAuthorizationNote}</p>
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
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-medium"
            >
              Issue verification challenge
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => {
                await patch({ action: "staff_attest", attestationNote: "Out-of-band identity check completed by staff." });
              })}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-medium"
            >
              Staff-attest identity
            </button>
          </div>
        )}
        {issuedToken && (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            One-time verification token (shown once): <code className="break-all">{issuedToken}</code>
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white card-shadow p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Data</h2>
        <p className="text-sm text-slate-600">
          {discovery.recordCount} current records · {discovery.evidenceCount} evidence snapshots · {discovery.eventCount} events
        </p>
        {discovery.holds.request && (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">Legal hold is active on this rights request.</p>
        )}
        {discovery.holds.consentRecords.length > 0 && (
          <p className="text-sm text-rose-700">Legal hold on {discovery.holds.consentRecords.length} consent record(s).</p>
        )}
        <p className="text-xs text-slate-500">
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
              className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white"
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
                className="rounded-2xl bg-rose-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
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
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-medium"
              >
                Invoke consent withdrawal
              </button>
            )}
          </div>
        )}
      </section>

      {request.requestType === "correction" && request.canManage && request.verificationStatus === "verified" && !terminal && (
        <section className="rounded-2xl bg-white card-shadow p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Correction</h2>
          <input
            value={correctionName}
            onChange={(event) => setCorrectionName(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
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
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white"
          >
            Apply approved name correction
          </button>
        </section>
      )}

      {request.canManage && !terminal && (
        <section className="rounded-2xl bg-white card-shadow p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Operator actions</h2>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
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
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-medium capitalize"
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-white card-shadow p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500">No recorded activity yet.</p>
        ) : (
          <ol className="space-y-3">
            {activity.map((item) => (
              <li key={item.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-xs font-medium text-slate-800">{item.action.replaceAll("_", " ")}</p>
                {item.description && (
                  <p className="text-sm text-slate-600">{item.description}</p>
                )}
                <p className="text-[11px] text-slate-400">{fmt(item.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
