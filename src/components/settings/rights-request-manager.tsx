"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/components/feedback/notify";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RightsRequestRow = {
  id: string;
  requestType: string;
  status: string;
  jurisdiction: string;
  requesterReference: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  verificationStatus: string;
  consentId: string | null;
  description: string;
  responseNotes: string | null;
  acknowledgeBy: Date;
  dueAt: Date;
  acknowledgedAt: Date | null;
  completedAt: Date | null;
  receivedAt: Date;
  assignedToName: string | null;
  websiteName: string | null;
  websiteDomain: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  }) + " " + new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
  });
}

function hoursLeft(deadline: Date) {
  return Math.round((new Date(deadline).getTime() - Date.now()) / 3_600_000);
}

function daysLeft(deadline: Date) {
  return Math.round((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// SLA indicator — colour-coded urgency chip
// ---------------------------------------------------------------------------

function SlaChip({ label, deadline, unit }: { label: string; deadline: Date; unit: "hours" | "days" }) {
  const remaining = unit === "hours" ? hoursLeft(deadline) : daysLeft(deadline);
  const overdue   = remaining < 0;
  const urgent    = !overdue && remaining < (unit === "hours" ? 12 : 5);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
      overdue ? "bg-rose-100 text-rose-700 ring-1 ring-rose-500/20"
      : urgent ? "bg-amber-50 text-amber-700 ring-1 ring-amber-500/20"
      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
    }`}>
      {overdue ? "Overdue" : `${label}: ${remaining} ${unit} left`}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Request type badge
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: string }) {
  const variantMap: Record<string, "primary" | "danger" | "warning" | "purple" | "neutral"> = {
    access:      "primary",
    correction:  "warning",
    erasure:     "danger",
    portability: "primary",
    objection:   "warning",
    restriction: "purple",
    withdraw_consent: "danger",
    grievance:   "purple",
    nomination:  "neutral",
  };
  return (
    <Badge variant={variantMap[type] ?? "neutral"} size="sm" className="capitalize">
      {type}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "neutral" | "warning" | "primary" | "success" | "danger"> = {
    received:     "neutral",
    verification_pending: "warning",
    verified: "primary",
    in_review: "warning",
    acknowledged: "warning",
    in_progress:  "primary",
    completed:    "success",
    rejected:     "danger",
    expired: "danger",
    cancelled: "neutral",
  };
  const label: Record<string, string> = {
    received: "Received",
    verification_pending: "Verification pending",
    verified: "Verified",
    in_review: "In review",
    acknowledged: "Acknowledged",
    in_progress: "In Progress",
    completed: "Completed",
    rejected: "Rejected",
    expired: "Expired",
    cancelled: "Cancelled",
  };
  return (
    <Badge variant={variantMap[status] ?? "neutral"} size="sm">
      {label[status] ?? status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Single expanded request card
// ---------------------------------------------------------------------------

function RequestCard({ request }: { request: RightsRequestRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [expanded, setExpanded]   = useState(false);
  const [notes, setNotes]         = useState(request.responseNotes ?? "");
  const [status, setStatus]       = useState(request.status);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  const isTerminal = ["completed", "rejected", "expired", "cancelled"].includes(status);
  const needsAck = !request.acknowledgedAt && !isTerminal && status !== "in_progress";

  async function save(nextStatus?: string) {
    setError(null); setSuccess(null);
    const body: Record<string, string> = {};
    if (nextStatus) body.status = nextStatus;
    if (notes !== (request.responseNotes ?? "")) body.responseNotes = notes;
    if (Object.keys(body).length === 0) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/settings/rights-requests/${request.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { success: boolean; message?: string; request?: { status: string } };
        if (!data.success) notify.error("Unable to save rights request. Please try again.");
        else {
          if (nextStatus) setStatus(nextStatus);
          notify.success("Rights request updated successfully");
          router.refresh();
        }
      } catch { notify.error("Unable to connect. Please try again."); }
    });
  }

  return (
    <div className="rounded-2xl bg-white card-shadow overflow-hidden">
      {/* Summary row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
        aria-expanded={expanded}
      >
        {/* Type + Status */}
        <div className="flex shrink-0 flex-col items-start gap-1.5 min-w-[110px]">
          <TypeBadge type={request.requestType} />
          <StatusBadge status={status} />
        </div>

        {/* Requester + website */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{request.requesterName}</p>
          <p className="truncate text-xs text-slate-500">{request.requesterEmail}</p>
          <p className="truncate text-[11px] uppercase text-slate-400">
            {request.jurisdiction} · {request.verificationStatus} · {request.requesterReference ?? request.id.slice(0, 8)}
          </p>
          {request.websiteName && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{request.websiteName}</p>
          )}
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            Assigned: {request.assignedToName ?? "Unassigned"}
          </p>
        </div>

        {/* SLA + received */}
        <div className="shrink-0 space-y-1 text-right">
          {!isTerminal && needsAck && (
            <SlaChip label="Ack." deadline={request.acknowledgeBy} unit="hours" />
          )}
          {!isTerminal && (
            <SlaChip label="Due" deadline={request.dueAt} unit="days" />
          )}
          <p className="text-xs text-slate-400">{fmt(request.receivedAt)}</p>
        </div>

        {/* Chevron */}
        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-5">
          {/* Requester details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Requester</p>
              <dl className="space-y-1 text-sm">
                <div className="flex gap-2"><dt className="text-slate-500 shrink-0">Name:</dt><dd className="text-slate-800 break-all">{request.requesterName}</dd></div>
                <div className="flex gap-2"><dt className="text-slate-500 shrink-0">Email:</dt><dd className="text-slate-800 break-all">{request.requesterEmail}</dd></div>
                {request.requesterPhone && (
                  <div className="flex gap-2"><dt className="text-slate-500 shrink-0">Phone:</dt><dd className="text-slate-800">{request.requesterPhone}</dd></div>
                )}
                {request.consentId && (
                  <div className="flex gap-2"><dt className="text-slate-500 shrink-0">Consent&nbsp;ID:</dt>
                    <dd><code className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 break-all">{request.consentId}</code></dd>
                  </div>
                )}
              </dl>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">SLA Deadlines</p>
              <dl className="space-y-1 text-sm">
                <div className="flex gap-2"><dt className="text-slate-500 shrink-0">Received:</dt><dd className="text-slate-700">{fmt(request.receivedAt)}</dd></div>
                <div className="flex gap-2"><dt className="text-slate-500 shrink-0">Ack. by:</dt>
                  <dd className={new Date(request.acknowledgeBy) < new Date() && !request.acknowledgedAt ? "text-rose-600 font-semibold" : "text-slate-700"}>
                    {fmt(request.acknowledgeBy)}
                  </dd>
                </div>
                {request.acknowledgedAt && (
                  <div className="flex gap-2"><dt className="text-slate-500 shrink-0">Acknowledged:</dt><dd className="text-emerald-700">{fmt(request.acknowledgedAt)}</dd></div>
                )}
                <div className="flex gap-2"><dt className="text-slate-500 shrink-0">Due by:</dt>
                  <dd className={new Date(request.dueAt) < new Date() && !request.completedAt ? "text-rose-600 font-semibold" : "text-slate-700"}>
                    {fmt(request.dueAt)}
                  </dd>
                </div>
                {request.completedAt && (
                  <div className="flex gap-2"><dt className="text-slate-500 shrink-0">Completed:</dt><dd className="text-emerald-700">{fmt(request.completedAt)}</dd></div>
                )}
              </dl>
            </div>
          </div>

          {/* Request description */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Request description</p>
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">{request.description}</p>
          </div>

          {/* Response notes + status update */}
          {!isTerminal && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Response / Resolution notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={10000}
                disabled={isPending}
                placeholder="Internal notes visible only to your team…"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition disabled:bg-slate-50"
              />

              {/* Feedback */}
              {error && (
                <p className="text-xs text-rose-600">{error}</p>
              )}
              {success && (
                <p className="text-xs text-emerald-600">{success}</p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/rights-requests/${request.id}`}
                  className="inline-flex items-center rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Open workflow
                </Link>
                {needsAck && status !== "verification_pending" && status !== "in_review" && (
                  <button type="button" disabled={isPending}
                    onClick={() => save(status === "verified" ? "in_review" : "acknowledged")}
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
                    Move to review
                  </button>
                )}
                {status === "acknowledged" || status === "in_review" ? (
                  <button type="button" disabled={isPending}
                    onClick={() => save("in_progress")}
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
                    Mark in progress
                  </button>
                ) : null}
                <button type="button" disabled={isPending}
                  onClick={() => save("rejected")}
                  className="inline-flex items-center rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50">
                  Reject
                </button>
                {notes !== (request.responseNotes ?? "") && (
                  <button type="button" disabled={isPending}
                    onClick={() => save(undefined)}
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
                    Save notes only
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Completed / rejected — show notes read-only */}
          {isTerminal && request.responseNotes && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Resolution notes</p>
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">{request.responseNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RightsRequestManager — top-level list component
// ---------------------------------------------------------------------------

export function RightsRequestManager({
  requests,
}: {
  requests: RightsRequestRow[];
}) {
  const [filter, setFilter] = useState<"all" | "open" | "completed" | "overdue">("open");
  const [typeFilter, setTypeFilter] = useState("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  const filtered = requests.filter((r) => {
    if (filter === "open" && ["completed", "rejected", "expired", "cancelled"].includes(r.status)) return false;
    if (filter === "completed" && r.status !== "completed" && r.status !== "rejected") return false;
    if (filter === "overdue" && (["completed", "rejected", "expired", "cancelled"].includes(r.status) || new Date(r.dueAt) >= new Date())) return false;
    if (typeFilter !== "all" && r.requestType !== typeFilter) return false;
    if (jurisdictionFilter !== "all" && r.jurisdiction !== jurisdictionFilter) return false;
    if (verificationFilter !== "all" && r.verificationStatus !== verificationFilter) return false;
    return true;
  });

  const openCount      = requests.filter((r) => r.status !== "completed" && r.status !== "rejected").length;
  const overdueAckCount = requests.filter((r) => r.status === "received" && new Date(r.acknowledgeBy) < new Date()).length;

  return (
    <div className="space-y-5">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Total",   value: requests.length,  dot: "bg-slate-400"   },
          { label: "Open",    value: openCount,         dot: "bg-indigo-500"  },
          ...(overdueAckCount > 0
            ? [{ label: "Overdue ack.", value: overdueAckCount, dot: "bg-rose-500" }]
            : []),
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm soft-shadow">
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            <span className="font-semibold text-slate-800">{s.value}</span>
            <span className="text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs">
          <option value="all">All types</option>
          {["access", "correction", "erasure", "portability", "objection", "restriction", "withdraw_consent", "grievance", "nomination"].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select value={jurisdictionFilter} onChange={(event) => setJurisdictionFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs">
          <option value="all">All jurisdictions</option>
          {["dpdp", "gdpr", "ccpa", "lgpd"].map((key) => (
            <option key={key} value={key}>{key.toUpperCase()}</option>
          ))}
        </select>
        <select value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs">
          <option value="all">All verification</option>
          {["pending", "verified", "failed", "expired", "unverified"].map((key) => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-0.5 rounded-2xl border border-slate-200 bg-slate-50 p-0.5 self-start soft-shadow w-fit">
        {(["open", "all", "completed", "overdue"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-1.5 text-xs font-medium capitalize transition ${
              filter === f
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="text-slate-300">
              <path d="M9 12l2 2 4-4" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {filter === "open" ? "No open requests" : "No requests found"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Requests submitted via the public API will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Request cards */}
      <div className="space-y-3">
        {filtered.map((r) => (
          <RequestCard key={r.id} request={r} />
        ))}
      </div>
    </div>
  );
}
